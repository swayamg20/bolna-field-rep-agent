'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

interface Rep {
  id: string; name: string; phone: string; territory: string;
  performance_score: number; total_calls: number;
}
interface Store {
  id: string; name: string; area: string; flag: string;
  days_since_order: number; last_order_date: string | null; last_order_value: number | null;
}
interface Call {
  id: string; status: string; call_summary: string | null; transcript: string | null;
  stores_visited_count: number | null; store_reports: string | null;
  competitor_activity: string | null; challenges: string | null;
  rep_engagement_score: number | null; follow_up_needed: string | null;
  called_at: string | null; completed_at: string | null;
}
interface NextCallContext {
  priority_stores: string;
  follow_up_items: string;
  competitor_context: string;
  call_tone: string;
}

export default function RepDetail() {
  const params = useParams();
  const id = params.id as string;

  const [rep, setRep] = useState<Rep | null>(null);
  const [stores, setStores] = useState<Store[]>([]);
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCall, setExpandedCall] = useState<string | null>(null);
  const [calling, setCalling] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [nextContext, setNextContext] = useState<NextCallContext | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/reps/${id}`).then(r => r.json()),
      fetch(`/api/reps/${id}/next-context`).then(r => r.ok ? r.json() : null),
    ]).then(([repData, ctxData]) => {
      setRep(repData.rep);
      setStores(repData.stores);
      setCalls(repData.calls);
      if (ctxData?.context) setNextContext(ctxData.context);
    }).finally(() => setLoading(false));
  }, [id]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      Promise.all([
        fetch(`/api/reps/${id}`).then(r => r.json()),
        fetch(`/api/reps/${id}/next-context`).then(r => r.ok ? r.json() : null),
      ]).then(([repData, ctxData]) => {
        setRep(repData.rep);
        setStores(repData.stores);
        setCalls(repData.calls);
        if (ctxData?.context) setNextContext(ctxData.context);
      });
    }, 10000);
    return () => clearInterval(interval);
  }, [id]);

  const handleCall = async () => {
    setCalling(true);
    try {
      const res = await fetch('/api/calls/trigger', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rep_id: id }),
      });
      if (res.ok) {
        setToast('Call triggered');
        setTimeout(() => setToast(null), 4000);
        // Refresh data
        const data = await fetch(`/api/reps/${id}`).then(r => r.json());
        setRep(data.rep);
        setStores(data.stores);
        setCalls(data.calls);
      } else {
        const err = await res.json();
        setToast(`Error: ${err.error}`);
        setTimeout(() => setToast(null), 4000);
      }
    } finally {
      setCalling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (!rep) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-600">Rep not found</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {toast && (
        <div className="fixed top-4 right-4 z-50 bg-gray-900 text-white px-4 py-2 rounded-lg shadow-lg">
          {toast}
        </div>
      )}

      <header className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700 mb-2 inline-block">
            &larr; Back to Dashboard
          </Link>
          <div className="flex items-center justify-between mt-2">
            <div>
              <h1 className="text-xl font-bold">{rep.name}</h1>
              <p className="text-sm text-gray-500">{rep.territory} &middot; {rep.phone}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-2xl font-bold">{rep.performance_score.toFixed(1)}<span className="text-sm text-gray-400">/5</span></p>
                <p className="text-xs text-gray-500">{rep.total_calls} calls</p>
              </div>
              <button
                onClick={handleCall}
                disabled={calling}
                className="px-4 py-2 bg-gray-900 text-white text-sm rounded-lg hover:bg-gray-800 disabled:opacity-50 transition"
              >
                {calling ? 'Calling...' : 'Call Now'}
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Stores */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Assigned Stores</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <div
                key={store.id}
                className={`bg-white rounded-lg border p-4 ${
                  store.flag === 'lost'
                    ? 'border-red-200'
                    : store.flag === 'at_risk'
                    ? 'border-orange-200'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-medium">{store.name}</p>
                  <FlagBadge flag={store.flag} />
                </div>
                <p className="text-xs text-gray-500">{store.area}</p>
                <div className="mt-2 text-xs text-gray-500">
                  {store.last_order_date ? (
                    <p>Last order: {store.last_order_date}{store.last_order_value ? ` (Rs ${store.last_order_value})` : ''}</p>
                  ) : (
                    <p>No orders recorded</p>
                  )}
                  <p>{store.days_since_order} days since last order</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Next Call Context */}
        {nextContext && (
          <section>
            <h2 className="text-lg font-semibold mb-3">Next Call Context (Preview)</h2>
            <div className="bg-white rounded-lg border border-gray-200 p-4 space-y-4">
              <ContextBlock
                label="Priority Stores"
                content={nextContext.priority_stores}
                defaultText="No stores require special attention today."
                color="text-red-700"
                bg="bg-red-50"
              />
              <ContextBlock
                label="Follow-ups"
                content={nextContext.follow_up_items}
                defaultText="No specific follow-ups from previous calls."
                color="text-orange-700"
                bg="bg-orange-50"
              />
              <ContextBlock
                label="Competitor Intel"
                content={nextContext.competitor_context}
                defaultText="No specific competitor activity to follow up on."
                color="text-purple-700"
                bg="bg-purple-50"
              />
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs font-medium text-gray-500 uppercase mb-1">Call Tone</p>
                <p className="text-sm text-gray-700">{nextContext.call_tone}</p>
              </div>
            </div>
          </section>
        )}

        {/* Call History */}
        <section>
          <h2 className="text-lg font-semibold mb-3">Call History</h2>
          {calls.length === 0 ? (
            <p className="text-sm text-gray-500">No calls yet</p>
          ) : (
            <div className="space-y-3">
              {calls.map((call) => (
                <div key={call.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50"
                    onClick={() => setExpandedCall(expandedCall === call.id ? null : call.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full ${
                          call.status === 'completed' ? 'bg-green-500' :
                          call.status === 'calling' ? 'bg-blue-500' :
                          call.status === 'failed' ? 'bg-red-500' : 'bg-gray-400'
                        }`} />
                        <div>
                          <p className="text-sm font-medium">
                            {call.called_at ? new Date(call.called_at).toLocaleDateString('en-IN', {
                              weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
                              hour: '2-digit', minute: '2-digit'
                            }) : 'Pending'}
                          </p>
                          {call.status === 'completed' && (
                            <p className="text-xs text-gray-500">
                              Score: {call.rep_engagement_score}/5 &middot; Stores visited: {call.stores_visited_count}/{stores.length}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-xs text-gray-400">{expandedCall === call.id ? '▲' : '▼'}</span>
                    </div>
                    {call.call_summary && (
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{call.call_summary}</p>
                    )}
                  </div>

                  {expandedCall === call.id && call.status === 'completed' && (
                    <div className="border-t border-gray-100 p-4 space-y-3 bg-gray-50">
                      {call.store_reports && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Store Reports</p>
                          <p className="text-sm text-gray-700">{call.store_reports}</p>
                        </div>
                      )}
                      {call.competitor_activity && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Competitor Activity</p>
                          <p className="text-sm text-gray-700">{call.competitor_activity}</p>
                        </div>
                      )}
                      {call.challenges && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Challenges</p>
                          <p className="text-sm text-gray-700">{call.challenges}</p>
                        </div>
                      )}
                      {call.follow_up_needed && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Follow-up Needed</p>
                          <p className="text-sm text-gray-700">{call.follow_up_needed}</p>
                        </div>
                      )}
                      {call.transcript && (
                        <div>
                          <p className="text-xs font-medium text-gray-500 uppercase mb-1">Transcript</p>
                          <pre className="text-xs text-gray-600 whitespace-pre-wrap bg-white rounded p-3 border border-gray-200 max-h-64 overflow-y-auto">
                            {call.transcript}
                          </pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

function ContextBlock({ label, content, defaultText, color, bg }: {
  label: string; content: string; defaultText: string; color: string; bg: string;
}) {
  const isDefault = content === defaultText;
  const lines = content.split('\n').filter(l => l.trim());
  const header = lines[0];
  const items = lines.slice(1);

  return (
    <div>
      <p className="text-xs font-medium text-gray-500 uppercase mb-1">{label}</p>
      {isDefault ? (
        <p className="text-sm text-gray-400">{content}</p>
      ) : (
        <div className={`rounded-lg ${bg} p-3`}>
          {items.length > 0 ? (
            <ul className="space-y-1">
              {items.map((item, i) => (
                <li key={i} className={`text-sm ${color}`}>{item.replace(/^- /, '')}</li>
              ))}
            </ul>
          ) : (
            <p className={`text-sm ${color}`}>{header}</p>
          )}
        </div>
      )}
    </div>
  );
}

function FlagBadge({ flag }: { flag: string }) {
  if (flag === 'normal') return <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">Normal</span>;
  if (flag === 'at_risk') return <span className="text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700">At Risk</span>;
  if (flag === 'lost') return <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700">Lost</span>;
  return null;
}
