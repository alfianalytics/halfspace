# Halfspace — Indonesia Super League Intelligence & Visual Report Assistant

> **AI Product Engineering with TypeScript Batch II — Final Project**  
> Conversational football intelligence and visual report generation assistant for the **Indonesia Super League (Liga 1)**, built for non-technical users (football journalists, content creators, pundits, and club coaching/scouting staff).

---

## 📄 Product & Engineering Documentation

- **[PRD.md](PRD.md)**: Complete 1–2 page Product Requirements Document covering the 7 mandatory Final Assignment sections.
- **[AGENTS.md](AGENTS.md)**: Rules and constraints for AI coding agents working in this repository.
- **[docs/README.md](docs/README.md)**: Software Factory knowledge base index:
  - [`docs/decision/`](docs/decision/): Architectural Decision Records (`0001`–`0006`).
  - [`docs/product/`](docs/product/): Domain rules for Liga 1 scouting, pre-match lineup predictions, and inline visual report templates (`0001`–`0004`).
  - [`docs/rules/`](docs/rules/): Coding conventions by layer (`architecture`, `server`, `client`, `database`, `styling`, `workflow`).

---

## 🎯 Core Use Cases

1. **Player Scouting**: Natural-language scouting filters (e.g., U-23 local central midfielders) backed by true positional role share (`>= 35%` minutes), per-90 rates, and Possession-Adjusted (`PAdj` per 500 opponent touches) defensive metrics.
2. **Pre-Match Analysis & Starting XI Prediction**: Combines historical PostgreSQL match lineups, formations, and disciplinary card counts with **Hybrid News & Regulation RAG** (injuries, `50/50 Doubtful` status with named backups, Timnas call-ups, and PSSI/LIB U-23 & foreign player quotas).
3. **Inline Visual Report Cards**: Renders publication-ready visual templates (`PlayerScoutingCard`, `PrematchLineupCard`, `PeerComparisonCard`) directly inside the `@anvia/react-ui` chat stream with 1-click PNG export (`Editorial Dark #090A0F` or `Transparent / Clean Mode`).
