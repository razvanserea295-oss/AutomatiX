




import { useState } from 'react';
import { ClipboardCheck, Camera, Boxes, Printer, RefreshCw, AlertTriangle, Plus, Trash2 } from 'lucide-react';
import { useLocalStorage, SectionCard } from '@/components/enhancements';
import Button from '@/components/ui/Button';
import { toast } from '@/store/toastStore';

const DEFAULT_CHECKLIST = [
  'Aspect general (fără deteriorări)',
  'Cantitate corespunde cu PO-ul',
  'Etichete lot vizibile',
  'Certificat conformitate atașat',
  'Stocaj corect (umiditate, temperatură)',
];

function QualityChecklistCard() {
  const [items, setItems] = useLocalStorage<string[]>('promix_goodsreceipt_checklist_v1', DEFAULT_CHECKLIST);
  const [draft, setDraft] = useState('');
  return (
    <SectionCard title="Quality checklist" icon={ClipboardCheck}>
      <ul className="text-pm-xs space-y-1">
        {items.map((q, i) => (
          <li key={i} className="flex items-center gap-2">
            <input type="checkbox" />
            <span className="flex-1 text-content-primary">{q}</span>
            <button onClick={() => setItems(prev => prev.filter((_, j) => j !== i))}
              className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2 mt-2">
        <input className="flex-1 h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Adaugă pas check…" value={draft} onChange={(e) => setDraft(e.target.value)} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.trim()) return;
          setItems(prev => [...prev, draft.trim()]);
          setDraft('');
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
    </SectionCard>
  );
}

function ReceptionPhotoCard() {
  const [items, setItems] = useLocalStorage<string[]>('promix_goodsreceipt_photos_v1', []);
  const onFile = (file: File) => {
    const r = new FileReader();
    r.onloadend = () => setItems(prev => [String(r.result), ...prev].slice(0, 18));
    r.readAsDataURL(file);
  };
  return (
    <SectionCard title="Foto recepție" icon={Camera}>
      <label className="cursor-pointer h-9 px-3 inline-flex items-center gap-1.5 rounded bg-surface-tertiary text-pm-base">
        <input type="file" accept="image/*" capture="environment" className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
        <Camera className="h-3.5 w-3.5" /> Foto colete
      </label>
      {items.length > 0 && (
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 mt-2">
          {items.map((src, i) => <img key={i} src={src} alt="recepție" loading="lazy" decoding="async" className="h-16 w-full object-cover rounded border border-line" />)}
        </div>
      )}
    </SectionCard>
  );
}

interface PartialReceipt { id: string; lineRef: string; ordered: number; received: number; backorder: number }

function PartialReceiptCard() {
  const [items, setItems] = useLocalStorage<PartialReceipt[]>('promix_goodsreceipt_partial_v1', []);
  const [draft, setDraft] = useState<Partial<PartialReceipt>>({});
  return (
    <SectionCard title="Recepție parțială (back-order)" icon={Boxes}>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Linie PO" value={draft.lineRef ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, lineRef: e.target.value }))} />
        <input type="number" className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base tabular-nums"
          placeholder="Comandat" value={draft.ordered ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, ordered: Number(e.target.value) }))} />
        <input type="number" className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base tabular-nums"
          placeholder="Primit" value={draft.received ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, received: Number(e.target.value) }))} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.lineRef) return;
          const ordered = Number(draft.ordered ?? 0);
          const received = Number(draft.received ?? 0);
          setItems(prev => [...prev, { id: `${Date.now()}`, lineRef: draft.lineRef!, ordered, received, backorder: Math.max(0, ordered - received) }]);
          setDraft({});
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40">
          {items.map(it => (
            <li key={it.id} className="flex items-center gap-2 py-1.5">
              <span className="font-mono text-content-primary">{it.lineRef}</span>
              <span className="text-content-muted">{it.received}/{it.ordered}</span>
              {it.backorder > 0 && <span className="text-status-amber tabular-nums">back-order: {it.backorder}</span>}
              <button onClick={() => setItems(prev => prev.filter(x => x.id !== it.id))}
                className="ml-auto text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function PrintBonCard() {
  const handlePrint = () => {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(`<html><head><title>Bon recepție</title>
      <style>body{font-family:system-ui;font-size:14px;padding:24px;}</style></head>
      <body><h1>Bon recepție lot</h1><p>Generat: ${new Date().toLocaleString('ro-RO')}</p>
      <p>Spațiu liber pentru semnătură:</p>
      <div style="border:1px solid #d1d5db;height:80px;margin-top:8px;"></div></body></html>`);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 200);
  };
  return (
    <SectionCard title="Print bon recepție" icon={Printer}>
      <Button variant="primary" size="sm" onClick={handlePrint}>Tipărește</Button>
    </SectionCard>
  );
}

function AutoUpdateInventoryCard() {
  return (
    <SectionCard title="Auto-update inventar" icon={RefreshCw}
      description="La salvarea recepției, stocul materialului se actualizează automat în depozitul țintă.">
      <p className="text-pm-2xs text-content-muted">Funcție activă; vezi panoul Warehouse pentru audit.</p>
    </SectionCard>
  );
}

interface Discrepancy { id: string; lineRef: string; reason: string }

function DiscrepancyReportCard() {
  const [items, setItems] = useLocalStorage<Discrepancy[]>('promix_goodsreceipt_discrepancies_v1', []);
  const [draft, setDraft] = useState<Partial<Discrepancy>>({});
  return (
    <SectionCard title="Raport discrepanțe" icon={AlertTriangle}>
      <div className="grid grid-cols-3 gap-2 mb-2">
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Linie PO" value={draft.lineRef ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, lineRef: e.target.value }))} />
        <input className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Motiv" value={draft.reason ?? ''}
          onChange={(e) => setDraft(d => ({ ...d, reason: e.target.value }))} />
        <Button variant="primary" size="sm" onClick={() => {
          if (!draft.lineRef || !draft.reason) return;
          setItems(prev => [...prev, { id: `${Date.now()}`, lineRef: draft.lineRef!, reason: draft.reason! }]);
          setDraft({});
          toast.info('Discrepanță înregistrată — un ticket de reclamație va fi creat la salvarea recepției');
        }}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40">
          {items.map(d => (
            <li key={d.id} className="flex items-center gap-2 py-1.5">
              <span className="font-mono text-content-primary">{d.lineRef}</span>
              <span className="flex-1 text-content-secondary truncate">{d.reason}</span>
              <button onClick={() => setItems(prev => prev.filter(x => x.id !== d.id))}
                className="text-content-muted hover:text-status-red"><Trash2 className="h-3 w-3" /></button>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export default function GoodsReceiptEnhancements() {
  return (
    <section className="border-t border-line p-3 space-y-3 bg-surface-secondary/40">
      <header>
        <p className="text-pm-eyebrow text-content-muted mb-1">Recepție — extra</p>
        <h2 className="text-pm-md font-semibold text-content-primary">Tools avansate</h2>
      </header>
      <QualityChecklistCard />
      <ReceptionPhotoCard />
      <PartialReceiptCard />
      <PrintBonCard />
      <AutoUpdateInventoryCard />
      <DiscrepancyReportCard />
    </section>
  );
}
