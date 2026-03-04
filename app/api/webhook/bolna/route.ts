import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { v4 as uuid } from 'uuid';

interface CallRecord {
  id: string;
  rep_id: string;
  team_id: string;
  status: string;
  bolna_execution_id: string;
}

interface Rep {
  id: string;
  name: string;
  territory: string;
  performance_score: number;
  total_calls: number;
}

interface Store {
  id: string;
  name: string;
  days_since_order: number;
  flag: string;
}

function logStep(db: ReturnType<typeof getDb>, teamId: string, callId: string, repName: string, category: string, action: string, detail: string) {
  db.prepare(
    'INSERT INTO processing_logs (id, team_id, call_id, rep_name, category, action, detail) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(uuid(), teamId, callId, repName, category, action, detail);
}

// --- TEXT PARSING HELPERS ---
// Since Bolna puts everything in summary/transcript, we parse it ourselves.

function parseStoresVisited(text: string, knownStores: Store[]): string[] {
  const lower = text.toLowerCase();
  return knownStores
    .filter(s => lower.includes(s.name.toLowerCase()))
    .map(s => s.name);
}

function parseStoreReorders(text: string, knownStores: Store[]): { name: string; value: number | null }[] {
  const reorders: { name: string; value: number | null }[] = [];
  const lower = text.toLowerCase();

  for (const store of knownStores) {
    const storeIdx = lower.indexOf(store.name.toLowerCase());
    if (storeIdx === -1) continue;

    // Look at text around the store name for order info
    const start = Math.max(0, storeIdx - 50);
    const end = Math.min(lower.length, storeIdx + store.name.length + 200);
    const nearby = lower.substring(start, end);

    const hasOrder = /reorder|order|bought|purchased|restocked|₹|rs\.?\s*\d|inr|\d+[,.]?\d*\s*(k|thousand|hundred)/i.test(nearby);
    if (hasOrder) {
      // Try to extract value
      const valueMatch = nearby.match(/₹\s*([\d,]+)|rs\.?\s*([\d,]+)|([\d,]+)\s*(?:rs|rupee|inr|k\b)/i);
      let value: number | null = null;
      if (valueMatch) {
        const raw = (valueMatch[1] || valueMatch[2] || valueMatch[3] || '').replace(/,/g, '');
        value = parseInt(raw, 10) || null;
        // Handle "15k" style
        if (nearby.includes('k') && value && value < 1000) {
          value = value * 1000;
        }
      }
      reorders.push({ name: store.name, value });
    }
  }

  return reorders;
}

function parseCompetitorActivity(text: string): string {
  const lower = text.toLowerCase();
  const keywords = ['competitor', 'brand x', 'brand y', 'rival', 'competition', 'competing', 'scheme', 'display', 'offer', 'discount'];
  const hasCompetitor = keywords.some(kw => lower.includes(kw));
  if (!hasCompetitor) return '';

  // Try to extract the relevant sentence(s)
  const sentences = text.split(/[.!]\s+/);
  const relevant = sentences.filter(s => {
    const sl = s.toLowerCase();
    return keywords.some(kw => sl.includes(kw));
  });
  return relevant.join('. ').trim() || '';
}

function parseChallenges(text: string): string {
  const lower = text.toLowerCase();
  const keywords = ['challenge', 'issue', 'problem', 'difficulty', 'transport', 'delay', 'closed', 'closure', 'late', 'couldn\'t', 'unable'];
  const sentences = text.split(/[.!]\s+/);
  const relevant = sentences.filter(s => {
    const sl = s.toLowerCase();
    return keywords.some(kw => sl.includes(kw));
  });
  return relevant.join('. ').trim() || '';
}

function estimateEngagement(text: string, storesVisited: number, totalStores: number): number {
  let score = 3; // default

  // More stores visited = better engagement
  if (totalStores > 0) {
    const ratio = storesVisited / totalStores;
    if (ratio >= 0.9) score += 1;
    else if (ratio < 0.4) score -= 1;
  }

  // Detailed responses suggest engagement
  if (text.length > 500) score += 1;
  if (text.length < 100) score -= 1;

  return Math.max(1, Math.min(5, score));
}

export async function POST(req: Request) {
  const payload = await req.json();

  console.log('[Webhook] Raw Bolna payload:', JSON.stringify(payload, null, 2));

  // Only process when the call is fully completed (transcript + extraction ready)
  // Bolna sends webhooks for intermediate statuses: queued → in-progress → call-disconnected → completed
  const bolnaStatus = payload.status || '';
  if (bolnaStatus && bolnaStatus !== 'completed') {
    console.log(`[Webhook] Ignoring intermediate status: ${bolnaStatus}`);
    return NextResponse.json({ status: 'ignored', reason: `intermediate status: ${bolnaStatus}` });
  }

  const db = getDb();

  // 1. IDENTIFY THE CALL
  const executionId = payload.execution_id || payload.id || payload.call_id;
  if (!executionId) {
    console.error('[Webhook] No execution_id in payload');
    return NextResponse.json({ error: 'No execution_id found' }, { status: 400 });
  }

  const call = db.prepare(
    'SELECT * FROM calls WHERE bolna_execution_id = ?'
  ).get(executionId) as CallRecord | undefined;

  if (!call) {
    console.error('[Webhook] No call found for execution_id:', executionId);
    return NextResponse.json({ error: 'Call not found' }, { status: 404 });
  }

  // IDEMPOTENCY: Skip if already processed
  if (call.status === 'completed') {
    console.log(`[Webhook] Call ${call.id} already processed, skipping duplicate webhook`);
    return NextResponse.json({ status: 'already_processed', call_id: call.id });
  }

  const rep = db.prepare('SELECT * FROM reps WHERE id = ?').get(call.rep_id) as Rep;
  const stores = db.prepare('SELECT * FROM stores WHERE rep_id = ?').all(call.rep_id) as Store[];

  logStep(db, call.team_id, call.id, rep.name, 'info', 'Webhook received',
    `Call completed for ${rep.name} (execution: ${executionId})`);

  // 2. EXTRACT DATA — from Bolna structured fields OR by parsing summary/transcript
  const extraction = payload.extracted_data || payload.extraction || payload.analytics || {};
  const transcript = typeof payload.transcript === 'string' ? payload.transcript : JSON.stringify(payload.transcript || '');
  const summary = payload.summary || payload.call_summary || extraction.summary || '';

  // Combine summary + transcript for parsing
  const fullText = `${summary} ${transcript}`;

  // Parse stores visited from text
  const visitedStoreNames = parseStoresVisited(fullText, stores);
  const storesVisitedCount = parseInt(extraction.stores_visited_count || extraction.stores_visited || '0', 10) || visitedStoreNames.length;

  // Parse reorders from text
  const reorders = parseStoreReorders(fullText, stores);

  // Build store reports string
  let storeReports = extraction.store_reports || '';
  if (!storeReports && (visitedStoreNames.length > 0 || reorders.length > 0)) {
    const parts: string[] = [];
    for (const store of stores) {
      const visited = visitedStoreNames.includes(store.name);
      const reorder = reorders.find(r => r.name === store.name);
      if (visited || reorder) {
        let line = `${store.name}: Visited`;
        if (reorder) {
          line += `, reorder${reorder.value ? ` ₹${reorder.value.toLocaleString()}` : ''}`;
        }
        parts.push(line);
      }
    }
    storeReports = parts.join('. ');
  }
  if (typeof storeReports !== 'string') {
    storeReports = JSON.stringify(storeReports);
  }

  // Parse competitor activity
  const competitorActivity = extraction.competitor_activity || extraction.competitor_info || parseCompetitorActivity(fullText);

  // Parse challenges
  const challenges = extraction.challenges || extraction.issues || parseChallenges(fullText);

  // Estimate engagement
  const repEngagement = parseInt(extraction.rep_engagement || extraction.engagement_score || '0', 10) || estimateEngagement(fullText, storesVisitedCount, stores.length);

  const followUpNeeded = extraction.follow_up_needed || extraction.follow_up || '';

  logStep(db, call.team_id, call.id, rep.name, 'extraction', 'Data extracted from call',
    `Stores visited: ${storesVisitedCount} (${visitedStoreNames.join(', ') || 'none detected'}) | Engagement: ${repEngagement}/5 | Competitor info: ${competitorActivity || 'None'} | Challenges: ${challenges || 'None'}`);

  if (reorders.length > 0) {
    logStep(db, call.team_id, call.id, rep.name, 'extraction', 'Reorders detected',
      reorders.map(r => `${r.name}: ₹${r.value?.toLocaleString() || 'unknown'}`).join(' | '));
  }

  // 3. UPDATE CALL RECORD
  db.prepare(`
    UPDATE calls SET
      status = 'completed',
      call_summary = ?,
      transcript = ?,
      stores_visited_count = ?,
      store_reports = ?,
      competitor_activity = ?,
      challenges = ?,
      rep_engagement_score = ?,
      follow_up_needed = ?,
      raw_extraction = ?,
      completed_at = datetime('now')
    WHERE id = ?
  `).run(
    summary, transcript, storesVisitedCount, storeReports,
    competitorActivity, challenges, repEngagement, followUpNeeded,
    JSON.stringify(payload), call.id
  );

  logStep(db, call.team_id, call.id, rep.name, 'info', 'Call record updated',
    `Status → completed | Summary: ${summary.substring(0, 120) || '(none)'}${summary.length > 120 ? '...' : ''}`);

  // 4. STORE HEALTH LOGIC
  const reorderStoreNames = new Set(reorders.map(r => r.name.toLowerCase()));
  const visitedSet = new Set(visitedStoreNames.map(n => n.toLowerCase()));

  for (const store of stores) {
    const storeLower = store.name.toLowerCase();

    if (reorderStoreNames.has(storeLower)) {
      // Reorder detected — reset to healthy
      const reorder = reorders.find(r => r.name.toLowerCase() === storeLower);
      db.prepare(
        "UPDATE stores SET last_order_date = date('now'), last_order_value = ?, days_since_order = 0, flag = 'normal' WHERE id = ?"
      ).run(reorder?.value || null, store.id);
      logStep(db, call.team_id, call.id, rep.name, 'store_health', `${store.name}: Reorder detected`,
        `₹${reorder?.value?.toLocaleString() || 'unknown'} | days_since_order → 0 | flag → normal (was ${store.flag}, ${store.days_since_order} days)`);
    } else if (visitedSet.has(storeLower)) {
      // Visited but no reorder — don't increment, but don't reset either
      logStep(db, call.team_id, call.id, rep.name, 'store_health', `${store.name}: Visited, no reorder`,
        `flag: ${store.flag} | days_since_order: ${store.days_since_order} (unchanged)`);
    } else {
      // Not visited — increment days
      const newDays = store.days_since_order + 1;
      let newFlag = store.flag;

      if (newDays > 30) {
        newFlag = 'lost';
      } else if (newDays > 14 && store.flag === 'normal') {
        newFlag = 'at_risk';
      }

      db.prepare('UPDATE stores SET days_since_order = ?, flag = ? WHERE id = ?').run(newDays, newFlag, store.id);

      if (newFlag !== store.flag) {
        logStep(db, call.team_id, call.id, rep.name, 'store_health', `${store.name}: Flag changed`,
          `${store.flag} → ${newFlag} (${newDays} days since order)`);

        if (newFlag === 'at_risk') {
          db.prepare(
            'INSERT INTO alerts (id, team_id, type, severity, title, description, related_rep_id, related_store_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).run(uuid(), call.team_id, 'at_risk_store', 'medium',
            `${store.name} hasn't reordered in ${newDays} days`,
            `Rep ${rep.name} did not visit or report reorder.`,
            rep.id, store.id);
          logStep(db, call.team_id, call.id, rep.name, 'alert', 'Alert: At-risk store',
            `${store.name} — ${newDays} days without order`);
        } else if (newFlag === 'lost') {
          db.prepare(
            'INSERT INTO alerts (id, team_id, type, severity, title, description, related_rep_id, related_store_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
          ).run(uuid(), call.team_id, 'at_risk_store', 'high',
            `${store.name} — potential lost account (${newDays} days)`,
            `Rep ${rep.name} has not secured reorder. Immediate attention needed.`,
            rep.id, store.id);
          logStep(db, call.team_id, call.id, rep.name, 'alert', 'Alert: Lost store',
            `${store.name} — ${newDays} days, potential lost account`);
        }
      } else {
        logStep(db, call.team_id, call.id, rep.name, 'store_health', `${store.name}: Not visited`,
          `flag: ${newFlag} | days_since_order: ${store.days_since_order} → ${newDays}`);
      }
    }
  }

  // 5. REP SCORING
  const visitRatio = stores.length > 0 ? storesVisitedCount / stores.length : 0;
  const engagementNorm = repEngagement / 5;
  const orderRatio = storesVisitedCount > 0 ? reorders.length / storesVisitedCount : 0;

  const rawScore = ((visitRatio * 0.4) + (engagementNorm * 0.3) + (Math.min(orderRatio, 1) * 0.3)) * 5;
  const score = Math.round(rawScore * 10) / 10;

  const newTotalCalls = rep.total_calls + 1;
  const newPerformanceScore = rep.total_calls > 0
    ? Math.round(((rep.performance_score * rep.total_calls + score) / newTotalCalls) * 10) / 10
    : score;

  db.prepare('UPDATE reps SET performance_score = ?, total_calls = ? WHERE id = ?').run(
    newPerformanceScore, newTotalCalls, rep.id
  );

  logStep(db, call.team_id, call.id, rep.name, 'scoring', 'Performance score calculated',
    `Visit ratio: ${Math.round(visitRatio * 100)}% (w=0.4) | Engagement: ${repEngagement}/5 (w=0.3) | Order ratio: ${Math.round(orderRatio * 100)}% [${reorders.length}/${storesVisitedCount}] (w=0.3) → Call score: ${score}/5 | Rolling avg: ${rep.performance_score} → ${newPerformanceScore}`);

  if (score < 2.0) {
    db.prepare(
      'INSERT INTO alerts (id, team_id, type, severity, title, description, related_rep_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(uuid(), call.team_id, 'low_engagement', 'medium',
      `${rep.name} showing low engagement (score: ${score})`,
      `Latest call scored ${score}/5. Visit ratio: ${Math.round(visitRatio * 100)}%, engagement: ${repEngagement}/5`,
      rep.id);
    logStep(db, call.team_id, call.id, rep.name, 'alert', 'Alert: Low engagement',
      `Score ${score}/5 is below threshold of 2.0`);
  }

  // 6. COMPETITOR INTELLIGENCE
  if (
    competitorActivity &&
    competitorActivity.trim() !== '' &&
    !['none', 'no', 'n/a', 'nil'].includes(competitorActivity.toLowerCase().trim())
  ) {
    db.prepare(
      'INSERT INTO alerts (id, team_id, type, severity, title, description, related_rep_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(uuid(), call.team_id, 'competitor_threat', 'medium',
      `Competitor activity in ${rep.territory}`,
      competitorActivity, rep.id);
    logStep(db, call.team_id, call.id, rep.name, 'competitor', 'Competitor activity detected',
      `Territory: ${rep.territory} | Details: ${competitorActivity}`);
  }

  // 7. MISSED VISITS CHECK
  if (stores.length > 0 && storesVisitedCount < stores.length * 0.5) {
    db.prepare(
      'INSERT INTO alerts (id, team_id, type, severity, title, description, related_rep_id) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(uuid(), call.team_id, 'missed_visits', 'low',
      `${rep.name} visited only ${storesVisitedCount}/${stores.length} stores`,
      'More than 50% of assigned stores were not visited today.', rep.id);
    logStep(db, call.team_id, call.id, rep.name, 'alert', 'Alert: Missed visits',
      `${storesVisitedCount}/${stores.length} stores visited (< 50% threshold)`);
  }

  logStep(db, call.team_id, call.id, rep.name, 'info', 'Processing complete',
    `Final score: ${score}/5 | Stores visited: ${storesVisitedCount}/${stores.length} | Reorders: ${reorders.length} | Alerts generated | Store health updated`);

  console.log(`[Webhook] Processed call ${call.id} for rep ${rep.name}. Score: ${score}`);

  return NextResponse.json({ status: 'processed', call_id: call.id, score });
}
