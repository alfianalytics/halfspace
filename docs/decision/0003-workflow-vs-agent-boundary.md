# 0003: Boundary between Fixed Agentic Workflow and Autonomous AI Agent

- Status: Accepted
- Date: 2026-11-25

## Context

Day 19 requires both **1 agentic workflow** (fixed steps) and **1 AI agent** (autonomous loop). Because our users are non-technical and interact via a chat UI, we must clearly separate what runs deterministically as a workflow versus what the agent decides at runtime.

## Decision

- **Fixed Agentic Workflow (Deterministic Steps)**:
  1. **Hybrid News & Context Sync Workflow**:
     - Auto-triggers at the end of a chat turn if no Liga 1 news has been synced for the current date (non-blocking), and can also be triggered on-demand via the **"Sync Berita Terbaru"** button in the UI sidebar.
     - Fetches recent Indonesian football news articles (injuries, suspensions, Timnas call-ups, coach press conferences), tags club/player entities, chunks (`400–600` tokens), embeds, and upserts into `halfspace.rag_documents`.
  2. **Pre-Flight Intent & Guardrail Step**:
     - On every user prompt, deterministically resolves fuzzy club/player names, applies sample-size rules (`>= 450` mins for full seasons; `>= 180` mins with an `Early Season Sample` badge for active season `26/27` in 2-season comparisons), and locks `>= 35%` positional share filters.
  3. **Visual Report Schema Validator**:
     - Before sending a visual card payload to the UI, deterministically verifies all numbers against the PostgreSQL tool result and validates the payload with Zod.
- **Autonomous AI Agent (`@anvia/core`)**:
  - Plans which MCP tools to invoke (`scout_players`, `get_prematch_context`, `get_player_report_data`, or fallback `query_liga1_readonly_sql`), decides when to search the News/Regulation RAG or live Web Search MCP for breaking matchday updates, resolves lineup availability conflicts, and invokes the appropriate visual report card tool.

## Consequences

- Chat responses stay fast because daily news sync runs asynchronously after the turn (or via manual button) rather than blocking every prompt.
- Deterministic workflows guarantee data hygiene, sample guards, and valid visual schemas, while the agent handles open-ended multi-step reasoning.
