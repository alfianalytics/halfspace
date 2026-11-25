# Documentation Index (`docs/`)

This folder is the single source of truth for **human engineers** and **AI coding agents** working on **Halfspace** (Indonesia Super League Intelligence & Visual Report Assistant).

Follows the Devscale Software Factory knowledge-base pattern (`erp-mock`):

```text
docs/
├── README.md                  # This index
├── decision/                  # Architectural Decision Records (ADRs) — numbered 0001..NNNN
│   ├── 0001-pnpm-monorepo-and-anvia-stack.md
│   ├── 0002-readonly-postgres-and-pgvector-rag.md
│   ├── 0003-workflow-vs-agent-boundary.md
│   ├── 0004-mcp-producer-and-consumer-architecture.md
│   ├── 0005-inline-visual-report-cards-in-chat.md
│   └── 0006-evals-and-lens-observability.md
├── product/                   # Product scope, domain rules, and Open Questions
│   ├── 0001-halfspace-scope.md
│   ├── 0002-player-scouting-and-metrics.md
│   ├── 0003-prematch-and-lineup-prediction.md
│   └── 0004-visual-report-templates.md
└── rules/                     # Coding, data, and workflow conventions for AI agents
    ├── architecture.md
    ├── client.md
    ├── database.md
    ├── server.md
    ├── styling.md
    └── workflow.md
```

## How AI Agents Must Use This Folder

1. **`docs/decision/` (Why we built it this way)**:
   - Immutable records of architectural choices (`Status`, `Date`, `Context`, `Decision`, `Consequences`).
   - Never overwrite an accepted decision to reverse it; create a new numbered file (e.g. `0007-...`) and mark the old one `Superseded by 0007`.
2. **`docs/product/` (What the product does & Open Questions)**:
   - Defines business logic, football analytics formulas (`PAdj`, true position share, proxy metrics), Liga 1 quota rules, and visual report payloads.
   - Each product file has an **`## Open questions`** section at the bottom. If an AI agent encounters an ambiguous domain edge case, it must **not** guess silently—either ask the user or record the ambiguity under `## Open questions`.
3. **`docs/rules/` (How code must be written)**:
   - Strict rules by layer (`architecture`, `server`, `client`, `database`, `styling`, `workflow`).
