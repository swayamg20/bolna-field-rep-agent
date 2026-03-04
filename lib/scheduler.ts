import { getDb } from '@/lib/db';

export interface CallQueueItem {
  rep_id: string;
  rep_name: string;
  phone: string;
  priority_score: number;
  priority_reasons: string[];
  suggested_time: string | null;
}

interface RepRow {
  id: string;
  name: string;
  phone: string;
  territory: string;
  performance_score: number;
  total_calls: number;
}

interface StoreFlag {
  flag: string;
  days_since_order: number;
}

interface LastCallRow {
  called_at: string;
  follow_up_needed: string | null;
  competitor_activity: string | null;
  challenges: string | null;
}

interface CompletedCallTime {
  called_at: string;
}

export function buildCallQueue(teamId: string): CallQueueItem[] {
  const db = getDb();
  const reps = db.prepare('SELECT * FROM reps WHERE team_id = ?').all(teamId) as RepRow[];

  const queue: CallQueueItem[] = [];

  for (const rep of reps) {
    let score = 0;
    const reasons: string[] = [];

    // (a) At-risk store urgency — max 40 points
    const storeFlags = db.prepare(
      "SELECT flag, days_since_order FROM stores WHERE rep_id = ?"
    ).all(rep.id) as StoreFlag[];

    const atRiskCount = storeFlags.filter(s => s.flag === 'at_risk' || s.flag === 'lost').length;
    if (atRiskCount >= 3) {
      score += 40;
    } else if (atRiskCount === 2) {
      score += 30;
    } else if (atRiskCount === 1) {
      score += 15;
    }

    if (atRiskCount > 0) {
      reasons.push(`${atRiskCount} store${atRiskCount > 1 ? 's' : ''} at risk of being lost`);
    }

    // Bonus: any store approaching 'lost' threshold (days_since_order > 25)
    const approachingLost = storeFlags.some(s => s.days_since_order > 25);
    if (approachingLost) {
      score += 10;
      reasons.push('Store approaching lost threshold (25+ days without order)');
    }

    // (b) Days since last call — max 30 points
    const lastCompletedCall = db.prepare(
      "SELECT called_at FROM calls WHERE rep_id = ? AND status = 'completed' ORDER BY called_at DESC LIMIT 1"
    ).get(rep.id) as { called_at: string } | undefined;

    if (!lastCompletedCall) {
      score += 30;
      reasons.push('Never called before');
    } else {
      const lastCallDate = new Date(lastCompletedCall.called_at);
      const now = new Date();
      const daysSince = Math.floor((now.getTime() - lastCallDate.getTime()) / (1000 * 60 * 60 * 24));

      if (daysSince >= 3) {
        score += 30;
        reasons.push(`Not called in ${daysSince} days`);
      } else if (daysSince === 2) {
        score += 20;
        reasons.push('Not called in 2 days');
      } else if (daysSince === 1) {
        score += 10;
        reasons.push('Last called yesterday');
      }
      // daysSince === 0 → 0 points
    }

    // (c) Previous call issues — max 20 points
    const lastCallDetails = db.prepare(
      "SELECT follow_up_needed, competitor_activity, challenges FROM calls WHERE rep_id = ? AND status = 'completed' ORDER BY called_at DESC LIMIT 1"
    ).get(rep.id) as LastCallRow | undefined;

    if (lastCallDetails) {
      let issuePoints = 0;

      const followUp = lastCallDetails.follow_up_needed;
      if (followUp && followUp.toLowerCase() !== 'none' && followUp.toLowerCase() !== 'no' && followUp.trim() !== '') {
        issuePoints += 10;
        reasons.push('Follow-up needed from last call');
      }

      if (lastCallDetails.competitor_activity && lastCallDetails.competitor_activity.trim() !== '') {
        issuePoints += 5;
        reasons.push('Competitor activity reported in territory');
      }

      if (lastCallDetails.challenges && lastCallDetails.challenges.trim() !== '') {
        issuePoints += 5;
        reasons.push('Challenges reported in last call');
      }

      score += Math.min(issuePoints, 20);
    }

    // (d) Low performance flag — max 10 points
    if (rep.performance_score < 2.0) {
      score += 10;
      reasons.push(`Low engagement score (${rep.performance_score.toFixed(1)}/5)`);
    } else if (rep.performance_score <= 3.0) {
      score += 5;
      reasons.push(`Average engagement score (${rep.performance_score.toFixed(1)}/5)`);
    }

    // Cap at 100
    score = Math.min(score, 100);

    // Best time estimation
    let suggestedTime: string | null = null;
    const completedCalls = db.prepare(
      "SELECT called_at FROM calls WHERE rep_id = ? AND status = 'completed'"
    ).all(rep.id) as CompletedCallTime[];

    if (completedCalls.length >= 3) {
      // Calculate most common hour (IST = UTC+5:30)
      const hourCounts: Record<number, number> = {};
      for (const call of completedCalls) {
        const utcDate = new Date(call.called_at);
        // Convert to IST
        const istHour = (utcDate.getUTCHours() + 5 + Math.floor((utcDate.getUTCMinutes() + 30) / 60)) % 24;
        hourCounts[istHour] = (hourCounts[istHour] || 0) + 1;
      }

      let bestHour = 19; // default 7 PM
      let maxCount = 0;
      for (const [hour, count] of Object.entries(hourCounts)) {
        if (count > maxCount) {
          maxCount = count;
          bestHour = parseInt(hour);
        }
      }

      const period = bestHour >= 12 ? 'PM' : 'AM';
      const displayHour = bestHour > 12 ? bestHour - 12 : bestHour === 0 ? 12 : bestHour;
      suggestedTime = `${displayHour}:00 ${period}`;
    }

    queue.push({
      rep_id: rep.id,
      rep_name: rep.name,
      phone: rep.phone,
      priority_score: score,
      priority_reasons: reasons,
      suggested_time: suggestedTime,
    });
  }

  // Sort by priority_score descending
  queue.sort((a, b) => b.priority_score - a.priority_score);

  return queue;
}
