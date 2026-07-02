




import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, FileDown, ListChecks, Plus, ChevronDown } from '@/icons';
import { useLocalStorage, SectionCard, ExportMenu } from '@/components/enhancements';
import Button from '@/components/ui/Button';
import StatusBadge from '@/components/ui/StatusBadge';
import { toast } from '@/store/toastStore';
import { formatDateRo } from '@/lib/format';

export interface AnomalyLite { id: number; severity: string; type?: string; created_at: string; title?: string; description?: string }
export interface HandoffLite { id: number; project_name: string; from_stage_name?: string | null; to_stage_name?: string | null; created_at?: string | null }

interface Props {
  anomalies: AnomalyLite[];
  handoffs: HandoffLite[];
  onBulkAck?: (ids: number[]) => Promise<void> | void;
}



function BulkAckCard({ anomalies, onBulkAck }: { anomalies: AnomalyLite[]; onBulkAck?: Props['onBulkAck'] }) {
  const [selected, setSelected] = useState<number[]>([]);
  const [reason, setReason] = useState('');

  const toggle = (id: number) => setSelected(prev =>
    prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
  );

  const ack = async () => {
    if (selected.length === 0) return;
    if (onBulkAck) await onBulkAck(selected);
    toast.success(`${selected.length} anomalii marcate rezolvate${reason ? ` (motiv: ${reason})` : ''}`);
    setSelected([]); setReason('');
  };

  return (
    <SectionCard title="Bulk acknowledge" icon={ListChecks}
      description="Selectează multiple anomalii pentru rezolvare în lot"
      actions={selected.length > 0 && <span className="text-pm-2xs text-content-secondary">{selected.length} selectate</span>}
    >
      {anomalies.length === 0 ? (
        <p className="text-pm-xs text-content-muted text-center py-3">Nicio anomalie disponibilă.</p>
      ) : (
        <ul className="text-pm-xs divide-y divide-line/40 max-h-44 overflow-y-auto">
          {anomalies.slice(0, 30).map(a => (
            <li key={a.id} className="flex items-center gap-2 py-1.5">
              <input type="checkbox" checked={selected.includes(a.id)} onChange={() => toggle(a.id)} />
              <StatusBadge size="xs" tone={a.severity === 'critical' ? 'danger' : 'warning'} label={a.severity} />
              <span className="flex-1 text-content-primary truncate">{a.title || a.description}</span>
              <span className="text-content-muted">{formatDateRo(a.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="flex items-center gap-2 mt-2">
        <input className="flex-1 h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Motiv comun (opțional)" value={reason} onChange={(e) => setReason(e.target.value)} />
        <Button variant="primary" size="sm" onClick={ack} disabled={selected.length === 0}>Marchează rezolvate</Button>
      </div>
    </SectionCard>
  );
}


function TrendChartCard({ anomalies }: { anomalies: AnomalyLite[] }) {
  const series = useMemo(() => {
    const days: { date: string; count: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date();
      d.setHours(0, 0, 0, 0);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().slice(0, 10);
      const count = anomalies.filter(a => a.created_at.startsWith(key)).length;
      days.push({ date: key, count });
    }
    return days;
  }, [anomalies]);

  const max = Math.max(...series.map(s => s.count), 1);

  return (
    <SectionCard title="Trend anomalii (30 zile)" icon={TrendingUp}>
      <div className="flex items-end gap-0.5 h-16">
        {series.map(s => (
          <div
            key={s.date}
            title={`${s.date}: ${s.count}`}
            className="flex-1 bg-accent/60 hover:bg-accent rounded-t min-h-[2px] transition-colors"
            style={{ height: `${(s.count / max) * 100}%` }}
          />
        ))}
      </div>
      <p className="text-pm-2xs text-content-muted mt-1">Total ultima lună: {anomalies.length}</p>
    </SectionCard>
  );
}


function IncidentReportCard({ anomalies }: { anomalies: AnomalyLite[] }) {
  const cols = [
    { key: 'id', label: 'ID' },
    { key: 'severity', label: 'Severitate' },
    { key: 'title', label: 'Titlu' },
    { key: 'description', label: 'Descriere' },
    { key: 'created_at', label: 'Creat' },
  ] as const;
  return (
    <SectionCard title="Raport incidente" icon={FileDown}
      description="Export pentru ședința lunară de management"
      actions={<ExportMenu rows={anomalies} columns={cols as unknown as Parameters<typeof ExportMenu>[0]['columns']} filename="incidente" title="Raport incidente lunar" />}
    >
      <p className="text-pm-xs text-content-secondary">{anomalies.length} înregistrări vor fi incluse.</p>
    </SectionCard>
  );
}


interface ManualAnomaly { id: string; severity: string; title: string; note?: string; created_at: string }

function ManualAnomalyCard() {
  const [items, setItems] = useLocalStorage<ManualAnomaly[]>('promix_manager_manual_anom_v1', []);
  const [draft, setDraft] = useState<Partial<ManualAnomaly>>({ severity: 'medium' });

  const add = () => {
    if (!draft.title) return;
    setItems(prev => [{
      id: `${Date.now()}`,
      severity: draft.severity ?? 'medium',
      title: draft.title!, note: draft.note,
      created_at: new Date().toISOString(),
    }, ...prev]);
    setDraft({ severity: 'medium' });
  };

  return (
    <SectionCard title="Anomalie manuală" icon={ChevronDown} description="Marchează situații care nu sunt prinse de detectorul automat">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-2">
        <select className="h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          value={draft.severity} onChange={(e) => setDraft(d => ({ ...d, severity: e.target.value }))}>
          <option value="low">low</option><option value="medium">medium</option>
          <option value="high">high</option><option value="critical">critical</option>
        </select>
        <input className="md:col-span-2 h-9 rounded border border-line bg-surface-primary px-3 text-pm-base"
          placeholder="Titlu" value={draft.title ?? ''} onChange={(e) => setDraft(d => ({ ...d, title: e.target.value }))} />
        <Button variant="primary" size="sm" onClick={add}><Plus className="h-3.5 w-3.5" /></Button>
      </div>
      {items.length > 0 && (
        <ul className="text-pm-xs divide-y divide-line/40 max-h-32 overflow-y-auto">
          {items.map(a => (
            <li key={a.id} className="flex items-center gap-2 py-1.5">
              <StatusBadge size="xs" tone={a.severity === 'critical' ? 'danger' : 'warning'} label={a.severity} />
              <span className="flex-1 text-content-primary truncate">{a.title}</span>
              <span className="text-content-muted">{formatDateRo(a.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

export default function ManagerEnhancements({ anomalies, onBulkAck }: Props) {
  useEffect(() => {  }, [anomalies.length]);
  
  
  
  
  
  
  
  return (
    <section className="mt-2 space-y-4">
      <header>
        <p className="text-pm-eyebrow text-content-muted mb-1">Tools manager</p>
        <h2 className="text-pm-md font-semibold text-content-primary">Acțiuni avansate de control</h2>
      </header>
      <TrendChartCard anomalies={anomalies} />
      <BulkAckCard anomalies={anomalies} onBulkAck={onBulkAck} />
      <ManualAnomalyCard />
      <IncidentReportCard anomalies={anomalies} />
    </section>
  );
}
