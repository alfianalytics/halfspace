# Client & Visual Report UI rules

## Chat & Session Routes (`apps/web`)

1. **Session Identity (`/s/$id`)**:
   - The home route (`/`) creates a new `sessionId` once, stores the first message in `pending-message.ts` (in-memory `Map`, read-once-then-delete), and navigates to `/s/$id`.
   - `/s/$id` loads saved history from `GET /api/session/:id`, converts messages via `messagesToUIMessages`, and passes `initialMessages` to `useChat({ transport, initialMessages })`.
   - Pass `key={id}` to `<ChatScreen />` so switching sessions resets local controller state cleanly.
   - On `run_end` in `useChat({ onEvent })`, call `router.invalidate()` on the root route so the sidebar session list refreshes automatically.

## Inline Visual Report Cards (`apps/web/src/components/reports/`)

1. **Custom Tool Part Rendering**:
   - Inside `<MessagePrimitive.Parts>`, intercept `part.type === "tool"`.
   - If the tool is `render_player_scouting_card`, `render_prematch_lineup_card`, or `render_peer_comparison_chart` and its output is ready, render the matching visual card component inline in the assistant message.
   - For non-visual tools (`scout_players`, `search_news_rag`, `web_search`), render a compact collapsible `<ToolCall />` badge showing the tool name, inputs, and status.
2. **Graceful Loading & Error States**:
   - While a visual card tool is still streaming/executing, display a clean skeleton card (`Generating Visual Report Card...`).
   - Validate tool output with `.safeParse()` before rendering. If validation fails, fall back to a readable table instead of crashing the React tree.
3. **PNG Download Support**:
   - Every visual card includes an **"Export PNG"** action button so non-technical users can save the graphic in one click.
