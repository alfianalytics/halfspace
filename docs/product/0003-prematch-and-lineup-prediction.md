# Product 0003: Pre-match analysis and lineup prediction

- Status: Accepted
- Date: 2026-11-25

## How Pre-Match & Starting XI Prediction Works

A pre-match analysis combines **historical database facts** (PostgreSQL via `get_prematch_context`) with **current news and league rules** (RAG + Web Search MCP):

```text
PostgreSQL (Last 5 Matches: Lineups, Formations, xG, Cards)
   + RAG News (Injuries, Suspensions, Timnas Call-ups, Coach Quotes)
   + RAG Regulations (U-23 Mandatory Starter & Foreign Player Quotas)
   ─────────────────────────────────────────────────────────────────►
   Predicted Starting XI + Tactical Matchup Summary + Pitch Visual Board
```

## Rules

1. **Base Formation & Core Starters**:
   - Determine each club's primary formation from their most recent 3–5 matches in PostgreSQL.
   - Rank candidate starters by recent start frequency and minutes played over the last 5 matches.
2. **Availability Filtering (Confirmed Out vs. 50/50 Doubtful)**:
   - **Confirmed Out** (Red card in previous match, yellow card accumulation suspension threshold, confirmed injury, or National Team call-up in RAG/Web news): Exclude from the Starting XI, place in the **"Sidelined / Unavailable"** strip with an inline citation (`[doc_id]` or news URL), and promote the top positional backup into the Starting XI.
   - **50/50 Doubtful ("Diragukan Tampil")**: Keep the player in the Predicted Starting XI with a yellow **`Doubtful / Diragukan`** warning badge, display the primary backup player directly underneath their node (`Backup: <Player Name>`), and cite the news report `[doc_id]`.
3. **Liga 1 Quota Compliance**:
   - Verify the predicted Starting XI against the active season's **Indonesia Super League regulation doc** in RAG:
     - **U-23 Starter Requirement**: Ensure the required minimum number of eligible local U-23 player(s) is included in the starting XI.
     - **Foreign Player On-Pitch Limit**: Never place more foreign players in the predicted Starting XI than the regulation allows on the pitch simultaneously.
4. **Tactical Matchup Narrative**:
   - Compare both teams across 4 plain-language dimensions:
     1. **Chance Creation & Finishing** (Open-Play xG vs. Set-Piece xG).
     2. **Territory & Field Tilt** (Defensive / Middle / Attacking Third touch shares).
     3. **Defensive Intensity** (`PAdj` defensive actions and goalkeeper `xGOT` faced).
     4. **Key Player Duels** (impact of any sidelined or doubtful starter).
