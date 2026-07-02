# Automatix — UX & UI Analysis

Based on a live walkthrough of the running app (`localhost:3500`, 22 Jun 2026) plus a read of the navigation model and the page state-handling patterns in the source. The goal here is not a bug list — it's how the product *feels to use*, where a real user loses time or trust, and what to change.

A quick note on the user: this is a dense internal ERP for a manufacturing business (sales → projects → engineering → production → procurement → finance), used daily by a small team who already know the domain. For that user, the enemies are **wasted clicks, screens that disagree with each other, and not knowing whether an action worked.** The findings below are framed around those.

---

## A. The experience-level themes (these matter most)

### A1. Numbers on the same screen don't agree — this erodes trust  ·  HIGH  ·  partly fixed

The single biggest UX problem isn't visual, it's *credibility*. On the Sales Hub the KPI cards said **3 / 1 / 1** while the board columns right below them said **7 / 4 / 1**, and the "11 leads without an update" warning didn't match the red badges on the cards. The Dashboard says **net profit 116.9K EUR at a 99.7% margin**; Financiar says **costs 0 and profit "not yet available."**

Why it matters: in a tool people use to make money decisions, one contradiction teaches the user to distrust *every* number on the screen. After that they re-check everything in a spreadsheet, which defeats the purpose of the app.

Root cause pattern: summary widgets read from separate pre-computed stat endpoints (`get_sales_stats`, dashboard stats) while the lists/boards read the live records. The two drift apart. This is a systemic issue, not a one-off — the same pattern exists on the Dashboard and Financiar.

Done: rewrote the Sales Hub KPI strip, the stale-lead banner and the card badges to derive from the *same* leads the board renders, so they can no longer disagree (`src/redesign/pages/sales/SalesHubPage.tsx`).
Recommended next: audit the Dashboard and Financiar widgets the same way — either compute summaries from the same records the page shows, or show a single shared "as of HH:MM / refresh" timestamp so the user knows both came from one snapshot. Resolve the profit contradiction by using one profit definition and one "not yet available" state across both screens.

### A2. Navigation is icon-only and the grouping doesn't match users' mental models  ·  HIGH

The left rail is 10 icon-only buttons; labels appear only on hover. For a 30-page app, icon-only top-level nav means new or occasional users hunt-and-peck, and even regulars rely on muscle memory rather than reading.

More damaging is *where things live*. "Email", "Mesaje (Chat)" and "Alerte" are filed under a wrench-icon group called **Instrumente** (Instruments/Tools) alongside the Tutorial. Communication channels are not "tools," and nobody looking for their inbox will think to click a wrench. Similarly **Documente** sits under **Financiar**. The result is that the most human, frequently-used features (messages, email, notifications) are the hardest to find.

Why it matters: discoverability is the difference between a feature being used and being invisible. If email is buried, people keep using Outlook and the app's comms features rot.

Recommend: (1) show text labels in the rail by default (the collapse control already exists — invert the default to expanded, or at least label-on-rail like SAP Fiori's launchpad). (2) Regroup so Email/Chat/Alerte form a "Comunicare" group with a speech/bell icon; keep "Instrumente" for actual tools (Tutorial, Birou control, print, downloads). (3) Move Documente next to Proiecte or into its own group.

### A3. Loading and error states are applied inconsistently  ·  MEDIUM

The codebase *has* good shared pieces — `EmptyState` is used on 32 of 39 pages and `toast` feedback on 32, which is genuinely good. But loading is a coin toss: 10 pages use polished `Skeleton` placeholders while 29 fall back to a bare spinning `Loader2`, and a dedicated `ErrorState` is used on only 2 pages. So a data-fetch failure on most pages either flashes a spinner forever or silently shows an empty page with no "something went wrong / retry."

Why it matters: inconsistent loading makes the app feel slower and less finished than it is, and a silent fetch failure leaves the user staring at an empty screen unsure if there's no data or the request died.

Recommend: standardize — skeletons for first load (they preserve layout and feel faster than spinners), `ErrorState` with a Retry on every data page, and reserve `EmptyState` strictly for genuine "no records yet." This is mostly wiring existing components into the remaining pages, not new design.

### A4. Mixed language and naming conventions break the polish  ·  LOW–MEDIUM

The nav mixes English and Romanian ("Sales Hub" next to "Oferte", "Clienți"), and labels mix bare names with parentheticals ("Producție (Kanban)", "Mesaje (Chat)" vs plain "Calendar", "Furnizori"). Small, but it reads as several people building separately, and it makes the product feel like a prototype rather than one considered tool.

Recommend: pick one language for the UI chrome (Romanian, given the rest) — "Sales Hub" → "Vânzări"/"Pipeline" — and drop the parenthetical qualifiers from nav labels (put "Kanban" as a view toggle inside the page, not in the menu name).

---

## B. Screen-specific findings

### B1. "Instrumente" page is fully broken  ·  HIGH
Opening it shows a full-screen error: `Failed to fetch dynamically imported module .../TutorialPage-DQXY-HjM.js`. This is a stale/corrupt production build — the served HTML points to a JS chunk hash that no longer exists in `dist/`, not a source bug. A clean rebuild + redeploy fixes it. The error-boundary screen itself (clear message, Retry, Home, "copy details for support") is one of the better-designed parts of the app — good fallback, but a whole module being dead is a hard stop for any user who needs it. Also: the breadcrumb reads "Instrumente" while the route is `/tutorial` — label and route disagree.

### B2. Dashboard revenue chart mixes time units  ·  MEDIUM
"Evoluție venituri" shows header "VENIT · 8 IUN", subtitle "+86,9% vs 1 lun", footer "Total 2 săptămâni", but the X-axis is labeled "1 lun … 8 lun". Weeks and months appear on one widget and the Săpt/Lună/Trim/An toggle doesn't visibly correspond to the axis. The user can't tell what period they're looking at — which makes the headline growth number ("+86.9%") meaningless. Make the axis, the toggle and the footer all reflect the same selected period.

### B3. Sales Hub board rhythm and the "Convertite" column  ·  LOW
The four pipeline stages render as equal kanban columns, but "Convertite" is a separate, narrower panel pinned to the right. It's defensible (it's a terminal stage), but visually it breaks the left-to-right pipeline flow and the differing card layout makes it read as a different feature. Consider styling it as a visually distinct but same-width "done" column, or collapsing it behind a count with expand-on-click.

### B4. "Proiecte active" list polish  ·  LOW
Trailing comma in names ("Statie PIKANORE,"); the deadline column is filled for some rows and blank/"—" for others with no explanation; status badge colors (amber/green/blue) appear with no legend. Each is tiny, but together a glanceable list becomes something you have to decode. Trim trailing punctuation at the source, always render a dated placeholder ("fără termen"), and add hover tooltips or a small legend for the badge colors.

### B5. Dashboard right column is lopsided  ·  LOW
The empty "Alerte" card and the tall, dense "Briefing lunar" panel sit side by side at very unequal heights, leaving a large dead zone under Alerte. On a "nothing's wrong" day (the common case) half the screen is empty. Let the columns balance, or stack Alerte above the briefing when it's empty.

---

## C. What's already good (worth keeping)
- Consistent dark visual language, generous KPI cards, and a coherent card/grid system across modules.
- `EmptyState` and `toast` feedback are used widely — the foundations for good feedback are there.
- The global error boundary (B1) is genuinely well done: clear, recoverable, support-friendly.
- A command palette (Ctrl K) and a reorderable KPI/card layout show real attention to power-user efficiency.

---

## Priority order
1. Rebuild + redeploy — fixes the dead Instrumente module (B1) and ships the Sales Hub coherence fix (A1).
2. Audit Dashboard/Financiar summaries for the same "two sources disagree" pattern (A1) and resolve the profit contradiction.
3. Default the nav rail to labelled, and regroup Email/Chat/Alerte out of "Instrumente" (A2).
4. Standardize loading (skeletons) and add ErrorState+Retry everywhere (A3).
5. Polish: chart units (B2), naming/language (A4), and the small list/layout items (B3–B5).

### To see the applied fix live
The app on :3500 is served from a production build, so the Sales Hub change won't appear until you rebuild and restart: `npm run build`, then restart the server. The same rebuild also clears the broken Instrumente chunk.

---

## D. Transcription synthesis (23 Jun 2026)

See **`src/app-ui/TRANSCRIPTION_UI_BRIEF.md`** for the full mapping of Eleken + Builder.io principles onto Automatix.

Applied in code this pass:
- **Comunicare** workspace (Email / Mesaje / Alerte) split out of Instrumente
- Rail shows icon + short label by default (72px rail)
- Workspace sub-nav highlights the active tab route (`activeTabId`)
- Sales Hub page chrome → **Vânzări**

Still pending: Dashboard/Financiar number audit, skeleton/ErrorState batch, chart period labels.
