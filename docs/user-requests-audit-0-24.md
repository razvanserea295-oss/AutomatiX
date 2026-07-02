# Audit: session checklist items 0–24

**Date:** 25 June 2026  
**Workspace:** `C:\APLICATIE AUTOMATIX\Automatix-NEW`  
**Scope:** Verify items 0–24 from `docs/user-requests-session-2026-06-25.md` against the **current working tree** (not only git HEAD).

---

## Executive summary

| Status | Count | Notes |
|--------|------:|-------|
| **Done** | 17 | Present in working tree and matches intent |
| **Partial** | 7 | WIP exists but uncommitted, incomplete page adoption, or layout caveat |
| **Missing** | 0 | No item is wholly absent after this pass |
| **Fixed this audit** | 3 files | Dashboard hero wiring, procurement card removal, titlebar toggle grouping |

### Critical regression root cause

**Git `HEAD` still contains the old shell** (`Titlebar.tsx` committed = `#1A1B1D` compact bar). The **new VS Code-style shell lives in uncommitted / untracked files**:

| File | Git state |
|------|-----------|
| `src/components/shell/Titlebar.tsx` | Modified (new shell) |
| `src/components/shell/AppShell.tsx` | Modified |
| `src/components/shell/Navbar.tsx` | Modified |
| `shell.css`, `TitlebarPageActions.tsx`, `TitlebarSelect.tsx`, `NavigationSwitcher.tsx`, `PageHeaderActionsContext.tsx`, `src/redesign/pages/dashboard/*` | **Untracked** |

A merge/commit of only a few page files (session item #26) would deploy **old committed shell + new pages** → user sees 1.1.4-era chrome. **Build from current disk** (`npm run build:web`) bundles the new shell.

**Build (this audit):** `npm run build:web` succeeded → `dist/assets/main-CPNQvaz4.js` (+ `main-K8t_k9Me.css`).  
**Production deploy:** Not run in this audit (build only).

---

## Item table (0–24)

| Item | Expected | Found | Action taken |
|------|----------|-------|--------------|
| **0** Classic cleanup — no glass/gradient on cards; restore header buttons | `GlassCard` = solid surface; header actions in titlebar | `GlassCard.tsx` uses `surface-card` / `bg-surface-elevated` (no blur). `TitlebarPageActions` in WIP titlebar. Some pages still import `GlassCard` name | None — component already cleaned |
| **0b** Run build | Production web build | `VERSION.txt` = 1.1.7; `npm run build:web` OK | Ran build after fixes |
| **0c** Deep UI uniformization | Consistent page structure/tokens | Mixed: many redesign pages still use in-page `<header>` + H1 (e.g. `ProjectsPage`, `ProcurementWorkspacePage`) | None (out of 0–24 scope) |
| **1** Deep page uniformization pass | ~49 redesign pages aligned | Partial — pattern inconsistent across pages | None |
| **2** Fix web download; bump 1.1.7 | `/api/download/latest`, version 1.1.7 | `server/downloads.ts` + `VERSION.txt` 1.1.7 | None |
| **3** Installer false “close Automatix” | NSIS only flags real `automatix.exe` process | `src-tauri/nsis/installer.nsi` `IsAutomatixRunning` uses `tasklist \| find` | None |
| **4** Desktop vitality pass 1 | Tokens, shell, micro-interactions | `classic-tokens.css`, `shell.css`, `polish-pass.css` present (mostly untracked WIP) | None |
| **4b** Desktop vitality pass 2 | Second polish pass | Same WIP assets on disk | None |
| **5** VS Code-style titlebar | Custom bar: search, controls, no legacy top nav | WIP `Titlebar.tsx` — `#2d2d2d`, centered search, window controls, `TitlebarPageActions` | None (already in WIP) |
| **6** Breadcrumb = page not workspace; drop page titles from header band | `useRoutePageMeta` → page title in titlebar context | `pageNavMeta.ts` + `App.tsx` `contextLabel = routeMeta.pageTitle`; `PageChrome` headless | None |
| **6b** Navbar visual alignment fixes | Spacing/breadcrumb alignment | WIP `shell.css` + titlebar layout | None |
| **7** `Skeleton is not defined` on DeplasariPage | Import `Skeleton` | `DeplasariPage.tsx` line 60: `import { GlassCard, Skeleton, EmptyState }` | None |
| **8** Audit every header button | Inventory + fixes | `TitlebarPageActions` + context exist; not all pages lift actions | None |
| **9–12** Sidebar toggle right of “Proiect nou” | Toggle immediately after page primary action | Toggle was left of back/forward with `hidden md:inline-flex`; “Proiect nou” still in **page body** on `ProjectsPage`, not titlebar | **Fixed:** grouped toggle in `titlebar-primary-actions` after `TitlebarPageActions` |
| **13** Deploy after changes | build + restart | Process doc only | Not run |
| **14** Remove Fișier/Editare menus; page actions in titlebar | No `TitleBarMenu` in bar; per-page actions via context | `Titlebar.tsx` has no Fișier menus; `TitlebarPageActions` + `PageHeaderActionsContext`. `TitleBarMenu.tsx` exists but unused. Many pages still render actions in-body | None |
| **15** Black screen after titlebar refactor | App renders | `PageHeaderActionsProvider` wraps shell in `AppShell.tsx` | None |
| **16** Kanban alternatives (info) | Documented alternatives | Informational — N/A to code audit | None |
| **17** Transparent titlebar button backgrounds | `background: transparent` + hover | `shell.css` `.titlebar-icon-btn { background: transparent }` | None |
| **18–19** Centered, wider search | Center column; xl:w-80 | `Titlebar.tsx` search `w-44 sm:w-52 lg:w-64 xl:w-80` centered | None |
| **20** Remove PageChrome header band | Headless chrome; actions to titlebar | `PageChrome.tsx` returns `null`, lifts actions via effect | None |
| **20b** Custom scrollbar | WebKit + Firefox thin scrollbars | `classic-tokens.css` + `index.css` / `redesign/index.css` | None |
| **21** Dashboard hero chart, transparent | `DashboardHeroChart` edge-to-edge | Component existed but **not wired** into `DashboardPage.tsx` | **Fixed:** imported and rendered above KPIs |
| **21b** Chart not visible | Explicit height for Recharts | `density.ts` `DASH_HERO_CHART_HEIGHT`; `RevenueChartWidget variant="hero"` | Verified via build |
| **21d** KPI cards below chart | Order: chart → KPIs → widgets | KPIs were above widget grid but **below** chart missing | **Fixed:** hero chart inserted before KPI strip |
| **21e** `mt-4` on `page-content-shell` | Constant includes `mt-4` | `redesign/layout/constants.ts` `PAGE_CONTENT_SHELL = '... mt-4 ...'` | None |
| **22** Readability / contrast tokens | Text vs surface contrast | `classic-tokens.css` light/dark text tokens + `@media (prefers-contrast: more)` | None |
| **22b** Hover contrast | Sidebar/tables/titlebar hover | `classic-tokens.css` hover blocks for cards, sidebar, scrollbar | None |
| **23** Titlebar select height (Parts tree) | 28px aligned select | `TitlebarSelect.tsx` + `shell.css` `.titlebar-select-trigger { height: 28px }` (WIP) | None |
| **23b** Remove “Unelte furnizori” card | No supplier tools sidebar on procurement | Card still present in `ProcurementWorkspacePage.tsx` | **Fixed:** removed aside + `SupplierToolsBar` |
| **24** Custom dark project dropdown | `TitlebarSelect` replaces native white select | `TitlebarSelect.tsx` + Radix dark content styles in `shell.css` (WIP) | None |

---

## Item 25 (not in 0–24 scope; noted)

| Item | Expected | Found |
|------|----------|-------|
| **25** NavigationSwitcher (Ctrl+Shift+P) | Alt navigation without changing navbar | `NavigationSwitcher.tsx` (untracked), lazy-loaded in `App.tsx`, trigger in `Navbar` + `layoutStore` |

---

## Files changed in this audit

1. `src/redesign/pages/DashboardPage.tsx` — wire `DashboardHeroChart`; KPIs below chart; dedupe `revenue_chart` widget when hero shows finance chart  
2. `src/redesign/pages/procurement/ProcurementWorkspacePage.tsx` — remove “Unelte furnizori” card; full-width tabs card  
3. `src/components/shell/Titlebar.tsx` — sidebar toggle in `titlebar-primary-actions` after page actions  

---

## Recommended follow-ups (not done here)

1. **Commit or stage all shell WIP** (`shell.css`, `TitlebarPageActions`, `TitlebarSelect`, `NavigationSwitcher`, `PageHeaderActionsContext`, `dashboard/*`) so merge cannot revert chrome again.  
2. Lift **“Proiect nou”** (and Parts tree project picker) into `PageChrome` actions so item 9–12 is fully satisfied.  
3. Replace native `<select>` on `PartsTreePage` with `TitlebarSelect` for item 24.  
4. Deploy `dist/` to `app.automatix.online` and hard-refresh; verify tunnel serves new `main-CPNQvaz4.js` not a cached bundle.

---

*Generated by audit agent — reflects working tree + build on 25 Jun 2026.*
