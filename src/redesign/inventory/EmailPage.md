# EmailPage — function inventory
**Route:** email · **Workspace:** instrumente · **File:** pages/email/EmailPage.tsx · **Lines:** 497
**Props/contract:** `EmailPage({ user: _user }: { user: User | null })` — receives the current `User | null`; the prop is currently unused (aliased `_user`). No other props.

## Backend functions (apiCommand) — ALL must survive
- `email_get_account` — loads the configured IMAP/SMTP email account (`EmailAccount | null`); if null → "Email neconfigurat" no-account screen · triggered on mount via `loadAccount()`.
- `email_list_folders` — loads folder list with per-folder `message_count` / `unread_count` (falls back to a single synthetic `INBOX` when empty) · triggered when an account exists, on folder change, after sync, and after send.
- `email_list_messages` — loads paginated message list `{ messages, total }` for `{ folder, page, page_size: 50 }` · triggered on account/folder change, pagination, and after sync when new messages arrive.
- `email_sync_inbox` — pulls new mail from IMAP, returns `{ new_messages }`; reloads messages (if >0) + folders · triggered by the "Sync" button in the sidebar footer.
- `email_get_message` — fetches the full message (`EmailFull`: html/text body, to/cc, attachments) for `{ message_id }`; also marks the row read locally · triggered by clicking/Enter on a message row.
- `email_toggle_star` — toggles starred flag for `{ message_id }`; optimistic local flip · triggered by the star button on each message row.
- `email_trash` — moves a message to Trash for `{ message_id }`; clears selection + reloads list · triggered by the trash icon in the email view header.
- `email_send` — sends an email with `{ request: { to[], cc?[], subject, body_html, attachments?, reply_to_message_id? } }`; on success switches to Sent folder · triggered by the "Trimite" button in ComposeView (new + reply).
- `email_download_attachment` — fetches base64 `{ data, content_type }` for `{ attachment_id }`; decoded to a Blob and downloaded · triggered by clicking an attachment chip in the email view.

Note: EmailEnhancements.tsx makes **no** apiCommand calls — all its features are client-only (localStorage) or toast stubs.

## Data sources (stores / hooks)
- `apiCommand` (`@/api/commands`) — all server data (account, folders, messages, message detail, send, attachment download).
- `toast` (`@/store/toastStore`) — error/info notifications.
- Local React state only (no Zustand): `account`, `noAccount`, `folders`, `currentFolder`, `messages`, `selected`, `loading`, `syncing`, `composing`, `replyTo`, `page`, `total`, `showTools`.
- `useLocalStorage` (`@/components/enhancements`) — EmailEnhancements persistence keys: `promix_email_templates_v1`, `promix_email_receipts_v1`, `promix_email_rules_v1`, `promix_email_signatures_v1`.
- `Link` (`wouter`) — navigation to `/settings` from the no-account screen.

## User actions & controls
- **Compune** button (sidebar) — opens ComposeView (new message, clears replyTo + tools).
- **Folder buttons** (sidebar list) — switch `currentFolder`, reset page to 1, clear selection/tools; show unread-count badge.
- **Email tools** toggle (sidebar footer) — show/hide the EmailEnhancements 4th-pane; clears selection + compose.
- **Sync** button (sidebar footer) — runs `email_sync_inbox`; spinner while syncing; shows "Ultima: HH:MM" last-sync timestamp.
- **Message row click / Enter** — opens full message (`email_get_message`), marks read.
- **Star button** (per row) — `email_toggle_star`, optimistic; `e.stopPropagation()` so it doesn't open the message.
- **Attachment indicator** (Paperclip) — visual flag on rows with attachments.
- **Pagination Înapoi / Înainte** (message-list footer, shown when `total > 50`) — prev/next page of 50; disabled at bounds.
- **EmailView: Raspunde** — opens ComposeView prefilled as reply (To=from, "Re:" subject, quoted original).
- **EmailView: Trash icon** — `email_trash`, clear selection, reload.
- **EmailView: Back (ChevronLeft, lg:hidden)** — clears selection (mobile back to list).
- **EmailView: attachment chips** — download via `email_download_attachment`.
- **ComposeView: Trimite** — `email_send` (validates non-empty To; parses comma-separated To/CC into `{email,name:null}`).
- **ComposeView: Paperclip / file input** — add attachment (FileReader → base64); remove attachment via per-chip X.
- **ComposeView: Anulează / X** — close compose, clear replyTo.
- **No-account screen: "Mergi la Setari"** — wouter Link to `/settings`.

## Modals & dialogs
- No overlay modals/sheets. The right pane is a **mode-switched 4th pane** (not a modal) that renders one of: `ComposeView`, EmailEnhancements (`showTools`), `EmailView` (`selected`), or an empty-state prompt.
  - **ComposeView** — fields: Către* (To), CC, Subiect, Mesaj (textarea HTML body), attachments list. Footer: Trimite / attach / Anulează.
  - **EmailView** — read-only message: subject header, from→to, date, sandboxed iframe HTML body (or `<pre>` text fallback), attachments strip, Raspunde/Trash actions.
  - **EmailEnhancements pane** — 7 SectionCards (see Sub-components).

## Filters / search / sort / tabs / sub-views
- **Folder navigation** acts as the primary tab/sub-view selector (INBOX / Sent / Trash / Drafts + any server folders, with icon+label mapping).
- **Pagination** — 50/page, prev/next, page counter; total shown in list header.
- No free-text search, no column sort, no client-side filter on the message list (filtering only via the localStorage Rules card stub).
- EmailEnhancements is a separate stacked sub-view (no internal tabs).

## Exports / print / file ops
- **Attachment download** — `email_download_attachment` → base64 → Blob → programmatic `<a download>` click (EmailView).
- **Attachment upload** — ComposeView hidden file input → FileReader `readAsDataURL` → base64 payload in `email_send`.
- No PDF/print/clipboard.

## Keyboard shortcuts / realtime / polling
- **Enter** on a focused message row opens it (`onKeyDown`).
- No polling, no websocket/realtime; mail refresh is manual via the Sync button only.
- Email body rendered in a `sandbox="allow-same-origin"` iframe (HTML written via `doc.write`); text fallback in `<pre>`.

## Sub-components owned
- **EmailView** (in EmailPage.tsx) — message reader + attachments + reply/trash; iframe body renderer.
- **ComposeView** (in EmailPage.tsx) — new/reply composer with attachments.
- **EmailEnhancements** (EmailEnhancements.tsx) default export — wrapper rendering 7 cards:
  - **TemplatesCard** — CRUD reply templates (name/subject/body) in localStorage; "Aplică" calls `onInsertSubject`/`onInsertBody` (currently no props wired from page → insert is inert).
  - **ScheduleSendCard** — datetime-local + "Programează" → toast stub ("backend cron necesar").
  - **MailMergeCard** — CSV recipients + `{{name}}` body → "Pregătește" → toast count stub.
  - **ProjectAutoLinkCard** — informational only (auto-link by project id in subject).
  - **ReadReceiptsCard** — checkbox (pixel tracking) persisted to localStorage.
  - **RulesCard** — CRUD filter rules (subject_contains / from_contains / folder) in localStorage.
  - **SignaturesCard** — CRUD signatures (name/html) in localStorage.
- Shared: `SectionCard`, `useLocalStorage` (`@/components/enhancements`); `Page`, `Button`, `EmptyState` UI primitives.

## Access / permissions
- No client-side role gating in the component; the `user` prop is unused (aliased `_user`). Page is reachable to any authenticated user who has the route.
- The no-account guard (`noAccount`) is a config gate, not a permission gate — directs to Settings to configure IMAP/SMTP.
- Server-side per-command auth (`email_*` handlers in `electron/services/emailService.ts` / registry) governs actual access; email TLS strict by default.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the classic **three-pane mail layout**: left folder rail (with Compose CTA + unread badges + Sync/last-sync), middle message list (50/page, star/attachment/unread affordances), right reading pane. This is the correct, recognizable pattern — don't flatten to cards.
- **Primary action:** Compose (top of folder rail). Secondary: Sync + Email tools.
- Right pane stays mode-switched (Empty → Read → Compose → Tools); modernize as a clean panel with a subtle header per mode rather than overlay modals. Consider Compose as a slide-over/dialog on narrow screens.
- Make the message list airier: avatar/initial chip, sender + time on one line, subject, snippet, star + attachment icons; bold unread; left accent bar for selected. Add real search + sort if rebuilding the list (currently absent).
- Move "Email tools" out of a cramped footer toggle into a clearly labeled secondary surface (settings-style panel or its own route/tab); preserve all 7 localStorage cards. Wire TemplatesCard's `onInsertSubject`/`onInsertBody` to the composer (currently dead) so "Aplică" actually fills the compose form.
- Preserve the sandboxed-iframe HTML body rendering and the base64 attachment download/upload flows exactly — they are load-bearing and security-relevant.
- All 9 `email_*` apiCommands must survive unchanged.
