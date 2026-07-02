# ListReport — tiparul standard de pagină-listă (SAP Fiori "List Report")

Folosește această componentă pentru ORICE pagină-listă nouă, ca să arate și să
se comporte identic cu restul aplicației (filtre + tabel uniform), fără să
reimplementezi antetul, bara de filtrare, sortarea și stările goale.

## Exemplu

```tsx
import ListReport, { type ListColumn } from '@/components/ui/ListReport';
import { Package } from '@/icons';

const columns: ListColumn<Material>[] = [
  { key: 'name',  header: 'Material', sortKey: 'name',  render: m => m.name },
  { key: 'stock', header: 'Stoc',     sortKey: 'stock', render: m => m.stock, className: 'text-right tabular-nums' },
  { key: 'unit',  header: 'UM',       render: m => m.unit },
];

<ListReport
  title="Inventar"
  icon={<Package className="h-4 w-4" />}
  actions={<button className="...">+ Material</button>}
  rows={materials}
  columns={columns}
  rowKey={m => m.id}
  loading={loading}
  searchKeys={['name', 'unit']}
  searchPlaceholder="Caută material..."
  filters={[{ key: 'cat', label: 'Categorie', value: cat, onChange: setCat, options: [...] }]}
  onRowClick={m => navigate(`/materials/${m.id}`)}   // → Object Page
  emptyMessage="Niciun material înregistrat."
/>
```

## De ce
- Antet (PageHeader), filtre (FilterBar), sortare (useSort) și stările
  loading/empty sunt deja standardizate înăuntru.
- Click pe rând duce la Object Page — pattern-ul Fiori List Report → Object Page.
- Paginile existente folosesc deja aceleași primitive; ListReport doar le
  împachetează pentru cazurile noi, ca uniformitatea să fie automată.
