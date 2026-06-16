# Ghid de stil Promix Automatix — checklist

Folosește acest checklist când adaugi sau refaci UI, ca butoanele, câmpurile și cardurile să fie **consistente** pe toate paginile.

## Înainte de cod

- [ ] Token-urile sunt în **`src/styles/promix-theme.css`** (`--pm-*`). Nu introduce culori/umbre hex noi „ad hoc” fără să le adaugi mai întâi în temă.
- [ ] **Tailwind:** preferă clasele `pm-*` unde există (`bg-pm-surface`, `rounded-pm-lg`, `shadow-pm-panel`).
- [ ] **CSS Modules:** folosește `var(--pm-…)` sau importă valori din `src/styles/theme.tokens.ts`.

---

## Grilă 8px

- [ ] Marginile și padding-urile verticale/ orizontale între blocuri majore: **8, 16, 24, 32…** (în Tailwind: `p-2`, `p-4`, `p-6`, `p-8` sau `gap-2` / `gap-4` / `space-y-4` / `space-y-8`).
- [ ] Evită valori arbitrare gen `p-[13px]` decât dacă e caz excepțional documentat.

---

## Butoane

| Regulă | Detaliu |
|--------|---------|
| Formă | `rounded-pm-md` sau `rounded-xl` (echivalent 12px din temă) |
| Înălțime | Minim **44px** zona apăsabilă: `min-h-11` sau `py-2.5 px-4` pe text normal |
| Primar | `bg-primary-600` / `hover:bg-primary-700` **sau** clasa utilitară `.btn-promix` pentru CTA unic |
| Secundar / ghost | Fundal `bg-pm-surface` sau transparent, bordură `border border-pm-border`, text `text-pm-text` |
| Pericol | `text-red-600` / `border-red-200` sau token danger din temă, nu roșu random |
| Stare disabled | `disabled:opacity-60 disabled:cursor-not-allowed` |
| Loading | `aria-busy={true}`, text schimbat (ex. „Se trimite…”) |
| Focus | Nu elimina focus-ul: folosește `focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2` pe variante custom; butoanele native moștenesc stilul din `@layer base` |
| Icon + text | `gap-2` (8px) între icon și label |

---

## Input-uri, select, textarea

| Regulă | Detaliu |
|--------|---------|
| Colțuri | `rounded-pm-md` (sau echivalent `rounded-xl` aliniat la 12px) |
| Bordură | `border border-pm-border` sau `border-black/5 dark:border-white/10` doar dacă e deja pattern pe pagină — ideal unificat la `pm-border` |
| Fundal | `bg-pm-surface` sau `bg-white/60` pentru toolbar — păstrează același pattern în aceeași zonă (listă vs formular) |
| Padding | `px-4 py-2.5` sau `px-4 py-3` — același set pe toate câmpurile din formular |
| Placeholder | `placeholder:text-pm-text-muted` sau `placeholder-gray-400` consistent cu tema |
| Focus | `focus:outline-none focus:ring-2 focus:ring-primary-500/50` (sau `border-color` accent + ring ca în `@layer base`) |
| Label | Asociere vizuală clară; pentru a11y: `htmlFor` / `id` sau `aria-label` dacă nu există label vizibil |

---

## Carduri și panouri

| Regulă | Detaliu |
|--------|---------|
| Preferat | Clase existente: `.surface-card`, `.industrial-panel`, `.promix-hero`, `.promix-panel`, `.promix-table-wrap` |
| Sau manual | `rounded-pm-lg shadow-pm-panel border border-pm-border bg-pm-surface` |
| Hover (opțional) | Doar pe carduri clickabile: `hover:shadow-pm-card-hover` sau `.industrial-panel:hover` |
| Titlu card | `text-lg font-semibold tracking-tight text-pm-text` (sau echivalent heading) |
| Spațiu interior | `p-6` sau `p-8` (24px / 32px), nu amesteca `p-3` și `p-8` pe același tip de card |

---

## Dark mode

- [ ] Orice culoare nouă trebuie definită și sub **`.dark`** în `promix-theme.css`.
- [ ] Testează contrastul text/fundal (minim WCAG AA pentru text normal).

---

## Verificare finală pe pagină nouă

- [ ] Toate butoanele aceleiași ierarhii arată la fel ca pe **Projects** / **Documents** (referință).
- [ ] Nu există `shadow-2xl` / `rounded-sm` amestecate fără motiv față de restul ERP-ului.
- [ ] Focus vizibil la navigare cu tastatura pe butoane, link-uri și input-uri.

---

## Fișiere de referință

| Fișier | Rol |
|--------|-----|
| `src/styles/promix-theme.css` | Culori, umbre, spațiere, raze, alias `--app-*` |
| `src/styles/theme.tokens.ts` | Mapare pentru CSS Modules / TS |
| `src/index.css` | Utilitare globale (`.promix-*`, `.btn-promix`, base focus) |
| `tailwind.config.js` | Clase `pm-*`, `rounded-pm-*`, `shadow-pm-*` |
