# Promix Automatix - Plan de Implementare (MAXIM EFICIENT - FĂRĂ PANEL URI)

## Faza 1: Design System (culori, spacing, typography)

### 1.1 Actualizare design tokens (promix-theme.css)
- [x] Actualizare culori light mode (teal-600, green-600, etc.)
- [x] Actualizare culori dark mode (slate-900, slate-800)
- [x] Actualizare spacing (8px grid)
- [x] Actualizare raze de colț (6px, 12px)
- [x] Actualizare umbre (subtile, fără borduri)

### 1.2 Actualizare CSS global (index.css)
- [ ] Actualizare utility classes
- [ ] Actualizare scrollbar styling
- [ ] Actualizare focus states

---

## Faza 2: Layout Principal

### 2.1 Sidebar retractabil (OperationsLayout.tsx)
- [ ] Adăugare state pentru expand/collapse
- [ ] Implementare animație smooth (200ms)
- [ ] 64px (collapsed) / 200px (expanded)
- [ ] Hover pentru etichete (desktop)
- [ ] Click pentru toggle

### 2.2 Header minimal (OperationsLayout.tsx)
- [ ] Înălțime 40px
- [ ] Logo 120px
- [ ] Search 200px
- [ ] Buttons 32px
- [ ] Glassmorphism 98%

---

## Faza 3: Componente (FĂRĂ PANEL URI)

### 3.1 Cards (shadow doar, fără bordură)
- [ ] Border radius 12px
- [ ] Shadow subtil (0 1px 2px rgba(0,0,0,0.04))
- [ ] Hover shadow (0 4px 12px rgba(0,0,0,0.08))
- [ ] Padding 16px

### 3.2 Buttons
- [ ] Height 36px
- [ ] Border radius 6px
- [ ] Primary: teal-600 gradient
- [ ] Secondary: border + transparent
- [ ] Ghost: transparent + hover slate-100

### 3.3 Tables
- [ ] Header: slate-100 / slate-900
- [ ] Rows: hover slate-50 / slate-800
- [ ] Sticky header
- [ ] Padding 10px vertical, 12px horizontal

### 3.4 Inputs
- [ ] Height 36px
- [ ] Border radius 6px
- [ ] Focus: teal-500 ring 2px

---

## Faza 4: Pagini (Actualizare)

### 4.1 DashboardPage.tsx
- [ ] Actualizare carduri (shadow, fără bordură)
- [ ] Actualizare header (40px)
- [ ] Actualizare grid (6 cards)
- [ ] Actualizare chart

### 4.2 ProjectsWorkspacePage.tsx
- [ ] Actualizare sidebar (retractabil)
- [ ] Actualizare header (40px)
- [ ] Actualizare table (sticky header)
- [ ] Actualizare detail panel

### 4.3 ProductionBoardPage.tsx
- [ ] Actualizare header (40px)
- [ ] Actualizare kanban columns
- [ ] Actualizare cards (shadow, fără bordură)

### 4.4 DocumentsPage.tsx
- [ ] Actualizare header (40px)
- [ ] Actualizare filter bar
- [ ] Actualizare table (sticky header)

### 4.5 AlertsPage.tsx
- [ ] Actualizare header (40px)
- [ ] Actualizare table (sticky header)

---

## Faza 5: Dark Mode

### 5.1 Verificare dark mode
- [ ] Toate componentele în dark mode
- [ ] Contrast minim 4.5:1
- [ ] Redus la minimum pentru ochi

---

## Faza 6: Responsive

### 6.1 Mobile
- [ ] Sidebar drawer
- [ ] Single column layout
- [ ] Touch targets 44px

### 6.2 Tablet
- [ ] Sidebar collapsed
- [ ] Single column layout

### 6.3 Desktop
- [ ] Sidebar expanded
- [ ] Multi-column layout

---

## Faza 7: Testare

### 7.1 Funcțional
- [ ] Toate paginile funcționează
- [ ] Navigarea este fluidă
- [ ] Dark mode funcționează

### 7.2 UX
- [ ] Acces rapid la funcții
- [ ] Fără distragere
- [ ] Layout curat

### 7.3 Performance
- [ ] Animations smooth
- [ ] No lag
- [ ] Fast load

---

## Nota: FĂRĂ PANEL URI

- Toate componentele folosesc shadow (fără bordură)
- Background curat
- Elemente doar când sunt necesare
- Minimalism maxim