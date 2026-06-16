# ChatPage — function inventory
**Route:** chat · **Workspace:** instrumente · **File:** pages/chat/ChatPage.tsx · **Lines:** 963
**Props/contract:** `ChatPage({ user }: { user: User | null })` — single prop `user` (current logged-in user); `myId = user?.id || 0` is used throughout for "is mine"/admin checks.

## Backend functions (apiCommand) — ALL must survive
- `get_chat_conversations` — loads the conversations list (DM + groups) with unread counts, last message, group meta · triggered by initial mount, 5s poll, window focus, after send/startChat/createGroup/group edits, and the 500ms re-fetch in `startChat`.
- `get_chat_messages` — loads all messages for `{ conversation_id }` · triggered when active conversation changes, 3s poll while a convo is open + visible, on window focus, and immediately after `handleSend`.
- `mark_chat_read` — marks `{ conversation_id }` as read (clears unread badge / sets read receipts) · triggered when a conversation becomes active.
- `get_users` — fetches all users (filtered to exclude self) for the people pickers · triggered when New-chat, New-group, or Add-members panel opens.
- `send_chat_message` — sends a message `{ conversation_id?, to_user_id?, content, message_type, attachment_name?, attachment_data? }`; `message_type` is `'text'` or `'file'` · triggered by Send button / Enter key (one call per pending file, then one for the text), and by `startChat` (sends a 👋 wave to open a new DM).
- `create_chat_group` — creates a group `{ name, member_ids }`, returns the new conversation · triggered by "Creeaza grup" button in New-group panel.
- `get_chat_group_details` — loads full group detail `{ conversation_id }` (members, roles, creator, created_at, avatar) · triggered by clicking the group avatar/name in the chat header (`openGroupSettings`).
- `update_chat_group` — updates group `{ conversation_id, name }` OR `{ conversation_id, avatar }` (data-URL) · triggered by saving the group-name edit and by uploading a new group avatar.
- `set_chat_group_admin` — promotes/demotes a member `{ conversation_id, member_id, is_admin }` · triggered by the Shield per-member button (creator-only).
- `remove_chat_group_member` — removes a member `{ conversation_id, member_id }` · triggered by the UserMinus per-member button after a `window.confirm` (creator-only).
- `add_chat_group_members` — adds members `{ conversation_id, member_ids }` · triggered by "Adaugă N membri" in the Add-members sub-panel (admin-only).

## Data sources (stores / hooks)
- No Zustand store for data — all state is local `useState` (convos, activeConvo, messages, input, search, allUsers, group drafts, pendingFiles, previewImage, dragging, groupSettings, etc.). Data is fetched directly via `apiCommand` + polling.
- `toast` from `@/store/toastStore` — success/error notifications.
- `user` prop supplies identity (`myId`).
- Refs: `messagesEndRef`, `messagesScrollRef` (auto-scroll), `textareaRef` (auto-grow/reset), `fileInputRef` (attach picker), `groupAvatarInputRef` (group avatar picker).

## User actions & controls
- **New conversation** (Plus button, sidebar header) — opens New-chat panel.
- **New group** (Users button, sidebar header) — opens New-group panel.
- **Search conversations** — text input filters list client-side by group/other-user name.
- **Select conversation** — click a list row → sets active, loads messages, marks read.
- **Back** (ChevronLeft, mobile only) — clears active conversation.
- **Open group settings** — click avatar/name in header (groups only) → loads + opens settings panel.
- **Send message** — Send button or Enter (Shift+Enter = newline); sends pending files then text.
- **Attach file** (Paperclip) — opens OS file picker, multiple; adds to pending strip.
- **Remove pending file** (X on each chip) — drops a queued file before sending.
- **Paste image** (Ctrl+V in textarea) — captures clipboard image as `screenshot-<ts>.png`.
- **Drag & drop files** — onto the message area; drag overlay shown.
- **Download file attachment** — click a non-image file bubble → `downloadBlob` decodes base64 and triggers browser download (mime by extension).
- **Preview image attachment** — click an image bubble → fullscreen preview modal.
- **Start chat with user** (New-chat panel row) — sends wave, opens DM.
- **Toggle group member** (New-group checkboxes) — build member list.
- **Create group** button — disabled until name + ≥1 member.
- **Edit group name** (Edit2 pencil, admin) — inline input; Save / Enter commits, Escape cancels.
- **Change group avatar** (Camera, admin) — opens image picker → uploads as data-URL.
- **Add members** (UserPlus, admin) — opens Add-members sub-panel.
- **Promote/demote admin** (Shield, creator only) — toggles member admin.
- **Remove member** (UserMinus, creator only) — confirm then remove.
- **Add N members** button (Add-members sub-panel) — disabled until ≥1 selected.

## Modals & dialogs
- **New chat panel** (right slide-over `aside`) — list of all users (excl. self); click a user to start a DM. No editable fields beyond selection.
- **New group panel** (right slide-over) — fields: group name input; checkbox list of users (member selection); "Creeaza grup (N membri)" submit.
- **Group settings panel** (right slide-over) — shows avatar (admin can change), group name (admin can inline-edit), creator + created date, members list with creator/admin badges and per-member admin/remove actions (creator only); "Adaugă" opens the Add-members sub-view.
- **Add-members sub-panel** (within group settings) — back button, checkbox list of users not already in group, "Adaugă N membri" submit; empty-state when all users already members.
- **Image preview modal** (fixed fullscreen overlay) — click anywhere or X to close.
- **Native `window.confirm`** — confirmation before removing a group member.

## Filters / search / sort / tabs / sub-views
- **Search box** — client-side filter of conversations by group name / other-user name (case-insensitive substring).
- **Sub-views:** conversation list (left) vs message thread (right); group settings panel has two sub-views (details ↔ add-members).
- No sort controls, no tabs, no pagination (full list rendered; messages fully loaded per convo).

## Exports / print / file ops
- **File upload:** attachments via picker, paste, or drag-drop; sent base64-encoded through `send_chat_message`. Group avatar upload via `update_chat_group`.
- **File download:** `downloadBlob` reconstructs a Blob from base64 attachment data and downloads (pdf/xlsx/docx/png/jpg/jpeg/gif/svg/octet-stream mime mapping).
- No PDF/print/clipboard-copy export.

## Keyboard shortcuts / realtime / polling
- **Enter** — send message; **Shift+Enter** — newline (textarea auto-grows up to 120px).
- **Ctrl+V** — paste clipboard image into pending files.
- **Enter / Escape** — commit / cancel inline group-name edit.
- **Conversations polling:** every 5s while document visible; paused when hidden; immediate refresh on `visibilitychange`→visible and on window `focus`.
- **Messages polling:** every 3s while a convo is active + visible; paused when hidden; immediate tick on start and on focus.
- **Auto-scroll:** messages container scrolled to bottom on every messages update (uses `scrollTop = scrollHeight`, not `scrollIntoView`, to avoid shifting the page).
- **Read receipts:** WhatsApp-style `StatusIcon` — single Check (sent), grey CheckCheck (delivered), blue CheckCheck (read) for own messages.

## Sub-components owned
- `StatusIcon({ msg })` — read-receipt tick icon (local component).
- Helpers (module-local, not exported): `isImage`, `timeDisplay`, `getInitials`, `downloadBlob`, `ROLE_COLORS` map.
- Types: `Conversation`, `GroupMember`, `GroupDetails`, `Message`, `UserItem`, `ChatPageProps`.
- All panels/modals are inline JSX within `ChatPage` (not separate files): New-chat, New-group, Group-settings, Add-members, Image-preview.

## Access / permissions
- No page-level role gate in the component (any authenticated user; gating, if any, is in `src/lib/access.ts`/server).
- **Group permission tiers (client-derived from `groupSettings`):**
  - `isGroupCreator` = `myId === groupSettings.created_by`.
  - `isGroupAdmin` = creator OR a member flagged `is_admin`.
  - **Admin** can: edit group name, change avatar, add members.
  - **Creator only** can: promote/demote admins, remove members.
  - Non-admins see read-only group details.
- Server is the source of truth — each `*_chat_group_*` command must re-enforce these rules.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the proven two-pane messenger shell: **left conversation rail** (search + New-chat / New-group actions in the rail header), **right thread pane** with sticky header, scrollable bubbles, and a bottom composer. This is a master-detail/chat layout — do NOT force `ListReport`/`mod-bento`; it is an exception page (see memory: don't impose bento on master-detail).
- **Primary action:** the message composer (Send); secondary actions New-chat / New-group sit in the rail header.
- Right-side **slide-over panels** for New-chat, New-group, and Group-settings (with nested Add-members view) work well — preserve that pattern; airy spacing, rounded avatars, role-colored fallback initials.
- Composer should retain: auto-grow textarea, attach button, pending-file chips strip, drag-drop overlay, paste-image.
- Bubbles: mine right (accent tint) / theirs left (bordered surface); show sender name for group messages; image thumbnails open preview; non-image files render a download card; report/link references render a labeled card.
- Preserve read-receipt ticks, unread badges, relative time formatting (today=time, this week=weekday, older=day+month).
- Preserve polling cadence (5s convos / 3s messages, paused when hidden, refresh on focus) and bottom auto-scroll.
- Group settings: avatar with camera overlay (admin), inline-editable name (admin), members list with Crown(creator)/ShieldCheck(admin) badges, per-member Shield/UserMinus (creator only), Add-members sub-panel.
