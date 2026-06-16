# Mega-Prompt: UI Ultra-Premium (High-End SaaS)

Copiază blocul de mai jos într-un chat AI când refaci o pagină sau componentă. Înlocuiește `[NUME_COMPONENTĂ]` cu calea sau numele fișierului țintă.

---

## Prompt (copiază de aici)

**Context:** Vreau să refac complet UI-ul pentru **`[NUME_COMPONENTĂ]`** (ex. `src/pages/dashboard/DashboardPage.tsx`). Scop: design **High-End SaaS** (referință: Linear, Vercel) — ultra-minimalist, curat, aerisit, fără aglomerare vizuală.

**Stack:** React + TypeScript + Tailwind CSS. Iconuri **Lucide React** cu `strokeWidth={1.5}`. Dacă există deja primitive UI în proiect, reutilizează-le; **shadcn/ui** poate fi menționat doar ca model de structură (API clar, variante) — nu presupune că pachetul e instalat; implementează echivalente simple cu Tailwind acolo unde lipsește.

**Limbaj vizual:**

- **Neubrutalism subtil** sau **glassmorphism rafinat** (backdrop blur discret, opacități mici), fără efecte kitsch.
- **Paleta:** monocromă — griuri profunde (`zinc`/`neutral` calibrate) și **alb pur** pentru suprafețe; **o singură culoare de accent** pentru acțiuni critice și link-uri primare: **Indigo vibrant `#6366f1`** (echivalent Tailwind aproximativ `indigo-500`, dar preferă **valori arbitrare** `bg-[#6366f1]` / `text-[#6366f1]` unde e cazul pentru consistență exactă).
- Fundal pagină: aproape negru sau gri foarte închis în dark mode; alb spre `zinc-50` în light mode — păstrează contrast ridicat pentru text.

**Tipografie:**

- Stack **sans-serif modern:** Inter, Geist sau SF Pro (dacă în proiect e alt font, poți păstra fișierul global dar aliniază **greutăți și tracking** la specificațiile de mai jos).
- **Titluri:** `font-bold` / `font-semibold`, `tracking-tight`, dimensiuni clare (ex. `text-2xl` → `text-3xl` pentru hero).
- **Corp:** `text-sm` sau `text-base`, `leading-relaxed`, culoare text secundară discretă (nu negru pur pe alb).

**Spațiere (grid generos):**

- Padding-uri și gap-uri **mari** între secțiuni (`p-8`, `p-10`, `gap-8`, `space-y-10` unde are sens).
- Container principal: `max-w-*` rezonabil + margini laterale generoase pe mobile (`px-4` → `px-8` pe desktop).
- **Zero clutter:** elimină orice element care nu e strict necesar pentru task-ul paginii.

**Componente:**

- **Butoane:** `rounded-lg` sau `rounded-xl`, tranziții `transition-all duration-200`, **micro-interacțiune:** `active:scale-[0.98]`, hover cu schimbare subtilă de fundal/border (nu salturi agresive). Stări `disabled`, `aria-busy` unde e cazul.
- **Carduri:** border **1px** subtil, ex. `border border-black/[0.08] dark:border-white/[0.08]`; umbră **foarte soft:** `shadow-[0_4px_6px_-1px_rgb(0_0_0/0.05)]` sau echivalent — **nu** umbre grele.
- **Inputuri:** aceeași logică de border fin, focus ring discret legat de accent (ex. `ring-2 ring-[#6366f1]/25`), label + `aria-*` unde lipsește.

**Detalii premium:**

- **Mesh gradient** foarte subtil în fundal (radial gradients cu opacitate mică) sau strat de **noise** (SVG/CSS noise la opacitate 2–4%) peste zona principală — fără a reduce lizibilitatea.

**Cerințe tehnice:**

- **100% Tailwind** pentru stiluri în componenta refăcută (fără CSS inline ad-hoc decât excepții justificate).
- **Complet responsiv** (`sm:`, `md:`, `lg:`).
- **Accesibil (A11y):** landmark-uri, `aria-label` pe butoane icon-only, contrast AA, focus vizibil, butoane `type="button"` unde nu sunt submit.

**Task:** Rescrie codul pentru **`[NUME_COMPONENTĂ]`** conform specificațiilor. Nu modifica logica de business sau apelurile `invoke` decât dacă e necesar pentru structura UI. Păstrează tipurile TypeScript stricte.

---

### Cele 3 reguli de aur (obligatorii)

1. **"No default colors"** — Nu folosi paleta generică Tailwind de tip `blue-500`, `green-600` etc. pentru accent. Folosește **culoarea de accent fixă** (`#6366f1` și derivați cu opacitate) sau **nuanțe custom/arbitrare** pentru un aspect distinct.
2. **"Subtle borders instead of shadows"** — Bazează ierarhia vizuală pe **borduri 1px fine** și separare prin spațiu; umbrele doar **foarte soft**, complementar, nu ca element principal.
3. **"Negative space is a feature"** — **Spațiul gol este intenționat:** lasă respirație între blocuri; nu umple ecranul cu carduri și controale inutile.

---

## Variante rapide (înlocuiești în prompt)

| Parametru   | Exemplu |
|------------|---------|
| Accent     | `#6366f1` (indigo) · `#0ea5e9` (sky) · `#8b5cf6` (violet) |
| Componentă | `src/pages/settings/SettingsPage.tsx` |
| Referință  | „ca Linear app shell” / „ca Vercel dashboard hero” |

---

## Notă pentru repo-ul Promix Automatix

- Tema existentă (`src/styles/promix-theme.css`, `primary` teal) poate intra în conflict cu accentul indigo din prompt. **Alege una:** fie izolezi această pagină cu token-uri locale (variabile CSS scoped), fie aliniezi ulterior tema globală — documentează în PR ce ai ales.
- Build: după modificări UI, rulează `npm run build`.
