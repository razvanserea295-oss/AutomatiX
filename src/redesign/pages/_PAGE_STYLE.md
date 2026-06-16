# Page rebuild guide (read before rebuilding any page)

Goal: rebuild a page's LAYOUT in the new monochrome/Apple language using the redesign primitives, while
preserving 100% of its behavior. Output a NEW file (the old page stays as fallback); a route repoint wires
it in. The design tokens are already live app-wide, so this is about LAYOUT + primitives + morphs, not colors.

## HARD RULES — preserve every function
1. **Copy the entire logic layer LITERALLY** from the original page: every `useState`/`useEffect`/`useRef`,
   every store hook, every `apiCommand('…')` call, every handler, every modal open/close, every prop, every
   keyboard handler, polling, file upload (REST/base64), access gating, viewer-only behavior. Do NOT change,
   rename, or drop any of it. Only the JSX/visual structure is redesigned.
2. Keep the SAME default export name + props signature as the original (so the route can swap the import
   path with no other change). Keep the same `apiCommand` literals (verified by a superset check).
3. The page's inventory manifest (`src/redesign/inventory/<PageName>.md`) lists every function/modal/action —
   tick them all off; nothing may disappear.
4. Sub-components / modals / `*Enhancements` the original imports: keep importing the EXISTING ones from
   `@/pages/...` (they re-skin via tokens) UNLESS trivially inlined — preserving behavior wins.

## Layout language (use the redesign primitives)
- Import primitives from `@/redesign/ui/<X>` (Page, Card, Button, IconButton, KpiCard, StatusBadge,
  StatusDot, Tabs, FilterBar, ListReport, Modal, FormModal, ConfirmDialog, EmptyState, ErrorState,
  Skeleton, Avatar, SectionHeader, MetricValue, Sparkline, TrendBadge, etc.). Reuse shared logic from `@/`
  (stores, api, lib, utils, types, hooks, `@/lib/statusTokens`, domain modals).
- **CRITICAL — genuinely RE-ARRANGE the layout.** The user explicitly wants card POSITIONS to visibly
  change. Do NOT reuse the original's grid or the old `mod-canvas`/`mod-kpis`/`mod-bento` grammar — that
  reads as "nothing moved". Re-architect into fresh zones with NEW positions/proportions: (1) a header row
  (title + filters + primary actions), (2) a horizontal KPI strip, (3) a main bento with DIFFERENT
  proportions (e.g. a 12-col grid: wide 8/12 primary panel + narrow 4/12 rail), (4) a secondary insights
  row. Build it with the redesign `Page`/`Card`/`KpiCard` primitives, generous spacing, the pm-* scale.
- Master-detail / board / chat pages keep a master+detail RELATIONSHIP but with a re-designed arrangement
  (don't force a dumb table, but DO reposition — new column split, new panel placement). Where the manifest
  flags a "layout win" (missing search/filter/sort), add it.
- Use `<Page>` + `<Page.Body>` for the shell, `<Card>` for surfaces, soft generous spacing, the pm-* type
  scale, status via `<StatusBadge>` + `@/lib/statusTokens` resolvers. Replace native `prompt()/confirm()`
  with the redesign `Modal`/`ConfirmDialog` where the manifest noted it (keep the same outcome).

## Shared-element morph
- For list → detail flows, give each list card `vtName={vtName('<entity>', id)}` (from
  `@/redesign/lib/viewTransition`) and the detail view's hero card the SAME name → it morphs across nav.
- For in-page master-detail (detail in a side panel/inline), wrap the selection state change in
  `startMorphTransition(() => flushSync(() => setSel(x)), { dir: 'forward' })` and match `vtName` on the
  row/card and the detail hero.
- KpiCard/Card/GlassCard accept `vtName`. Don't put a `<StatusBadge>` as a direct child of `flex flex-col`
  (it stretches full width) — use block flow or `self-start`.

## Output
- Write to `src/redesign/pages/<same subpath as original>/<PageName>.tsx`.
- Do NOT edit any other file. After writing, return the structured summary (commands preserved, etc.).
