<div align="center">

# MATIS
### Multi-Agent Test Automation Intelligence System

**An AI-powered QA platform that automates your entire testing pipeline —**
**from test generation to structured bug reports — using a chain of 4 intelligent agents.**

<br/>

![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)
![React](https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black)
![Streamlit](https://img.shields.io/badge/Streamlit-FF4B4B?style=for-the-badge&logo=streamlit&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)
![Express](https://img.shields.io/badge/Express-000000?style=for-the-badge&logo=express&logoColor=white)
![OpenTelemetry](https://img.shields.io/badge/OpenTelemetry-000000?style=for-the-badge&logo=opentelemetry&logoColor=white)
![pnpm](https://img.shields.io/badge/pnpm-F69220?style=for-the-badge&logo=pnpm&logoColor=white)

<br/>

</div>

---

## What is MATIS?

**MATIS** (Multi-Agent Test Automation Intelligence System) is a full-stack AI-powered testing platform that automates the entire software QA pipeline using a sequential chain of four AI agents. Each agent has a single responsibility and hands its output to the next, forming a complete test automation workflow without human intervention.

The system is designed to demonstrate production-grade multi-agent AI orchestration paired with real observability (distributed tracing), real-time streaming, and a proper relational database — not a mock or a demo toy.

> Submit a file path or test suite name → Get structured bug reports ready for GitHub, in seconds.

---

## Why MATIS?

Modern software teams face a chronic bottleneck: writing tests, diagnosing failures, triaging bugs, and filing issues all require significant human engineering time. MATIS attacks every step of that pipeline simultaneously:

| Problem | MATIS Solution |
|---|---|
| Writing tests takes hours | Agent 1 generates 5–25 targeted pytest cases instantly |
| Failure logs are hard to read | Agent 2 classifies every failure with root cause + fix |
| Triage is subjective and slow | Agent 3 applies ML metrics (F1, precision, recall) and ranks by priority |
| Bug reports are inconsistently written | Agent 4 authors structured GitHub issues with reproduction steps |
| No visibility into AI pipeline health | OpenTelemetry spans wrap every agent invocation |
| Results disappear after each run | PostgreSQL persists every test case, failure, and bug report |

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                           MATIS Platform                                 │
│                                                                          │
│   ┌─────────────────────┐        ┌──────────────────────────────────┐   │
│   │   React + Vite      │        │      Streamlit Dashboard         │   │
│   │   Frontend  /       │        │      /streamlit/                 │   │
│   │   Dark cockpit UI   │        │   Light theme · 7 tabs           │   │
│   │   SSE live updates  │        │   Live charts · Plotly           │   │
│   └──────────┬──────────┘        └──────────────┬───────────────────┘   │
│              │                                  │                        │
│              └──────────────┬───────────────────┘                        │
│                             │  REST + SSE                                │
│                    ┌────────▼────────┐                                   │
│                    │  Express API    │  /api/*                           │
│                    │  TypeScript     │  SSE live streaming               │
│                    │  Drizzle ORM    │  OpenTelemetry tracing            │
│                    └────────┬────────┘                                   │
│                             │                                            │
│          ┌──────────────────┼───────────────────┐                       │
│          │                  │                   │                        │
│   ┌──────▼──────┐   ┌───────▼──────┐   ┌────────▼───────┐              │
│   │ PostgreSQL  │   │ Anthropic AI │   │ OpenTelemetry  │              │
│   │ Database    │   │ claude-haiku │   │ Trace Spans    │              │
│   │ 7 tables    │   │ 4 agents     │   │ per agent      │              │
│   └─────────────┘   └──────────────┘   └────────────────┘              │
└──────────────────────────────────────────────────────────────────────────┘
```

---

## The Four-Agent Pipeline

At the heart of MATIS is a sequential chain of four AI agents. Each agent makes a real API call to Claude, parses structured JSON from the response, and passes its output to the next agent.

```
  User Input (file path / test suite / repo / log file)
       │
       ▼
╔══════════════════════════════════════════════════════╗
║  AGENT 1 — Test Generator                           ║
║                                                      ║
║  Prompt: "You are an expert Python test engineer.   ║
║           Given this source, generate pytest cases" ║
║                                                      ║
║  Input  → source file path, git diff, or log file   ║
║  Output → 5–25 test names + coverage summary +      ║
║           risk areas JSON                           ║
║  Model  → claude-haiku-4-5  (8 192 max tokens)      ║
║  Tokens → ~4 000–8 000 per run                      ║
╚══════════════════════╦═══════════════════════════════╝
                       ║  test names [ ]
                       ▼
╔══════════════════════════════════════════════════════╗
║  AGENT 2 — Log Analyzer                             ║
║                                                      ║
║  Prompt: "You are an expert log analysis AI agent.  ║
║           Identify and classify failures."          ║
║                                                      ║
║  Input  → test names from Agent 1                   ║
║  Output → failure records with:                     ║
║           · errorType  (import / assertion /        ║
║             timeout / dependency / logic)           ║
║           · severity   (critical / high / med / low)║
║           · rootCause  (technical explanation)      ║
║           · suggestedFix  (actionable code fix)     ║
║           · isRegression  (boolean)                 ║
║           · precision / recall metrics              ║
║  Model  → claude-haiku-4-5                          ║
║  Tokens → ~5 000–12 000 per run                     ║
╚══════════════════════╦═══════════════════════════════╝
                       ║  failures [ ]
                       ▼
╔══════════════════════════════════════════════════════╗
║  AGENT 3 — Triage Agent                             ║
║                                                      ║
║  Prompt: "You are an expert software triage AI.     ║
║           Prioritize, deduplicate, rank failures."  ║
║                                                      ║
║  Input  → failure records from Agent 2              ║
║  Output → triaged failures with:                    ║
║           · priority  (P1=critical → P5=backlog)    ║
║           · isDuplicate + duplicateOf reference     ║
║           · triageReason  (human-readable)          ║
║           · f1Score / regression flags              ║
║  Model  → claude-haiku-4-5                          ║
║  Tokens → ~3 000–7 000 per run                      ║
╚══════════════════════╦═══════════════════════════════╝
                       ║  triaged P1+P2 failures
                       ▼
╔══════════════════════════════════════════════════════╗
║  AGENT 4 — Bug Reporter                             ║
║                                                      ║
║  Prompt: "You are an expert engineer writing        ║
║           GitHub issues. Write clear, actionable    ║
║           bug reports."                             ║
║                                                      ║
║  Input  → critical + high severity failures only    ║
║  Output → structured GitHub issues with:            ║
║           · Title  ([CRITICAL] / [HIGH] prefix)     ║
║           · Markdown body (Summary / Root Cause /   ║
║             Steps to Reproduce / Expected vs Actual ║
║             / Suggested Fix / Affected Files)       ║
║           · Labels  (severity + error-type +        ║
║             "automated" + "regression" if needed)   ║
║           · GitHub issue number + URL               ║
║  Model  → claude-haiku-4-5                          ║
║  Tokens → ~4 000–10 000 per run                     ║
╚══════════════════════╩═══════════════════════════════╝
                       │
                       ▼
            Pipeline Complete
    (all results persisted to PostgreSQL,
     streamed live to frontends via SSE)
```

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **AI Agents** | Anthropic `claude-haiku-4-5` | Powers all 4 agents with structured JSON prompts |
| **API Server** | Node.js + Express + TypeScript | Orchestrates agents, serves REST + SSE endpoints |
| **Database** | PostgreSQL + Drizzle ORM | Persists all pipeline results relationally |
| **Observability** | OpenTelemetry | Distributed trace spans per agent (OTLP export) |
| **Real-time** | Server-Sent Events (SSE) | Streams live pipeline progress to frontends |
| **React Frontend** | React 18 + Vite + Tailwind | Dark cockpit-style UI with live SSE integration |
| **Streamlit Dashboard** | Python + Streamlit + Plotly | Light-theme 7-tab analytics dashboard |
| **API Contract** | OpenAPI 3.0 + Orval codegen | Type-safe client hooks generated from spec |
| **Schema validation** | Zod | Runtime validation of all API inputs and outputs |
| **Monorepo** | pnpm workspaces | Shared libraries across frontend, API, and scripts |
| **Charts** | Recharts (React) · Plotly (Streamlit) | Data visualization across both dashboards |
| **Build** | esbuild | Fast API server bundling |

---

## Database Schema

Every agent output is stored in PostgreSQL with a proper relational schema:

| Table | Contents |
|---|---|
| `pipelines` | Run metadata, status, current stage, token counts, cost estimate, trace ID |
| `test_cases` | Generated test names per pipeline, coverage summary, risk areas |
| `failures` | Classified failures — error type, severity, root cause, fix, regression flag |
| `bugs` | Authored bug reports — title, body, labels, GitHub issue number/URL |
| `agent_metrics` | Per-agent latency, token usage, invocation count, error rate |
| `eval_runs` | ML quality metrics — F1 score, precision, recall, test coverage |
| `agent_logs` | Full debug/info/warn/error log stream, filterable by agent and level |

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/pipelines` | Create and run a new pipeline (triggers 4-agent chain) |
| `GET` | `/api/pipelines` | List all pipeline runs with status and metadata |
| `GET` | `/api/pipelines/:id` | Get full pipeline details and stage breakdown |
| `GET` | `/api/pipelines/:id/stream` | **SSE** — live stream of pipeline stage progress |
| `GET` | `/api/failures` | List all classified failures (filter by severity, type) |
| `GET` | `/api/bugs` | List all filed bug reports |
| `GET` | `/api/agents` | Agent health status and per-agent metrics |
| `GET` | `/api/metrics/summary` | Aggregate KPIs — pipelines run, tokens used, cost, success rate |
| `GET` | `/api/metrics/throughput` | 24-hour activity time series |
| `GET` | `/api/metrics/agents` | Per-agent performance breakdown |
| `GET` | `/api/metrics/failure-breakdown` | Failures grouped by severity and error type |
| `GET` | `/api/evals` | Historical evaluation runs with ML quality scores |
| `POST` | `/api/evals/run` | Trigger a new evaluation suite |
| `GET` | `/api/logs` | Agent log stream (filterable by level and agent) |
| `GET` | `/api/health` | Health check — API + DB + agent status |

---

## Dashboards

### React Dashboard — `/`

Dark cockpit-style UI built with React 18 + Vite. Connects to the live SSE stream and updates in real time as each agent completes. Pages:

- **Dashboard** — KPI cards, success rate, agent health overview, throughput chart
- **Pipelines** — All runs with stage-by-stage breakdown and live progress
- **Pipeline Detail** — Full trace view for a single run, per-agent timing
- **Agent Health** — Circuit breaker state, latency p99, token budget per agent
- **Failures** — Filterable failure table with drill-down detail view
- **Bugs** — All authored bug reports with full GitHub issue body
- **Evals** — F1, precision, recall, and coverage over time
- **Logs** — Live agent log stream with level and agent filters

### Streamlit Dashboard — `/streamlit/`

Light-theme 7-tab analytics dashboard built with Python + Streamlit + Plotly:

| Tab | What it shows |
|---|---|
| **Dashboard** | KPI cards, success rate gauge, agent health indicator, activity bar chart, failure severity pie chart, per-agent performance bars |
| **Pipelines** | All pipeline runs with expandable stage breakdowns + Launch Pipeline form |
| **Agent Health** | Cards for all 4 agents — tasks, failures, tokens, latency, model, circuit breaker |
| **Failures** | Filterable failure table with severity/error-type drill-down and charts |
| **Bugs** | All Claude-authored reports with full markdown body, labels, and GitHub links |
| **Evals** | Historical ML quality metrics + Run Eval form |
| **Logs** | Live agent log stream — filter by level (debug/info/warn/error) and by agent |

---

## Observability

Every agent invocation is wrapped in an **OpenTelemetry span**. The full trace tree for one pipeline looks like:

```
pipeline.run  ──────────────────────────────────── (total duration)
├── agent.test_generator    attrs: pipeline.id, tokens, duration_ms, model
├── agent.log_analyzer      attrs: pipeline.id, tokens, precision, recall, failures_found
├── agent.triage            attrs: pipeline.id, tokens, f1_score, duplicates
└── agent.bug_reporter      attrs: pipeline.id, tokens, bugs_filed, success_rate
```

Spans capture: agent type, Claude model, token usage, latency, success/failure, and error messages. This makes the system compatible with any OTLP-capable backend — Jaeger, Grafana Tempo, Honeycomb, etc.

---

## Project Structure

```
matis/
├── artifacts/
│   ├── api-server/                  # Express API server (TypeScript)
│   │   └── src/
│   │       ├── agents/
│   │       │   ├── testGenerator.ts     # Agent 1 — generates pytest test cases
│   │       │   ├── logAnalyzer.ts       # Agent 2 — classifies failures
│   │       │   ├── triageAgent.ts       # Agent 3 — prioritizes + deduplicates
│   │       │   └── bugReporter.ts       # Agent 4 — authors GitHub bug reports
│   │       ├── routes/
│   │       │   ├── pipelines.ts         # Pipeline orchestrator + SSE stream
│   │       │   ├── bugs.ts              # Bug CRUD
│   │       │   ├── failures.ts          # Failure CRUD + filters
│   │       │   ├── agents.ts            # Agent health + metrics
│   │       │   ├── metrics.ts           # Aggregate KPIs + throughput
│   │       │   ├── evals.ts             # Evaluation runs
│   │       │   ├── logs.ts              # Agent log stream
│   │       │   └── health.ts            # Health check
│   │       └── lib/
│   │           ├── telemetry.ts         # OpenTelemetry span helpers
│   │           ├── pipelineEvents.ts    # SSE event emitter
│   │           └── logger.ts            # Structured logger
│   │
│   ├── matis/                       # React + Vite dark cockpit frontend
│   │   └── src/
│   │       ├── pages/               # dashboard, pipelines, agents, failures, bugs…
│   │       ├── components/          # layout, shadcn/ui components
│   │       └── hooks/
│   │           └── usePipelineStream.ts  # SSE hook for live updates
│   │
│   └── matis-streamlit/             # Python Streamlit dashboard
│       ├── app.py                   # 7-tab dashboard — all charts, forms, tables
│       └── .streamlit/config.toml   # Light theme configuration
│
├── lib/
│   ├── db/                          # Drizzle ORM schema + migrations
│   │   └── src/schema/
│   │       ├── pipelines.ts
│   │       ├── failures.ts
│   │       ├── bugs.ts
│   │       ├── agents.ts
│   │       ├── evals.ts
│   │       └── logs.ts
│   ├── api-spec/
│   │   └── openapi.yaml             # OpenAPI 3.0 contract
│   ├── api-zod/                     # Zod schemas (generated from OpenAPI)
│   ├── api-client-react/            # React Query hooks (generated from OpenAPI)
│   └── integrations-anthropic-ai/   # Anthropic client wrapper
│
└── README.md
```

---

## Running Locally

### Prerequisites

- **Node.js** 20+
- **Python** 3.11+
- **pnpm** 9+
- **PostgreSQL** database
- **Anthropic API key** (or Replit AI Integration)

### 1 — Clone the repo

```bash
git clone https://github.com/sai0546/Multi-Agent-Test-Automation-Intelligence-System.git
cd Multi-Agent-Test-Automation-Intelligence-System
```

### 2 — Install dependencies

```bash
# Install all Node.js packages (monorepo)
pnpm install

# Install Python packages
pip install streamlit requests pandas plotly
```

### 3 — Configure environment variables

Create a `.env` file in the project root (or set these in your environment):

```env
# Required
DATABASE_URL=postgresql://user:password@localhost:5432/matis

# Anthropic (if running outside Replit)
AI_INTEGRATIONS_ANTHROPIC_BASE_URL=https://api.anthropic.com
AI_INTEGRATIONS_ANTHROPIC_API_KEY=sk-ant-...

# Optional
SESSION_SECRET=your-session-secret
PORT=3000
```

### 4 — Run database migrations

```bash
pnpm --filter @workspace/db run migrate
```

### 5 — Start all services

Open three terminals:

```bash
# Terminal 1 — API server (port 3000)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — React frontend (port 5173)
pnpm --filter @workspace/matis run dev

# Terminal 3 — Streamlit dashboard (port 8501)
streamlit run artifacts/matis-streamlit/app.py
```

### Running on Replit

All services start automatically via Replit Workflows — no manual setup needed. The platform handles ports, env vars, and service routing.

---

## Running Your First Pipeline

Once all services are running, open the dashboard and:

1. Click **"Run Pipeline"** (or navigate to the Pipelines tab in Streamlit)
2. Enter an **input source**, e.g. `src/payments/checkout.py`
3. Select an **input type**: `source_file`, `git_diff`, `pytest_json`, or `log_file`
4. Click **Submit**
5. Watch the four agents run in real time via SSE — each stage updates as it completes
6. View the generated test cases, classified failures, and bug reports in their respective tabs

---

## Environment Variables Reference

| Variable | Required | Description |
|---|---|---|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Yes | Anthropic API proxy base URL |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Yes | Anthropic API key |
| `SESSION_SECRET` | Yes | Express session signing secret |
| `PORT` | No | Per-service port (auto-set by Replit workflows) |
| `NODE_ENV` | No | `development` or `production` |

---

## Engineering Highlights

This project is intentionally built to demonstrate engineering depth across the full stack:

- **Real AI calls** — All four agents make actual API calls to Claude with carefully crafted system prompts and structured JSON output parsing. No mocks.
- **Real database** — Every test case, failure, and bug report is persisted in PostgreSQL with a normalized relational schema via Drizzle ORM.
- **Real observability** — OpenTelemetry spans wrap every agent invocation, capturing token counts, latency, and success/failure for each stage of the pipeline.
- **Real streaming** — Server-Sent Events push live agent progress to the React frontend as each agent completes, with no polling.
- **Real ML metrics** — F1 score, precision, and recall are computed from actual agent output, not hardcoded values.
- **Contract-first API** — The entire API is defined in OpenAPI 3.0 first; Zod schemas and React Query hooks are generated from it automatically via Orval.
- **Two frontends** — Both the React and Streamlit dashboards are fully wired to the same live API with no duplicated logic.
- **Type safety end-to-end** — TypeScript strict mode across the API server, React frontend, and shared libraries.

---

<div align="center">

Built with TypeScript · Python · React · Streamlit · PostgreSQL · Anthropic AI · OpenTelemetry

</div>
