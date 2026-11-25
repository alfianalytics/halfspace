# Product 0004: Visual report templates

- Status: Accepted
- Date: 2026-11-25

## Purpose

Give non-technical users instant, editorial-grade visual cards inside the chat thread that they can read at a glance or download as PNG for articles, social media, or scouting decks.

## The 3 Visual Card Templates

| Template Component | Trigger Tool Name | When Used | Required Data Sections |
| :--- | :--- | :--- | :--- |
| **`PlayerScoutingCard`** | `render_player_scouting_card` | Single-player scouting profile or 2-season evolution (`25/26` → `26/27`) | Player header (name, club, age, nationality, true position share, minutes played, optional `Early Season Sample` badge), 4 metric groups (*Attacking & xG*, *Progression & Passing*, *Possession-Adjusted Defense*, *Duels & Discipline*) with percentile bars (`0–100`) and optional previous-season delta markers. |
| **`PrematchLineupCard`** | `render_prematch_lineup_card` | Pre-match preview & Starting XI prediction | Match header (Home vs Away, season), side-by-side pitch formation diagram (11 predicted starters per team with position nodes, `U-23` / `Foreign` badges, and yellow `Doubtful` badge + `Backup: <Name>` sub-label when 50/50), "Sidelined / Unavailable" list with cited reasons, and 4 head-to-head team metric bars. |
| **`PeerComparisonCard`** | `render_peer_comparison_chart` | Scouting shortlist or comparing players against Liga 1 positional peers | **Adaptive Layout Rule**:<br>- When comparing **exactly 2 players**: renders side-by-side **Head-to-Head Comparison Bars** across core metrics.<br>- When comparing **`>= 3` players / cohort**: renders a **2D Scatter Quadrant** encoding **U-23 vs Senior** (fill color) and **Local (`IDN`) vs Foreign** (pill shape/border) with the focal player highlighted. |

## Rules

1. **Zero Hallucinated Numbers**:
   - The visual card tools do **not** let the LLM invent arbitrary numbers in free text. The tool takes a validated player/team identifier or structured output produced directly from `liga1-intelligence-mcp` and runs through the deterministic schema validator.
2. **Dual Metric Naming (Technical + Tactical Plain Language)**:
   - Because users are non-technical, every metric label on a visual card shows both the clear tactical meaning and the metric code (e.g., `Long Ball Progression (Acc. Long Balls / 90)` or `Proactive Defense (PAdj Interceptions)`).
3. **Dual PNG Export Toggle (`Editorial Dark` vs `Transparent / Clean Mode`)**:
   - Every visual card provides a toggle before exporting PNG:
     - **`Editorial Dark (#090A0F)`** (default): full card with header, badges, dark gunmetal background, and cohort benchmark footer.
     - **`Transparent / Clean Mode`**: removes the outer background and header/footer chrome so content creators can overlay the graphic directly onto their own slides or videos.
4. **Sample & Peer Cohort Footer**:
   - In Editorial Dark mode, every visual card displays a footer stating the exact peer benchmark cohort (e.g., *"Benchmarked against 42 Liga 1 Central Midfielders with >= 450 mins in 26/27 • Source: PostgreSQL Match DB & Halfspace RAG"*).
