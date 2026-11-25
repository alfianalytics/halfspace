# 0001: Use pnpm monorepo with Hono, TanStack Router, and Anvia

- Status: Accepted
- Date: 2026-11-25

## Context

The Final Assignment requires an AI product built with Anvia that includes a full-stack web UI, an agentic workflow, an AI agent, RAG, an MCP producer and consumer, and an evaluation suite with tracing. We also target non-technical football users who need a clean chat interface that renders visual report cards inline.

## Decision

Use a `pnpm` workspace monorepo split into:
- `apps/api`: Hono HTTP server streaming Anvia agent events (`@anvia/server`, `@anvia/client`) and serving the HTTP MCP endpoint (`/mcp`).
- `apps/web`: React 19 + Vite + TanStack Router + `@anvia/react` + `@anvia/react-ui` with Tailwind CSS v4.
- `packages/agents`: `@anvia/core` agent, deterministic workflows, RAG retriever, MCP client connections, and `@anvia/core/evals` test suites.
- `packages/mcp-server`: Custom MCP producer (`liga1-intelligence-mcp`) supporting both `stdio` and `HTTP` transports.
- `packages/db`: Read-only PostgreSQL pool for Liga 1 match analytics, `pgvector` store for RAG news/regulations, and `PrismaMemoryStore` (`@anvia/memory-prisma/v8`) for chat sessions.

## Consequences

- Shared Zod schemas for visual report payloads (`PlayerReportCard`, `PrematchLineupCard`, `PeerComparisonCard`) are defined once and imported by both `packages/agents` and `apps/web`.
- CORS in `apps/api` must expose `x-anvia-stream-protocol` so `@anvia/client` in the browser can read the `anvia.client.v3` stream.
- All packages typecheck and build from the root via `pnpm -r`.
