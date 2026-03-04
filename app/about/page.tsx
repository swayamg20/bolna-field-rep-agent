'use client';

import Link from 'next/link';

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">FieldPulse</h1>
          <Link
            href="/"
            className="text-sm px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            Open Dashboard
          </Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-12 space-y-16">
        {/* Problem */}
        <section className="max-w-3xl">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">The Problem</p>
          <h2 className="text-3xl font-bold mb-4">
            Field sales teams are a black box after 6 PM
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed">
            FMCG companies deploy hundreds of field reps daily to visit retail stores.
            Area managers have <strong>zero real-time visibility</strong> into what happened —
            which stores were visited, what orders were placed, what competitors are doing.
            Reps fill forms at the end of the day (if at all), data is incomplete, and
            by the time insights reach managers, it&apos;s too late to act.
          </p>
        </section>

        {/* Solution */}
        <section className="max-w-3xl">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">The Solution</p>
          <h2 className="text-3xl font-bold mb-4">
            Voice AI that calls reps, extracts data, and flags issues — automatically
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-6">
            FieldPulse uses <strong>Bolna Voice AI</strong> to make automated end-of-day phone calls
            to field reps. A conversational AI agent asks about store visits, reorders,
            competitor activity, and challenges — in natural Hinglish. The call data flows
            into a backend that scores performance, flags at-risk stores, and surfaces
            competitor intelligence in real-time.
          </p>
        </section>

        {/* Flow */}
        <section>
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">How It Works</p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                title: 'Trigger',
                desc: 'Area manager clicks "Call All Reps" on the dashboard at end of day.',
              },
              {
                step: '2',
                title: 'AI Calls',
                desc: 'Bolna voice agent calls each rep, asks about store visits, orders, and competitor activity in Hinglish.',
              },
              {
                step: '3',
                title: 'Process',
                desc: 'Webhook receives call data. Backend scores reps, flags at-risk stores, and generates alerts.',
              },
              {
                step: '4',
                title: 'Act',
                desc: 'Dashboard updates with performance scores, store health, competitor intel, and actionable alerts.',
              },
            ].map((item) => (
              <div key={item.step} className="border border-gray-200 rounded-lg p-5">
                <div className="w-8 h-8 rounded-full bg-gray-900 text-white flex items-center justify-center text-sm font-bold mb-3">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-1">{item.title}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Outcome Metrics */}
        <section>
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">Outcome Metrics</p>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              { metric: 'Rep Performance Score', desc: 'Composite score (0-5) based on visit ratio, engagement, and order conversion — tracked per call, rolling average.' },
              { metric: 'Store Health Flags', desc: 'Automatic detection: Normal → At Risk (14+ days no order) → Lost (30+ days). Real-time alerts for each transition.' },
              { metric: 'Competitor Intelligence', desc: 'Every mention of competitor activity is captured, tagged by territory, and surfaced as an actionable alert.' },
            ].map((item) => (
              <div key={item.metric} className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold mb-2">{item.metric}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Tech Stack */}
        <section className="max-w-3xl">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Tech Stack</p>
          <div className="flex flex-wrap gap-2">
            {['Next.js 14', 'TypeScript', 'Tailwind CSS', 'better-sqlite3', 'Bolna Voice AI', 'ElevenLabs TTS', 'Deepgram STT', 'GPT-4.1-mini'].map((tech) => (
              <span key={tech} className="text-sm px-3 py-1 bg-gray-100 rounded-full text-gray-700">
                {tech}
              </span>
            ))}
          </div>
        </section>

        {/* Architecture */}
        <section className="max-w-3xl">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-4">Architecture</p>
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 font-mono text-sm text-gray-700 leading-loose">
            <pre>{`Area Manager (Dashboard)
    │
    ├── Click "Call Rep" ──→ POST /api/calls/trigger
    │                            │
    │                            ├── Fetches rep info, stores, last call context
    │                            └── Bolna API: makeCall(agent_id, phone, user_data)
    │                                     │
    │                                     ▼
    │                              Bolna Voice Agent
    │                              (ElevenLabs + Deepgram + GPT-4.1-mini)
    │                                     │
    │                                     ▼
    │                              Phone Call to Rep
    │                              "Hi Rahul! Quick check-in..."
    │                                     │
    │                                     ▼
    │                              POST /api/webhook/bolna
    │                                     │
    │                                     ├── Extract: stores visited, orders, competitors
    │                                     ├── Score rep performance (0-5)
    │                                     ├── Flag store health (normal/at_risk/lost)
    │                                     ├── Generate alerts (competitor, missed visits)
    │                                     └── Update database
    │
    └── Dashboard auto-refreshes (10s polling)
         ├── Stats cards
         ├── Active alerts (severity-coded)
         ├── Rep table with scores
         └── Recent call feed`}</pre>
          </div>
        </section>

        <div className="text-center pb-8">
          <Link
            href="/"
            className="inline-block px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            Open Dashboard
          </Link>
        </div>
      </main>
    </div>
  );
}
