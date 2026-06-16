import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, MapPin, Calendar, User,
  Wrench, ClipboardList, Clock, Package, Activity, AlertTriangle,
  Plus, ChevronRight,
} from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import type { User as AppUser } from '@/core/types';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
import { STATION_PIECE_MODULES, slugToLabel } from '@/constants/stationPieceModules';
import { formatDateRo, formatCurrencyRon } from '@/lib/format';
import { confirmDialog } from '@/components/ConfirmDialog';
import PageHeader from '@/components/ui/PageHeader';
import StatusBadge from '@/components/ui/StatusBadge';
import type { StatusTone } from '@/lib/statusTokens';
import type { TabDescriptor } from '@/components/ui/Tabs';





interface StationDetail {
  id: number;
  project_id: number | null;
  project_name: string | null;
  client_id: number;
  client_name: string;
  code: string;
  name: string;
  location: string | null;
  station_type: string | null;
  delivery_date: string | null;
  commissioning_date: string | null;
  warranty_end_date: string | null;
  status: string;
  internal_manager_id: number | null;
  internal_manager_name: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface Intervention {
  id: number;
  station_id: number;
  intervention_type: string;
  reason: string;
  problem_description: string | null;
  open_date: string;
  is_urgent: boolean;
  technician_id: number | null;
  status: string;
  close_date: string | null;
  final_notes: string | null;
  labor_cost: number;
  created_at: string;
  updated_at: string;
}

interface MaintenancePlan {
  id: number;
  station_id: number;
  maintenance_type: string;
  periodicity_days: number;
  last_execution_date: string | null;
  next_execution_date: string;
  assignee_id: number | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface PartsRequest {
  id: number;
  station_id: number;
  intervention_id: number | null;
  material_id: number | null;
  part_name: string | null;
  part_code: string | null;
  quantity: number;
  reason: string | null;
  status: string;
  supplier: string | null;
  estimated_cost: number;
  order_date: string | null;
  received_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ChangeRequest {
  id: number;
  station_id: number;
  requested_by_name: string | null;
  request_date: string;
  description: string;
  priority: string;
  status: string;
  estimated_cost: number;
  estimated_deadline: string | null;
  assignee_id: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

interface ActivityLog {
  id: number;
  station_id: number;
  user_id: number | null;
  action_type: string;
  description: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

type TabId = 'overview' | 'interventions' | 'maintenance' | 'parts' | 'changes' | 'activity';

const TABS: { id: TabId; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'overview', label: 'Prezentare', icon: ClipboardList },
  { id: 'interventions', label: 'Interventii', icon: Wrench },
  { id: 'maintenance', label: 'Mentenanta', icon: Clock },
  { id: 'parts', label: 'Piese', icon: Package },
  { id: 'changes', label: 'Cereri modificare', icon: AlertTriangle },
  { id: 'activity', label: 'Jurnal', icon: Activity },
];





function statusTone(status: string): StatusTone {
  const s = status.toUpperCase();
  if (['ACTIVE', 'COMPLETED', 'RECEIVED', 'INSTALLED', 'APPROVED'].includes(s)) return 'success';
  if (['OPEN', 'NEW', 'PLANNED', 'IDENTIFIED', 'TO_ORDER', 'IN_ANALYSIS'].includes(s)) return 'warning';
  if (['IN_PROGRESS', 'IN_SERVICE', 'IN_TRANSIT', 'ORDERED', 'SCHEDULED', 'DUE_SOON'].includes(s)) return 'warning';
  if (['WAITING_FOR_PARTS', 'NEEDS_PARTS', 'OVERDUE', 'BLOCKED', 'STOPPED'].includes(s)) return 'danger';
  if (['CANCELLED', 'REJECTED', 'DECOMMISSIONED', 'UNAVAILABLE'].includes(s)) return 'neutral';
  return 'neutral';
}

function StationStatusBadge({ status, size }: { status: string; size?: 'xs' | 'sm' | 'md' }) {
  return <StatusBadge tone={statusTone(status)} label={status.replace(/_/g, ' ')} size={size} />;
}

function priorityTone(priority: string): StatusTone {
  const p = priority.toUpperCase();
  if (p === 'CRITICAL') return 'danger';
  if (p === 'HIGH') return 'warning';
  if (p === 'MEDIUM') return 'warning';
  return 'neutral';
}

function PriorityBadge({ priority }: { priority: string }) {
  return <StatusBadge tone={priorityTone(priority)} label={priority} size="xs" />;
}

const formatDate = formatDateRo;
const formatCurrency = formatCurrencyRon;





interface StationDetailPageProps {
  user: AppUser | null;
  stationId: number;
  onBack: () => void;
}

export default function StationDetailPage({ stationId, onBack }: StationDetailPageProps) {
  const [activeTab, setActiveTab] = useState<TabId>('overview');
  const [station, setStation] = useState<StationDetail | null>(null);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [maintenance, setMaintenance] = useState<MaintenancePlan[]>([]);
  const [parts, setParts] = useState<PartsRequest[]>([]);
  const [changes, setChanges] = useState<ChangeRequest[]>([]);
  const [activityLog, setActivityLog] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const interventionModal = useFormModal();

  const fetchStation = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiCommand<StationDetail>('get_station_by_id', { id: stationId });
      setStation(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Eroare la incarcarea statiei');
    } finally {
      setLoading(false);
    }
  }, [stationId]);

  const fetchTabData = useCallback(async (tab: TabId) => {
    try {
      switch (tab) {
        case 'interventions': {
          const data = await apiCommand<Intervention[]>('get_station_interventions', { station_id: stationId });
          setInterventions(data);
          break;
        }
        case 'maintenance': {
          const data = await apiCommand<MaintenancePlan[]>('get_station_maintenance_plans', { station_id: stationId });
          setMaintenance(data);
          break;
        }
        case 'parts': {
          const data = await apiCommand<PartsRequest[]>('get_station_parts', { station_id: stationId });
          setParts(data);
          break;
        }
        case 'changes': {
          const data = await apiCommand<ChangeRequest[]>('get_station_change_requests', { station_id: stationId });
          setChanges(data);
          break;
        }
        case 'activity': {
          const data = await apiCommand<ActivityLog[]>('get_station_activity', { station_id: stationId });
          setActivityLog(data);
          break;
        }
      }
    } catch (err) {
      console.error(`[StationDetail] Failed to load ${tab}:`, err);
    }
  }, [stationId]);

  useEffect(() => { void fetchStation(); }, [fetchStation]);
  useEffect(() => { void fetchTabData(activeTab); }, [activeTab, fetchTabData]);

  
  
  
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        void fetchStation();
        void fetchTabData(activeTab);
      }
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('focus', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('focus', onVisible);
    };
  }, [activeTab, fetchStation, fetchTabData]);

  
  const interventionFields: FormField[] = [
    {
      name: 'intervention_type', label: 'Tip interventie', type: 'select', required: true,
      options: [
        { value: 'SERVICE', label: 'Service' },
        { value: 'CORRECTIVE', label: 'Corectiva' },
        { value: 'PREVENTIVE', label: 'Preventiva' },
        { value: 'DIAGNOSTIC', label: 'Diagnostic' },
        { value: 'UPGRADE', label: 'Upgrade' },
        { value: 'CHECKUP', label: 'Verificare' },
      ],
    },
    { name: 'reason', label: 'Motiv', type: 'text', required: true, placeholder: 'Descriere motiv interventie' },
    { name: 'problem_description', label: 'Descriere problema', type: 'textarea', required: false, placeholder: 'Detalii tehnice...' },
    {
      name: 'is_urgent', label: 'Urgent', type: 'select', required: false,
      options: [{ value: '0', label: 'Nu' }, { value: '1', label: 'Da' }],
    },
  ];

  const handleCreateIntervention = async (data: Record<string, unknown>) => {
    await apiCommand('create_intervention', {
      station_id: stationId,
      intervention_type: data.intervention_type || 'SERVICE',
      reason: data.reason,
      problem_description: data.problem_description || null,
      is_urgent: data.is_urgent === '1',
    });
    await fetchTabData('interventions');
  };

  
  if (loading && !station) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-page">
        <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
      </div>
    );
  }

  if (error && !station) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-surface-page">
        <p className="text-sm text-status-red">{error}</p>
        <button type="button" onClick={onBack} className="mt-3 text-xs text-accent hover:underline">
          ← Înapoi la statii
        </button>
      </div>
    );
  }

  if (!station) return null;

  
  const moduleKeys = STATION_PIECE_MODULES.map((m) => m.slug);

  
  const warrantyActive = station.warranty_end_date && new Date(station.warranty_end_date) > new Date();

  const tabDescriptors: TabDescriptor<TabId>[] = TABS.map(({ id, label, icon: Icon }) => ({
    id,
    label,
    icon: <Icon className="h-3.5 w-3.5" />,
  }));

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface-page">
      {}
      <PageHeader
        onBack={onBack}
        title={station.name}
        icon={<Wrench className="h-4 w-4" />}
        subtitle={`Cod: ${station.code} | Client: ${station.client_name}${station.project_name ? ` | Proiect: ${station.project_name}` : ''}`}
        tabs={tabDescriptors}
        activeTab={activeTab}
        onTabChange={setActiveTab}
      >
        <StationStatusBadge status={station.status} />
        {warrantyActive && (
          <StatusBadge tone="success" label="Garantie" dot />
        )}
        {station.location && (
          <span className="flex items-center gap-1 text-xs text-content-muted">
            <MapPin className="h-3 w-3" />{station.location}
          </span>
        )}
      </PageHeader>

      {}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {activeTab === 'overview' && <OverviewTab station={station} moduleKeys={moduleKeys} />}
        {activeTab === 'interventions' && (
          <InterventionsTab interventions={interventions} onAdd={() => interventionModal.openModal()} />
        )}
        {activeTab === 'maintenance' && <MaintenanceTab plans={maintenance} stationId={stationId} onChange={() => fetchTabData(activeTab)} />}
        {activeTab === 'parts' && <PartsTab parts={parts} stationId={stationId} onChange={() => fetchTabData(activeTab)} />}
        {activeTab === 'changes' && <ChangesTab changes={changes} stationId={stationId} onChange={() => fetchTabData(activeTab)} />}
        {activeTab === 'activity' && <ActivityTab logs={activityLog} />}
      </div>

      {}
      <FormModal
        isOpen={interventionModal.isOpen}
        onClose={interventionModal.closeModal}
        title="Adaugă interventie"
        fields={interventionFields}
        onSubmit={handleCreateIntervention}
        initialData={{}}
        submitLabel="Creeaza"
      />
    </div>
  );
}





function OverviewTab({ station, moduleKeys }: { station: StationDetail; moduleKeys: string[] }) {
  return (
    <div className="flex flex-col">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {}
        <div className="bg-surface-secondary border-b border-line lg:border-r p-4">
          <h2 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted mb-3">Informatii statie</h2>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <InfoRow label="Cod" value={station.code} />
            <InfoRow label="Tip" value={station.station_type} />
            <InfoRow label="Client" value={station.client_name} />
            <InfoRow label="Proiect" value={station.project_name} />
            <InfoRow label="Locație" value={station.location} />
            <InfoRow label="Status" value={station.status} />
            <InfoRow label="Manager intern" value={station.internal_manager_name} />
            <InfoRow label="Data livrare" value={formatDate(station.delivery_date)} />
            <InfoRow label="Punere in functiune" value={formatDate(station.commissioning_date)} />
            <InfoRow label="Garantie pana" value={formatDate(station.warranty_end_date)} />
          </dl>
          {station.notes && (
            <div className="mt-3 border-t border-line pt-2 text-xs text-content-muted">
              <span className="font-medium text-content-primary">Note: </span>{station.notes}
            </div>
          )}
        </div>

        {}
        <div className="bg-surface-secondary border-b border-line p-4">
          <h2 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted mb-3">Module standard statie</h2>
          <div className="flex flex-col">
            {moduleKeys.map((slug, i) => (
              <div key={slug} className={`flex items-center gap-2 bg-surface-primary px-3 py-2 text-xs ${i > 0 ? 'border-t border-line' : ''}`}>
                <div className="w-2 h-2 bg-accent shrink-0" />
                <span className="text-content-primary">{slugToLabel(slug)}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {}
      <div className="bg-surface-secondary border-b border-line p-4">
        <h2 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted mb-3">Cronologie</h2>
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {[
            { label: 'Creare', date: station.created_at },
            { label: 'Livrare', date: station.delivery_date },
            { label: 'Punere in functiune', date: station.commissioning_date },
            { label: 'Garantie expirare', date: station.warranty_end_date },
          ].map((step, i, arr) => (
            <div key={step.label} className="flex items-center gap-2">
              <div className="flex flex-col items-center">
                <div className={`w-3 h-3 border-2 ${step.date ? 'border-accent bg-accent/20' : 'border-line bg-surface-primary'}`} />
                <div className="mt-1 text-center">
                  <p className="text-pm-2xs font-medium text-content-primary whitespace-nowrap">{step.label}</p>
                  <p className="text-pm-2xs text-content-muted">{formatDate(step.date)}</p>
                </div>
              </div>
              {i < arr.length - 1 && <div className="w-12 h-px bg-line shrink-0 mt-[-14px]" />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <>
      <dt className="text-content-muted">{label}</dt>
      <dd className="text-content-primary font-medium">{value || '—'}</dd>
    </>
  );
}





function InterventionsTab({ interventions, onAdd }: { interventions: Intervention[]; onAdd: () => void }) {
  return (
    <div className="flex flex-col">
      {}
      <div className="flex items-center justify-between border-b border-line bg-surface-primary px-5 py-2">
        <h2 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Interventii service ({interventions.length})</h2>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1.5 h-8 bg-accent px-3.5 text-xs font-semibold text-surface-primary"
        >
          <Plus className="h-3.5 w-3.5" /> Adaugă interventie
        </button>
      </div>

      {interventions.length === 0 ? (
        <EmptyState text="Nicio interventie inregistrata" />
      ) : (
        <div className="flex flex-col">
          {interventions.map((iv) => (
            <div key={iv.id} className="bg-surface-secondary border-b border-line p-3 flex items-start gap-3">
              <div className={`mt-0.5 w-2.5 h-2.5 shrink-0 ${iv.is_urgent ? 'bg-status-red animate-pulse' : 'bg-accent'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-medium text-content-primary">{iv.reason}</span>
                  <StationStatusBadge status={iv.status} />
                  <span className="text-pm-2xs px-1.5 py-0.5 bg-surface-tertiary text-content-muted">{iv.intervention_type}</span>
                  {iv.is_urgent && (
                    <StatusBadge tone="danger" label="URGENT" size="xs" />
                  )}
                </div>
                {iv.problem_description && (
                  <p className="mt-1 text-xs text-content-muted line-clamp-2">{iv.problem_description}</p>
                )}
                <div className="mt-1.5 flex items-center gap-3 text-pm-2xs text-content-muted">
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(iv.open_date)}</span>
                  {iv.close_date && <span>Inchis: {formatDate(iv.close_date)}</span>}
                  {iv.labor_cost > 0 && <span>Cost: {formatCurrency(iv.labor_cost)}</span>}
                </div>
                {iv.final_notes && (
                  <p className="mt-1 text-pm-2xs text-content-muted italic">Note: {iv.final_notes}</p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-content-muted shrink-0 mt-1" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}





function MaintenanceTab({ plans, stationId, onChange }: { plans: MaintenancePlan[]; stationId: number; onChange: () => void }) {
  const [show, setShow] = useState(false);
  const [maintenanceType, setMaintenanceType] = useState('Revizie generala');
  const [periodicityDays, setPeriodicityDays] = useState('90');
  const [nextDate, setNextDate] = useState(new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const submit = async () => {
    if (!maintenanceType.trim()) { toast.error('Tip mentenanta obligatoriu'); return; }
    try {
      await apiCommand('create_station_maintenance_plan', {
        request: {
          station_id: stationId,
          maintenance_type: maintenanceType.trim(),
          periodicity_days: Number(periodicityDays) || 90,
          next_execution_date: nextDate,
          notes: notes.trim() || null,
        },
      });
      toast.success('Plan adaugat');
      setShow(false); setMaintenanceType('Revizie generala'); setNotes('');
      onChange();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare la adăugare');
    }
  };
  const remove = async (id: number) => {
    if (!(await confirmDialog({ title: 'Șterge planul?', danger: true }))) return;
    try {
      await apiCommand('delete_station_maintenance_plan', { id });
      toast.success('Sters'); onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Eroare'); }
  };
  return (
    <div className="flex flex-col">
      {}
      <div className="flex items-center justify-between border-b border-line bg-surface-primary px-5 py-2">
        <h2 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Planuri mentenanta ({plans.length})</h2>
        <button type="button" onClick={() => setShow(true)}
          className="bg-accent px-2.5 py-1 text-pm-xs font-semibold text-surface-primary hover:opacity-90">+ Plan nou</button>
      </div>

      {show && (
        <div className="bg-surface-secondary border-b border-accent/40 p-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={maintenanceType} onChange={e => setMaintenanceType(e.target.value)} placeholder="Tip mentenanta"
              className="border border-line bg-surface-primary px-2 py-1.5 text-xs" />
            <input type="number" value={periodicityDays} onChange={e => setPeriodicityDays(e.target.value)} placeholder="Zile"
              className="border border-line bg-surface-primary px-2 py-1.5 text-xs" />
            <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
              className="border border-line bg-surface-primary px-2 py-1.5 text-xs" />
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note"
              className="border border-line bg-surface-primary px-2 py-1.5 text-xs" />
          </div>
          <div className="flex justify-end gap-1.5 mt-2">
            <button onClick={() => setShow(false)} className="border border-line px-2 py-1 text-pm-2xs text-content-secondary">Anulează</button>
            <button onClick={submit} className="bg-accent px-3 py-1 text-pm-2xs font-semibold text-surface-primary">Salvează</button>
          </div>
        </div>
      )}

      {plans.length === 0 ? (
        <EmptyState text="Niciun plan de mentenanta" />
      ) : (
        <div className="bg-surface-secondary overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line">
                <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Tip</th>
                <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Periodicitate</th>
                <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Ultima executie</th>
                <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Urmatoarea</th>
                <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {plans.map((p) => {
                const isOverdue = new Date(p.next_execution_date) < new Date() && p.status !== 'COMPLETED';
                return (
                  <tr key={p.id} className={`border-b border-line hover:bg-surface-tertiary/30 transition-colors ${isOverdue ? 'bg-status-red/5' : ''}`}>
                    <td className="px-3 py-2 text-content-primary font-medium">{p.maintenance_type}</td>
                    <td className="px-3 py-2 text-content-muted tabular-nums">La {p.periodicity_days} zile</td>
                    <td className="px-3 py-2 text-content-muted">{formatDate(p.last_execution_date)}</td>
                    <td className={`px-3 py-2 ${isOverdue ? 'text-status-red font-medium' : 'text-content-muted'}`}>
                      {formatDate(p.next_execution_date)}
                      {isOverdue && <span className="ml-1 text-pm-2xs">(DEPASIT)</span>}
                    </td>
                    <td className="px-3 py-2"><StationStatusBadge status={p.status} /></td>
                    <td className="px-3 py-2 text-right">
                      <button onClick={() => remove(p.id)} className="text-pm-2xs text-status-red hover:underline">Șterge</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}





function PartsTab({ parts, stationId, onChange }: { parts: PartsRequest[]; stationId: number; onChange: () => void }) {
  const totalCost = parts.reduce((s, p) => s + p.estimated_cost * p.quantity, 0);
  const [show, setShow] = useState(false);
  const [partName, setPartName] = useState('');
  const [partCode, setPartCode] = useState('');
  const [quantity, setQuantity] = useState('1');
  const [supplier, setSupplier] = useState('');
  const [estimatedCost, setEstimatedCost] = useState('0');
  const [reason, setReason] = useState('');
  const submit = async () => {
    if (!partName.trim()) { toast.error('Numele piesei e obligatoriu'); return; }
    try {
      await apiCommand('create_station_parts_request', {
        request: {
          station_id: stationId,
          part_name: partName.trim(),
          part_code: partCode.trim() || null,
          quantity: Number(quantity) || 1,
          supplier: supplier.trim() || null,
          estimated_cost: Number(estimatedCost) || 0,
          reason: reason.trim() || null,
        },
      });
      toast.success('Cerere piesa adaugata');
      setShow(false); setPartName(''); setPartCode(''); setQuantity('1'); setSupplier(''); setEstimatedCost('0'); setReason('');
      onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Eroare'); }
  };
  const remove = async (id: number) => {
    if (!(await confirmDialog({ title: 'Șterge cererea?', danger: true }))) return;
    try { await apiCommand('delete_station_parts_request', { id }); toast.success('Sters'); onChange(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Eroare'); }
  };
  return (
    <div className="flex flex-col">
      {}
      <div className="flex items-center justify-between border-b border-line bg-surface-primary px-5 py-2">
        <h2 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Piese solicitate ({parts.length})</h2>
        <div className="flex items-center gap-3">
          {totalCost > 0 && (
            <span className="text-xs text-content-muted">Cost estimat total: <strong className="text-content-primary tabular-nums">{formatCurrency(totalCost)}</strong></span>
          )}
          <button type="button" onClick={() => setShow(true)}
            className="bg-accent px-2.5 py-1 text-pm-xs font-semibold text-surface-primary hover:opacity-90">+ Cerere noua</button>
        </div>
      </div>

      {show && (
        <div className="bg-surface-secondary border-b border-accent/40 p-3">
          <div className="grid grid-cols-2 gap-2">
            <input value={partName} onChange={e => setPartName(e.target.value)} placeholder="Nume piesa *" className="border border-line bg-surface-primary px-2 py-1.5 text-xs" />
            <input value={partCode} onChange={e => setPartCode(e.target.value)} placeholder="Cod" className="border border-line bg-surface-primary px-2 py-1.5 text-xs" />
            <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Cantitate" className="border border-line bg-surface-primary px-2 py-1.5 text-xs" />
            <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Furnizor" className="border border-line bg-surface-primary px-2 py-1.5 text-xs" />
            <input type="number" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} placeholder="Cost estimat (RON)" className="border border-line bg-surface-primary px-2 py-1.5 text-xs" />
            <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motiv" className="border border-line bg-surface-primary px-2 py-1.5 text-xs" />
          </div>
          <div className="flex justify-end gap-1.5 mt-2">
            <button onClick={() => setShow(false)} className="border border-line px-2 py-1 text-pm-2xs text-content-secondary">Anulează</button>
            <button onClick={submit} className="bg-accent px-3 py-1 text-pm-2xs font-semibold text-surface-primary">Salvează</button>
          </div>
        </div>
      )}

      {parts.length === 0 ? (
        <EmptyState text="Nicio solicitare de piese" />
      ) : (
        <div className="bg-surface-secondary overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-line">
                <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Piesa</th>
                <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Cod</th>
                <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Cant.</th>
                <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Furnizor</th>
                <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Cost est.</th>
                <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Comandat</th>
                <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Primit</th>
                <th className="px-3 py-2 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Status</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {parts.map((p) => (
                <tr key={p.id} className="border-b border-line hover:bg-surface-tertiary/30 transition-colors">
                  <td className="px-3 py-2 text-content-primary font-medium">{p.part_name || '—'}</td>
                  <td className="px-3 py-2 text-content-muted font-mono text-pm-2xs">{p.part_code || '—'}</td>
                  <td className="px-3 py-2 text-content-primary tabular-nums">{p.quantity}</td>
                  <td className="px-3 py-2 text-content-muted">{p.supplier || '—'}</td>
                  <td className="px-3 py-2 text-content-primary tabular-nums">{formatCurrency(p.estimated_cost)}</td>
                  <td className="px-3 py-2 text-content-muted">{formatDate(p.order_date)}</td>
                  <td className="px-3 py-2 text-content-muted">{formatDate(p.received_date)}</td>
                  <td className="px-3 py-2"><StationStatusBadge status={p.status} /></td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => remove(p.id)} className="text-pm-2xs text-status-red hover:underline">Șterge</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}





function ChangesTab({ changes, stationId, onChange }: { changes: ChangeRequest[]; stationId: number; onChange: () => void }) {
  const [show, setShow] = useState(false);
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('MEDIUM');
  const [estimatedCost, setEstimatedCost] = useState('0');
  const [estimatedDeadline, setEstimatedDeadline] = useState('');
  const [requestedByName, setRequestedByName] = useState('');
  const submit = async () => {
    if (!description.trim()) { toast.error('Descrierea e obligatorie'); return; }
    try {
      await apiCommand('create_station_change_request', {
        request: {
          station_id: stationId,
          description: description.trim(),
          priority,
          estimated_cost: Number(estimatedCost) || 0,
          estimated_deadline: estimatedDeadline || null,
          requested_by_name: requestedByName.trim() || null,
        },
      });
      toast.success('Cerere adaugata');
      setShow(false); setDescription(''); setEstimatedCost('0'); setEstimatedDeadline(''); setRequestedByName('');
      onChange();
    } catch (e) { toast.error(e instanceof Error ? e.message : 'Eroare'); }
  };
  const remove = async (id: number) => {
    if (!(await confirmDialog({ title: 'Șterge cererea?', danger: true }))) return;
    try { await apiCommand('delete_station_change_request', { id }); toast.success('Sters'); onChange(); }
    catch (e) { toast.error(e instanceof Error ? e.message : 'Eroare'); }
  };
  return (
    <div className="flex flex-col">
      {}
      <div className="flex items-center justify-between border-b border-line bg-surface-primary px-5 py-2">
        <h2 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Cereri de modificare ({changes.length})</h2>
        <button type="button" onClick={() => setShow(true)}
          className="bg-accent px-2.5 py-1 text-pm-xs font-semibold text-surface-primary hover:opacity-90">+ Cerere noua</button>
      </div>

      {show && (
        <div className="bg-surface-secondary border-b border-accent/40 p-3">
          <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descriere modificare *" rows={2}
            className="w-full border border-line bg-surface-primary px-2 py-1.5 text-xs" />
          <div className="grid grid-cols-2 gap-2 mt-2">
            <select value={priority} onChange={e => setPriority(e.target.value)} className="border border-line bg-surface-primary px-2 py-1.5 text-xs">
              <option value="LOW">Scazuta</option>
              <option value="MEDIUM">Medie</option>
              <option value="HIGH">Ridicata</option>
              <option value="CRITICAL">Critica</option>
            </select>
            <input type="number" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} placeholder="Cost estimat" className="border border-line bg-surface-primary px-2 py-1.5 text-xs" />
            <input type="date" value={estimatedDeadline} onChange={e => setEstimatedDeadline(e.target.value)} className="border border-line bg-surface-primary px-2 py-1.5 text-xs" />
            <input value={requestedByName} onChange={e => setRequestedByName(e.target.value)} placeholder="Solicitant" className="border border-line bg-surface-primary px-2 py-1.5 text-xs" />
          </div>
          <div className="flex justify-end gap-1.5 mt-2">
            <button onClick={() => setShow(false)} className="border border-line px-2 py-1 text-pm-2xs text-content-secondary">Anulează</button>
            <button onClick={submit} className="bg-accent px-3 py-1 text-pm-2xs font-semibold text-surface-primary">Salvează</button>
          </div>
        </div>
      )}

      {changes.length === 0 ? (
        <EmptyState text="Nicio cerere de modificare" />
      ) : (
        <div className="flex flex-col">
          {changes.map((cr) => (
            <div key={cr.id} className="bg-surface-secondary border-b border-line p-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-medium text-content-primary">{cr.description}</span>
                <PriorityBadge priority={cr.priority} />
                <StationStatusBadge status={cr.status} />
              </div>
              <div className="flex items-center gap-3 text-pm-2xs text-content-muted mt-1.5">
                {cr.requested_by_name && (
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{cr.requested_by_name}</span>
                )}
                <span className="flex items-center gap-1"><Calendar className="h-3 w-3" />{formatDate(cr.request_date)}</span>
                {cr.estimated_cost > 0 && <span>Cost: {formatCurrency(cr.estimated_cost)}</span>}
                {cr.estimated_deadline && <span>Termen: {formatDate(cr.estimated_deadline)}</span>}
              </div>
              {cr.notes && <p className="text-pm-2xs text-content-muted italic mt-1">{cr.notes}</p>}
              <button onClick={() => remove(cr.id)} className="text-pm-2xs text-status-red hover:underline mt-1">Șterge cererea</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}





function ActivityTab({ logs }: { logs: ActivityLog[] }) {
  return (
    <div className="flex flex-col">
      <div className="border-b border-line bg-surface-primary px-5 py-2">
        <h2 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Jurnal activitate ({logs.length})</h2>
      </div>

      {logs.length === 0 ? (
        <EmptyState text="Nicio înregistrare in jurnal" />
      ) : (
        <div className="flex flex-col">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 py-2 px-5 border-b border-line bg-surface-secondary">
              <div className="mt-0.5 w-2 h-2 bg-accent shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-pm-2xs px-1.5 py-0.5 bg-surface-tertiary text-content-muted font-mono">{log.action_type}</span>
                  <span className="text-pm-2xs text-content-muted">{formatDate(log.created_at)}</span>
                </div>
                <p className="text-xs text-content-primary mt-0.5">{log.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}





function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center bg-surface-secondary border-b border-line p-12">
      <p className="text-xs text-content-muted">{text}</p>
    </div>
  );
}
