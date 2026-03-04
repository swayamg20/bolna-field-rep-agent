'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';

interface Team { id: string; name: string; bolna_agent_id: string }
interface Rep {
  id: string; name: string; phone: string; territory: string;
  performance_score: number; total_calls: number; store_count: number; flagged_stores: number;
}
interface Alert {
  id: string; type: string; severity: string; title: string;
  description: string; rep_name: string; store_name: string; created_at: string;
}
interface Call {
  id: string; rep_name: string; status: string; called_at: string;
  stores_visited_count: number; rep_engagement_score: number;
}
interface Stats {
  total_calls_today: number; avg_engagement: number | null;
  stores_at_risk: number; competitor_alerts_today: number; reps_called_today: number;
}
interface OutcomeMetrics {
  total_stores: number;
  stores_by_flag: Record<string, number>;
  reorders_today: number;
  avg_team_score: number | null;
  active_alerts: number;
  alerts_by_type: Record<string, number>;
}
interface LogEntry {
  id: string; rep_name: string; category: string; action: string; detail: string; created_at: string;
}
interface DashboardData {
  team: Team; reps: Rep[]; alerts: Alert[];
  recentCalls: Call[]; stats: Stats;
  outcomeMetrics: OutcomeMetrics;
  processingLogs: LogEntry[];
}

const CATEGORY_COLORS: Record<string, string> = {
  info: 'bg-gray-100 text-gray-700',
  extraction: 'bg-blue-100 text-blue-700',
  scoring: 'bg-purple-100 text-purple-700',
  store_health: 'bg-emerald-100 text-emerald-700',
  alert: 'bg-orange-100 text-orange-700',
  competitor: 'bg-red-100 text-red-700',
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [teamId, setTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [callingRep, setCallingRep] = useState<string | null>(null);
  const [callingAll, setCallingAll] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchDashboard = useCallback(async (tid: string) => {
    try {
      const res = await fetch(`/api/dashboard/${tid}`);
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (err) {
      console.error('Dashboard fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const res = await fetch('/api/teams');
      const { teams } = await res.json();
      if (teams && teams.length > 0) {
        setTeamId(teams[0].id);
        fetchDashboard(teams[0].id);
      } else {
        setLoading(false);
      }
    }
    init();
  }, [fetchDashboard]);

  useEffect(() => {
    if (!teamId) return;
    const interval = setInterval(() => fetchDashboard(teamId), 10000);
    return () => clearInterval(interval);
  }, [teamId, fetchDashboard]);

  const handleSeed = async () => {
    setLoading(true);
    const res = await fetch('/api/seed', { method: 'POST' });
    const { team_id } = await res.json();
    setTeamId(team_id);
    await fetchDashboard(team_id);
    showToast('Demo data seeded successfully');
  };

  const handleCallRep = async (repId: string) => {
    setCallingRep(repId);
    try {
      const res = await fetch('/api/calls/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rep_id: repId }),
      });
      if (res.ok) {
        showToast('Call triggered successfully');
        if (teamId) fetchDashboard(teamId);
      } else {
        const err = await res.json();
        showToast(`Error: ${err.error}`);
      }
    } catch {
      showToast('Failed to trigger call');
    } finally {
      setCallingRep(null);
    }
  };

  const handleCallAll = async () => {
    if (!teamId) return;
    setCallingAll(true);
    try {
      const res = await fetch('/api/calls/trigger-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ team_id: teamId }),
      });
      if (res.ok) {
        const { triggered } = await res.json();
        showToast(`${triggered} calls triggered`);
        fetchDashboard(teamId);
      } else {
        showToast('Failed to trigger calls');
      }
    } catch {
      showToast('Failed to trigger calls');
    } finally {
      setCallingAll(false);
    }
  };

  const handleResolveAlert = async (alertId: string) => {
    await fetch(`/api/alerts/${alertId}/resolve`, { method: 'PATCH' });
    if (teamId) fetchDashboard(teamId);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">FieldPulse</h1>
          <p className="text-gray-600 mb-6">No team data found. Seed demo data to get started.</p>
          <button
            onClick={handleSeed}
            className="bg-gray-900 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition"
          >
            Seed Demo Data
          </button>
        </div>
      </div>
    );
  }

  const { team, reps, alerts, recentCalls, stats, outcomeMetrics, processingLogs } = data;
  const om = outcomeMetrics;

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold">FieldPulse</h1>
            <p className="text-sm text-gray-500">{team.name}</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/about"
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              About
            </Link>
            <button
              onClick={handleSeed}
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Reset Data
            </button>
            <Link
              href="/settings"
              className="text-sm px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              Settings
            </Link>
            <button
              onClick={handleCallAll}
              disabled={callingAll}
              className="text-sm px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 transition"
            >
              {callingAll ? 'Calling...' : 'Call All Reps'}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Calls Today" value={stats.total_calls_today} />
          <StatCard label="Avg Engagement" value={stats.avg_engagement !== null ? `${stats.avg_engagement}/5` : '—'} />
          <StatCard label="Stores At Risk" value={stats.stores_at_risk} highlight={stats.stores_at_risk > 0} />
          <StatCard label="Competitor Alerts" value={stats.competitor_alerts_today} />
        </div>

        {/* Outcome Metrics */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Outcome Metrics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <MetricCard label="Team Avg Score" value={om.avg_team_score !== null ? `${om.avg_team_score}/5` : '—'} />
            <MetricCard label="Total Stores" value={om.total_stores} />
            <MetricCard
              label="Healthy Stores"
              value={om.stores_by_flag?.normal || 0}
              sub={`of ${om.total_stores}`}
              color="text-green-600"
            />
            <MetricCard
              label="At Risk"
              value={om.stores_by_flag?.at_risk || 0}
              color="text-orange-600"
            />
            <MetricCard
              label="Lost Stores"
              value={om.stores_by_flag?.lost || 0}
              color="text-red-600"
            />
            <MetricCard label="Reorders Today" value={om.reorders_today} color="text-green-600" />
          </div>
          {/* Alert breakdown */}
          {om.active_alerts > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {Object.entries(om.alerts_by_type).map(([type, count]) => (
                <span key={type} className="text-xs px-2 py-1 bg-gray-100 rounded-full text-gray-600">
                  {type.replace(/_/g, ' ')}: {count}
                </span>
              ))}
            </div>
          )}
        </section>

        {/* Alerts */}
        {alerts.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Active Alerts</h2>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    alert.severity === 'high'
                      ? 'bg-red-50 border-red-200'
                      : alert.severity === 'medium'
                      ? 'bg-orange-50 border-orange-200'
                      : 'bg-yellow-50 border-yellow-200'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`w-2 h-2 rounded-full flex-shrink-0 ${
                        alert.severity === 'high'
                          ? 'bg-red-500'
                          : alert.severity === 'medium'
                          ? 'bg-orange-500'
                          : 'bg-yellow-500'
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium">{alert.title}</p>
                      {alert.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{alert.description}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => handleResolveAlert(alert.id)}
                    className="text-xs px-3 py-1 border border-gray-300 rounded hover:bg-white transition flex-shrink-0"
                  >
                    Resolve
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Field Reps */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Field Reps</h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Name</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Territory</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Score</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Calls</th>
                  <th className="text-left text-xs font-medium text-gray-500 uppercase px-4 py-3">Stores</th>
                  <th className="text-right text-xs font-medium text-gray-500 uppercase px-4 py-3">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {reps.map((rep) => (
                  <tr key={rep.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <Link href={`/reps/${rep.id}`} className="text-sm font-medium text-blue-600 hover:underline">
                        {rep.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rep.territory}</td>
                    <td className="px-4 py-3">
                      <ScoreBar score={rep.performance_score} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{rep.total_calls}</td>
                    <td className="px-4 py-3 text-sm">
                      <span className="text-gray-600">{rep.store_count}</span>
                      {rep.flagged_stores > 0 && (
                        <span className="ml-1 text-red-500 text-xs">({rep.flagged_stores} flagged)</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleCallRep(rep.id)}
                        disabled={callingRep === rep.id}
                        className="text-xs px-3 py-1.5 bg-gray-900 text-white rounded hover:bg-gray-800 disabled:opacity-50 transition"
                      >
                        {callingRep === rep.id ? 'Calling...' : 'Call'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent Calls */}
        {recentCalls.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Recent Calls</h2>
            <div className="space-y-2">
              {recentCalls.map((call) => (
                <div key={call.id} className="bg-white rounded-lg border border-gray-200 p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{call.rep_name}</p>
                    <p className="text-xs text-gray-500">
                      {call.called_at ? new Date(call.called_at).toLocaleString() : '—'}
                    </p>
                  </div>
                  <div className="flex items-center gap-4 text-sm">
                    {call.status === 'completed' && (
                      <>
                        <span className="text-gray-500">{call.stores_visited_count} stores</span>
                        <span className="text-gray-500">Score: {call.rep_engagement_score}/5</span>
                      </>
                    )}
                    <StatusBadge status={call.status} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Backend Processing Logs */}
        {processingLogs && processingLogs.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Backend Processing Log</h2>
            <div className="bg-gray-900 rounded-lg overflow-hidden">
              <div className="p-3 border-b border-gray-700 flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="w-3 h-3 rounded-full bg-yellow-500"></span>
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-xs text-gray-400 ml-2">webhook processing pipeline</span>
              </div>
              <div className="p-4 max-h-96 overflow-y-auto font-mono text-xs space-y-1.5">
                {processingLogs.map((log) => (
                  <div key={log.id} className="flex gap-2">
                    <span className="text-gray-500 flex-shrink-0 w-20">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium flex-shrink-0 ${CATEGORY_COLORS[log.category] || CATEGORY_COLORS.info}`}>
                      {log.category}
                    </span>
                    <span className="text-green-400 flex-shrink-0">{log.rep_name}:</span>
                    <span className="text-gray-300">
                      <span className="text-white">{log.action}</span>
                      {log.detail && <span className="text-gray-400"> — {log.detail}</span>}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, highlight }: { label: string; value: string | number; highlight?: boolean }) {
  return (
    <div className={`bg-white rounded-lg border p-4 ${highlight ? 'border-red-200' : 'border-gray-200'}`}>
      <p className="text-xs text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-2xl font-bold mt-1 ${highlight ? 'text-red-600' : ''}`}>{value}</p>
    </div>
  );
}

function MetricCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-3">
      <p className="text-[11px] text-gray-500 uppercase tracking-wide">{label}</p>
      <p className={`text-xl font-bold mt-0.5 ${color || ''}`}>
        {value}
        {sub && <span className="text-xs text-gray-400 font-normal ml-1">{sub}</span>}
      </p>
    </div>
  );
}

function ScoreBar({ score }: { score: number }) {
  const pct = (score / 5) * 100;
  const color = score > 3.5 ? 'bg-green-500' : score > 2.5 ? 'bg-yellow-500' : 'bg-red-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-gray-600">{score.toFixed(1)}</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    completed: 'bg-green-100 text-green-700',
    calling: 'bg-blue-100 text-blue-700',
    pending: 'bg-gray-100 text-gray-600',
    failed: 'bg-red-100 text-red-700',
  };
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full ${styles[status] || styles.pending}`}>
      {status}
    </span>
  );
}
