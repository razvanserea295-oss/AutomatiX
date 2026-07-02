# Mobile UI Notes

## Decizii UX

- Shell-ul SaaS are acum model mobil separat: app bar compact sus, drawer full-screen pe telefon / sheet pe tabletă și bottom nav pentru module frecvente.
- Sidebar-ul desktop rămâne desktop-only. Pe mobil, drawer-ul grupează workspace-urile și afișează subpaginile direct sub fiecare modul.
- Bottom nav-ul expune scurtături pentru `Start`, `Vânzări`, `Mesaje`, `Rapoarte`, `Setări`. Navigarea completă rămâne în drawer.
- `Page`, `PageChrome`, `Panel`, `DashboardLayout`, `ListPageLayout` și `MasterDetailLayout` folosesc gutters mai mici pe telefon, acțiuni wrap, KPI 1 coloană pe telefon și 2 pe tabletă.
- Paginile cu listă/detaliu (`Chat`, `Email`, `Tichete service`, `Oferte`) folosesc pe telefon flux listă -> detaliu în loc de două coloane înghesuite.
- Board-urile (`Vânzări`, `Comenzi piese`) păstrează scroll-ul orizontal unde este natural, dar cu înălțimi mobile explicite și panouri secundare sub board.

## Rute De Verificat

- `/` sau `/dashboard`: KPI-uri pe o coloană, panourile fără clipping, refresh accesibil.
- `/reports` și `/raports`: configurarea cade sub rezultate pe mobil; tabelul rămâne scrollabil.
- `/sales-hub`: pipeline scrollabil pe orizontală, convertite sub board pe telefon.
- `/chat`: listă conversații -> ecran conversație, buton înapoi vizibil.
- `/email`: foldere/listă -> email/compose/tools, fără trei coloane simultan pe telefon.
- `/alerts`: KPI-uri și filtre wrap, lista și rezumatul se stivuiesc.
- `/quotations`: lista apare înaintea detaliului pe mobil, detaliul are înălțime utilizabilă.
- `/service-tickets`: listă -> detaliu cu buton `Înapoi la listă`.
- `/pieces-ordering`: pipeline activ cu coloane lizibile și panoul de coduri dedesubt.
- `/settings`: navigarea secțiunilor are scroll intern, conținutul activ rămâne vizibil.
- `/tutorial`: rail-ul de tutorial are înălțime limitată pe mobil, conținutul principal rămâne scrollabil.

## Note De Implementare

- Comportamentul desktop al `AppSidebar`, `AppShell`, `shell.css` și `layoutStore` este păstrat.
- Noile texte vizibile sunt în română.
- Nu s-a schimbat logica de business; modificările sunt în shell, primitive de layout și clase responsive pe pagini migrate.
