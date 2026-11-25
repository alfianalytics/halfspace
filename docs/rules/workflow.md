# Workflow & Verification rules

## How AI Coding Agents Work in This Repo (Day 19 Slide 4)

1. **Read the spec first**: Check `AGENTS.md`, `PRD.md`, `docs/product/`, and `docs/decision/` before writing code.
2. **Code in small steps**: Build one package or feature slice at a time (`packages/db` → `packages/mcp-server` → `packages/agents` → `apps/api` → `apps/web`).
3. **Run the checks after every step**:
   - `pnpm typecheck`
   - `pnpm build`
   - `pnpm --filter @repo/agents eval` (when touching prompts, RAG, or MCP tools)
4. **Commit one step at a time**: Short imperative commit subject; body explains why and references the relevant `docs/decision/` or `docs/product/` file.

## Handling Ambiguity (When the AI Agent is Unsure)

- **Never invent football business rules or silently guess on product trade-offs**:
  1. First, check `docs/product/` and `docs/decision/`.
  2. If the rule is still missing and blocks the current task, **ask the user**.
  3. If it is a future edge case discovered while coding, document it under `## Open questions` in the relevant `docs/product/000X-*.md` file and report it in your summary.
  4. Once the user answers an open question, remove it from `## Open questions` and record the permanent rule in `docs/product/` or add a new ADR in `docs/decision/`.
