# BOLNA ASSIGNMENT

**AI-powered field sales management platform** that automates rep check-in calls using voice AI, then processes the conversations to extract store-level intelligence, score rep performance, and generate actionable alerts — all without managers having to make a single call.

Built with Next.js 14, Bolna Voice AI, and SQLite.

---

## The Problem

Field sales managers oversee 20-50+ reps across large territories. Staying informed about store health, competitor activity, and rep performance requires hours of manual calls every day. Most calls follow the same pattern, yet the insights buried in those conversations rarely get captured systematically.

## What This Agent Does

1. **Prioritize** — Smart scheduling engine scores each rep (0-100) based on at-risk stores, days since last call, unresolved follow-ups, and performance trends. Highest-priority reps get called first.

2. **Contextualize** — Before each call, a dynamic prompt builder assembles a unique, context-aware conversation script. The AI knows which stores are struggling, what follow-ups are pending, and what competitor activity was reported — so every call is targeted and relevant.

3. **Call** — Bolna Voice AI (ElevenLabs TTS + Deepgram STT + GPT-4.1-mini) conducts natural Hindi/English conversations with field reps via phone. No app install needed.

4. **Process & Act** — Post-call webhook extracts structured data from transcripts: store visit reports, competitor intel, rep engagement scores, challenges. Automatically updates store health flags, rep scores, and generates alerts for managers.

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     DASHBOARD                           │
│  Smart Queue  |  Rep Details  |  Alerts  |  Settings    │
└──────────┬──────────────────────────────────┬───────────┘
           │                                  │
    ┌──────▼───────┐                  ┌───────▼────────┐
    │  Scheduler   │                  │ Prompt Builder  │
    │ buildQueue() │                  │ buildContext()  │
    │ score 0-100  │                  │ buildUserData() │
    └──────┬───────┘                  └───────┬────────┘
           │                                  │
           └────────────┬─────────────────────┘
                        │
              ┌─────────▼──────────┐
              │   Bolna Voice AI   │
              │  ElevenLabs + STT  │
              │  + GPT-4.1-mini    │
              │  + Plivo telephony │
              └─────────┬──────────┘
                        │
              ┌─────────▼──────────┐
              │  Webhook Processor │
              │  Extract → Score   │
              │  → Update → Alert  │
              └────────────────────┘
                        │
                   ┌────▼────┐
                   │ SQLite  │
                   │  (WAL)  │
                   └─────────┘
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript |
| Database | SQLite via `better-sqlite3` (WAL mode) |
| Voice AI | Bolna (orchestrator) |
| TTS | ElevenLabs (Nila voice, Turbo v2.5) |
| STT | Deepgram (Nova-3, Hindi) |
| LLM | GPT-4.1-mini |
| Telephony | Plivo |
| Styling | Tailwind CSS v4 |
| UI | React 18, Server Components + Client Components |

---

## Getting Started

### Prerequisites

- Node.js 18+
- A [Bolna](https://bolna.ai) account with API key
- A phone number configured in Plivo (via Bolna)

### Installation

```bash
git clone https://github.com/your-username/field-call.git
cd field-call
npm install
```

### Environment Variables

Create `.env.local` in the project root:

```env
BOLNA_API_KEY=your_bolna_api_key
BOLNA_AGENT_ID=your_default_agent_id
NEXT_PUBLIC_APP_URL=https://your-public-url.com
```

> **Important:** `NEXT_PUBLIC_APP_URL` must be a publicly accessible URL (not `localhost`). Bolna's servers send post-call webhooks to this URL. For local development, use a tunnel like [ngrok](https://ngrok.com):
> ```bash
> ngrok http 3000
> # Then set NEXT_PUBLIC_APP_URL=https://abc123.ngrok-free.app
> ```

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Seed Demo Data

Go to **Settings** (`/settings`) and click **"Seed Demo Data"**. This creates:
- 1 team with a Bolna voice agent
- 3 field reps with phone numbers
- 9 stores across territories
- Pre-existing alerts for demo purposes
- Auto-patches the agent with the dynamic prompt template

---

## Project Structure

```
field-call/
├── app/
│   ├── page.tsx                          # Dashboard (queue, stats, alerts)
│   ├── about/page.tsx                    # About / architecture page
│   ├── settings/page.tsx                 # Settings (seed, webhook, prompt setup)
│   ├── reps/[id]/page.tsx                # Rep detail (calls, context preview)
│   └── api/
│       ├── seed/route.ts                 # POST — seed demo data
│       ├── teams/route.ts                # GET/POST — team management
│       ├── reps/route.ts                 # GET/POST — rep CRUD
│       ├── reps/[id]/route.ts            # GET — single rep detail
│       ├── reps/[id]/next-context/route.ts  # GET — preview next call context
│       ├── stores/route.ts               # GET/POST — store CRUD
│       ├── dashboard/[teamId]/route.ts   # GET — dashboard aggregation
│       ├── calls/
│       │   ├── trigger/route.ts          # POST — trigger single rep call
│       │   ├── trigger-all/route.ts      # POST — call all reps (priority ordered)
│       │   ├── smart-trigger/route.ts    # POST — smart batch call (top N)
│       │   └── queue/route.ts            # GET — preview priority queue
│       ├── agent/
│       │   ├── setup-prompt/route.ts     # POST — set agent prompt template
│       │   └── update-webhook/route.ts   # POST — update agent webhook URL
│       ├── webhook/bolna/route.ts        # POST — Bolna post-call webhook
│       ├── alerts/[id]/resolve/route.ts  # POST — resolve an alert
│       └── logs/route.ts                 # GET — processing logs
├── lib/
│   ├── db.ts                             # SQLite setup, schema, connection
│   ├── bolna.ts                          # Bolna API client (create, call, patch)
│   ├── scheduler.ts                      # Smart call queue & priority scoring
│   └── prompt-builder.ts                 # Dynamic prompt & context generation
├── bolna-assignment.db                         # SQLite database (auto-created)
└── .env.local                            # Environment variables
```

---

## Key Features

### Smart Call Scheduling Engine

The scheduler scores each rep on a 0-100 priority scale using four weighted factors:

| Factor | Max Points | Logic |
|---|---|---|
| At-risk stores | 40 + 10 bonus | More at-risk/lost stores = higher priority. Bonus if any store has 25+ days since last order |
| Days since last call | 30 | Longer gap = higher priority (caps at 14 days) |
| Previous call issues | 20 | Unresolved follow-ups or low engagement on last call |
| Low performance | 10 | Below-average performance score gets flagged |

Also estimates the **best time to call** each rep based on historical pickup patterns (IST).

### Dynamic Prompt Generation

Instead of one static prompt for all calls, each call gets a unique context built from:

- **Priority stores** — at-risk/lost stores the rep should discuss
- **Follow-up items** — unresolved issues from previous calls
- **Competitor intelligence** — recent competitor activity in the territory
- **Adaptive tone** — adjusts based on rep's current performance and engagement

Uses Bolna's `{variable}` template substitution via `user_data` — the agent prompt contains placeholders like `{priority_stores}`, and each call passes the actual values. This is **concurrent-safe** (no race conditions between simultaneous calls).

### Post-Call Webhook Processing

When a call completes, Bolna sends the transcript to the webhook endpoint, which:

1. Extracts structured data (stores visited, issues, competitor mentions)
2. Updates store health flags (normal → at_risk → lost)
3. Recalculates rep performance scores
4. Generates alerts for managers (at-risk stores, low engagement, competitor threats)
5. Logs every processing step for auditability

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/teams` | List all teams |
| `POST` | `/api/teams` | Create team + Bolna agent |
| `GET` | `/api/reps?team_id=X` | List reps for a team |
| `POST` | `/api/reps` | Add a new rep |
| `GET` | `/api/reps/:id` | Get rep detail with calls & stores |
| `GET` | `/api/reps/:id/next-context` | Preview next call's dynamic context |
| `GET` | `/api/dashboard/:teamId` | Dashboard stats, alerts, recent calls |
| `GET` | `/api/calls/queue?team_id=X` | Preview smart call queue with scores |
| `POST` | `/api/calls/trigger` | Trigger a single call to one rep |
| `POST` | `/api/calls/trigger-all` | Call all reps in priority order |
| `POST` | `/api/calls/smart-trigger` | Call top N priority reps (default 3) |
| `POST` | `/api/webhook/bolna` | Bolna post-call webhook receiver |
| `POST` | `/api/agent/setup-prompt` | Set agent prompt template (one-time) |
| `POST` | `/api/agent/update-webhook` | Update agent webhook URL |
| `POST` | `/api/seed` | Seed demo data |
| `GET` | `/api/logs?team_id=X` | Processing logs |
| `POST` | `/api/alerts/:id/resolve` | Resolve an alert |

---

## Deployment

### Railway (Recommended — zero code changes)

Railway supports persistent filesystems, so SQLite works out of the box.

```bash
# Install Railway CLI
npm i -g @railway/cli

# Login and deploy
railway login
railway init
railway up
```

Set environment variables in the Railway dashboard:
- `BOLNA_API_KEY`
- `BOLNA_AGENT_ID`
- `NEXT_PUBLIC_APP_URL` → your Railway deployment URL

After deploying, go to Settings and click **"Update Webhook URL"** so Bolna sends webhooks to the deployed URL.

### Render

Similar to Railway — supports persistent disk. Add a disk mount in the Render dashboard and point it to the project root so `bolna-assignment.db` persists.

### Vercel (requires DB migration)

Vercel uses serverless functions with ephemeral filesystems — SQLite won't persist. To deploy on Vercel, you'd need to migrate to:
- [Turso](https://turso.tech) (hosted libSQL, closest to SQLite — minimal changes)
- Vercel Postgres
- PlanetScale / Neon

---

## Database Schema

```sql
teams       — id, name, bolna_agent_id
reps        — id, team_id, name, phone, territory, performance_score, total_calls
stores      — id, rep_id, team_id, name, area, last_order_date, days_since_order, flag
calls       — id, rep_id, team_id, bolna_execution_id, status, transcript, call_summary,
              store_reports, competitor_activity, rep_engagement_score, follow_up_needed
alerts      — id, team_id, type, severity, title, description, related_rep_id, resolved
processing_logs — id, team_id, call_id, action, detail, category
```

---

## License

MIT
