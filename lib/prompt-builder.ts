import { getDb } from '@/lib/db';

export interface CallContext {
  rep_name: string;
  company_name: string;
  territory_name: string;
  store_list: string;
  last_call_context: string;
  priority_stores: string;
  follow_up_items: string;
  competitor_context: string;
  call_tone: string;
}

interface RepRow {
  id: string;
  name: string;
  phone: string;
  territory: string;
  performance_score: number;
  total_calls: number;
}

interface TeamRow {
  id: string;
  name: string;
  bolna_agent_id: string;
}

interface StoreRow {
  id: string;
  name: string;
  area: string;
  flag: string;
  days_since_order: number;
  last_order_date: string | null;
  last_order_value: number | null;
}

interface CallRow {
  id: string;
  call_summary: string | null;
  follow_up_needed: string | null;
  competitor_activity: string | null;
  challenges: string | null;
  store_reports: string | null;
  called_at: string | null;
}

interface AlertRow {
  id: string;
  type: string;
  title: string;
  description: string | null;
}

export function buildCallContext(repId: string, teamId: string): CallContext {
  const db = getDb();

  const rep = db.prepare('SELECT * FROM reps WHERE id = ?').get(repId) as RepRow;
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as TeamRow;
  const stores = db.prepare('SELECT * FROM stores WHERE rep_id = ?').all(repId) as StoreRow[];

  const lastCall = db.prepare(
    "SELECT call_summary FROM calls WHERE rep_id = ? AND status = 'completed' ORDER BY called_at DESC LIMIT 1"
  ).get(repId) as { call_summary: string | null } | undefined;

  const storeList = stores.map(s => s.name).join(', ');
  const lastCallContext = lastCall?.call_summary || 'This is the first check-in call';

  // (a) Priority stores
  const priorityStores = buildPriorityStores(stores);

  // (b) Follow-up items
  const followUpItems = buildFollowUpItems(repId);

  // (c) Competitor context
  const competitorContext = buildCompetitorContext(repId, teamId);

  // (d) Call tone
  const callTone = buildCallTone(rep);

  return {
    rep_name: rep.name,
    company_name: team.name,
    territory_name: rep.territory,
    store_list: storeList,
    last_call_context: lastCallContext,
    priority_stores: priorityStores,
    follow_up_items: followUpItems,
    competitor_context: competitorContext,
    call_tone: callTone,
  };
}

function buildPriorityStores(stores: StoreRow[]): string {
  const priority = stores.filter(
    s => s.flag === 'at_risk' || s.flag === 'lost' || s.days_since_order > 10
  );

  if (priority.length === 0) {
    return 'No stores require special attention today.';
  }

  const lines = priority.map(s => {
    if (s.flag === 'lost') {
      return `- ${s.name}: Has not reordered in ${s.days_since_order} days (LOST). Ask specifically why and if there's a way to re-engage.`;
    } else if (s.flag === 'at_risk') {
      return `- ${s.name}: Has not reordered in ${s.days_since_order} days. Ask specifically why and if there's an issue.`;
    } else {
      return `- ${s.name}: Approaching ${s.days_since_order} days without order. Check if they need anything.`;
    }
  });

  return `PRIORITY STORES TO ASK ABOUT SPECIFICALLY:\n${lines.join('\n')}`;
}

function buildFollowUpItems(repId: string): string {
  const db = getDb();
  const recentCalls = db.prepare(
    "SELECT * FROM calls WHERE rep_id = ? AND status = 'completed' ORDER BY called_at DESC LIMIT 2"
  ).all(repId) as CallRow[];

  if (recentCalls.length === 0) {
    return 'No specific follow-ups from previous calls.';
  }

  const items: string[] = [];

  for (const call of recentCalls) {
    const callDate = call.called_at
      ? new Date(call.called_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })
      : 'Unknown date';

    const followUp = call.follow_up_needed;
    if (followUp && followUp.toLowerCase() !== 'none' && followUp.toLowerCase() !== 'no' && followUp.trim() !== '') {
      items.push(`- Last call (${callDate}): ${followUp}`);
    }

    if (call.challenges && call.challenges.trim() !== '') {
      items.push(`- Last call (${callDate}): Rep faced: ${call.challenges}. Check if this is recurring.`);
    }
  }

  if (items.length === 0) {
    return 'No specific follow-ups from previous calls.';
  }

  return `FOLLOW UP FROM PREVIOUS CALLS:\n${items.join('\n')}`;
}

function buildCompetitorContext(repId: string, teamId: string): string {
  const db = getDb();
  const items: string[] = [];

  // Check recent team-wide competitor alerts (last 7 days)
  const competitorAlerts = db.prepare(
    "SELECT * FROM alerts WHERE team_id = ? AND type = 'competitor_threat' AND resolved = 0 AND created_at >= datetime('now', '-7 days')"
  ).all(teamId) as AlertRow[];

  for (const alert of competitorAlerts) {
    if (alert.description) {
      items.push(`- ${alert.description}`);
    } else {
      items.push(`- ${alert.title}`);
    }
  }

  // Check this rep's own recent calls for competitor activity
  const recentCallsWithCompetitor = db.prepare(
    "SELECT competitor_activity, called_at FROM calls WHERE rep_id = ? AND status = 'completed' AND competitor_activity IS NOT NULL AND competitor_activity != '' ORDER BY called_at DESC LIMIT 2"
  ).all(repId) as { competitor_activity: string; called_at: string }[];

  for (const call of recentCallsWithCompetitor) {
    const callDate = new Date(call.called_at).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
    items.push(`- This rep mentioned competitor activity (${callDate}): ${call.competitor_activity}`);
  }

  if (items.length === 0) {
    return 'No specific competitor activity to follow up on.';
  }

  return `COMPETITOR INTELLIGENCE TO PROBE:\n${items.join('\n')}`;
}

function buildCallTone(rep: RepRow): string {
  if (rep.total_calls === 0) {
    return 'TONE: This is the first call to this rep. Be extra friendly and explain that this is a quick daily check-in to help them.';
  }

  if (rep.performance_score > 3.5) {
    return 'TONE: This rep is performing well. Be encouraging and brief. Don\'t micromanage.';
  }

  if (rep.performance_score >= 2.0) {
    return 'TONE: This rep is average. Be supportive but thorough in your questions.';
  }

  return 'TONE: This rep has low engagement. Be extra warm and encouraging. Try to understand if they\'re facing issues. Don\'t be accusatory.';
}

export function buildSystemPrompt(context: CallContext): string {
  return `You are a friendly, efficient field operations assistant named Rakesh, calling on behalf of ${context.company_name}. You speak in a mix of English and Hindi (Hinglish) — warm but businesslike. Keep the conversation under 4 minutes.

You are calling ${context.rep_name}, a field sales representative covering ${context.territory_name}.
Today they were assigned to visit these stores: ${context.store_list}.

${context.call_tone}

${context.priority_stores}

${context.follow_up_items}

${context.competitor_context}

INSTRUCTIONS:
1. Greet them warmly.
2. Ask: How many stores did you visit today?
3. FOR PRIORITY STORES: Ask about these BY NAME first. Be specific about the issues mentioned above.
4. For other stores (max 2 more), ask briefly:
   a. Did they place a reorder? Roughly what value?
   b. Any stock-outs or complaints?
   c. Any competitor activity — new displays, offers, schemes?
5. If there are follow-up items above, ask about them naturally during the conversation.
6. Ask: Any challenges today — transport, store closures, anything?
7. Wrap up: Great, thanks. This is all logged. Have a good evening!

GUARDRAILS:
- If rep didn't visit stores, don't interrogate — just ask why and note it
- Keep each store discussion under 60 seconds
- If rep goes off-topic, gently redirect
- Never discuss other reps' performance
- If rep asks about targets/incentives, say that's best discussed with their ASM`;
}

/**
 * Returns the agent system prompt as a TEMPLATE with {variable} placeholders.
 * Set this on the Bolna agent once (via PATCH or at creation time).
 * Bolna substitutes the placeholders from user_data on each call.
 *
 * Approach A: Set this template on the agent → pass values via user_data → Bolna substitutes.
 * Approach B: Call buildSystemPrompt(context) per call → PATCH agent before each call.
 *
 * Approach A is preferred (concurrent-safe, no extra API call per call).
 */
export function getAgentPromptTemplate(): string {
  return `You are a friendly, efficient field operations assistant named Rakesh, calling on behalf of {company_name}. You speak in a mix of English and Hindi (Hinglish) — warm but businesslike. Keep the conversation under 4 minutes.

You are calling {rep_name}, a field sales representative covering {territory_name}.
Today they were assigned to visit these stores: {store_list}.

{call_tone}

{priority_stores}

{follow_up_items}

{competitor_context}

INSTRUCTIONS:
1. Greet them warmly.
2. Ask: How many stores did you visit today?
3. FOR PRIORITY STORES: Ask about these BY NAME first. Be specific about the issues mentioned above.
4. For other stores (max 2 more), ask briefly:
   a. Did they place a reorder? Roughly what value?
   b. Any stock-outs or complaints?
   c. Any competitor activity — new displays, offers, schemes?
5. If there are follow-up items above, ask about them naturally during the conversation.
6. Ask: Any challenges today — transport, store closures, anything?
7. Wrap up: Great, thanks. This is all logged. Have a good evening!

GUARDRAILS:
- If rep didn't visit stores, don't interrogate — just ask why and note it
- Keep each store discussion under 60 seconds
- If rep goes off-topic, gently redirect
- Never discuss other reps' performance
- If rep asks about targets/incentives, say that's best discussed with their ASM`;
}

export function buildUserData(context: CallContext): Record<string, string> {
  return {
    rep_name: context.rep_name,
    company_name: context.company_name,
    territory_name: context.territory_name,
    store_list: context.store_list,
    last_call_context: context.last_call_context,
    priority_stores: context.priority_stores,
    follow_up_items: context.follow_up_items,
    competitor_context: context.competitor_context,
    call_tone: context.call_tone,
  };
}
