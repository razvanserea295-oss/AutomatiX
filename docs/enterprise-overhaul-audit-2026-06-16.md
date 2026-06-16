# Enterprise Overhaul Audit — Promix Automatix

Date: 2026-06-16. Method: 3 parallel specialist passes (performance, visual consistency, interface bugs) over all 71 pages + bundle measurements.

## Verdict

The app is **not** poorly architected. Code-splitting is correct (main bundle 190KB; charts/office/cad isolated as lazy chunks), the `src/redesign/` system is token-clean and disciplined, and the active pages handle loading/empty/error states. The "vibe-coded, buggy, slow" perception traces to **4 root causes**, all fixable:

1. **Half-finished UI migration** — two parallel component libraries coexist (`src/components/ui/` vs `src/redesign/ui/`); mobile + customer portal never migrated; old sub-components leak into new pages.
2. **Layout/scroll plumbing** — workspace shells still use the old `overflow-y-auto` Page → double scrollbars (the prior audit's root cause, fixed in pages but not in the workspace layer).
3. **Cross-session state hygiene** — stores not reset on logout/tenant switch; `businessTypeStore` never refetches (this is the same family as the ZET nav bug).
4. **Runtime perf** — 5s dashboard polling on top of SSE; unvirtualized long lists; list remount-on-keystroke.

## Key metrics
- Total `dist/assets`: 3.79 MB across 189 files (well-split; not a problem).
- Largest chunks: vendor-charts 532KB, vendor-office 419KB, main 190KB — all lazy except main.
- Hardcoded hex in components: only 20 occurrences across 6 files (mostly portal + data-viz).
- 365 source TS/TSX files; 43 lazy/dynamic-import sites (good coverage).

---

## Tier 1 — Highest leverage, low risk, instantly visible

### T1.1 — Collapse the duplicate component libraries  *(visual #1, #2, #7, #8)*
`src/redesign/ui/Button.tsx` (`rounded-xl`, bordered secondary) and `src/components/ui/Button.tsx` (`rounded-md`, borderless) are two separate implementations of the same control. 81 files import the old one; 14 redesigned pages leak old-styled `*Enhancements`/modal sub-components.
**Fix:** make `src/components/ui/{Button,Card,KpiCard,SaveButton,SplitViewToggle,filterControls,StatusBadge}` thin re-exports of their `src/redesign/ui/` counterparts. One-line files; re-skins every screen at once with no per-page rewrites.

### T1.2 — Make workspace shells `fit` (kill double scrollbars)  *(bug #1)*
All 10 `src/pages/workspace/*.tsx` import `Page` from `@/components/ui/Page`, whose root is always `overflow-y-auto` (`Page.tsx:34`), then nest a redesign `<Page fit>` that owns its own scroll → two scroll contexts → double scrollbar / content scrolling behind fixed headers (worst on tablet).
**Fix:** use the redesign `<Page fit>` for the workspace shell (or add a `fit` prop to `components/ui/Page`).

### T1.3 — Fix nav stale-dep + reset business type on tenant switch  *(bug #2, #3)*
- `src/App.tsx:478` — `navbarItems` memo computes from `inferredBusinessType` but its dep array lists `businessType`. One-char fix: depend on `inferredBusinessType`.
- `src/store/businessTypeStore.ts:24` short-circuits once `loaded:true` → never refetches on tenant switch; wrong business-type nav persists. Reset `loaded=false` on logout.
- `src/store/authStore.ts:172` logout clears only auth — add a `resetAll()` store barrel (or `window.location.reload()` in `handleLogout`) so one user's data doesn't flash into the next session on the shared tablet.

### T1.4 — Remove double page-headers  *(bug #4)*
`WorkspaceTabs title="..."` + each inner redesign page's own `<h1>` hero = two stacked title bars (~80px wasted), e.g. Finance, Sales→Clients, Engineering.
**Fix:** keep one — drop `title` from `WorkspaceTabs` OR remove the per-page hero on pages that live inside a workspace.

## Tier 2 — Performance

### T2.1 — Kill/raise the 5s dashboard polling  *(perf #1, highest-leverage perf fix)*
`src/store/dashboardStore.ts:148` + `DashboardPage.tsx:178` — `startPolling(5000)` fires 3 API calls every 5s + a 4th handoff poll, while `useLiveEvents` SSE already pushes the same updates. ~4 redundant requests/5s per open dashboard.
**Fix:** raise to 30–60s or drop polling and rely on SSE.

### T2.2 — Virtualize long lists  *(perf #2)*
`react-window` is installed but used only in `PartsTreePage`. Projects/Finance/Documents/Quotations render every row to the DOM.
**Fix:** wrap long list bodies in `FixedSizeList`.

### T2.3 — Stop list remount-on-keystroke  *(perf #3)*
`ProjectsPage.tsx:510` — `<div key={search}>` unmounts/remounts all rows + replays `stagger-in` on every character typed.
**Fix:** remove `key={search}`; animate once on data load.

### T2.4 — Memoize `useMoney()` formatter  *(perf #4)*
`settingsStore.ts:85` returns a new function identity each call, consumed by 48 files → re-render churn.
**Fix:** `useMemo` keyed on `[displayCurrency, eurRate]`.

## Tier 3 — Coverage / cleanup

### T3.1 — Repoint mobile to redesign pages  *(visual #4)*
`src/mobile/mobilePages.tsx:26-57` lazy-loads the OLD `@/pages/*` for all 32 phone routes. Phone users get the entire old look.
**Fix:** repoint to `@/redesign/pages/*` (already responsive).

### T3.2 — Rebuild customer portal on the design system  *(visual #3)*
`src/pages/portal/CustomerPortalPage.tsx` (69 raw palette classes) + `RfqResponsePage.tsx` (28) — the only pages an external client sees, 100% off-system.
**Fix:** rebuild on redesign primitives + `<StatusBadge>`.

### T3.3 — Standardize modals  *(bug #5, #6, #7)*
`src/redesign/ui/Modal.tsx` has no scrim, no click-outside, `z-30`, anchors to `<main>` (titlebar/nav stay live, no focus trap). `FormModal` ignores `initialData` changes while open.
**Fix:** portal to `document.body`, `fixed inset-0` scrim, `z-50`, focus trap; key FormModal by record id.

### T3.4 — Delete the dead legacy tree
Once mobile (T3.1) is repointed, `src/pages/*Page.tsx` + the `mod-*` token grammar are unreferenced — delete to remove two-places-to-fix drag.

---

## Recommended execution order
Tier 1 first (cheap, low-risk, visible everywhere), then T2.1 (biggest perf win), then the rest. T1.1 + T1.2 alone will make the app look and feel dramatically more cohesive.

## Deployment note
`dist/` is the SHARED static bundle served by BOTH `:3500` (Promix manufacturing, elevated) and `:3501` (ZET Burgers). Any frontend rebuild deploys to both at once. Verify on `:3501` (non-elevated, restartable without UAC) before considering it live on prod.
