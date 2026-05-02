import streamlit as st
import requests
import pandas as pd
import plotly.express as px
import plotly.graph_objects as go
import json
import time
from datetime import datetime

st.set_page_config(
    page_title="MATIS — Multi-Agent Test Automation",
    page_icon=None,
    layout="wide",
    initial_sidebar_state="collapsed",
)

API_BASE = "http://localhost:80/api"

# ── CSS ───────────────────────────────────────────────────────────────────────
st.markdown("""
<style>
  /* ── Page reset ── */
  .block-container {
    padding-top: 0 !important;
    padding-bottom: 3rem !important;
    max-width: 100% !important;
  }
  #MainMenu, header[data-testid="stHeader"], footer { display: none !important; }

  /* ── Navbar (HTML block) ── */
  .navbar {
    background: #ffffff;
    border-bottom: 1px solid #e2e8f0;
    padding: 0 2rem;
    height: 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin: 0 -6rem;
    box-shadow: 0 1px 3px rgba(15,23,42,0.05);
    position: sticky;
    top: 0;
    z-index: 200;
  }
  .nav-brand {
    display: flex;
    align-items: baseline;
    gap: 0.55rem;
  }
  .nav-wordmark {
    font-size: 1.05rem;
    font-weight: 800;
    letter-spacing: -0.02em;
    color: #0f172a;
  }
  .nav-sep {
    font-size: 0.85rem;
    color: #e2e8f0;
    font-weight: 300;
  }
  .nav-tagline {
    font-size: 0.76rem;
    color: #94a3b8;
    font-weight: 400;
    letter-spacing: 0;
  }
  .nav-right {
    display: flex;
    align-items: center;
    gap: 0.6rem;
  }
  .nav-chip {
    font-size: 0.67rem;
    font-weight: 600;
    letter-spacing: 0.03em;
    color: #64748b;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    padding: 3px 9px;
    white-space: nowrap;
  }
  .nav-chip.blue {
    color: #2563eb;
    background: #eff6ff;
    border-color: #bfdbfe;
  }

  /* ── Navbar refresh button (pure HTML, onclick reload) ── */
  .navbar-btn {
    font-size: 0.72rem;
    font-weight: 500;
    color: #64748b;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 5px;
    padding: 4px 14px;
    height: 28px;
    cursor: pointer;
    font-family: inherit;
    letter-spacing: 0;
    line-height: 1;
    transition: background 0.12s, border-color 0.12s, color 0.12s;
    white-space: nowrap;
  }
  .navbar-btn:hover {
    background: #f1f5f9;
    border-color: #cbd5e1;
    color: #0f172a;
  }

  /* ── Tabs ── */
  [data-testid="stTabs"] { margin-top: 0.75rem; }
  [data-testid="stTabs"] button[role="tab"] {
    font-size: 0.8rem;
    font-weight: 500;
    padding: 0.5rem 1.1rem;
    color: #64748b;
    border-radius: 0;
  }
  [data-testid="stTabs"] button[aria-selected="true"] {
    color: #2563eb !important;
    font-weight: 600 !important;
    border-bottom: 2px solid #2563eb !important;
  }
  [data-testid="stTabsContent"] { padding-top: 1rem !important; }

  /* ── Section label ── */
  .section-label {
    font-size: 0.7rem;
    font-weight: 700;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #94a3b8;
    border-bottom: 1px solid #e2e8f0;
    padding-bottom: 0.4rem;
    margin: 1.4rem 0 0.8rem;
  }

  /* Metric cards */
  [data-testid="metric-container"] {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 1rem 1.1rem !important;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }

  /* Agent card */
  .agent-card {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-left: 3px solid #2563eb;
    border-radius: 8px;
    padding: 1.1rem 1.3rem;
    margin-bottom: 1rem;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04);
  }
  .agent-card.degraded { border-left-color: #ef4444; }
  .agent-card.busy     { border-left-color: #f59e0b; }

  .agent-name {
    font-size: 0.95rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 0.2rem;
  }
  .agent-desc {
    font-size: 0.78rem;
    color: #64748b;
    margin: 0 0 0.9rem;
  }
  .agent-stats {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }
  .stat-box {
    text-align: center;
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    padding: 0.5rem 0.3rem;
  }
  .stat-val {
    font-size: 1.1rem;
    font-weight: 700;
    color: #0f172a;
    display: block;
  }
  .stat-key {
    font-size: 0.62rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: #94a3b8;
    display: block;
    margin-top: 1px;
  }

  /* Status badge */
  .status-badge {
    display: inline-block;
    font-size: 0.68rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    padding: 2px 8px;
    border-radius: 4px;
  }
  .badge-green  { background:#f0fdf4; color:#16a34a; border:1px solid #bbf7d0; }
  .badge-blue   { background:#eff6ff; color:#2563eb; border:1px solid #bfdbfe; }
  .badge-red    { background:#fef2f2; color:#dc2626; border:1px solid #fecaca; }
  .badge-yellow { background:#fffbeb; color:#d97706; border:1px solid #fde68a; }
  .badge-gray   { background:#f8fafc; color:#64748b; border:1px solid #e2e8f0; }

  /* Tabs */
  [data-testid="stTabs"] button[role="tab"] {
    font-size: 0.82rem;
    font-weight: 500;
    padding: 0.5rem 1.1rem;
    color: #64748b;
  }
  [data-testid="stTabs"] button[aria-selected="true"] {
    color: #2563eb !important;
    font-weight: 600 !important;
    border-bottom: 2px solid #2563eb !important;
  }

  /* Table */
  [data-testid="stDataFrame"] { border: 1px solid #e2e8f0; border-radius: 8px; }

  /* Footer */
  .app-footer {
    text-align: center;
    font-size: 0.72rem;
    color: #cbd5e1;
    margin-top: 2rem;
    padding-top: 1rem;
    border-top: 1px solid #f1f5f9;
  }
</style>
""", unsafe_allow_html=True)


# ── Helpers ───────────────────────────────────────────────────────────────────
def api_get(ep, params=None):
    try:
        r = requests.get(f"{API_BASE}{ep}", params=params, timeout=15)
        r.raise_for_status()
        return r.json()
    except requests.exceptions.ConnectionError:
        st.error("Cannot connect to the API server.")
        return None
    except Exception as e:
        st.error(f"API error ({ep}): {e}")
        return None


def api_post(ep, data=None):
    try:
        r = requests.post(f"{API_BASE}{ep}", json=data, timeout=90)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        st.error(f"API error ({ep}): {e}")
        return None


def fmt_ms(ms):
    if not ms:
        return "—"
    s = ms / 1000
    return f"{int(s // 60)}m {s % 60:.0f}s" if s >= 60 else f"{s:.1f}s"


def fmt_tok(n):
    if not n:
        return "—"
    return f"{n / 1000:.1f}k" if n >= 1000 else str(n)


def status_badge(status):
    s = (status or "").lower()
    cls = {
        "completed": "green", "idle": "green", "filed": "green",
        "running": "blue", "busy": "blue",
        "failed": "red", "error": "red", "critical": "red",
        "pending": "gray", "queued": "gray", "unknown": "gray",
        "cancelled": "yellow", "high": "yellow", "medium": "yellow",
    }.get(s, "gray")
    return f'<span class="status-badge badge-{cls}">{status}</span>'


def chart_style(fig, height=300):
    fig.update_layout(
        height=height,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="rgba(0,0,0,0)",
        font=dict(color="#334155", size=11, family="Inter, system-ui, sans-serif"),
        margin=dict(t=36, b=20, l=4, r=4),
        legend=dict(bgcolor="rgba(0,0,0,0)", font=dict(color="#64748b", size=10)),
        xaxis=dict(gridcolor="#f1f5f9", linecolor="#e2e8f0", tickcolor="#e2e8f0"),
        yaxis=dict(gridcolor="#f1f5f9", linecolor="#e2e8f0", tickcolor="#e2e8f0"),
    )
    return fig


BLUES  = ["#2563eb", "#3b82f6", "#60a5fa", "#93c5fd", "#bfdbfe"]
MULTI  = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]
SEV_C  = {"critical": "#dc2626", "high": "#f59e0b", "medium": "#3b82f6",
          "low": "#10b981", "info": "#64748b"}


# ── Header ────────────────────────────────────────────────────────────────────
st.markdown("""
<div class="navbar">
  <div class="nav-brand">
    <span class="nav-wordmark">MATIS</span>
    <span class="nav-sep">/</span>
    <span class="nav-tagline">Multi-Agent Test Automation Intelligence System</span>
  </div>
  <div class="nav-right">
    <span class="nav-chip blue">Claude AI</span>
    <span class="nav-chip">OpenTelemetry</span>
    <span class="nav-chip">PostgreSQL</span>
    <button class="navbar-btn" onclick="window.location.reload()">Refresh</button>
  </div>
</div>
""", unsafe_allow_html=True)


# ── Tabs ──────────────────────────────────────────────────────────────────────
tabs = st.tabs([
    "Dashboard",
    "Pipelines",
    "Agent Health",
    "Failures",
    "Bugs",
    "Evals",
    "Logs",
])


# ════════════════════════════════════════════════════════════════════════════
# DASHBOARD
# ════════════════════════════════════════════════════════════════════════════
with tabs[0]:
    metrics    = api_get("/metrics/summary")
    throughput = api_get("/metrics/throughput")
    agent_m    = api_get("/metrics/agents")
    breakdown  = api_get("/metrics/failure-breakdown")

    if metrics:
        st.markdown('<p class="section-label">Overview</p>', unsafe_allow_html=True)
        c1, c2, c3, c4, c5, c6 = st.columns(6)
        c1.metric("Total Pipelines",    metrics.get("totalPipelines", 0))
        c2.metric("Active Pipelines",   metrics.get("activePipelines", 0))
        c3.metric("Failures Analyzed",  metrics.get("totalFailuresAnalyzed", 0))
        c4.metric("Bugs Filed",         metrics.get("totalBugsFiled", 0))
        c5.metric("Tokens Used",        fmt_tok(metrics.get("totalTokensUsed", 0)))
        c6.metric("Total Cost",         f"${metrics.get('totalCostUsd', 0):.4f}")

        st.markdown('<p class="section-label">Performance</p>', unsafe_allow_html=True)
        g1, g2, g3 = st.columns(3)

        with g1:
            rate = metrics.get("successRate", 0)
            rate_pct = rate if rate > 1 else rate * 100
            fig = go.Figure(go.Indicator(
                mode="gauge+number+delta",
                value=rate_pct,
                delta={"reference": 80, "valueformat": ".1f",
                       "increasing": {"color": "#16a34a"},
                       "decreasing": {"color": "#dc2626"}},
                title={"text": "Pipeline Success Rate",
                       "font": {"size": 12, "color": "#64748b"}},
                number={"suffix": "%", "font": {"size": 26, "color": "#0f172a"}},
                gauge={
                    "axis": {"range": [0, 100], "tickcolor": "#e2e8f0",
                             "tickfont": {"color": "#94a3b8", "size": 10}},
                    "bar": {"color": "#2563eb", "thickness": 0.22},
                    "bgcolor": "#f8fafc",
                    "borderwidth": 0,
                    "steps": [
                        {"range": [0, 60],  "color": "#fef2f2"},
                        {"range": [60, 80], "color": "#fffbeb"},
                        {"range": [80, 100], "color": "#f0fdf4"},
                    ],
                    "threshold": {
                        "line": {"color": "#16a34a", "width": 2},
                        "thickness": 0.75,
                        "value": 80,
                    },
                },
            ))
            fig.update_layout(height=200, paper_bgcolor="rgba(0,0,0,0)",
                              margin=dict(t=16, b=0, l=16, r=16))
            st.plotly_chart(fig, use_container_width=True)

        with g2:
            ah    = metrics.get("agentHealthy", 0)
            total = ah + metrics.get("agentDegraded", 0)
            fig2 = go.Figure(go.Indicator(
                mode="number",
                value=ah,
                title={"text": f"Healthy Agents (of {total})",
                       "font": {"size": 12, "color": "#64748b"}},
                number={"font": {"size": 40, "color": "#16a34a" if ah == total else "#f59e0b"}},
            ))
            fig2.update_layout(height=200, paper_bgcolor="rgba(0,0,0,0)",
                               margin=dict(t=16, b=0, l=16, r=16))
            st.plotly_chart(fig2, use_container_width=True)

        with g3:
            avg = metrics.get("avgPipelineDurationMs", 0)
            fig3 = go.Figure(go.Indicator(
                mode="number",
                value=(avg / 1000) if avg else 0,
                title={"text": "Avg Pipeline Duration",
                       "font": {"size": 12, "color": "#64748b"}},
                number={"suffix": "s", "font": {"size": 40, "color": "#2563eb"}},
            ))
            fig3.update_layout(height=200, paper_bgcolor="rgba(0,0,0,0)",
                               margin=dict(t=16, b=0, l=16, r=16))
            st.plotly_chart(fig3, use_container_width=True)

    st.markdown('<p class="section-label">Activity & Failure Breakdown</p>',
                unsafe_allow_html=True)
    ch_l, ch_r = st.columns(2)

    with ch_l:
        if throughput:
            pts = throughput.get("dataPoints", throughput if isinstance(throughput, list) else [])
            if pts:
                df_t = pd.DataFrame(pts)
                x_col = next((c for c in ["hour", "date", "time"] if c in df_t.columns),
                             df_t.columns[0] if len(df_t.columns) else None)
                y_cols = [c for c in ["pipelinesRun", "failuresAnalyzed", "bugsFiledCount"]
                          if c in df_t.columns]
                if x_col and y_cols:
                    label_map = {
                        "pipelinesRun":      "Pipelines Run",
                        "failuresAnalyzed":  "Failures Analyzed",
                        "bugsFiledCount":    "Bugs Filed",
                    }
                    fig = px.bar(df_t, x=x_col, y=y_cols, barmode="group",
                                 title="Activity — Last 24 Hours",
                                 color_discrete_sequence=MULTI,
                                 labels={**label_map, "value": "Count",
                                         "variable": "Metric"})
                    fig.for_each_trace(lambda t: t.update(
                        name=label_map.get(t.name, t.name)))
                    st.plotly_chart(chart_style(fig), use_container_width=True)

    with ch_r:
        if breakdown:
            by_sev = breakdown.get("bySeverity", [])
            if by_sev:
                df_s = pd.DataFrame(by_sev)
                fig = px.pie(df_s, names="severity", values="count",
                             title="Failures by Severity", hole=0.52,
                             color="severity", color_discrete_map=SEV_C)
                fig.update_traces(textinfo="label+percent", textfont_size=11)
                st.plotly_chart(chart_style(fig), use_container_width=True)

    if agent_m:
        items = agent_m.get("items", agent_m if isinstance(agent_m, list) else [])
        if items:
            st.markdown('<p class="section-label">Agent Performance</p>',
                        unsafe_allow_html=True)
            df_a    = pd.DataFrame(items)
            n_col   = next((c for c in ["agentName","agentType","agent","name"] if c in df_a.columns), None)
            lat_col = next((c for c in ["avgLatencyMs","avgDurationMs"] if c in df_a.columns), None)
            tok_col = next((c for c in ["totalTokens","avgTokens"] if c in df_a.columns), None)

            ap_l, ap_r = st.columns(2)
            if n_col and lat_col:
                with ap_l:
                    fig = px.bar(df_a, x=n_col, y=lat_col, text=lat_col,
                                 title="Average Latency per Agent (ms)",
                                 color=n_col, color_discrete_sequence=BLUES)
                    fig.update_traces(texttemplate="%{text:.0f} ms",
                                      textposition="outside", marker_line_width=0)
                    st.plotly_chart(chart_style(fig), use_container_width=True)
            if n_col and tok_col:
                with ap_r:
                    fig2 = px.bar(df_a, x=n_col, y=tok_col, text=tok_col,
                                  title="Total Tokens per Agent",
                                  color=n_col, color_discrete_sequence=BLUES)
                    fig2.update_traces(texttemplate="%{text:,}",
                                       textposition="outside", marker_line_width=0)
                    st.plotly_chart(chart_style(fig2), use_container_width=True)


# ════════════════════════════════════════════════════════════════════════════
# PIPELINES
# ════════════════════════════════════════════════════════════════════════════
with tabs[1]:
    pl_list, pl_run = st.tabs(["All Runs", "Run Pipeline"])

    with pl_list:
        data  = api_get("/pipelines", params={"limit": 50})
        items = []
        if data:
            items = data.get("items", data.get("pipelines", data if isinstance(data, list) else []))

        if items:
            st.markdown(f'<p class="section-label">{len(items)} Pipeline Runs</p>',
                        unsafe_allow_html=True)
            for p in items:
                status = p.get("status", "unknown")
                with st.expander(
                    f"{p['id'][:8]}   ·   {p.get('inputSource','—')}   ·   {p.get('createdAt','')[:10]}   ·   {status.upper()}",
                    expanded=False,
                ):
                    c1, c2, c3, c4, c5 = st.columns(5)
                    c1.metric("Tests Generated", p.get("testsGenerated", 0))
                    c2.metric("Failures",        p.get("failuresAnalyzed", 0))
                    c3.metric("Bugs Filed",      p.get("bugsFiledCount", 0))
                    c4.metric("Tokens",          fmt_tok(p.get("tokensUsed", 0)))
                    c5.metric("Duration",        fmt_ms(p.get("durationMs", 0)))

                    stages = p.get("stages", [])
                    if stages:
                        st.caption("Agent stages")
                        s_cols = st.columns(len(stages))
                        for i, s in enumerate(stages):
                            with s_cols[i]:
                                st.markdown(f"**{s['name'].replace('_',' ').title()}**")
                                st.caption(
                                    f"{s['status'].upper()}  ·  "
                                    f"{fmt_tok(s.get('tokensUsed',0))} tokens  ·  "
                                    f"{fmt_ms(s.get('durationMs',0))}"
                                )
                    if p.get("errorMessage"):
                        st.error(p["errorMessage"][:400])
        else:
            st.info("No pipeline runs yet. Use the Run Pipeline tab to start one.")

    with pl_run:
        st.markdown('<p class="section-label">Launch a New Pipeline</p>',
                    unsafe_allow_html=True)
        st.caption("Runs 4 Claude AI agents sequentially: Test Generator → Log Analyzer → Triage → Bug Reporter. Typically takes 30–60 seconds.")

        frm_col, inf_col = st.columns([3, 2])
        with frm_col:
            with st.form("pipeline_form"):
                src   = st.text_input("Input Source",
                                      value="src/payments/checkout.py",
                                      help="File path, test suite name, or repository URL")
                itype = st.selectbox("Input Type",
                                     ["source_file", "test_suite", "repository", "log_file"])
                model = st.selectbox("Model",
                                     ["claude-3-5-haiku", "claude-3-5-sonnet", "claude-3-opus"])
                dry   = st.checkbox("Dry run (skip database writes)")
                go    = st.form_submit_button("Launch Pipeline", type="primary",
                                              use_container_width=True)

        with inf_col:
            st.markdown("""
**Pipeline stages**

| Stage | Agent |
|-------|-------|
| 1 | Test Generator |
| 2 | Log Analyzer |
| 3 | Triage Agent |
| 4 | Bug Reporter |
""")

        if go:
            with st.spinner("Creating pipeline…"):
                result = api_post("/pipelines", {
                    "inputSource": src, "inputType": itype,
                    "model": model, "dryRun": dry,
                })
            if result:
                pid = result.get("id", "")
                st.success(f"Pipeline started — ID: {pid[:8]}")
                st.divider()

                stage_w = {"test_generation": 0.25, "log_analysis": 0.50,
                           "triage": 0.75, "bug_filing": 1.0}
                prog      = st.progress(0.0, text="Initialising agents…")
                stage_ph  = st.empty()
                result_ph = st.empty()

                for _ in range(100):
                    time.sleep(2)
                    poll = api_get(f"/pipelines/{pid}")
                    if not poll:
                        break
                    cur    = poll.get("status", "running")
                    stages = poll.get("stages", [])
                    pct    = 0.0
                    for s in stages:
                        w = stage_w.get(s["name"], 0)
                        if s["status"] == "completed":
                            pct = max(pct, w)
                        elif s["status"] == "running":
                            pct = max(pct, max(0, w - 0.12))

                    prog.progress(min(pct, 1.0), text=f"Status: {cur}")
                    rows = [{
                        "Stage":    s["name"].replace("_", " ").title(),
                        "Status":   s["status"].upper(),
                        "Tokens":   fmt_tok(s.get("tokensUsed", 0)),
                        "Duration": fmt_ms(s.get("durationMs", 0)),
                    } for s in stages]
                    stage_ph.dataframe(pd.DataFrame(rows), hide_index=True,
                                       use_container_width=True)

                    if cur in ("completed", "failed", "cancelled"):
                        prog.progress(1.0)
                        if cur == "completed":
                            result_ph.success(
                                f"Complete — "
                                f"Tests: {poll.get('testsGenerated')}  |  "
                                f"Failures: {poll.get('failuresAnalyzed')}  |  "
                                f"Bugs: {poll.get('bugsFiledCount')}  |  "
                                f"Tokens: {fmt_tok(poll.get('tokensUsed'))}"
                            )
                        elif cur == "failed":
                            result_ph.error(poll.get("errorMessage", "")[:400])
                        else:
                            result_ph.warning("Pipeline was cancelled.")
                        break


# ════════════════════════════════════════════════════════════════════════════
# AGENT HEALTH
# ════════════════════════════════════════════════════════════════════════════
with tabs[2]:
    agents_data = api_get("/agents")
    items = []
    if agents_data:
        items = agents_data.get("items", agents_data if isinstance(agents_data, list) else [])

    AGENT_DEFS = [
        {"id": "test_generator", "name": "Test Generator",
         "desc": "Generates unit tests from source code using Claude AI"},
        {"id": "log_analyzer",   "name": "Log Analyzer",
         "desc": "Analyzes test execution logs to detect and classify failures"},
        {"id": "triage_agent",   "name": "Triage Agent",
         "desc": "Prioritizes failures, deduplicates issues, computes F1 score"},
        {"id": "bug_reporter",   "name": "Bug Reporter",
         "desc": "Authors and files structured bug reports via Claude AI"},
    ]
    agent_map = {ag.get("type", ag.get("id", "")): ag for ag in items}

    st.markdown('<p class="section-label">Agent Status</p>', unsafe_allow_html=True)
    col_a, col_b = st.columns(2)
    all_healthy = True

    for i, adef in enumerate(AGENT_DEFS):
        ag     = agent_map.get(adef["id"], {})
        status = ag.get("status", "unknown")
        cb     = ag.get("circuitBreakerState", "closed")
        done   = ag.get("tasksCompleted", 0)
        failed = ag.get("tasksFailed", 0)
        tokens = fmt_tok(ag.get("totalTokensUsed", 0))
        lat    = fmt_ms(ag.get("avgLatencyMs", 0))
        model  = ag.get("model", "claude-haiku-4-5")

        card_cls = ("degraded" if status in ("error","failed")
                    else "busy" if status == "busy" else "")
        if status not in ("idle", "busy"):
            all_healthy = False

        badge_html  = status_badge(status)
        fail_color  = "#dc2626" if failed > 0 else "#0f172a"

        html = f"""
<div class="agent-card {card_cls}">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.25rem">
    <span class="agent-name">{adef['name']}</span>
    {badge_html}
  </div>
  <p class="agent-desc">{adef['desc']}</p>
  <div class="agent-stats">
    <div class="stat-box">
      <span class="stat-val">{done}</span>
      <span class="stat-key">Tasks Done</span>
    </div>
    <div class="stat-box">
      <span class="stat-val" style="color:{fail_color}">{failed}</span>
      <span class="stat-key">Failed</span>
    </div>
    <div class="stat-box">
      <span class="stat-val">{tokens}</span>
      <span class="stat-key">Tokens</span>
    </div>
    <div class="stat-box">
      <span class="stat-val">{lat}</span>
      <span class="stat-key">Avg Latency</span>
    </div>
  </div>
  <div style="margin-top:0.75rem;font-size:0.73rem;color:#94a3b8">
    Model: <code style="color:#2563eb;font-size:0.72rem">{model}</code>
    &nbsp;&middot;&nbsp; Circuit Breaker:
    <code style="color:#0f172a;font-size:0.72rem">{cb}</code>
  </div>
</div>
"""
        with col_a if i % 2 == 0 else col_b:
            st.markdown(html, unsafe_allow_html=True)

    # Diagnostics
    st.markdown('<p class="section-label">Diagnostics</p>', unsafe_allow_html=True)
    if all_healthy:
        st.info("All agents are reporting healthy. Run diagnostics to confirm end-to-end behaviour.")
    else:
        st.warning("One or more agents may be degraded. Run diagnostics to investigate.")

    diag_col, _ = st.columns([2, 5])
    with diag_col:
        run_diag = st.button("Run Diagnostic Pipeline", type="primary",
                             use_container_width=True)

    if run_diag:
        with st.spinner("Starting diagnostic pipeline — src/auth/login_test.py…"):
            diag = api_post("/pipelines", {
                "inputSource": "src/auth/login_test.py",
                "inputType":   "source_file",
                "model":       "claude-3-5-haiku",
            })

        if not diag:
            st.error("Failed to create diagnostic pipeline.")
        else:
            pid = diag.get("id", "")
            stage_w   = {"test_generation": 0.25, "log_analysis": 0.50,
                         "triage": 0.75, "bug_filing": 1.0}
            diag_prog = st.progress(0.0, text="Running…")
            final     = None

            for _ in range(80):
                time.sleep(2)
                poll = api_get(f"/pipelines/{pid}")
                if not poll:
                    break
                cur    = poll.get("status", "running")
                stages = poll.get("stages", [])
                pct    = 0.0
                for s in stages:
                    w = stage_w.get(s["name"], 0)
                    if s["status"] == "completed":
                        pct = max(pct, w)
                    elif s["status"] == "running":
                        pct = max(pct, max(0, w - 0.1))
                diag_prog.progress(min(pct, 1.0), text=f"Status: {cur}")
                if cur in ("completed", "failed", "cancelled"):
                    final = poll
                    break

            diag_prog.progress(1.0)
            if final:
                stage_map = {s["name"]: s for s in final.get("stages", [])}
                key_map   = {"test_generator": "test_generation",
                             "log_analyzer":   "log_analysis",
                             "triage_agent":   "triage",
                             "bug_reporter":   "bug_filing"}
                results = []
                for adef in AGENT_DEFS:
                    s = stage_map.get(key_map.get(adef["id"], adef["id"]), {})
                    ok = s.get("status") == "completed"
                    results.append({
                        "Agent":    adef["name"],
                        "Result":   "Pass" if ok else "Fail",
                        "Status":   s.get("status", "—").upper(),
                        "Tokens":   fmt_tok(s.get("tokensUsed", 0)),
                        "Duration": fmt_ms(s.get("durationMs", 0)),
                        "Error":    (s.get("errorMessage") or "—")[:80],
                    })

                df_r = pd.DataFrame(results)
                st.dataframe(df_r, hide_index=True, use_container_width=True)

                passed = sum(1 for r in results if r["Result"] == "Pass")
                total  = len(results)
                if passed == total:
                    st.success(
                        f"All {total} agents passed.  "
                        f"Tests generated: {final.get('testsGenerated')}  |  "
                        f"Tokens used: {fmt_tok(final.get('tokensUsed'))}"
                    )
                else:
                    st.error(f"{total - passed} of {total} agents failed. See table above.")

    # Historical charts
    agent_m = api_get("/metrics/agents")
    if agent_m:
        am = agent_m.get("items", agent_m if isinstance(agent_m, list) else [])
        if am:
            st.markdown('<p class="section-label">Historical Metrics</p>',
                        unsafe_allow_html=True)
            df   = pd.DataFrame(am)
            n_c  = next((c for c in ["agentName","agentType","agent","name"] if c in df.columns), None)
            l_c  = next((c for c in ["avgLatencyMs","avgDurationMs"] if c in df.columns), None)
            t_c  = next((c for c in ["totalTokens","avgTokens"] if c in df.columns), None)
            sr_c = next((c for c in ["successRate"] if c in df.columns), None)

            hm1, hm2, hm3 = st.columns(3)
            if n_c and l_c:
                with hm1:
                    fig = px.bar(df, x=n_c, y=l_c, text=l_c, color=n_c,
                                 color_discrete_sequence=BLUES,
                                 title="Avg Latency (ms)")
                    fig.update_traces(texttemplate="%{text:.0f}", textposition="outside",
                                      marker_line_width=0)
                    st.plotly_chart(chart_style(fig, 260), use_container_width=True)

            if n_c and sr_c:
                with hm2:
                    fig2 = px.bar(df, x=n_c, y=sr_c, color=n_c,
                                  color_discrete_sequence=BLUES, title="Success Rate")
                    fig2.update_layout(yaxis_tickformat=".0%")
                    st.plotly_chart(chart_style(fig2, 260), use_container_width=True)

            if n_c and t_c:
                with hm3:
                    fig3 = px.pie(df, names=n_c, values=t_c, hole=0.5,
                                  title="Token Share",
                                  color_discrete_sequence=BLUES)
                    fig3.update_traces(textinfo="label+percent")
                    st.plotly_chart(chart_style(fig3, 260), use_container_width=True)


# ════════════════════════════════════════════════════════════════════════════
# FAILURES
# ════════════════════════════════════════════════════════════════════════════
with tabs[3]:
    data = api_get("/failures", params={"limit": 200})
    all_items = []
    if data:
        all_items = data.get("items", data.get("failures", data if isinstance(data, list) else []))

    if all_items:
        ff1, ff2, ff3 = st.columns([3, 2, 1])
        with ff1:
            sev_opts = sorted({f.get("severity","unknown") for f in all_items})
            sel_sev  = st.multiselect("Severity", sev_opts, default=sev_opts)
        with ff2:
            err_opts = sorted({f.get("errorType","unknown") for f in all_items})
            sel_err  = st.multiselect("Error Type", err_opts, default=err_opts)
        with ff3:
            st.metric("Total", len(all_items))

        items = [f for f in all_items
                 if f.get("severity") in sel_sev and f.get("errorType") in sel_err]

        rows = [{
            "Severity":   f.get("severity", "—").upper(),
            "Test":       (f.get("testName") or "—")[:50],
            "Error Type": f.get("errorType", "—"),
            "Root Cause": (f.get("rootCause") or "—")[:60],
            "Status":     f.get("status", "—"),
            "Duplicate":  "Yes" if f.get("isDuplicate") else "No",
            "Regression": "Yes" if f.get("isRegression") else "No",
            "Duration":   fmt_ms(f.get("durationMs", 0)),
            "Pipeline":   (f.get("pipelineId") or "—")[:8],
        } for f in items]

        st.dataframe(pd.DataFrame(rows), hide_index=True,
                     use_container_width=True, height=320)

        fch1, fch2 = st.columns(2)
        with fch1:
            sev_c = {}
            for f in items:
                s = f.get("severity", "unknown")
                sev_c[s] = sev_c.get(s, 0) + 1
            if sev_c:
                fig = px.pie(names=list(sev_c.keys()), values=list(sev_c.values()),
                             title="By Severity", hole=0.5,
                             color=list(sev_c.keys()), color_discrete_map=SEV_C)
                fig.update_traces(textinfo="label+percent")
                st.plotly_chart(chart_style(fig), use_container_width=True)

        with fch2:
            err_c = {}
            for f in items:
                e = f.get("errorType", "unknown")
                err_c[e] = err_c.get(e, 0) + 1
            if err_c:
                df_e = pd.DataFrame({"type": list(err_c.keys()),
                                     "count": list(err_c.values())}).sort_values("count")
                fig2 = px.bar(df_e, x="count", y="type", orientation="h",
                              title="By Error Type",
                              color_discrete_sequence=["#2563eb"])
                st.plotly_chart(chart_style(fig2), use_container_width=True)

        with st.expander("Failure detail view"):
            idx = st.number_input("Row index", 0, max(0, len(items)-1), 0,
                                  label_visibility="collapsed")
            if items:
                f = items[idx]
                d1, d2 = st.columns(2)
                with d1:
                    st.write(f"**Test:** {f.get('testName','—')}")
                    st.write(f"**Severity:** {f.get('severity','—').upper()}")
                    st.write(f"**Error Type:** {f.get('errorType','—')}")
                    st.write(f"**Status:** {f.get('status','—')}")
                with d2:
                    st.write(f"**Duplicate:** {'Yes' if f.get('isDuplicate') else 'No'}")
                    st.write(f"**Regression:** {'Yes' if f.get('isRegression') else 'No'}")
                    st.write(f"**Priority:** {f.get('priority','—')}")
                    st.write(f"**Affected Files:** {', '.join(f.get('affectedFiles',[]))}")
                for field, label in [
                    ("rootCause", "Root Cause"), ("suggestedFix", "Suggested Fix"),
                    ("errorMessage", "Error Message"), ("stackTrace", "Stack Trace"),
                ]:
                    if f.get(field):
                        st.markdown(f"**{label}**")
                        st.code(f[field][:600], language="text")
    else:
        st.info("No failures recorded yet. Run a pipeline to detect test failures.")


# ════════════════════════════════════════════════════════════════════════════
# BUGS
# ════════════════════════════════════════════════════════════════════════════
with tabs[4]:
    data = api_get("/bugs", params={"limit": 100})
    all_items = []
    if data:
        all_items = data.get("items", data.get("bugs", data if isinstance(data, list) else []))

    if all_items:
        bc1, bc2 = st.columns([4, 1])
        with bc1:
            statuses = sorted({b.get("status","unknown") for b in all_items})
            sel      = st.multiselect("Status filter", statuses, default=statuses)
        with bc2:
            st.metric("Total Bugs", len(all_items))

        items = [b for b in all_items if b.get("status") in sel]
        for b in items:
            try:
                labels = json.loads(b.get("labels", "[]"))
            except Exception:
                labels = []

            has_gh  = bool(b.get("githubIssueUrl"))
            gh_link = (f"[GitHub #{b.get('githubIssueNumber')}]({b['githubIssueUrl']})"
                       if has_gh else "")

            with st.expander(f"{b.get('title','Untitled')}  ·  {b.get('status','—').upper()}"):
                body_col, meta_col = st.columns([3, 1])
                with body_col:
                    body = b.get("body","")
                    st.markdown(body[:1200] + ("…" if len(body) > 1200 else ""))
                with meta_col:
                    st.markdown(f"**Status:** {b.get('status','—')}")
                    if gh_link:
                        st.markdown(f"**Issue:** {gh_link}")
                    if b.get("assignee"):
                        st.markdown(f"**Assignee:** {b['assignee']}")
                    if labels:
                        st.markdown("**Labels:** " + "  ".join(f"`{l}`" for l in labels[:6]))
                    st.caption(f"Pipeline: {(b.get('pipelineId') or '')[:8]}")
                    st.caption(f"Filed: {(b.get('createdAt') or '')[:19].replace('T',' ')}")
    else:
        st.info("No bugs filed yet. Run a pipeline to generate Claude-authored bug reports.")


# ════════════════════════════════════════════════════════════════════════════
# EVALS
# ════════════════════════════════════════════════════════════════════════════
with tabs[5]:
    ev_hist, ev_run = st.tabs(["History", "Run Eval"])

    with ev_hist:
        data  = api_get("/evals", params={"limit": 50})
        items = []
        if data:
            items = data.get("items", data.get("evals", data if isinstance(data, list) else []))

        if items:
            rows = [{
                "Suite":      e.get("suiteName", e.get("suite","—")),
                "Status":     e.get("status","—").upper(),
                "Passed":     e.get("testsPassed", e.get("passedCases", 0)),
                "Failed":     e.get("testsFailed", e.get("failedCases", 0)),
                "Coverage %": round(e.get("coveragePct", e.get("testGenCoveragePercent",0)), 1),
                "F1 Score":   round(e.get("f1Score",     e.get("triageF1Score", 0)), 3),
                "Precision":  round(e.get("precision",   e.get("logAnalyzerPrecision", 0)), 3),
                "Recall":     round(e.get("recall",      e.get("logAnalyzerRecall", 0)), 3),
                "Duration":   fmt_ms(e.get("durationMs", 0)),
            } for e in items]
            st.dataframe(pd.DataFrame(rows), hide_index=True,
                         use_container_width=True, height=280)

            ec1, ec2 = st.columns(2)
            with ec1:
                td = [{"Suite": e.get("suiteName","?"),
                       "Passed": e.get("testsPassed", e.get("passedCases",0)),
                       "Failed": e.get("testsFailed", e.get("failedCases",0))}
                      for e in items]
                fig = px.bar(pd.DataFrame(td), x="Suite", y=["Passed","Failed"],
                             barmode="group", title="Pass / Fail by Suite",
                             color_discrete_map={"Passed":"#10b981","Failed":"#ef4444"})
                st.plotly_chart(chart_style(fig), use_container_width=True)

            with ec2:
                ml = [{"Suite": e.get("suiteName","?"),
                       "Precision": e.get("precision", e.get("logAnalyzerPrecision",0)),
                       "Recall":    e.get("recall",    e.get("logAnalyzerRecall",0)),
                       "F1 Score":  e.get("f1Score",   e.get("triageF1Score",0))}
                      for e in items]
                fig2 = px.line(pd.DataFrame(ml), x="Suite",
                               y=["Precision","Recall","F1 Score"], markers=True,
                               title="ML Quality Metrics",
                               color_discrete_sequence=["#2563eb","#10b981","#f59e0b"])
                st.plotly_chart(chart_style(fig2), use_container_width=True)
        else:
            st.info("No eval runs recorded yet.")

    with ev_run:
        st.markdown('<p class="section-label">Trigger Evaluation</p>',
                    unsafe_allow_html=True)
        with st.form("eval_form"):
            suite   = st.text_input("Suite Name", value="unit_tests")
            e_model = st.selectbox("Model",
                                   ["claude-3-5-haiku","claude-3-5-sonnet"])
            go_ev   = st.form_submit_button("Run Eval", type="primary",
                                            use_container_width=True)
        if go_ev:
            with st.spinner("Running evaluation…"):
                result = api_post("/evals/run", {"suiteName": suite, "model": e_model})
            if result:
                p = result.get("testsPassed", result.get("passedCases","—"))
                f = result.get("testsFailed", result.get("failedCases","—"))
                st.success(f"Evaluation complete — Passed: {p}  |  Failed: {f}")
                st.json(result)


# ════════════════════════════════════════════════════════════════════════════
# LOGS
# ════════════════════════════════════════════════════════════════════════════
with tabs[6]:
    lc1, lc2, lc3 = st.columns([3, 3, 1])
    with lc1:
        level_sel = st.multiselect("Level", ["debug","info","warn","error"],
                                   default=["info","warn","error"])
    with lc2:
        agent_sel = st.selectbox("Agent",
                                 ["all","test_generator","log_analyzer",
                                  "triage_agent","bug_reporter"])
    with lc3:
        limit_sel = st.slider("Max", 10, 200, 50, label_visibility="collapsed")

    params = {"limit": limit_sel}
    if agent_sel != "all":
        params["agentId"] = agent_sel

    data = api_get("/logs", params=params)
    all_items = []
    if data:
        all_items = data.get("items", data.get("logs", data if isinstance(data, list) else []))
    if level_sel:
        all_items = [l for l in all_items if l.get("level","") in level_sel]

    if all_items:
        st.markdown(f'<p class="section-label">{len(all_items)} Entries</p>',
                    unsafe_allow_html=True)

        rows = [{
            "Time":     (l.get("createdAt") or "")[:19].replace("T"," "),
            "Level":    (l.get("level","")).upper(),
            "Agent":    l.get("agentType", l.get("agentId","—")),
            "Message":  (l.get("message","—"))[:100],
            "Tokens":   str(l.get("tokensUsed") or "—"),
            "Latency":  fmt_ms(l.get("latencyMs",0)),
            "Trace":    (l.get("traceId") or "—")[:12],
        } for l in all_items]

        st.dataframe(pd.DataFrame(rows), hide_index=True,
                     use_container_width=True, height=360)

        lch1, lch2 = st.columns(2)
        with lch1:
            level_c = {}
            for l in all_items:
                lv = (l.get("level") or "unknown").upper()
                level_c[lv] = level_c.get(lv, 0) + 1
            if level_c:
                fig = px.bar(x=list(level_c.keys()), y=list(level_c.values()),
                             title="Distribution by Level",
                             color=list(level_c.keys()),
                             color_discrete_map={"ERROR":"#ef4444","WARN":"#f59e0b",
                                                 "INFO":"#2563eb","DEBUG":"#94a3b8"},
                             labels={"x":"Level","y":"Count"})
                st.plotly_chart(chart_style(fig, 240), use_container_width=True)

        with lch2:
            agent_c = {}
            for l in all_items:
                a = l.get("agentType", l.get("agentId","unknown")) or "unknown"
                agent_c[a] = agent_c.get(a, 0) + 1
            if agent_c:
                fig2 = px.pie(names=list(agent_c.keys()), values=list(agent_c.values()),
                              hole=0.5, title="Distribution by Agent",
                              color_discrete_sequence=BLUES)
                fig2.update_traces(textinfo="label+percent")
                st.plotly_chart(chart_style(fig2, 240), use_container_width=True)

        with st.expander("Raw entry"):
            idx = st.number_input("Entry", 0, max(0, len(all_items)-1), 0,
                                  label_visibility="collapsed")
            st.json(all_items[idx])
    else:
        st.info("No log entries match the current filters.")


# ── Footer ────────────────────────────────────────────────────────────────────
st.markdown(
    f'<p class="app-footer">MATIS &nbsp;·&nbsp; Multi-Agent Test Automation '
    f'&nbsp;·&nbsp; Last refreshed {st.session_state.last_refresh}</p>',
    unsafe_allow_html=True,
)
