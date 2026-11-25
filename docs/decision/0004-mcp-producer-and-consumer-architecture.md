# 0004: Goal-oriented MCP Producer (`liga1-intelligence-mcp`) with Guarded SQL Fallback & Dual MCP Consumer

- Status: Accepted
- Date: 2026-11-25

## Context

Day 17 and Day 19 require the project to act as both an **MCP Producer** (a server we build) and an **MCP Consumer** (servers our agent connects to). Most user questions fall into our 3 core use cases (scouting, pre-match & lineup prediction, and visual reports), but journalists and analysts also ask unique ad-hoc follow-up questions during a chat session.

## Decision

1. **MCP Producer (`packages/mcp-server` — `liga1-intelligence-mcp`)**:
   - Exposes 4 tools over `stdio` and `HTTP` (`/mcp`):
     1. `scout_players`: finds and ranks Liga 1 players by position, age bracket (`U23` / `Senior`), nationality (`Local` / `Foreign`), minimum minutes, and tactical style.
     2. `get_prematch_context`: returns recent match form, historical starting XIs, formations, key player availability stats, and yellow/red card accumulation counts for two clubs.
     3. `get_player_report_data`: returns the complete, pre-validated metric and percentile payload for single-season or two-season player visual report cards.
     4. `query_liga1_readonly_sql`: guarded fallback tool for ad-hoc analytical follow-ups. Enforces `SELECT`-only syntax check, read-only transaction, `3000ms` statement timeout, and `LIMIT 50`.
2. **MCP Consumer (`packages/agents/src/mcp.ts`)**:
   - The Anvia host connects as an MCP client to:
     1. Our own `liga1-intelligence-mcp` server for structured PostgreSQL Liga 1 analytics.
     2. An external **Web Search / Fetch MCP Server** (`tavily-mcp` or `@modelcontextprotocol/server-fetch`) to check breaking matchday news not yet indexed in RAG.

## Consequences

- 90% of queries execute through fast, pre-tested SQL inside the 3 goal-oriented tools, while the guarded `query_liga1_readonly_sql` tool gives the agent flexibility to answer any unexpected follow-up question safely.
- External MCP clients (Claude Desktop, Cursor) can connect directly to `liga1-intelligence-mcp`.
