# ForcePasswordChangePage — function inventory
**Route:** force-password · **Workspace:** auth · **File:** pages/ForcePasswordChangePage.tsx · **Lines:** 191
**Props/contract:** `ForcePasswordChangePage({ username: string, onLogout: () => void })` — full-screen blocking gate rendered by `App.tsx` when a logged-in account has `must_change_password=1`; no shell/route access until a strong password is set. `username` is the current account login; `onLogout` returns to the login screen.

## Backend functions (apiCommand) — ALL must survive
- `change_password` — rotates the user's password and clears the `must_change_password` flag (and rotates all other sessions server-side); returns the updated `User`. Called indirectly via `useAuthStore.changePassword(current, next)` (`src/store/authStore.ts:243`) on form submit. Server is authoritative for strength validation (`electron/security/password.ts validatePasswordStrength`); the client `checkStrength()` only mirrors it for instant feedback.

> No other backend command is invoked directly by this page. The HIBP breach check is a raw `fetch` to `https://api.pwnedpasswords.com/range/{prefix}` (NOT an apiCommand) inside the sub-component; the "Cere skip de la admin" button is currently a toast stub only (no backend call). Password history is device-local `localStorage`, not server-side.

## Data sources (stores / hooks)
- `useAuthStore((s) => s.changePassword)` — the only store selector; provides the password-change action (`src/store/authStore.ts`).
- `toast` from `@/store/toastStore` — used by the enhancements sub-component for success/info notifications.
- `useLocalStorage` from `@/components/enhancements/useLocalStorage` — reads device-local password-history list (key `promix_pwd_history_<username>`).
- Local React state only: `current`, `next`, `confirm`, `showPwd`, `error`, `loading`.

## User actions & controls
- **Parola curentă** input (PasswordField) — current password; `autoComplete="current-password"`; carries the single show/hide toggle (Eye/EyeOff) that controls visibility for all three fields.
- **Parolă nouă** input (PasswordField) — new password; `autoComplete="new-password"`; has hint "Min. 12 caractere, cu literă mare, mică, cifră și simbol".
- **Confirmă parola nouă** input (PasswordField) — confirm new password; `autoComplete="new-password"`.
- **Show/hide password toggle** — Eye/EyeOff button on the current-password field; `tabIndex={-1}`; flips `showPwd` for all three inputs simultaneously.
- **Actualizează parola** (submit button) — runs client validation then `changePassword(current, next)`; shows `Loader2` spinner while `loading`; disabled during submit. On success records password history locally and lets `App.tsx` re-render into the normal shell (no manual redirect).
- **Deconectează-te** (logout button) — calls `onLogout`; disabled during submit.
- **Sugerează parolă** (in enhancements) — generates a CSPRNG 16-char password (guarantees lower/upper/digit/symbol), fills both `next` + `confirm` via `onSuggest`, copies it to clipboard, toasts success.
- **Cere skip de la admin** (in enhancements) — toast-only stub: "Cerere trimisă către administrator…" (no backend wired yet).

### Client-side validation (handleSubmit, all must survive)
- current password required ("Introdu parola curentă").
- `checkStrength(next)`: ≥12 and ≤128 chars; must contain lowercase, uppercase, digit, and symbol; rejects weak substrings `1234`, `admin`, `parola`, `password`, `automatix`, `promix`, `qwerty`.
- new must equal confirm ("Cele două parole noi nu coincid").
- new must differ from current ("Parola nouă trebuie să fie diferită de cea curentă").
- Re-entrancy guard: ignores submit while `loading`.

## Modals & dialogs
— none — (single full-screen card; no modals/sheets/dialogs).

## Filters / search / sort / tabs / sub-views
— none —

## Exports / print / file ops
- **Clipboard write** — generated password is copied to clipboard via `navigator.clipboard.writeText` ("Sugerează parolă"). No print/PDF/upload/download.

## Keyboard shortcuts / realtime / polling
- Form submit on Enter (native `<form onSubmit>`); `noValidate` so custom validation runs.
- **Debounced HIBP probe** (enhancements): 600ms debounce after `next` changes (when length ≥ 6) → SHA-1 + k-anonymity range query to api.pwnedpasswords.com; shows "Verific HIBP…" spinner, then breach-count warning if found. Falls back to null silently on CSP/network block.
- No polling, no websockets/realtime, no global keyboard shortcuts.

## Sub-components owned
- **`PasswordField`** (same file) — labeled password input with optional show/hide toggle and optional hint; reused for all three fields.
- **`PasswordChangeEnhancements`** (`src/pages/auth/PasswordChangeEnhancements.tsx`, default export) — strength meter (4-bar, label foarte slabă→excelentă), device-local reuse warning (last 5 hashes via FNV-1a), HIBP breach badge, password generator + admin-skip buttons. Props: `{ username, next, onSuggest }`.
- **`recordPasswordHistory(username, pwd)`** (named export from the same file) — called on successful change to push the new password's FNV-1a hash into `localStorage` (cap 5).
- `GearLogo` (`@/components/ui/GearLogo`) — brand mark in the header.

## Access / permissions
- Not role-gated by `src/lib/access.ts`; this page is the **gate itself** — `App.tsx` hard-routes any authenticated account with `must_change_password=1` here, blocking all routes/shell/data until resolved. Requires an authenticated token (the store throws "Not authenticated" 401 otherwise). The seeded `admin`/`1234` factory account carries the flag (migrations 099 + 108). Server-side `change_password` clears the flag and rotates all other sessions.

## Rebuild notes (Modern-SaaS layout intent)
- Keep the **single centered card on a full-screen surface** — this is a focused, blocking interstitial, not a workspace page. No PageHeader/WorkspaceTabs/side-nav (the shell isn't mounted here).
- Vertical flow inside one airy card: brand row → amber "first login / change password to continue" notice → three stacked password fields → enhancements block (strength meter, reuse/HIBP warnings, generator + admin-skip) → inline error → primary "Actualizează parola" button (full width, spinner state) → subtle "Deconectează-te" link.
- Primary action = **Actualizează parola**; secondary = logout link (de-emphasized).
- Form (not a table) — this is purely an input flow. Preserve: the single shared show/hide toggle, the new-password hint text, the live strength meter, the debounced HIBP badge, the local-reuse warning, clipboard-copy on generate, and ALL client validation messages (they mirror the authoritative server policy).
- Load-bearing: the `change_password` command path through `useAuthStore.changePassword` and the `recordPasswordHistory(username, next)` call on success must remain. Do not drop the weak-substring list or the ≥12-char policy — they mirror `electron/security/password.ts`.
