# AGENTS.md

Constraints for AI agents working in this repo (`Halfspace` — Indonesia Super League Intelligence & Visual Report Assistant). Follow them unless the user explicitly overrides one in the current request.

## Read first

Before you change code, read:

1. [`PRD.md`](PRD.md): product summary, the 3 core use cases, and the 5 mandatory course requirements.
2. [`docs/README.md`](docs/README.md): what the `docs/` folder holds and how to update it.
3. The rules file for the area you touch:
   - Monorepo structure, package boundaries, folder placement: [`docs/rules/architecture.md`](docs/rules/architecture.md)
   - Hono API, Anvia agent loop, workflows, MCP server/client: [`docs/rules/server.md`](docs/rules/server.md)
   - React chat UI, `@anvia/react-ui`, inline visual report cards: [`docs/rules/client.md`](docs/rules/client.md)
   - PostgreSQL analytics read-only rules, Prisma memory, `pgvector` RAG: [`docs/rules/database.md`](docs/rules/database.md)
   - Styling, visual card layout, chart rules: [`docs/rules/styling.md`](docs/rules/styling.md)
   - Branches, checks, eval runs, PR expectations: [`docs/rules/workflow.md`](docs/rules/workflow.md)
4. The product rule for the feature in [`docs/product/`](docs/product/). Football domain behaviour, metric formulas, and lineup rules come from there, never from guessing.
5. Any architectural decision record that touches your change in [`docs/decision/`](docs/decision/).

If a rule conflicts with the code, don't silently pick one. Report the conflict to the user.

## Code placement

- Monorepo packages live under `apps/` (`apps/api`, `apps/web`) and `packages/` (`packages/agents`, `packages/mcp-server`, `packages/db`).
- Web routes go in `apps/web/src/routes/`. Never hand-edit `apps/web/src/routeTree.gen.ts`.
- Visual report card templates (Player Scouting Card, Pre-Match Predicted XI Pitch Board, Peer Comparison Chart) go in `apps/web/src/components/reports/` and render inside assistant tool parts.
- Agent definitions, deterministic workflows, MCP client wiring, and `@anvia/core/evals` suites live in `packages/agents/src/`.
- The custom MCP server (`liga1-intelligence-mcp`) lives in `packages/mcp-server/src/` with both `stdio` and `HTTP` (`/mcp`) entrypoints.

## Server, Agent, and Data Safety

- **Analytics PostgreSQL is strictly read-only**: never run `INSERT`, `UPDATE`, `DELETE`, `DROP`, or `TRUNCATE` against the football analytics tables. Only the Anvia session memory store (`PrismaMemoryStore`) and the `pgvector` RAG embeddings table may be written to.
- Every MCP tool and API route validates its input with Zod before querying.
- Never expose raw SQL or database table names to the end user. Users are non-technical football journalists, content creators, and club staff.
- Enforce sample-size guardrails on scouting queries (default `>= 450` minutes played) and true positional share (`>= 35%` minutes in the target position).
- Never commit `.env*`, database dumps, or API keys (`OPENAI_API_KEY`, `TAVILY_API_KEY`, `DATABASE_URL`).

## Verification

Before saying a change is done, run and report:

- `pnpm typecheck`
- `pnpm build`
- For agent, prompt, RAG, or MCP tool changes: run the evaluation suite (`pnpm --filter @repo/agents eval`) and report the pass rate across the cases.
- For UI or visual report card changes: test in `pnpm dev` and verify that the visual card renders cleanly from a real tool call without layout overflow.

Don't claim something works if you didn't run it.

## Docs

- Change behaviour, change the doc in the same change:
  - Football domain or product rule changed: update the file in `docs/product/`.
  - New architectural choice: add a record in `docs/decision/` (next number `000X-...`, never reused).
  - New coding convention: update the matching file in `docs/rules/`.
- Don't rewrite an old decision. Add a new one that supersedes it and mark the old one `Superseded by`.
- Keep docs short and true. Point at file paths instead of pasting code that drifts.

## Scope & Ambiguity

- Do what was asked. Don't refactor unrelated code, rename things for taste, or add features the user didn't request.
- When something is unclear and the choice matters, ask the user. When it's a small reversible choice, make it, log it, and say what you chose.
- Don't invent football metrics or Liga 1 rules. If `docs/product/` doesn't cover the case, ask or flag it under `## Open questions` in the relevant product doc.
