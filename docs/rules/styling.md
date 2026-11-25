# Styling & Visual Card Design rules

## App Shell & Chat UI

- Tailwind CSS v4 with clean editorial dark/light theme tokens.
- Keep the chat thread readable (`max-w-4xl` container for messages and visual cards) with a collapsible left sidebar for saved sessions (`/s/$id`) and quick-start use-case templates.
- Use `lucide-react` icons sized consistently (`size-4` for inline controls).

## Editorial Visual Report Cards (`apps/web/src/components/reports/`)

1. **High-Density Editorial Hierarchy (No Generic AI Slop)**:
   - Dark gunmetal/obsidian card canvas (`#090A0F` / `bg-zinc-950`) with crisp border hairlines (`border-zinc-800`) and tabular numerals (`font-variant-numeric: tabular-nums`) so numbers and percentiles align vertically.
2. **Dual Metric Naming**:
   - Every metric row displays the **Plain-Language Tactical Meaning** in bold primary text and the **Technical Metric Code** in muted secondary text (e.g., **Ball Progression** · `Acc. Long Balls / 90`).
3. **Color Encoding**:
   - **Percentile Bars (`0–100`)**: Elite (`>= 80`) in emerald/teal, Above Average (`60–79`) in sky blue, Average (`40–59`) in amber/neutral, Below Average (`< 40`) in coral/rose.
   - **Player Quota Badges**:
     - `U-23` badge in vibrant emerald pill; `Senior` in neutral slate.
     - `IDN (Local)` in solid rounded pill; `Foreign` in outlined square badge.
   - **Two-Season Evolution Markers**: Show `Prev Season → Current Season` connected by a clear delta indicator (`+` in emerald, `-` in rose).
4. **Pitch Board Layout (`PrematchLineupCard`)**:
   - Render an SVG football pitch with 11 positioned starter nodes per team according to their predicted formation (e.g., `4-3-3` or `4-2-3-1`), plus a clear sidelined/unavailable strip below the pitch citing the injury/suspension reason.
