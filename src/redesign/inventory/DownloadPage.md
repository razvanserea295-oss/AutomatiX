# DownloadPage — function inventory
**Route:** download · **Workspace:** public · **File:** pages/DownloadPage.tsx · **Lines:** 168
**Props/contract:** `export default function DownloadPage()` — no props. Default-exported page component. Public, no-auth route reachable at `/#/download` (server redirects `/download` here).

## Backend functions (apiCommand) — ALL must survive
- — none — · This page does NOT use `apiCommand`. It is a public/no-auth page that talks directly to a plain REST endpoint (see below).

### Non-apiCommand backend call (load-bearing — must survive)
- `GET ${base}/api/download/latest` — raw `fetch` to the server (base from `getServerUrl()` in `@/config/server`). Returns `LatestInfo { available, version, file, url, size }` describing the latest Windows installer (.exe) produced by `npm run dist:electron:win`. · triggered on mount via `useEffect`. On error, falls back to `{ available:false, version:null, file:null, url:null, size:null }`.
- File download served from `${base}${info.url}` — the actual installer binary download · triggered by the primary CTA anchor.

## Data sources (stores / hooks)
- React local state only — no Zustand stores.
  - `info: LatestInfo | null` — `useState`, populated from `/api/download/latest`.
  - `loading: boolean` — `useState(true)`, toggled in fetch `.finally()`.
  - `os: OS` — `useState(() => detectOS())`, lazy-init from `navigator.userAgent`/`navigator.platform`.
- `getServerUrl()` from `@/config/server` — resolves API base URL.
- `useEffect` — one-shot fetch on mount with an `alive` guard for cleanup.

## User actions & controls
- **Primary CTA "Descarcă pentru Windows (.exe)"** — `<a href={downloadUrl}>` anchor; triggers browser download of the installer. Only rendered when `downloadUrl` exists and `loading` is false. Has hover/active animations (shine sweep, brightness, scale).
- **Loading state** — when `loading`, CTA replaced by a spinner "Se verifică versiunea…" (`Loader2`).
- **Unavailable state** — when not loading and no `downloadUrl`, CTA replaced by a disabled-looking notice "Installer indisponibil momentan. Revino curând." (`AlertCircle`).
- No buttons, forms, toggles, inline edits, drag-drop, context menus, or bulk actions. Single download link is the only interactive element.

## Modals & dialogs
- — none —

## Filters / search / sort / tabs / sub-views
- — none —

## Exports / print / file ops
- **File download** — the installer `.exe` via the CTA anchor (`href={downloadUrl}`). This is the page's sole purpose.
- No print, PDF generation, clipboard, or upload.

## Keyboard shortcuts / realtime / polling
- No keyboard shortcuts.
- No realtime/polling — single fetch on mount only (no interval, no refresh control).

## Sub-components owned
- `Req({ icon, title, value })` — system-requirement card (in-file local component). Used 3×: Sistem / Procesor / Spațiu.
- `Step({ n, title, text })` — numbered install-step list item (in-file local component). Used 3× in the "Instalare în 3 pași" ordered list.
- Helper functions (in-file, not components):
  - `detectOS(): OS` — UA/platform sniff → `'windows' | 'mac' | 'linux' | 'other'`.
  - `formatSize(bytes): string` — bytes → "— ", MB, or GB (1024 MB threshold).
- `interface LatestInfo` and `type OS` — local type defs.
- External UI deps: `GearLogo`, `AppBackground` (`@/components/ui/*`); lucide icons (`Download, Monitor, ShieldCheck, Cpu, HardDrive, CheckCircle2, Loader2, AlertCircle, Apple, Terminal`).

## Access / permissions
- **Public — no auth, no role gating.** Reachable without login at `/#/download`. Workspace `public`. No viewer-only branches; no permission checks.
- OS detection only affects messaging: macOS/Linux users see an amber "in curs de pregătire" banner (only Windows build offered); does not block the download link.

## Rebuild notes (Modern-SaaS layout intent)
- Single-column centered landing page (`max-w-3xl`), airy, on `AppBackground` (aurora). Keep it a focused marketing/download splash — NOT a list/table/dashboard page; do NOT apply `ListReport`/`.mod-bento`.
- Sections, top to bottom: (1) Brand header — `GearLogo` in a glowing rounded tile + gradient H1 "Descarcă Automatix" + muted tagline; (2) Glass download card (`max-w-xl`) holding the primary CTA, an OS-mismatch banner (mac/linux), a meta row (Windows 10/11 · 64-bit · `v{version}` · size), and a 3-up system-requirements grid (`Req`); (3) "Instalare în 3 pași" numbered steps (`Step`); (4) footer line `v{version} · Promix Technologies`.
- **Primary action = the single download CTA** (full-width 56px gradient button). Preserve its three states: loading spinner / available link / unavailable notice. Keep the version + size meta driven by `/api/download/latest`.
- Keep `version` fallback `'1.1.4'` and `formatSize` em-dash fallback. Preserve OS-aware banner copy. No tables, no cards-grid beyond the 3 requirement chips + 3 step rows.
- Load-bearing to preserve: the `GET /api/download/latest` fetch, `getServerUrl()` base, `downloadUrl = ${base}${info.url}`, and the `alive` cleanup guard.
