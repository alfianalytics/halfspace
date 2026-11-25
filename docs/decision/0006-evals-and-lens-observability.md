# 0006: Evals with `@anvia/core/evals` and Tracing via Anvia Lens + Built-in In-App Trace Summary

- Status: Accepted
- Date: 2026-11-25

## Context

Day 9, Day 18, and Day 19 emphasize that reliability must be proven with repeatable evaluation cases (`@anvia/core/evals`) and observability tracing. We also want tracing metrics (latency, token spend, tool calls, RAG hits) to remain visible during live reviews even if the local Docker Anvia Lens container is not running.

## Decision

1. **Evaluation Suite (`@anvia/core/evals` — 25 Golden Test Cases in `packages/agents/src/evals/cases.ts`)**:
   - **Numerical & Visual Card Grounding (10 cases)**: deterministic checks verifying that numbers in the text and visual card payload match PostgreSQL ground truth.
   - **Methodology, News & Regulation Faithfulness (8 cases)**: `contains()` and LLM-judge `faithfulness()` verifying that injury/suspension news from RAG and Liga 1 U-23/foreign rules are respected and cited `[doc_id]`.
   - **Abstention on Out-of-Scope Requests (7 cases)**: `abstention()` verifying that the agent refuses to invent unavailable data (salaries, GPS sprint speeds, Liga 2 unrecorded stats).
2. **Dual Observability (Anvia Lens + In-App Trace Drawer)**:
   - Configure **Anvia Lens** via `infra/lens/docker-compose.yml` (matching `anvia-fullstack-app` and `basic-evals`).
   - Also record lightweight per-turn run telemetry (latency in ms, workflow steps executed, MCP tools called, RAG chunks retrieved, and token estimate) and expose an **In-App Trace Summary pill** on each assistant response in the UI.

## Consequences

- Any prompt, tool description, or RAG chunking change can be regression-tested with `pnpm --filter @repo/agents eval`.
- Mentor reviews and demos can inspect trace telemetry either in Anvia Lens or directly inside the chat UI without worrying about Docker uptime.
