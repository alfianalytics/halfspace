# 0005: Render 3 Inline Visual Report Card Templates with Dual Export Modes

- Status: Accepted
- Date: 2026-11-25

## Context

Non-technical football users (journalists, content creators, club staff) want publication-ready visual outputs directly from their chat conversation. Content creators also need flexibility to either post a complete dark-themed editorial card directly or export a clean transparent version to overlay onto their own broadcast/social templates.

## Decision

1. **Three Inline Visual Card Components (`apps/web/src/components/reports/`)**:
   - `PlayerScoutingCard`: single-season percentile bars and two-season evolution deltas (`25/26` → `26/27`).
   - `PrematchLineupCard`: side-by-side pitch formation diagram with 11 predicted starters per team, `U-23` / `Foreign` / `Doubtful` badges with backup player sub-labels, sidelined player list, and head-to-head team metrics.
   - `PeerComparisonCard`: automatically renders a **2D Scatter Quadrant** when comparing a cohort (`>= 3` players) or **Head-to-Head Comparison Bars** when comparing exactly `2` players.
2. **Dual PNG Export Toggle**:
   - Every visual card includes a theme/export toggle supporting:
     - **`Editorial Dark (#090A0F)`** (default): full card with title header, club/season badges, and cohort benchmark footer.
     - **`Transparent / Clean Mode`**: transparent background without outer chrome so creators can drop the chart directly into their design slides.

## Consequences

- Rendered inside `<MessagePrimitive.Parts>` whenever the corresponding visual tool completes.
- All visual card props are validated via shared Zod schemas so malformed data never crashes the chat UI.
