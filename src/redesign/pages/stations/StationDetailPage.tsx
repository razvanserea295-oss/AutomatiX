




























import { useState, useEffect, useCallback } from 'react';
import {
  Loader2, MapPin, Calendar, User, ArrowLeft,
  Wrench, ClipboardList, Clock, Package, Activity, AlertTriangle,
  Plus, ChevronRight, Trash2,
} from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import type { User as AppUser } from '@/core/types';
import FormModal, { type FormField } from '@/components/FormModal';
import { useFormModal } from '@/hooks/useFormModal';
import { STATION_PIECE_MODULES, slugToLabel } from '@/constants/stationPieceModules';
import { formatDateRo, formatCurrencyRon } from '@/lib/format';
import { confirmDialog } from '@/components/ConfirmDialog';
import Page from '@/redesign/ui/Page';
import Button from '@/redesign/ui/Button';
import Card, { CardBody, CardHeader } from '@/redesign/ui/Card';
import KpiCard from '@/redesign/ui/KpiCard';
import IconButton from '@/redesign/ui/IconButton';
import StatusBadge from '@/redesign/ui/StatusBadge';
import Tabs, { type TabDescriptor } from '@/redesign/ui/Tabs';
import EmptyState from '@/redesign/ui/EmptyState';
import { vtName } from '@/redesign/lib/viewTransition';
import type { StatusTone } from '@/lib/statusTokens';





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
      <Page>
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
        </div>
      </Page>
    );
  }

  if (error && !station) {
    return (
      <Page>
        <div className="flex flex-1 flex-col items-center justify-center gap-3">
          <p className="text-pm-sm text-status-red">{error}</p>
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-3.5 w-3.5" /> Înapoi la statii
          </Button>
        </div>
      </Page>
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

  
  
  const tabCreateButton = (() => {
    if (activeTab === 'interventions') {
      return (
        <Button size="md" onClick={() => interventionModal.openModal()}>
          <Plus className="h-3.5 w-3.5" /> Adaugă interventie
        </Button>
      );
    }
    return null;
  })();

  return (
    <Page fit>
      {
}
      <div className="enter-up shrink-0 pb-4 border-b border-line/60 px-6 pt-6" style={{ animationDelay: '0ms' }}>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 inline-flex items-center justify-center gap-1.5 h-9 px-3 rounded-xl border border-line text-pm-sm font-medium text-content-secondary bg-surface-primary transition-smooth duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] hover:bg-surface-tertiary hover:text-content-primary active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Înapoi
          </button>

          <span className="h-11 w-11 rounded-2xl bg-accent-muted flex items-center justify-center shrink-0">
            <Wrench className="h-5 w-5 text-accent" />
          </span>

          <div className="min-w-0">
            {/* Eyebrow removed — breadcrumb already conveys the workspace. */}
            <h1 className="text-pm-2xl font-semibold text-content-primary leading-tight truncate">{station.name}</h1>
            <p className="text-pm-sm text-content-muted truncate leading-tight">
              {`Cod: ${station.code} | Client: ${station.client_name}${station.project_name ? ` | Proiect: ${station.project_name}` : ''}`}
            </p>
          </div>

          <div className="flex-1" />

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <StationStatusBadge status={station.status} />
            {warrantyActive && (
              <StatusBadge tone="success" label="Garantie" dot />
            )}
            {station.location && (
              <span className="flex min-w-0 max-w-[14rem] items-center gap-1 text-pm-xs text-content-muted">
                <MapPin className="h-3 w-3 shrink-0" /><span className="truncate">{station.location}</span>
              </span>
            )}
            {tabCreateButton}
          </div>
        </div>
      </div>

      <Page.Body fit maxWidth="wide" padding="comfortable">

        {}
        <Page.Kpis cols={4} className="shrink-0 stagger-in" key={`kpis-${interventions.length}-${maintenance.length}-${parts.length}-${changes.length}`}>
          <KpiCard
            label="Intervenții"
            value={interventions.length}
            icon={Wrench}
            vtName={vtName('station', station.id)}
            hint={interventions.some(i => i.is_urgent) ? 'Conține urgențe' : undefined}
          />
          <KpiCard
            label="Mentenanță"
            value={maintenance.length}
            icon={Clock}
            hint={
              maintenance.some(p => new Date(p.next_execution_date) < new Date() && p.status !== 'COMPLETED')
                ? 'Planuri depășite' : undefined
            }
          />
          <KpiCard
            label="Piese"
            value={parts.length}
            icon={Package}
            hint={parts.length > 0 ? `Cost est. ${formatCurrency(parts.reduce((s, p) => s + p.estimated_cost * p.quantity, 0))}` : undefined}
          />
          <KpiCard
            label="Cereri modificare"
            value={changes.length}
            icon={AlertTriangle}
          />
        </Page.Kpis>

        {}
        <Card padding="none" className="shrink-0">
          <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-2">
            <Tabs<TabId>
              tabs={tabDescriptors}
              activeId={activeTab}
              onChange={setActiveTab}
              variant="segmented"
            />
            {tabCreateButton}
          </div>
        </Card>

        {}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {}
          <div key={activeTab} className="enter-up">
            {activeTab === 'overview' && <OverviewTab station={station} moduleKeys={moduleKeys} />}
            {activeTab === 'interventions' && (
              <InterventionsTab interventions={interventions} onAdd={() => interventionModal.openModal()} />
            )}
            {activeTab === 'maintenance' && <MaintenanceTab plans={maintenance} stationId={stationId} onChange={() => fetchTabData(activeTab)} />}
            {activeTab === 'parts' && <PartsTab parts={parts} stationId={stationId} onChange={() => fetchTabData(activeTab)} />}
            {activeTab === 'changes' && <ChangesTab changes={changes} stationId={stationId} onChange={() => fetchTabData(activeTab)} />}
            {activeTab === 'activity' && <ActivityTab logs={activityLog} />}
          </div>
        </div>
      </Page.Body>

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
    </Page>
  );
}





function OverviewTab({ station, moduleKeys }: { station: StationDetail; moduleKeys: string[] }) {
  return (
    <div className="space-y-4">
      {}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {}
        <Card className="lg:col-span-7">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                  <ClipboardList className="h-4 w-4" />
                </span>
                Informatii statie
              </span>
            }
          />
          <CardBody>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4">
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
              <div className="mt-4 border-t border-line/70 pt-3 text-pm-sm text-content-muted">
                <span className="font-medium text-content-primary">Note: </span>{station.notes}
              </div>
            )}
          </CardBody>
        </Card>

        {}
        <Card className="lg:col-span-5">
          <CardHeader
            title={
              <span className="flex items-center gap-2">
                <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                  <Package className="h-4 w-4" />
                </span>
                Module standard statie
              </span>
            }
          />
          <CardBody>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 stagger-in">
              {moduleKeys.map((slug) => (
                <div key={slug} className="flex items-center gap-2 rounded-xl border border-line/60 bg-surface-primary px-3 py-2 text-pm-sm">
                  <div className="w-2 h-2 rounded-full bg-accent shrink-0" />
                  <span className="text-content-primary">{slugToLabel(slug)}</span>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      {}
      <Card>
        <CardHeader
          title={
            <span className="flex items-center gap-2">
              <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4" />
              </span>
              Cronologie
            </span>
          }
        />
        <CardBody>
          {
}
          <div className="flex items-start gap-2 overflow-x-auto pb-2 stagger-in">
            {[
              { label: 'Creare', date: station.created_at },
              { label: 'Livrare', date: station.delivery_date },
              { label: 'Punere in functiune', date: station.commissioning_date },
              { label: 'Garantie expirare', date: station.warranty_end_date },
            ].map((step, i, arr) => (
              <div key={step.label} className="flex items-center gap-2">
                <div className="flex flex-col items-center">
                  <div className={`w-3.5 h-3.5 rounded-full border-2 transition-transform hover:scale-110 motion-reduce:transform-none ${step.date ? 'border-accent bg-accent/20 anim-glow' : 'border-line bg-surface-primary'}`} />
                  <div className="mt-2 text-center">
                    <p className="text-pm-2xs font-medium text-content-primary whitespace-nowrap">{step.label}</p>
                    <p className="text-pm-2xs text-content-muted">{formatDate(step.date)}</p>
                  </div>
                </div>
                {i < arr.length - 1 && <div className="w-16 h-px bg-line shrink-0 mt-[7px] anim-bar-grow" />}
              </div>
            ))}
          </div>
        </CardBody>
      </Card>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div>
      <dt className="text-pm-2xs uppercase tracking-wide text-content-muted">{label}</dt>
      <dd className="text-pm-sm text-content-primary font-medium mt-0.5">{value || '—'}</dd>
    </div>
  );
}





function InterventionsTab({ interventions, onAdd }: { interventions: Intervention[]; onAdd: () => void }) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
              <Wrench className="h-4 w-4" />
            </span>
            Interventii service ({interventions.length})
          </span>
        }
        actions={
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-3.5 w-3.5" /> Adaugă interventie
          </Button>
        }
      />
      <CardBody>
        {interventions.length === 0 ? (
          <EmptyState icon={Wrench} title="Nicio interventie inregistrata" description="Adaugă prima intervenție de service pentru această stație." />
        ) : (
          <div className="space-y-3 stagger-in" key={`iv-${interventions.length}`}>
            {interventions.map((iv) => (
              <div key={iv.id} className="group rounded-xl border border-line/60 bg-surface-primary p-4 flex items-start gap-3 transition-smooth duration-150 hover:border-line hover:bg-surface-tertiary/30 hover:shadow-[var(--elevation-2)]">
                <div className={`mt-1 w-2.5 h-2.5 rounded-full shrink-0 ${iv.is_urgent ? 'bg-status-red animate-pulse' : 'bg-accent'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-pm-sm font-medium text-content-primary">{iv.reason}</span>
                    <StationStatusBadge status={iv.status} />
                    <span className="text-pm-2xs px-1.5 py-0.5 rounded-md bg-surface-tertiary text-content-muted">{iv.intervention_type}</span>
                    {iv.is_urgent && (
                      <StatusBadge tone="danger" label="URGENT" size="xs" />
                    )}
                  </div>
                  {iv.problem_description && (
                    <p className="mt-1 text-pm-sm text-content-muted line-clamp-2">{iv.problem_description}</p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-pm-2xs text-content-muted">
                    <span className="flex items-center gap-1"><Calendar className="h-3 w-3 shrink-0" />{formatDate(iv.open_date)}</span>
                    {iv.close_date && <span>Inchis: {formatDate(iv.close_date)}</span>}
                    {iv.labor_cost > 0 && <span>Cost: {formatCurrency(iv.labor_cost)}</span>}
                  </div>
                  {iv.final_notes && (
                    <p className="mt-1 text-pm-2xs text-content-muted italic">Note: {iv.final_notes}</p>
                  )}
                </div>
                <ChevronRight className="h-4 w-4 text-content-muted shrink-0 mt-1 transition-transform duration-150 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:translate-x-0.5 group-hover:text-content-secondary motion-reduce:transform-none" />
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
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
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
              <Clock className="h-4 w-4" />
            </span>
            Planuri mentenanta ({plans.length})
          </span>
        }
        actions={
          <Button size="sm" onClick={() => setShow(true)}>
            <Plus className="h-3.5 w-3.5" /> Plan nou
          </Button>
        }
      />
      <CardBody>
        {show && (
          <div className="mb-4 rounded-xl border border-accent/40 bg-surface-secondary p-4 anim-fade-slide-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={maintenanceType} onChange={e => setMaintenanceType(e.target.value)} placeholder="Tip mentenanta"
                className="rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
              <input type="number" value={periodicityDays} onChange={e => setPeriodicityDays(e.target.value)} placeholder="Zile"
                className="rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
              <input type="date" value={nextDate} onChange={e => setNextDate(e.target.value)}
                className="rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
              <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Note"
                className="rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => setShow(false)}>Anulează</Button>
              <Button size="sm" onClick={submit}>Salvează</Button>
            </div>
          </div>
        )}

        {plans.length === 0 ? (
          <EmptyState icon={Clock} title="Niciun plan de mentenanta" description="Programează prima revizie pentru această stație." />
        ) : (
          <div className="rounded-xl border border-line/60 overflow-x-auto">
            <table className="w-full text-left text-pm-sm">
              <thead>
                <tr className="border-b border-line bg-surface-secondary">
                  <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Tip</th>
                  <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Periodicitate</th>
                  <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Ultima executie</th>
                  <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Urmatoarea</th>
                  <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="stagger-in" key={`mt-${plans.length}`}>
                {plans.map((p) => {
                  const isOverdue = new Date(p.next_execution_date) < new Date() && p.status !== 'COMPLETED';
                  return (
                    <tr key={p.id} className={`group border-b border-line/60 last:border-0 hover:bg-surface-tertiary/30 transition-colors ${isOverdue ? 'bg-status-red/5' : ''}`}>
                      <td className="px-4 py-3 text-content-primary font-medium">{p.maintenance_type}</td>
                      <td className="px-4 py-3 text-content-muted tabular-nums">La {p.periodicity_days} zile</td>
                      <td className="px-4 py-3 text-content-muted">{formatDate(p.last_execution_date)}</td>
                      <td className={`px-4 py-3 ${isOverdue ? 'text-status-red font-medium' : 'text-content-muted'}`}>
                        {formatDate(p.next_execution_date)}
                        {isOverdue && <span className="ml-1 text-pm-2xs">(DEPASIT)</span>}
                      </td>
                      <td className="px-4 py-3"><StationStatusBadge status={p.status} /></td>
                      <td className="px-4 py-3 text-right">
                        <IconButton
                          intent="danger"
                          size="sm"
                          aria-label="Șterge planul"
                          title="Șterge planul"
                          onClick={() => remove(p.id)}
                          className="opacity-70 group-hover:opacity-100 transition-opacity"
                        >
                          <Trash2 />
                        </IconButton>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
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
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
              <Package className="h-4 w-4" />
            </span>
            Piese solicitate ({parts.length})
          </span>
        }
        subtitle={totalCost > 0 ? `Cost estimat total: ${formatCurrency(totalCost)}` : undefined}
        actions={
          <Button size="sm" onClick={() => setShow(true)}>
            <Plus className="h-3.5 w-3.5" /> Cerere noua
          </Button>
        }
      />
      <CardBody>
        {show && (
          <div className="mb-4 rounded-xl border border-accent/40 bg-surface-secondary p-4 anim-fade-slide-in">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input value={partName} onChange={e => setPartName(e.target.value)} placeholder="Nume piesa *" className="rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
              <input value={partCode} onChange={e => setPartCode(e.target.value)} placeholder="Cod" className="rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
              <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} placeholder="Cantitate" className="rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
              <input value={supplier} onChange={e => setSupplier(e.target.value)} placeholder="Furnizor" className="rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
              <input type="number" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} placeholder="Cost estimat (RON)" className="rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
              <input value={reason} onChange={e => setReason(e.target.value)} placeholder="Motiv" className="rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => setShow(false)}>Anulează</Button>
              <Button size="sm" onClick={submit}>Salvează</Button>
            </div>
          </div>
        )}

        {parts.length === 0 ? (
          <EmptyState icon={Package} title="Nicio solicitare de piese" description="Adaugă prima cerere de piese pentru această stație." />
        ) : (
          <div className="rounded-xl border border-line/60 overflow-x-auto">
            <table className="w-full text-left text-pm-sm">
              <thead>
                <tr className="border-b border-line bg-surface-secondary">
                  <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Piesa</th>
                  <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Cod</th>
                  <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Cant.</th>
                  <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Furnizor</th>
                  <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Cost est.</th>
                  <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Comandat</th>
                  <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Primit</th>
                  <th className="px-4 py-3 text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="stagger-in" key={`pt-${parts.length}`}>
                {parts.map((p) => (
                  <tr key={p.id} className="group border-b border-line/60 last:border-0 hover:bg-surface-tertiary/30 transition-colors">
                    <td className="px-4 py-3 text-content-primary font-medium">{p.part_name || '—'}</td>
                    <td className="px-4 py-3 text-content-muted font-mono text-pm-2xs">{p.part_code || '—'}</td>
                    <td className="px-4 py-3 text-content-primary tabular-nums">{p.quantity}</td>
                    <td className="px-4 py-3 text-content-muted">{p.supplier || '—'}</td>
                    <td className="px-4 py-3 text-content-primary tabular-nums">{formatCurrency(p.estimated_cost)}</td>
                    <td className="px-4 py-3 text-content-muted">{formatDate(p.order_date)}</td>
                    <td className="px-4 py-3 text-content-muted">{formatDate(p.received_date)}</td>
                    <td className="px-4 py-3"><StationStatusBadge status={p.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <IconButton
                        intent="danger"
                        size="sm"
                        aria-label="Șterge cererea"
                        title="Șterge cererea"
                        onClick={() => remove(p.id)}
                        className="opacity-70 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardBody>
    </Card>
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
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </span>
            Cereri de modificare ({changes.length})
          </span>
        }
        actions={
          <Button size="sm" onClick={() => setShow(true)}>
            <Plus className="h-3.5 w-3.5" /> Cerere noua
          </Button>
        }
      />
      <CardBody>
        {show && (
          <div className="mb-4 rounded-xl border border-accent/40 bg-surface-secondary p-4 anim-fade-slide-in">
            <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descriere modificare *" rows={2}
              className="w-full rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
              <select value={priority} onChange={e => setPriority(e.target.value)} className="rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]">
                <option value="LOW">Scazuta</option>
                <option value="MEDIUM">Medie</option>
                <option value="HIGH">Ridicata</option>
                <option value="CRITICAL">Critica</option>
              </select>
              <input type="number" value={estimatedCost} onChange={e => setEstimatedCost(e.target.value)} placeholder="Cost estimat" className="rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
              <input type="date" value={estimatedDeadline} onChange={e => setEstimatedDeadline(e.target.value)} className="rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
              <input value={requestedByName} onChange={e => setRequestedByName(e.target.value)} placeholder="Solicitant" className="rounded-lg border border-line/70 bg-surface-secondary/40 px-3 py-2 text-pm-sm transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]" />
            </div>
            <div className="flex justify-end gap-2 mt-3">
              <Button size="sm" variant="outline" onClick={() => setShow(false)}>Anulează</Button>
              <Button size="sm" onClick={submit}>Salvează</Button>
            </div>
          </div>
        )}

        {changes.length === 0 ? (
          <EmptyState icon={AlertTriangle} title="Nicio cerere de modificare" description="Înregistrează prima cerere de modificare pentru această stație." />
        ) : (
          <div className="space-y-3 stagger-in" key={`cr-${changes.length}`}>
            {changes.map((cr) => (
              <div key={cr.id} className="group relative rounded-xl border border-line/60 bg-surface-primary p-4 transition-smooth duration-150 hover:border-line hover:bg-surface-tertiary/30 hover:shadow-[var(--elevation-2)]">
                <div className="flex items-center gap-2 flex-wrap pr-9">
                  <span className="text-pm-sm font-medium text-content-primary">{cr.description}</span>
                  <PriorityBadge priority={cr.priority} />
                  <StationStatusBadge status={cr.status} />
                </div>
                <div className="flex flex-wrap items-center gap-3 text-pm-2xs text-content-muted mt-2">
                  {cr.requested_by_name && (
                    <span className="flex items-center gap-1"><User className="h-3 w-3 shrink-0" />{cr.requested_by_name}</span>
                  )}
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3 shrink-0" />{formatDate(cr.request_date)}</span>
                  {cr.estimated_cost > 0 && <span>Cost: {formatCurrency(cr.estimated_cost)}</span>}
                  {cr.estimated_deadline && <span>Termen: {formatDate(cr.estimated_deadline)}</span>}
                </div>
                {cr.notes && <p className="text-pm-2xs text-content-muted italic mt-1">{cr.notes}</p>}
                <IconButton
                  intent="danger"
                  size="sm"
                  aria-label="Șterge cererea"
                  title="Șterge cererea"
                  onClick={() => remove(cr.id)}
                  className="absolute top-3 right-3 opacity-70 group-hover:opacity-100 transition-smooth duration-150"
                >
                  <Trash2 />
                </IconButton>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}





function ActivityTab({ logs }: { logs: ActivityLog[] }) {
  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2">
            <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
              <Activity className="h-4 w-4" />
            </span>
            Jurnal activitate ({logs.length})
          </span>
        }
      />
      <CardBody>
        {logs.length === 0 ? (
          <EmptyState icon={Activity} title="Nicio înregistrare in jurnal" description="Acțiunile efectuate pe această stație vor apărea aici." />
        ) : (
          <div className="space-y-2 stagger-in" key={`log-${logs.length}`}>
            {logs.map((log) => (
              <div key={log.id} className="flex items-start gap-3 rounded-xl border border-line/60 bg-surface-primary px-4 py-3 transition-smooth duration-150 hover:border-line hover:bg-surface-tertiary/30">
                <div className="mt-1.5 w-2 h-2 rounded-full bg-accent shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-pm-2xs px-1.5 py-0.5 rounded-md bg-surface-tertiary text-content-muted font-mono">{log.action_type}</span>
                    <span className="text-pm-2xs text-content-muted">{formatDate(log.created_at)}</span>
                  </div>
                  <p className="text-pm-sm text-content-primary mt-0.5">{log.description}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
