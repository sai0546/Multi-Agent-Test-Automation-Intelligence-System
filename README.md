# MATIS — Multi-Agent Test Automation Intelligence System

---

## What is MATIS?

MATIS (Multi-Agent Test Automation Intelligence System) is a full-stack AI-powered testing platform that automates the entire software QA pipeline using a team of four Claude AI agents running in sequence. Each agent has a single responsibility and hands its output to the next agent in the chain.

The system demonstrates production-grade multi-agent AI orchestration, distributed tracing, and real-time streaming.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        MATIS Platform                               │
│                                                                     │
│  ┌──────────────────┐      ┌───────────────────────────────────┐   │
│  │  React + Vite    │      │        Streamlit Dashboard        │   │
│  │  Frontend (/)    │      │        (/streamlit/)              │   │
│  │  Dark cockpit UI │      │  Light theme, 7 tabs, live data   │   │
│  └────────┬─────────┘      └──────────────┬────────────────────┘   │
│           │                               │                         │
│           └───────────────┬───────────────┘                         │
│                           │ HTTP / REST                             │
│                  ┌────────▼────────┐                               │
│                  │  Express API    │  /api/*                        │
│                  │  Server         │  SSE streaming                 │
│                  │  (TypeScript)   │  OpenTelemetry tracing         │
│                  └────────┬────────┘                               │
│                           │                                         │
│          ┌────────────────┼────────────────┐                       │
│          │                │                │                        │
│   ┌──────▼──────┐  ┌──────▼──────┐  ┌─────▼───────┐              │
│   │  PostgreSQL │  │  Claude AI  │  │ OpenTelemetry│              │
│   │  Database   │  │  (Anthropic)│  │  Tracing     │              │
│   └─────────────┘  └─────────────┘  └─────────────┘              │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Input → Processing → Output Flow

### Step 1 — User Submits a Pipeline

The user provides:
- **Input Source**: a file path, test suite name, or repository URL (e.g. `src/payments/checkout.py`)
- **Input Type**: `source_file`, `test_suite`, `repository`, or `log_file`
- **Model**: which Claude model to use (`claude-haiku-4-5` by default for speed)

This creates a Pipeline record in PostgreSQL and kicks off the four-agent chain.

---

### Step 2 — Agent Chain Execution

Each agent is a real Claude AI call with a structured prompt. They run sequentially, each consuming the previous agent's output.

```
Input Source
    │
    ▼
┌─────────────────────────────────────┐
│  Agent 1: Test Generator            │
│  - Receives: file path / source     │
│  - Calls Claude API                 │
│  - Generates: 20–30 unit test cases │
│    (name, description, assertions,  │
│     priority, category)             │
└──────────────────┬──────────────────┘
                   │  test cases JSON
                   ▼
┌─────────────────────────────────────┐
│  Agent 2: Log Analyzer              │
│  - Receives: test cases             │
│  - Simulates test execution         │
│  - Calls Claude API                 │
│  - Classifies: each failure by      │
│    error type, severity, root cause,│
│    stack trace, suggested fix       │
└──────────────────┬──────────────────┘
                   │  failure records JSON
                   ▼
┌─────────────────────────────────────┐
│  Agent 3: Triage Agent              │
│  - Receives: failure records        │
│  - Calls Claude API                 │
│  - Computes: F1 score, precision,   │
│    recall, deduplication, priority  │
│    ranking, regression detection    │
└──────────────────┬──────────────────┘
                   │  triaged failures JSON
                   ▼
┌─────────────────────────────────────┐
│  Agent 4: Bug Reporter              │
│  - Receives: top priority failures  │
│  - Calls Claude API                 │
│  - Authors: structured bug reports  │
│    with title, reproduction steps,  │
│    expected/actual behaviour,       │
│    severity label, GitHub body      │
└──────────────────┬──────────────────┘
                   │
                   ▼
             Pipeline Complete
```

---

### Step 3 — Results Stored and Streamed

All outputs are written to PostgreSQL:

| Table | Contents |
|-------|----------|
| `pipelines` | Run metadata, status, stage progress, token counts, cost |
| `test_cases` | Generated unit tests per pipeline |
| `failures` | Classified failures with root cause and fix suggestions |
| `bugs` | Structured bug reports ready for GitHub |
| `agent_metrics` | Per-agent latency, token usage, success rate |
| `eval_runs` | ML quality metrics: F1, precision, recall, coverage |
| `agent_logs` | Full debug/info/warn/error log stream |

Results are also streamed to the frontend in real time via **Server-Sent Events (SSE)** as each agent completes.

---

## The Four Agents

### Agent 1 — Test Generator
- **Input**: source file path or test suite name
- **Output**: 20–30 structured unit test cases as JSON
- **What it decides**: which functions to test, edge cases to cover, assertion types, test priority
- **Token usage**: ~4,000–8,000 per run

### Agent 2 — Log Analyzer
- **Input**: test cases from Agent 1
- **Output**: failure records with classification
- **What it decides**: which tests fail, what the error type is (assertion error, timeout, null pointer, etc.), severity level (critical / high / medium / low), root cause, and a suggested fix
- **Token usage**: ~5,000–12,000 per run

### Agent 3 — Triage Agent
- **Input**: failure records from Agent 2
- **Output**: prioritised, deduplicated failure list with ML quality metrics
- **What it decides**: which failures are duplicates, whether a failure is a regression, priority ranking (P0–P3), F1 score, precision, and recall for the overall test run
- **Token usage**: ~3,000–7,000 per run

### Agent 4 — Bug Reporter
- **Input**: high-priority failures from Agent 3
- **Output**: structured bug reports in GitHub issue format
- **What it decides**: bug title, markdown body with reproduction steps, expected vs actual behaviour, affected files, severity label, and assignee
- **Token usage**: ~4,000–10,000 per run

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Agents | Anthropic Claude (`claude-haiku-4-5`) via Replit AI Integration |
| API Server | Node.js + Express + TypeScript |
| Database | PostgreSQL (Drizzle ORM) |
| Observability | OpenTelemetry (distributed tracing with spans per agent) |
| Real-time | Server-Sent Events (SSE) for live pipeline streaming |
| Dashboard (primary) | React 18 + Vite (dark cockpit UI) |
| Dashboard (secondary) | Python Streamlit (light theme, 7 tabs) |
| Charts | Plotly (Streamlit) / Recharts (React) |
| Monorepo | pnpm workspaces |

---

## Project Structure

```
matis/
├── artifacts/
│   ├── api-server/          # Express API + 4 Claude AI agents
│   │   └── src/
│   │       ├── agents/      # testGenerator, logAnalyzer, triageAgent, bugReporter
│   │       ├── routes/      # pipelines, failures, bugs, metrics, evals, logs
│   │       └── lib/         # telemetry, pipelineEvents (SSE), db
│   ├── matis/               # React + Vite dark cockpit frontend
│   └── matis-streamlit/     # Python Streamlit light-theme dashboard
│       └── app.py           # 7-tab dashboard: Dashboard, Pipelines, Agent Health,
│                            #   Failures, Bugs, Evals, Logs
├── lib/
│   └── db/                  # Drizzle schema + migrations (shared)
│       └── src/schema/      # pipelines, testCases, failures, bugs, agentMetrics…
└── README.md
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/pipelines` | Create and run a new pipeline |
| `GET` | `/api/pipelines` | List all pipeline runs |
| `GET` | `/api/pipelines/:id` | Get pipeline status and stage details |
| `GET` | `/api/pipelines/:id/stream` | SSE stream for live pipeline updates |
| `GET` | `/api/failures` | List all classified failures |
| `GET` | `/api/bugs` | List all filed bug reports |
| `GET` | `/api/agents` | Agent health and per-agent metrics |
| `GET` | `/api/metrics/summary` | Aggregate KPIs (pipelines, tokens, cost, success rate) |
| `GET` | `/api/metrics/throughput` | 24-hour activity time series |
| `GET` | `/api/metrics/agents` | Per-agent performance metrics |
| `GET` | `/api/metrics/failure-breakdown` | Failures grouped by severity and error type |
| `GET` | `/api/evals` | Historical evaluation runs |
| `POST` | `/api/evals/run` | Trigger an evaluation suite |
| `GET` | `/api/logs` | Agent log stream (filterable by level / agent) |

---

## Dashboards

### Streamlit Dashboard (`/streamlit/`)

Seven tabs covering every aspect of the system:

1. **Dashboard** — KPI cards (total pipelines, failures, bugs, tokens, cost), success rate gauge, agent health indicator, avg pipeline duration, activity bar chart, failure severity pie chart, and per-agent performance bars
2. **Pipelines** — All pipeline runs with expandable stage-by-stage breakdown; Launch Pipeline form with live progress polling
3. **Agent Health** — Cards for all 4 agents showing tasks completed, failures, tokens, latency, model, and circuit-breaker state; Run Diagnostic Pipeline button
4. **Failures** — Filterable table of all classified failures with severity/error-type filters; drill-down detail view; severity and error-type charts
5. **Bugs** — All Claude-authored bug reports with full markdown body, labels, assignee, and GitHub issue link
6. **Evals** — Historical ML quality metrics (F1, precision, recall, coverage); Run Eval form
7. **Logs** — Live agent log stream filterable by level (debug/info/warn/error) and agent

### React Dashboard (`/`)

Dark cockpit-style UI with real-time SSE integration for live pipeline updates.

---

## Observability

Every agent invocation is wrapped in an **OpenTelemetry span**:

```
pipeline.run
├── agent.test_generator  (duration, token_count, model)
├── agent.log_analyzer    (duration, token_count, model)
├── agent.triage          (duration, token_count, model)
└── agent.bug_reporter    (duration, token_count, model)
```

Spans capture: agent type, model, token usage, latency, success/failure, and error messages. This makes the system observable with any OTLP-compatible backend (Jaeger, Grafana Tempo, etc.).

---

## Running Locally

This project runs on [Replit](https://replit.com) using pnpm workspaces.

```bash
# Install dependencies
pnpm install

# Start the API server
pnpm --filter @workspace/api-server run dev

# Start the Streamlit dashboard
streamlit run artifacts/matis-streamlit/app.py --server.port 5000

# Start the React frontend
pnpm --filter @workspace/matis run dev
```

Required environment variables:

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `AI_INTEGRATIONS_ANTHROPIC_BASE_URL` | Anthropic API proxy base URL |
| `AI_INTEGRATIONS_ANTHROPIC_API_KEY` | Anthropic API key |
| `SESSION_SECRET` | Express session secret |
| `PORT` | Per-service port (set by Replit workflows) |

---

## A Note on Design

MATIS is intentionally built to demonstrate engineering depth, not just a proof-of-concept chatbot:

- **Real AI calls** — all four agents make actual Claude API calls with structured prompts and JSON output parsing
- **Real database** — every result is persisted in PostgreSQL with a proper relational schema
- **Real observability** — OpenTelemetry spans wrap every agent for distributed tracing
- **Real streaming** — SSE pushes live updates to the frontend as each agent completes
- **Real metrics** — F1 score, precision, and recall are computed from actual agent output, not mocked
- **Two frontends** — both the React and Streamlit dashboards are fully wired to the same live API
