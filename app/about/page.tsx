'use client';

import Link from 'next/link';

export default function About() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <header className="border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-6 py-6 flex items-center justify-between">
          <h1 className="text-xl font-bold">BOLNA ASSIGNMENT</h1>
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
            This agent uses <strong>Bolna Voice AI</strong> to make automated end-of-day phone calls
            to field reps. A conversational AI agent asks about store visits, reorders,
            competitor activity, and challenges — in natural Hinglish. The call data flows
            into a backend that scores performance, flags at-risk stores, and surfaces
            competitor intelligence in real-time.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            The <strong>Smart Scheduling Engine</strong> automatically prioritizes which reps to call first
            based on at-risk stores, days since last contact, unresolved follow-ups, and performance scores.
            The <strong>Dynamic Prompt Builder</strong> constructs a unique, context-aware conversation script
            for each call — so the AI agent asks about specific stores by name, follows up on
            previous issues, and probes on competitor activity reported across the territory.
          </p>
        </section>

        {/* Flow */}
        <section>
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-6">How It Works</p>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              {
                step: '1',
                title: 'Prioritize',
                desc: 'Smart Scheduling Engine scores every rep (0-100) based on at-risk stores, days since last call, pending follow-ups, and performance — then builds a priority queue.',
              },
              {
                step: '2',
                title: 'Contextualize',
                desc: 'Dynamic Prompt Builder generates a unique call script per rep — priority stores by name, unresolved issues from past calls, competitor intel to probe, and adaptive tone.',
              },
              {
                step: '3',
                title: 'AI Calls',
                desc: 'Bolna voice agent calls each rep in priority order with their personalized context, asking about specific stores, follow-ups, and competitor activity in Hinglish.',
              },
              {
                step: '4',
                title: 'Process & Act',
                desc: 'Webhook extracts data, scores performance, flags store health, generates alerts. Dashboard updates in real-time with actionable insights.',
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
              { metric: 'Smart Priority Score', desc: 'Each rep scored 0-100 based on at-risk stores (40pts), recency of last call (30pts), unresolved follow-ups (20pts), and engagement level (10pts).' },
              { metric: 'Dynamic Call Context', desc: 'Every call gets a unique prompt — priority stores mentioned by name, follow-up items from past calls, competitor intel to probe, and tone adapted to rep performance.' },
              { metric: 'Best Time Estimation', desc: 'Analyzes historical call pickup patterns to suggest the optimal time (IST) to reach each rep, based on 3+ completed calls.' },
            ].map((item) => (
              <div key={item.metric} className="border border-gray-200 rounded-lg p-5">
                <h3 className="font-semibold mb-2">{item.metric}</h3>
                <p className="text-sm text-gray-600">{item.desc}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Dynamic Prompt Mechanism */}
        <section className="max-w-3xl">
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wide mb-2">How Dynamic Prompts Work</p>
          <h2 className="text-2xl font-bold mb-4">
            One agent template, unique context per call
          </h2>
          <p className="text-lg text-gray-600 leading-relaxed mb-4">
            The Bolna voice agent has a single system prompt with <strong>{'{variable}'}</strong> placeholders
            like <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">{'{priority_stores}'}</code>,
            <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">{'{follow_up_items}'}</code>,
            <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">{'{competitor_context}'}</code>, and
            <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">{'{call_tone}'}</code>.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed mb-4">
            On each call, the backend passes real values via <code className="text-sm bg-gray-100 px-1.5 py-0.5 rounded">user_data</code>.
            Bolna substitutes the placeholders before the LLM sees the prompt — so every call gets a unique,
            context-aware conversation without needing to update the agent between calls.
          </p>
          <p className="text-lg text-gray-600 leading-relaxed">
            This is <strong>concurrent-safe</strong>: three simultaneous calls to three different reps each get
            their own context through variable substitution, not by rewriting the agent prompt.
            The template is set once — automatically on seed, or manually from Settings.
          </p>
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
          <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 font-mono text-sm text-gray-700 leading-loose overflow-x-auto">
            <pre>{`One-time Setup
    │
    ├── POST /api/agent/setup-prompt (or auto on seed)
    │     └── PATCH Bolna agent with {variable} template prompt
    │           {rep_name}, {priority_stores}, {follow_up_items},
    │           {competitor_context}, {call_tone}, {store_list}...
    │
Area Manager (Dashboard)
    │
    ├── "Start Smart Calls" ──→ POST /api/calls/smart-trigger
    │     └── buildCallQueue → top N reps by priority
    │
    ├── "Call All Reps" ───────→ POST /api/calls/trigger-all
    │     └── buildCallQueue → ALL reps in priority order
    │
    ├── "Call" (individual) ──→ POST /api/calls/trigger
    │     └── Single rep, direct call
    │
    │   ALL THREE paths use the same pipeline:
    │   ┌─────────────────────────────────────────┐
    │   │  buildCallContext(repId)                 │
    │   │    ├── Priority stores (by name + issue) │
    │   │    ├── Follow-up items from past calls   │
    │   │    ├── Competitor intel to probe          │
    │   │    └── Adaptive call tone                │
    │   │  buildUserData(context)                  │
    │   │  makeCall(agent_id, phone, user_data)    │
    │   │    └── Bolna substitutes {variables}     │
    │   └─────────────────────────────────────────┘
    │                         │
    │                         ▼
    │                  Bolna Voice Agent
    │                  (ElevenLabs + Deepgram + GPT-4.1-mini)
    │                  Unique prompt per rep via variable substitution
    │                         │
    │                         ▼
    │                  Phone Call to Rep
    │                  "Hi Rahul! Gupta Medicals hasn't
    │                   reordered in 18 days — kya hua?"
    │                         │
    │                         ▼
    │                  POST /api/webhook/bolna
    │                         │
    │                         ├── Extract: stores, orders, competitors
    │                         ├── Score rep performance (0-5)
    │                         ├── Flag store health transitions
    │                         ├── Generate alerts
    │                         └── Update database ──→ feeds back into
    │                                                 next buildCallQueue()
    │                                                 & buildCallContext()
    │
    └── Dashboard auto-refreshes (10s polling)
         ├── Smart Call Queue (priority-ranked via scheduler)
         ├── Stats cards
         ├── Active alerts (severity-coded)
         ├── Rep table with scores
         ├── Recent call feed
         └── Rep detail → Next Call Context preview`}</pre>
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
