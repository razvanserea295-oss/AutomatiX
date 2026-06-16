# AIAssistantPage — function inventory
**Route:** ai · **Workspace:** instrumente · **File:** pages/ai/AIAssistantPage.tsx · **Lines:** 530
**Props/contract:** `export default function AIAssistantPage(_props: AIAssistantPageProps)` where `interface AIAssistantPageProps { user: User | null }`. NOTE: the `user` prop is currently received but **unused** (destructured as `_props`); the rebuild may keep or drop it.

## Backend functions (apiCommand) — ALL must survive
This page makes **NO `apiCommand()` calls**. It bypasses the standard command registry and talks **directly to the standalone Rust ai-service over HTTP** via the `@/api/ai` client. These HTTP endpoints are the load-bearing backend surface and MUST all survive the rebuild:

- `POST {aiServiceUrl}/chat` — sends the full message thread + session_id + the user's PROMIX JWT (`user_token`) to the agent; returns `{ reply, tools_used[], session_id, iterations }`. Wrapped by `aiChat(messages, sessionId)`. Triggered by Send button / Enter key. Prepends `AI_SYSTEM_PROMPT` (schema-aware, READ-ONLY rules) as a leading `system` message unless caller already supplied one. 120s timeout.
- `GET {aiServiceUrl}/health` — connectivity probe, returns boolean ok. Wrapped by `aiHealth()`. Triggered on mount + every 60s interval. Drives the Conectat/Deconectat/Verifică status dot.
- `GET {aiServiceUrl}/queue` — returns `{ active: number }` queue snapshot. Wrapped by `aiQueueDepth()`. Triggered every 2s **only while a request is in flight**; shown as "AI ocupat — X cereri în față de tine" (`max(0, active-1)`).

**AI agent tools (invoked server-side by the LLM, surfaced as `tools_used` chips):**
- `query_database` — the only tool the system prompt instructs the agent to call; read-only SQL over a fixed allow-listed schema (sales_leads, projects, project_pieces, clients, suppliers, materials, finance_invoices, quotations, etc.). PII tables (users, sessions, audit_logs, daily_briefings) are blocked. Any tool name returned in `tools_used[]` is rendered as a Wrench chip — the UI is tool-agnostic, so whatever tools the Rust agent exposes must keep flowing through `reply.tools_used`.

URL resolution / auth (in `@/api/ai`, must survive): `getAiServiceUrl()` (localStorage `AI_SERVICE_URL` override → else derive: `/ai` path behind reverse proxy, or port-8100 swap on LAN, or `127.0.0.1:8100`), `setAiServiceUrl()` (validates http/https + `isAllowedAiHost` loopback/RFC1918/same-origin guard against token exfil), `getAiServiceToken()`/`setAiServiceToken()` (localStorage `AI_SERVICE_TOKEN`, sent as `Authorization: Bearer`). The PROMIX JWT (localStorage `TOKEN`) is forwarded as `user_token` so the AI inherits the caller's role/permissions — never broader.

## Data sources (stores / hooks)
- **No Zustand stores. No server hooks.** All chat history lives in **`localStorage`** under key `promix_ai_conversations_v2` with a **7-day TTL** — no backend persistence.
- `loadAll()` / `saveAll()` — read/write+prune expired conversations, sorted by `updatedAt` desc.
- React local state only: `conversations`, `activeId`, `active`/`messages` (derived via `useMemo`), `inputValue`, `sending`, `error`, `connected` (health), `queueDepth`, `elapsedSec`.
- Refs: `chatEndRef` (scroll anchor), `chatScrollRef`, `textareaRef`.
- Helpers: `makeSessionId()`, `deriveTitle(messages)` (first user line, ≤48 chars), `groupConversations()` (Astăzi / Ieri / Mai vechi), `persistConvo()` (setState + saveAll wrapper).

## User actions & controls
- **Conversație nouă** (sidebar primary button + header? no — sidebar only) — `handleNewConversation`: new sessionId, clears error/input, focuses textarea.
- **Select conversation** — clicking a sidebar row sets `activeId` (highlights active row with accent left-border).
- **Delete conversation (per-row)** — hover-revealed Trash2 inside each sidebar row; `handleDeleteConversation(id)` (stopPropagation; Enter key also triggers); if active deleted, falls back to next remaining or a fresh session.
- **Șterge (active conversation)** — header button (only shown when `messages.length > 0`); `handleClearActive` → deletes the active conversation.
- **Send message** — Send icon Button (disabled while sending or empty input) + Enter key; `handleSend`: optimistically appends user msg, persists, calls `aiChat`, appends assistant reply (or "(răspuns gol)"), fires confetti if `iterations > 1`.
- **Type / multiline input** — auto-resizing `<textarea>` (`resizeTextarea`, min 40px / max 160px); disabled while sending.

## Modals & dialogs
— none — (no modals, dialogs, sheets, or popovers; delete is immediate with no confirm).

## Filters / search / sort / tabs / sub-views
- **No filters, no search, no sort, no tabs, no pagination.**
- Sidebar conversations are **grouped** into Astăzi / Ieri / Mai vechi (by `updatedAt`) and sorted newest-first. Empty state: "Nicio conversație încă."

## Exports / print / file ops
— none — (Q2 simplification explicitly retired markdown export, voice input, citations, token usage, multi-document context, file upload. No print/PDF/clipboard/download.)

## Keyboard shortcuts / realtime / polling
- **Enter** = send; **Shift+Enter** = newline (`handleKeyDown`).
- **Enter** on a row's delete affordance also deletes (accessibility).
- **Health polling:** `aiHealth()` on mount + `setInterval` every **60s**.
- **Queue polling:** `aiQueueDepth()` every **2s** while `sending` is true only.
- **Elapsed timer:** 1s tick while sending → drives staged "Se gândește… / Procesează… / Lucrează — Ns scurse" copy.
- **Auto-scroll:** `chatEndRef.scrollIntoView({behavior:'smooth'})` on new message / sending change.
- **Confetti:** `fireConfetti()` (from `@/lib/confetti`) when assistant reply `iterations > 1`.

## Sub-components owned
— none — (single self-contained component; no child modal/tree/enhancement components). Reuses shared UI `<Page>` and `<Button>`; icons from lucide-react (Send, Bot, User, Loader2, Trash2, Wrench, Zap, Plus, MessageSquare).

## Access / permissions
- **No client-side role gating in the page.** Any logged-in user reaching the route can chat.
- Effective permissions are enforced **server-side**: the forwarded PROMIX JWT (`user_token`) makes the Rust agent run every PROMIX command under the caller's own role — the AI inherits exactly the caller's permissions, no broader.
- AI is **READ-ONLY** by system-prompt contract (cannot create/update/delete; PII tables blocked). `isAllowedAiHost` prevents pointing the service at an untrusted host (JWT exfil guard).

## Rebuild notes (Modern-SaaS layout intent)
Keep the **two-pane shell**: left sidebar = conversation history (grouped Today/Yesterday/Older, primary "Conversație nouă" button pinned top, hover-delete per row, active-row accent); right = chat surface (sticky header with title + connection status dot + "Șterge", scrollable message list, sticky bottom composer). This is already a clean SaaS chat layout — modernize spacing/typography but DO NOT reintroduce removed features unless asked.
- **Primary action:** the composer Send (Enter to send, Shift+Enter newline). Secondary: New chat.
- **Message rendering:** user bubbles right-aligned (accent tint), assistant left-aligned with avatar; preserve `whitespace-pre-wrap break-words` + `min-w-0` wrapping (load-bearing fix: a single long token used to push the sidebar off-screen).
- **Tool/iteration chips** under assistant messages (`tools_used` → Wrench chips, `iterations` → "N pași" Zap chip) — keep; they are the only window into agent activity.
- **In-flight feedback:** thinking bubble with queue depth + staged elapsed copy — preserve the honest "X cereri în față" wait signal (the Rust service serializes at a Mutex, so this is real wait time).
- **Persistence stays client-side localStorage (7-day TTL)** unless the rebuild adds backend persistence — if so, keep the same `{sessionId, title, messages, updatedAt}` shape and session_id forwarding to `/chat`.
- Use cards-vs-table: neither — this is a chat thread; keep it as a message list, not a data table.
