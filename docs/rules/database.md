# Database & RAG rules

## Analytics PostgreSQL (`sofascore` schema — Read-Only)

1. **Strict Read-Only Access**:
   - All queries against `sofascore.*` tables MUST be `SELECT`-only. Never execute `INSERT`, `UPDATE`, `DELETE`, `DROP`, `ALTER`, or `TRUNCATE` on match/player tables.
2. **Deduplication Invariant**:
   - Prefer joining player/team match stats against the deduplicated dimension tables (`1` row per player/team).
   - If querying match-grain player or team tables directly, always deduplicate with `SELECT DISTINCT ON (player_id) ... ORDER BY player_id, last_modified_datetime DESC NULLS LAST` so row counts never inflate via cartesian joins.
3. **Guarded Ad-Hoc SQL Tool (`query_liga1_readonly_sql`)**:
   - Enforce `SELECT`-only validation (reject any query containing mutating keywords or semicolons chaining statements), run inside a `READ ONLY` transaction with `SET LOCAL statement_timeout = '3000ms'`, and cap results at `LIMIT 50`.
4. **Numeric Casting & Null Safety**:
   - SQL aggregates (`SUM`, `AVG`, `COUNT`) return strings or `null` in Node `pg`. Always coerce safely (`Number(row.val ?? 0)`) and guard against division by zero (`NULLIF(minutes_played, 0)`).
5. **Season Reference (Indonesia Super League — `tournament_id = 1015`)**:
   - Season `24/25` = `65049`
   - Season `25/26` = `78590`
   - Season `26/27` = `100394` (default current season when user asks for "musim ini")

## Dedicated `halfspace` Schema (RAG & Session Memory + Local Fallback)

1. **Isolated Write Schema (`halfspace`)**:
   - Create and use `halfspace` schema on the PostgreSQL database (`CREATE SCHEMA IF NOT EXISTS halfspace`) for all application writes (RAG chunks/embeddings and Anvia chat session memory), keeping `sofascore` untouched.
   - Maintain a local JSON/file-backed fallback store (`.local-rag-store.json` and `.sessions-memory.json`) so the app and `@anvia/core/evals` work seamlessly even if the VPS connection is unavailable.
2. **RAG Metadata Contract**:
   - Every RAG chunk must preserve:
     - `doc_id` (human-readable citation slug, e.g. `news-persib-injury-nov26` or `reg-liga1-u23-2627`)
     - `category` (`news` | `regulation` | `methodology` | `tactical_profile`)
     - `club` (optional club tag for filtered retrieval)
     - `published_date` (`YYYY-MM-DD`)
     - `source_url`
3. **Recency-Weighted News Retrieval**:
   - When retrieving news for **Pre-Match & Lineup Prediction**, rank by combined semantic similarity and `published_date` recency so outdated injury reports do not override current status.
