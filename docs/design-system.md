# Promix Design System

**Canonical visual foundation (v2):** `src/redesign/tokens/design-tokens.css`  
**Legacy aliases** (`--color-*`, `--elevation-*`): `src/redesign/tokens/legacy-aliases.css`  
**Utilities** (glass, focus rings, typography): `src/redesign/tokens/utilities.css`  
**Entry stylesheet:** `src/redesign/index.css` · **Tailwind:** `tailwind.config.js` (`ds-*`, `brand-*`, `canvas-*`)

---

## Token quick reference

| Layer | CSS variable | Tailwind |
|---|---|---|
| Deepest bg | `--bg-void` | `bg-canvas-void` / `bg-ds-void` |
| Page | `--bg-base` | `bg-canvas-base` |
| Card | `--bg-surface` | `bg-canvas-surface` |
| Dropdown | `--bg-elevated` | `bg-canvas-elevated` |
| Tooltip | `--bg-overlay` | `bg-canvas-overlay` |
| Accent | `--accent` | `bg-brand` / `text-brand` |
| Focus ring | `--ring-default` | `shadow-ring-default` |
| Z-index | `--z-modal` etc. | `z-modal` / `z-tooltip` |

Use `tabular-nums` or `text-ds-4xl` for KPI numbers. Frosted floats: `surface-glass`, `surface-glass-lg`.

---

# Promix Design System (Faza 1 — house style)

Limbajul vizual al dashboard-ului redesignat, extras în tokeni + primitive
reutilizabile. Faza 2 le aplică pe module. **Doar prezentare** — fără backend/IPC.

- Tokeni + utilitare: `src/styles/theme.css` (culorile rămân în `src/index.css`)
- Primitive: `src/components/ui/` (barrel: `src/components/ui/index.ts`)
- Hooks de animație: `src/hooks/`
- Fundal ambiental: `src/components/ui/AppBackground.tsx` (montat o dată în shell `<main>`)

---

## 1. Token reference (`theme.css`)

| Grup | Tokeni |
|---|---|
| Motion durations | `--dur-instant 80` · `--dur-fast 120` · `--dur-base 220` · `--dur-slow 360` · `--dur-cinematic 600` (ms) |
| Easing | `--ease-standard` · `--ease-out-expo` · `--ease-spring` · `--ease-anticipate` |
| Opacity scale | `--o-04 / --o-08 / --o-12 / --o-18 / --o-35` |
| Z-index | `--z-bg 0` · `--z-surface 1` · `--z-overlay 20` · `--z-dropdown 40` · `--z-modal 60` · `--z-toast 80` |
| Glass shadows | `--shadow-glass-sm / -md / -lg / -glow` |
| Gradient mesh | `--mesh-accent` · `--mesh-2` · `--mesh-3` · `--mesh-blur 120px` |
| Ambient | `--bg-anim-opacity` · `--page-surface-alpha` (kill switch: **`100%` = fără ambient**) |
| Display type | `--text-display 34px` · `--text-display-lg 44px` |

Culori/`--radius-*`/tipografia `pm-*` rămân în `index.css` (neduplicate). Accentul e teal `#2DD4BF` — nu adăuga culori noi.

## 2. Clase utilitare

- **Sticlă:** `.glass-surface` · `.glass-elevated` · `.glass-floating`
- **Hover:** `.hover-lift` · `.hover-glow`
- **Intrare:** `.enter-up` · `.enter-fade` · `.enter-scale` (pune `style={{animationDelay}}` pentru cascadă)
- **Tipografie:** `.text-display` · `.text-display-lg`
- **Densitate:** `.density-compact` · `.density-regular` · `.density-spacious` (setează spacing local + scad intensitatea ambientală)

## 3. Primitive — când folosești care

| Primitivă | Folosește pentru |
|---|---|
| `GlassCard` | orice suprafață glassy; `size` compact/regular/hero, `interactive` → hover lift+glow |
| `MetricValue` | valori numerice mari, count-up, format `ro-RO`, tnum |
| `Sparkline` | mini-trend SVG (necesită serie reală de date) |
| `TrendBadge` | săgeată ±% semantic; `pill` pentru fundal tonat |
| `SectionHeader` | titlu de secțiune + meta + acțiuni dreapta |
| `HeroHeader` | deschiderea unui modul (titlu mare, subtitlu, acțiuni, slot pentru selector perioadă) — distinct de `PageHeader` compact existent |
| `AnimatedTabs` | segmented control cu indicator glisant spring |
| `StatusDot` | stare live (dot pulsant) |
| `Skeleton` | placeholder shimmer la loading |
| `EmptyState` / `ErrorState` | zone fără date / eroare, cu CTA |

Toate sunt tree-shakeable: `import { GlassCard, MetricValue } from '@/components/ui'`.

## 4. Hooks

- `useCountUp(value, { duration? })` — animație numerică rAF, ease-out-expo, respectă reduced-motion.
- `useEnterStagger(count, baseDelay=60)` — array de `{animationDelay}` pentru cascadă; reduced-motion → fără delay.
- `useReducedMotion()` — citește media query reactiv.
- `useVisibilityPause(cb)` — `cb(visible)` la schimbarea vizibilității tabului.

## 5. Densitate adaptivă

- **Aerisit** (`.density-spacious` / default module landing): dashboard-uri, overview-uri, ecrane „hero". Ambient mai vizibil, gap-uri mari.
- **Compact** (`.density-compact`): tabele dense, formulare lungi, liste. Ambientul scade automat (`--bg-anim-opacity 0.5`, `--page-surface-alpha 98%`) pentru lizibilitate.
- Pune clasa de densitate pe wrapper-ul de pagină/secțiune; primitivele și suprafața paginii citesc variabilele.

## 6. Exemple

```tsx
import { GlassCard, MetricValue, TrendBadge, SectionHeader, EmptyState } from '@/components/ui';

<GlassCard size="hero" interactive>
  <SectionHeader eyebrow="Financiar" title="Profit net"
    actions={<TrendBadge value={12.3} pill suffix="vs. anterior" />} />
  <MetricValue value={450000} format={money} size="display-lg" />
</GlassCard>

// stare goală
<EmptyState icon={Inbox} title="Nicio comandă" description="Nu există date în perioada selectată." />
```

```tsx
import { useEnterStagger } from '@/hooks/useEnterStagger';
const delays = useEnterStagger(items.length);
items.map((it, i) => <GlassCard key={it.id} className="enter-up" style={delays[i]} />)
```

## 7. Fundal ambiental global

`<AppBackground />` e montat o singură dată în shell (`AppShell <main>`), `z-index:-1`,
sub conținut, peste fundalul paginii. Performanță: pornește pe `requestIdleCallback`,
pauză la tab ascuns/`prefers-reduced-motion`, ~17 elemente, doar transform/opacity.
Intensitatea: `--bg-anim-opacity`. Suprafața paginilor (`<Page>` → `.app-surface`) e
translucidă la `--page-surface-alpha` (96% implicit, subtil). **Kill switch global:**
setează `--page-surface-alpha: 100%` în `theme.css`.
