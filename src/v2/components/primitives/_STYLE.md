# Redesign primitives — style guide (read before rebuilding any primitive)

Goal: rebuild each legacy UI primitive into `src/redesign/ui/<Name>.tsx` as a **drop-in replacement** —
**identical exports, prop names, types, and default-vs-named export** — with ONLY the visual styling
modernized to the new Modern-SaaS language. Pages and the barrel depend on the exact API; do not change it.

## Hard rules (API preservation)
1. Keep every exported name, prop name, prop type, and union member EXACTLY. Keep `export default` vs named
   exports identical. Keep `displayName`, `forwardRef`, and generic signatures.
2. **Sibling primitive imports** → import from `@/v2/components/primitives/<Sibling>` (NEVER `@/components/ui/...`).
   Any old import from `@/components/ui/...`, `@/components/Modal`, `@/components/FormModal`,
   `@/components/ConfirmDialog` → rewrite the path to `@/v2/components/primitives/...`.
3. **Shared logic** (hooks, utils, stores, statusTokens, types) → keep importing from `@/...` untouched
   (e.g. `@/hooks`, `@/lib/statusTokens`, `@/store/...`). Do NOT reimplement logic; only restyle JSX.
4. Don't drop functionality, props, a11y attributes, keyboard handling, or event wiring.

## Visual language (Modern SaaS · clean & airy)
- **Reference files:** `redesign/ui/Button.tsx`, `Card.tsx`, `Page.tsx` — match their conventions.
- **Radius:** containers/cards/panels/modals `rounded-2xl`; buttons/inputs/selects/menus `rounded-xl`;
  small chips/cells `rounded-lg`; pills/dots `rounded-full`.
- **Surfaces:** SOLID. Cards = `bg-surface-primary border border-line surface-card` (soft diffuse shadow,
  NO glass blur). Use `.surface-glass` ONLY for genuinely floating overlays (popovers, command palette,
  dropdown menus). Page canvas = `bg-surface-page`. Subtle panels = `bg-surface-secondary`. Hover =
  `bg-surface-tertiary`. Popover/dropdown = `bg-surface-elevated`.
- **Shadows:** `shadow-[var(--elevation-1)]` (rest cards), `--elevation-2` (raised), `--elevation-3`
  (popovers/menus), `--elevation-4` (modals). Or the `surface-card` / `surface-card-elevated` classes.
- **Accent = indigo** via tokens only: `text-accent`, `bg-accent`, `border-accent`, `bg-accent-muted`,
  `accent` (Tailwind var-driven). NEVER hardcode a hex.
- **Text:** `text-content-primary` / `text-content-secondary` / `text-content-muted`. Type sizes use the
  `pm-*` scale (`text-pm-sm`, `text-pm-md`, `text-pm-lg`, `text-pm-eyebrow`, etc.).
- **Borders:** `border-line` (default), `border-line/70` (soft), `divider-soft`.
- **Status colors:** `status-green/red/amber/blue/teal/purple` tokens, or `<StatusBadge>` tones. The
  `StatusBadge` tone set MUST stay `success | warning | danger | info | progress | special | accent | neutral`.
- **Spacing:** generous — inputs/selects/buttons `h-10` (small `h-9`/`h-8`); card padding `p-5`/`p-6`;
  grid gaps `gap-4`/`gap-6`.
- **Motion:** keep it subtle. Existing utility classes are available in the new CSS: `btn-shine`,
  `btn-accent-glow`, `surface-card`, `surface-card-elevated`, `surface-glass`, `surface-lift`,
  `card-interactive`, `pill`/`pill-accent`/`pill-success`/`pill-danger`/`pill-warn`, `anim-scale-in`,
  `anim-fade-in`, `anim-slide-up`, `anim-fade-slide-in`, `ds-skeleton`, `ds-tab-indicator`,
  `ds-sparkline`, `app-surface`, `scroll-fade-x/y`, `focus-ring-soft`, `hover-lift`, `text-display(-lg)`.
- **Focus:** keep `focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]` (or the default
  2px accent outline) on interactive elements.

## Component-specific notes
- **AppBackground:** the airy direction drops the animated aurora. Render a minimal/no-op element (or a
  very faint static radial). Keep the default export + props so AppShell can still import it.
- **GlassCard:** rebuild as a solid soft card (NOT glass). Keep `GlassCardProps`/`GlassCardSize` exports
  and all props; just style it like `Card` elevated.
- **GearLogo:** keep the SVG mark; recolor to use `currentColor`/accent so it adapts.
- **filterControls.tsx:** NOT a component — it exports className strings/functions
  (`filterSearchInputCls`, `filterSelectCls(active)`, `filterDateInputCls`, `filterResetBtnCls`,
  `filterToggleCls(active)`, `filterClearInlineBtnCls`, `filterSearchIconCls`, …). Keep the SAME exported
  names + signatures; just modernize the class strings (h-10 pills, `rounded-xl`, soft focus ring, indigo
  active state).
- **Modal / FormModal / ConfirmDialog / ToastContainer:** preserve the imperative API + store wiring
  EXACTLY (`confirmDialog()`, `useFormModal()`, `toast.*`, host components, store imports). Only restyle
  the visual shell: overlay = soft scrim, panel = `rounded-2xl bg-surface-elevated shadow-[var(--elevation-4)]`,
  buttons via the redesign `Button`.
- **StatusBadge / StatusDot:** keep tone unions + `tone`/`label` props; restyle as soft tinted pills.
- **Tabs / AnimatedTabs / WorkspaceTabs:** keep variants + props; underline/segmented/pill styles with
  indigo active indicator (`ds-tab-indicator`).

After writing, double-check: same exports? same props? sibling imports use `@/v2/components/primitives`? No hardcoded hex?
