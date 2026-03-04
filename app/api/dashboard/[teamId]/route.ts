import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

interface Params {
  params: { teamId: string };
}

export async function GET(_req: Request, { params }: Params) {
  const { teamId } = params;
  const db = getDb();

  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId);
  if (!team) {
    return NextResponse.json({ error: 'Team not found' }, { status: 404 });
  }

  const reps = db.prepare(`
    SELECT r.*,
      (SELECT COUNT(*) FROM stores WHERE rep_id = r.id) as store_count,
      (SELECT COUNT(*) FROM stores WHERE rep_id = r.id AND flag != 'normal') as flagged_stores
    FROM reps r
    WHERE r.team_id = ?
    ORDER BY r.name
  `).all(teamId);

  const alerts = db.prepare(`
    SELECT a.*,
      (SELECT name FROM reps WHERE id = a.related_rep_id) as rep_name,
      (SELECT name FROM stores WHERE id = a.related_store_id) as store_name
    FROM alerts a
    WHERE a.team_id = ? AND a.resolved = 0
    ORDER BY
      CASE a.severity WHEN 'high' THEN 1 WHEN 'medium' THEN 2 WHEN 'low' THEN 3 END,
      a.created_at DESC
  `).all(teamId);

  const today = new Date().toISOString().split('T')[0];

  const totalCallsToday = db.prepare(
    "SELECT COUNT(*) as count FROM calls WHERE team_id = ? AND date(called_at) = ?"
  ).get(teamId, today) as { count: number };

  const avgEngagement = db.prepare(
    "SELECT AVG(rep_engagement_score) as avg FROM calls WHERE team_id = ? AND date(called_at) = ? AND status = 'completed'"
  ).get(teamId, today) as { avg: number | null };

  const storesAtRisk = db.prepare(
    "SELECT COUNT(*) as count FROM stores WHERE team_id = ? AND flag IN ('at_risk', 'lost')"
  ).get(teamId) as { count: number };

  const competitorAlertsToday = db.prepare(
    "SELECT COUNT(*) as count FROM alerts WHERE team_id = ? AND type = 'competitor_threat' AND date(created_at) = ?"
  ).get(teamId, today) as { count: number };

  const repsCalledToday = db.prepare(
    "SELECT COUNT(DISTINCT rep_id) as count FROM calls WHERE team_id = ? AND date(called_at) = ?"
  ).get(teamId, today) as { count: number };

  const recentCalls = db.prepare(`
    SELECT c.*, r.name as rep_name
    FROM calls c
    JOIN reps r ON r.id = c.rep_id
    WHERE c.team_id = ?
    ORDER BY c.called_at DESC
    LIMIT 10
  `).all(teamId);

  const processingLogs = db.prepare(`
    SELECT * FROM processing_logs
    WHERE team_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(teamId);

  // Outcome metrics
  const totalStores = db.prepare(
    'SELECT COUNT(*) as count FROM stores WHERE team_id = ?'
  ).get(teamId) as { count: number };

  const storesByFlag = db.prepare(`
    SELECT flag, COUNT(*) as count FROM stores WHERE team_id = ? GROUP BY flag
  `).all(teamId) as { flag: string; count: number }[];

  const totalReorders = db.prepare(
    "SELECT COUNT(*) as count FROM stores WHERE team_id = ? AND date(last_order_date) = ?"
  ).get(teamId, today) as { count: number };

  const avgScore = db.prepare(
    'SELECT AVG(performance_score) as avg FROM reps WHERE team_id = ?'
  ).get(teamId) as { avg: number | null };

  const totalAlerts = db.prepare(
    'SELECT COUNT(*) as count FROM alerts WHERE team_id = ? AND resolved = 0'
  ).get(teamId) as { count: number };

  const alertsByType = db.prepare(
    'SELECT type, COUNT(*) as count FROM alerts WHERE team_id = ? AND resolved = 0 GROUP BY type'
  ).all(teamId) as { type: string; count: number }[];

  return NextResponse.json({
    team,
    reps,
    alerts,
    recentCalls,
    processingLogs,
    stats: {
      total_calls_today: totalCallsToday.count,
      avg_engagement: avgEngagement.avg ? Math.round(avgEngagement.avg * 10) / 10 : null,
      stores_at_risk: storesAtRisk.count,
      competitor_alerts_today: competitorAlertsToday.count,
      reps_called_today: repsCalledToday.count,
    },
    outcomeMetrics: {
      total_stores: totalStores.count,
      stores_by_flag: Object.fromEntries(storesByFlag.map(r => [r.flag, r.count])),
      reorders_today: totalReorders.count,
      avg_team_score: avgScore.avg ? Math.round(avgScore.avg * 10) / 10 : null,
      active_alerts: totalAlerts.count,
      alerts_by_type: Object.fromEntries(alertsByType.map(r => [r.type, r.count])),
    },
  });
}
