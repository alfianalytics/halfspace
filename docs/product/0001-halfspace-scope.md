# Product 0001: Halfspace scope

- Status: Accepted
- Date: 2026-11-25

## Purpose

An AI football intelligence and visual report assistant for the **Indonesia Super League (Liga 1)**. Designed for **non-technical users** (football journalists, content creators, pundits, and club staff) who do not know SQL and need instant, accurate scouting insights, pre-match lineup predictions backed by the latest news, and ready-to-share visual report cards—all through a natural chat interface.

## Core Use Cases & Modules

| Module / Capability | Trigger (In Chat / Home Screen) | Output | Details |
| :--- | :--- | :--- | :--- |
| **1. Player Scouting** | Natural language prompt or quick-start card (e.g. *"Carikan gelandang U-23 lokal terbaik musim ini"*) | Ranked shortlist table + grounded tactical narrative + inline **Player Scouting / Comparison Visual Card** | See [Product 0002](0002-player-scouting-and-metrics.md) |
| **2. Pre-Match & Lineup Prediction** | Match preview prompt or 1-click from **"Jadwal & Big Match Liga 1"** bar on Home (`/`) | Recent form & tactical matchup summary + RAG-cited availability check (injuries, cards, U-23 quota) + inline **Predicted XI Pitch Board** | See [Product 0003](0003-prematch-and-lineup-prediction.md) |
| **3. Visual Report Generation** | Single-player or two-season comparison request (e.g. *"Buatkan report evolusi 2 musim untuk pemain ini"*) | Narrative breakdown + downloadable **Visual Report Card** (`PlayerScoutingCard`, `PrematchLineupCard`, `PeerComparisonCard`) with **Editorial Dark** & **Transparent/Clean** PNG export toggle | See [Product 0004](0004-visual-report-templates.md) |
| **4. Session, News Sync & Trace UI** | `/`, `/s/$id`, Sidebar controls | Persistent multi-turn chat sessions (`halfspace` schema + fallback), manual **"Sync Berita Terbaru"** trigger (+ daily post-turn auto-sync), and per-turn **In-App Trace Summary** | Full transparency and zero technical setup for the end user |

## Home Screen (`/`) Onboarding Rules

1. **Quick-Start Use Case Cards**: Display 3 interactive cards for *Player Scouting*, *Pre-Match & Predicted XI*, and *Two-Season Visual Report*.
2. **Live "Jadwal & Big Match Liga 1" Bar**: Pull real upcoming or latest Liga 1 fixtures from PostgreSQL so a non-technical user can click any fixture pill (e.g. `Persib vs Persija`) to immediately launch a pre-match tactical & lineup analysis.

## Out of scope

- **Raw SQL / BI query editors**: Users never write SQL or configure database schemas.
- **Live match-event scraping inside the request loop**: Match stats are queried from our existing PostgreSQL analytics database (`sofascore` schema); news is indexed via the Hybrid News Sync Workflow + live Web Search MCP fallback.
- **Betting / gambling advice or scoreline odds**: Strictly tactical, statistical, and editorial football analysis.
- **Authentication & multi-tenant billing**: Single workspace with persistent chat sessions for the demo and evaluation scope.
