# 0002: Read-only PostgreSQL (`sofascore`) + Dedicated `halfspace` Schema for RAG & Session Memory

- Status: Accepted
- Date: 2026-11-25

## Context

We already have a comprehensive PostgreSQL database (`football_db` on VPS) containing multi-season Indonesia Super League (`24/25`, `25/26`, `26/27`) match logs, player statistics, shot maps, disciplinary incidents, and ML-estimated player positions inside the `sofascore` schema. However:
1. The `sofascore` schema must remain strictly read-only so no agent tool can ever mutate match data.
2. We need persistent storage for our **Hybrid News & Regulation RAG** (`pgvector` embeddings + curated local corpus) and **Anvia Session Memory** (`PrismaMemoryStore`).

## Decision

1. **Match & Player Statistics (`sofascore` schema — Strictly Read-Only)**:
   - Connect `packages/mcp-server` to `football_db.sofascore` using a read-only query layer.
2. **RAG Embeddings & Session Memory (`halfspace` schema + Local Fallback)**:
   - Store RAG document chunks (`halfspace.rag_documents`) and Anvia conversation sessions in a dedicated `halfspace` schema on the same PostgreSQL database, paired with a local JSON/file-backed fallback store so the app and `@anvia/core/evals` suite remain 100% deterministic even when offline.
3. **Hybrid RAG Corpus Strategy**:
   - Seed a curated local corpus of Liga 1 competition regulations (`24/25`–`26/27`), tactical profiles, and golden matchweek news articles (ensuring deterministic Evals).
   - Augment dynamically via the **Hybrid News Sync Workflow**, which auto-fetches recent Indonesian football news via RSS/Tavily/Portal Bola Indonesia when no news has been synced today, or when triggered manually via the UI **"Sync Berita Terbaru"** button.

## Consequences

- Zero risk of corrupting the `sofascore` match analytics tables.
- Non-technical users get answers that combine hard numbers (`sofascore.*`) with qualitative reasons, injury updates, and league rules (`halfspace.rag_documents`) in one turn.
- Every RAG-backed claim in a scouting or pre-match report must carry an inline `[doc_id]` citation.
