


































import { useState, useEffect, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { ClipboardCheck, Save, Loader2, CheckSquare, FileText, Minimize2, Maximize2, Pencil, Eye, CalendarClock, History } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import { formatDateTimeRo } from '@/lib/format';
import type { User } from '@/core/types';
import { useProjectStore } from '@/store/projectStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import { isViewerOnly } from '@/lib/access';
import FisaTemplatePicker from '@/pages/checklist/FisaTemplatePicker';
import { computeFisaProgress } from '@/lib/fisaProgress';
import { useCountUp } from '@/hooks/useCountUp';


import Page from '@/redesign/ui/Page';
import Card from '@/redesign/ui/Card';
import Button from '@/redesign/ui/Button';
import StatusBadge from '@/redesign/ui/StatusBadge';
import EmptyState from '@/redesign/ui/EmptyState';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';

interface Checklist {
  id: number; project_id: number; project_name: string; designer_name: string;
  status: string; revision: number; tracking_json: string; specs_json: string;
  template_id: number | null; template_snapshot_name: string | null;
  

  column_weights_json?: string | null;
  finalized_at: string | null; created_at: string; updated_at: string;
}
interface Sub { id: string; name: string; proiect: boolean; dxf: boolean; desene: boolean; executie: boolean; livrat: boolean; }
interface Assembly { id: string; assembly: string; zincare: boolean; culoare: string; subs: Sub[]; }

interface SpecField { key: string; label: string; value: unknown; type: string; options?: string[]; }
interface SpecSection { id: string; title: string; fields: SpecField[]; }
interface Specs { header: Record<string, string>; sections: SpecSection[]; aprobat_beneficiar: Record<string, string>; }

type Tab = 'tracking' | 'specs';

export default function FisaProiectantPage({ user }: { user: User | null }) {
  const projects = useProjectStore(s => s.projects);
  const fetchProjects = useProjectStore(s => s.fetchProjects);
  const [projectId, setProjectId] = useState<number | null>(null);
  const [checklist, setChecklist] = useState<Checklist | null>(null);
  const [tracking, setTracking] = useState<Assembly[]>([]);
  const [specs, setSpecs] = useState<Specs | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState<Tab>('tracking');
  const [compactView, setCompactView] = useState(false);
  
  
  const [editMode, setEditMode] = useState(false);
  
  
  const [savedSnapshot, setSavedSnapshot] = useState('');

  
  
  const canEdit = !!user && !isViewerOnly(user.role_name, 'fisa-proiectant', user.custom_pages);

  const selectedProject = useMemo(() => projects.find(p => p.id === projectId) || null, [projects, projectId]);

  const dirty = useMemo(
    () => JSON.stringify({ tracking, specs }) !== savedSnapshot,
    [tracking, specs, savedSnapshot],
  );

  
  
  
  
  const progressData = useMemo(
    () => computeFisaProgress(tracking, checklist?.column_weights_json ?? null),
    [tracking, checklist?.column_weights_json],
  );

  
  
  
  const pctCount = Math.round(useCountUp(progressData.pct, { from: 0 }));

  useEffect(() => { void fetchProjects(); }, [fetchProjects]);

  const loadChecklist = useCallback((pid: number) => {
    setLoading(true);
    setEditMode(false); 
    apiCommand<Checklist>('get_checklist_by_project', { project_id: pid })
      .then(c => { setChecklist(c); parseData(c); })
      .catch(() => setChecklist(null))
      .finally(() => setLoading(false));
  }, []);

  const parseData = (c: Checklist) => {
    let t: Assembly[] = [];
    try {
      const parsed = JSON.parse(c.tracking_json);
      t = Array.isArray(parsed) ? parsed : [];
    } catch { t = []; }
    setTracking(t);

    let s: Specs;
    try {
      const raw = JSON.parse(c.specs_json) as Partial<Specs> | null;
      
      s = {
        header: (raw && typeof raw.header === 'object' && raw.header) ? raw.header as Record<string, string> : {},
        sections: Array.isArray(raw?.sections) ? raw!.sections : [],
        aprobat_beneficiar: (raw && typeof raw.aprobat_beneficiar === 'object' && raw.aprobat_beneficiar)
          ? raw.aprobat_beneficiar as Record<string, string> : {},
      };
    } catch {
      s = { header: {}, sections: [], aprobat_beneficiar: {} };
    }
    setSpecs(s);
    
    
    setSavedSnapshot(JSON.stringify({ tracking: t, specs: s }));
  };

  const handleSelectProject = (pid: number) => { setProjectId(pid); loadChecklist(pid); };

  
  
  
  const selectProjectMorph = (pid: number) => {
    startMorphTransition(
      () => flushSync(() => handleSelectProject(pid)),
      { dir: 'forward' },
    );
  };

  
  
  
  const [templatePickerOpen, setTemplatePickerOpen] = useState(false);
  const handleCreate = () => {
    if (!projectId) return;
    setTemplatePickerOpen(true);
  };
  const handleTemplatePicked = async (templateId: number) => {
    setTemplatePickerOpen(false);
    if (!projectId) return;
    try {
      const c = await apiCommand<Checklist>('create_checklist', { project_id: projectId, template_id: templateId });
      setChecklist(c); parseData(c);
      setEditMode(true); 
      toast.success('Fișă creată');
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const handleSave = async (finalize = false): Promise<boolean> => {
    if (!checklist) return false;
    setSaving(true);
    try {
      const c = await apiCommand<Checklist>('update_checklist', {
        id: checklist.id,
        tracking_json: JSON.stringify(tracking),
        specs_json: JSON.stringify(specs),
        ...(finalize ? { status: 'finalized' } : {}),
      });
      setChecklist(c); parseData(c);
      toast.success(finalize ? 'Fisa finalizata. Proiectul e mutat in productie.' : 'Fișa salvată pe proiect');
      
      
      if (finalize) {
        setEditMode(false); 
        await useProjectStore.getState().refreshAll();
        void useDashboardStore.getState().invalidate();
      }
      return true;
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); return false; }
    finally { setSaving(false); }
  };

  const handleFinalize = async () => {
    if (!checklist) return;
    if (!(await confirmDialog({ title: 'Finalizezi fisa?', body: 'Proiectul va trece in productie.' }))) return;
    await handleSave(true);
  };

  
  
  const toggleEditMode = async () => {
    if (!editMode) {
      if (!canEdit) return;
      setEditMode(true);
      return;
    }
    if (dirty) {
      const ok = await confirmDialog({
        title: 'Renunți la modificări?',
        body: 'Ai modificări nesalvate care se vor pierde.',
        confirmLabel: 'Renunță',
      });
      if (!ok) return;
      if (checklist) parseData(checklist); 
    }
    setEditMode(false);
  };

  
  
  
  
  

  const toggleTrackingField = (asmIdx: number, subIdx: number, field: keyof Sub) => {
    const updated = [...tracking];
    const sub = { ...updated[asmIdx].subs[subIdx] };
    (sub as unknown as Record<string, unknown>)[field] = !(sub as unknown as Record<string, boolean>)[field];
    updated[asmIdx] = { ...updated[asmIdx], subs: [...updated[asmIdx].subs] };
    updated[asmIdx].subs[subIdx] = sub;
    setTracking(updated);
  };

  
  
  
  const toggleZincare = (asmIdx: number) => {
    const updated = [...tracking];
    updated[asmIdx] = { ...updated[asmIdx], zincare: !updated[asmIdx].zincare };
    setTracking(updated);
  };

  const updateSpecField = (sectionIdx: number, fieldIdx: number, value: unknown) => {
    if (!specs) return;
    const updated = { ...specs, sections: [...specs.sections] };
    updated.sections[sectionIdx] = { ...updated.sections[sectionIdx], fields: [...updated.sections[sectionIdx].fields] };
    updated.sections[sectionIdx].fields[fieldIdx] = { ...updated.sections[sectionIdx].fields[fieldIdx], value };
    setSpecs(updated);
  };

  const updateHeader = (key: string, value: string) => {
    if (!specs) return;
    setSpecs({ ...specs, header: { ...specs.header, [key]: value } });
  };

  const updateBeneficiar = (key: string, value: string) => {
    if (!specs) return;
    setSpecs({ ...specs, aprobat_beneficiar: { ...specs.aprobat_beneficiar, [key]: value } });
  };

  
  
  const deadlineChip = useMemo(() => {
    if (!selectedProject?.deadline) return null;
    const days = Math.ceil((new Date(selectedProject.deadline).getTime() - Date.now()) / 86400000);
    const tone: 'danger' | 'warning' | 'success' = days <= 7 ? 'danger' : days <= 14 ? 'warning' : 'success';
    return { tone, label: days > 0 ? `${days} zile ramase` : 'Expirat' };
  }, [selectedProject]);

  return (
    <Page fit>
      <Page.Body fit maxWidth="wide" padding="comfortable" className="relative">

        {
}
        <header
          className="enter-up shrink-0 flex flex-col gap-4 pb-4 border-b border-line/60 xl:flex-row xl:items-center xl:justify-between"
          style={{ animationDelay: '0ms' }}
        >
          <div className="flex items-center gap-4 min-w-0">
            <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              {/* Eyebrow removed — breadcrumb already shows "Proiectare". */}
              <h1 className="text-pm-lg font-semibold text-content-primary truncate leading-tight">Fișa proiectant</h1>
              <p className="mt-0.5 text-pm-sm text-content-muted">
                Tracking ansambluri + specificații tehnice, pe proiect
              </p>
            </div>
          </div>

          {
}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <select
              value={projectId || ''}
              onChange={e => { const v = Number(e.target.value); if (v) selectProjectMorph(v); }}
              className="h-9 max-w-[260px] rounded-xl border border-line bg-surface-primary px-3 text-pm-sm text-content-primary transition-smooth duration-150 hover:border-line/80 hover:bg-surface-tertiary focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
            >
              <option value="">Selectează proiect...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {projectId && !checklist && !loading && (
              <Button size="md" onClick={handleCreate}>
                <FileText className="h-4 w-4" /> Creează fișă
              </Button>
            )}

            {checklist && (
              <>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setCompactView(v => !v)}
                  title={compactView ? 'Vedere normala' : 'Vedere compacta'}
                >
                  {compactView ? <Maximize2 className="h-4 w-4" /> : <Minimize2 className="h-4 w-4" />}
                  {compactView ? 'Normal' : 'Compact'}
                </Button>

                {
}
                <Button
                  variant={editMode ? 'secondary' : 'primary'}
                  size="md"
                  onClick={toggleEditMode}
                  disabled={saving || (!editMode && !canEdit)}
                  title={!canEdit
                    ? 'Nu ai drepturi de editare (acces doar vizualizare)'
                    : editMode ? 'Revino la vizualizare' : 'Editează fișa'}
                >
                  {editMode ? <Eye className="h-4 w-4" /> : <Pencil className="h-4 w-4" />}
                  {editMode ? 'Vizualizare' : 'Editează'}
                </Button>

                {editMode && (
                  <Button size="md" onClick={() => void handleSave(false)} disabled={saving || !dirty}
                    title="Salvează modificările pe fișa acestui proiect">
                    <Save className="h-4 w-4" /> {saving ? 'Se salvează...' : dirty ? 'Salvează •' : 'Salvează'}
                  </Button>
                )}
                {editMode && checklist.status !== 'finalized' && (
                  <Button
                    variant="success"
                    size="md"
                    onClick={handleFinalize}
                    disabled={saving}
                  >
                    Finalizează fisa
                  </Button>
                )}
              </>
            )}
          </div>
        </header>

        {

}
        {loading ? (
          <Card padding="lg" className="flex flex-1 min-h-0 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
          </Card>
        ) : !projectId ? (
          
          <Card padding="lg" className="enter-up flex-1 min-h-0 overflow-y-auto" style={{ animationDelay: '160ms' }}>
            <div className="mb-5">
              <p className="text-pm-eyebrow font-bold uppercase tracking-[0.14em] text-content-muted">Alege un proiect</p>
              <p className="mt-0.5 text-pm-sm text-content-muted">Selectează un proiect pentru a-i deschide sau crea fișa proiectant.</p>
            </div>
            {projects.length === 0 ? (
              <EmptyState
                icon={ClipboardCheck}
                title="Niciun proiect disponibil"
                description="Adaugă proiecte în modulul Proiecte pentru a putea crea o fișă proiectant."
              />
            ) : (
              <div className="stagger-in grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {projects.slice(0, 9).map(p => (
                  <Card
                    key={p.id}
                    padding="md"
                    interactive
                    vtName={vtName('fisa', p.id)}
                    onClick={() => selectProjectMorph(p.id)}
                    className="flex h-full flex-col gap-3"
                  >
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="h-9 w-9 rounded-lg bg-accent-muted text-accent flex items-center justify-center shrink-0">
                        <ClipboardCheck className="h-4 w-4" />
                      </span>
                      <p className="text-pm-sm font-semibold text-content-primary truncate">{p.name}</p>
                    </div>
                    {p.deadline && (
                      <p className="text-pm-2xs text-content-muted">Termen: {formatDateTimeRo(p.deadline)}</p>
                    )}
                    <span className="mt-auto text-pm-xs font-medium text-accent">Deschide fișa →</span>
                  </Card>
                ))}
              </div>
            )}
          </Card>
        ) : !checklist ? (
          
          <Card padding="lg" className="enter-up flex flex-1 min-h-0 items-center justify-center" style={{ animationDelay: '160ms' }}>
            <EmptyState
              icon={FileText}
              title="Proiectul nu are fișă"
              description={'Apasă „Creează fișă" în antet pentru a începe o fișă proiectant nouă.'}
              action={(
                <Button size="md" onClick={handleCreate}>
                  <FileText className="h-4 w-4" /> Creează fișă
                </Button>
              )}
            />
          </Card>
        ) : (
          
          <div className="enter-up grid flex-1 min-h-0 grid-cols-1 xl:grid-cols-12 gap-5" style={{ animationDelay: '160ms' }}>

            {
}
            <Card
              padding="lg"
              tone="elevated"
              vtName={vtName('fisa', checklist.project_id)}
              className="xl:col-span-4 min-w-0 min-h-0 overflow-y-auto"
            >
              <div className="space-y-4">
                <div>
                  <p className="text-pm-eyebrow font-bold uppercase tracking-[0.14em] text-content-muted mb-2">Stadiu fișă</p>
                  <h2 className="text-pm-lg font-semibold text-content-primary leading-tight truncate">
                    {selectedProject?.name || checklist.project_name}
                  </h2>
                </div>

                <div>
                  <StatusBadge
                    tone={checklist.status === 'finalized' ? 'success' : 'accent'}
                    label={`${checklist.status === 'finalized' ? 'Finalizată' : 'În lucru'} — Rev.${checklist.revision}`}
                    size="xs"
                  />
                </div>

                {}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Progres</span>
                    <span className="text-pm-sm font-semibold tabular-nums text-content-primary">{pctCount}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface-tertiary overflow-hidden">
                    <div className="anim-bar-grow h-full rounded-full bg-accent transition-colors duration-150 motion-reduce:transition-none" style={{ width: `${progressData.pct}%` }} />
                  </div>
                  <p className="mt-1.5 text-pm-2xs text-content-muted tabular-nums">{progressData.done}/{progressData.total} puncte verificate</p>
                </div>

                <div className="border-t border-line/60 pt-4 space-y-3">
                  {}
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Mod</span>
                    <StatusBadge
                      tone={editMode ? 'accent' : 'neutral'}
                      label={editMode ? 'Editare' : 'Vizualizare'}
                      size="xs"
                    />
                  </div>

                  {checklist?.updated_at && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted inline-flex items-center gap-1.5">
                        <History className="h-3 w-3" /> Actualizat
                      </span>
                      <span className="text-pm-2xs text-content-secondary tabular-nums text-right">{formatDateTimeRo(checklist.updated_at)}</span>
                    </div>
                  )}

                  {deadlineChip && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted inline-flex items-center gap-1.5">
                        <CalendarClock className="h-3 w-3" /> Termen
                      </span>
                      <StatusBadge tone={deadlineChip.tone} label={deadlineChip.label} size="xs" />
                    </div>
                  )}
                </div>
              </div>
            </Card>

            {}
            <Card padding="none" className="xl:col-span-8 min-w-0 min-h-0 flex flex-col overflow-hidden">
              {}
              <div className="flex border-b border-line/70 shrink-0 px-2">
                {([['tracking', 'Tracking Ansambluri', CheckSquare], ['specs', 'Specificatii Tehnice', FileText]] as [Tab, string, typeof CheckSquare][]).map(([id, label, Icon]) => (
                  <button key={id} onClick={() => setTab(id)}
                    className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-t-lg border-b-2 px-4 py-3 text-pm-sm transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${tab === id
                      ? 'text-accent border-accent font-semibold'
                      : 'text-content-muted hover:text-content-primary border-transparent hover:bg-surface-tertiary/50'}`}>
                    <Icon className="h-4 w-4 shrink-0" /> {label}
                  </button>
                ))}
              </div>

              {
}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <div key={tab} className="enter-up">
                  {tab === 'tracking' ? (
                    <TrackingTab tracking={tracking} onToggle={toggleTrackingField} onToggleZincare={toggleZincare} compact={compactView} readOnly={!editMode} />
                  ) : specs ? (
                    <SpecsTab specs={specs} onUpdateField={updateSpecField} onUpdateHeader={updateHeader} onUpdateBeneficiar={updateBeneficiar} compact={compactView} readOnly={!editMode} />
                  ) : null}
                </div>
              </div>
            </Card>
          </div>
        )}

        <FisaTemplatePicker
          open={templatePickerOpen}
          onClose={() => setTemplatePickerOpen(false)}
          onPick={handleTemplatePicked}
        />
      </Page.Body>
    </Page>
  );
}





function TrackingTab({ tracking, onToggle, onToggleZincare, compact, readOnly }: { tracking: Assembly[]; onToggle: (a: number, s: number, f: keyof Sub) => void; onToggleZincare: (a: number) => void; compact?: boolean; readOnly?: boolean }) {
  const cols: (keyof Sub)[] = ['proiect', 'dxf', 'desene', 'executie', 'livrat'];
  const colLabels = ['Proiect.', 'DXF', 'Desene', 'Executie', 'Livrat'];

  const cellPy = compact ? 'py-0.5' : 'py-2';
  const cellPySub = compact ? 'py-0.5' : 'py-1.5';
  const textSize = compact ? 'text-pm-xs' : 'text-pm-sm';
  const checkSize = compact ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead className="sticky top-0 z-10">
          <tr className="bg-surface-secondary">
            <th className={`px-3 ${cellPy} text-pm-2xs font-semibold uppercase tracking-wide text-content-muted border-b border-line ${compact ? 'w-32' : 'w-40'}`}>ANSAMBLU</th>
            <th className={`px-2 ${cellPy} text-pm-2xs font-semibold uppercase tracking-wide text-content-muted border-b border-line text-center w-12`}>Zn</th>
            <th className={`px-3 ${cellPy} text-pm-2xs font-semibold uppercase tracking-wide text-content-muted border-b border-line ${compact ? 'w-36' : 'w-48'}`}>SUBANSAMBLU</th>
            {colLabels.map(h => <th key={h} className={`px-2 ${cellPy} text-pm-2xs font-semibold uppercase tracking-wide text-content-muted border-b border-line text-center ${compact ? 'w-12' : 'w-16'}`}>{h}</th>)}
          </tr>
        </thead>
        {
}
        <tbody key={`trk-${tracking.length}`} className="stagger-in">
          {tracking.map((asm, ai) => asm.subs.map((sub, si) => (
            <tr key={sub.id} className="hover:bg-surface-tertiary/40 transition-colors">
              {si === 0 ? (
                <>
                  <td rowSpan={asm.subs.length} className={`px-3 ${cellPySub} ${textSize} font-semibold text-content-primary border-b border-line align-top bg-surface-secondary/50`}>
                    <span className="text-pm-xs text-accent mr-1">{asm.id}.</span>{asm.assembly}
                  </td>
                  <td rowSpan={asm.subs.length} className={`px-2 ${cellPySub} text-center border-b border-line align-top`}>
                    <input type="checkbox" checked={asm.zincare} disabled={readOnly} onChange={() => onToggleZincare(ai)} className={`${checkSize} rounded accent-[var(--color-accent)] transition-smooth duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:opacity-40 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`} />
                  </td>
                </>
              ) : null}
              <td className={`px-3 ${cellPySub} ${textSize} text-content-primary border-b border-line`}>
                <span className="text-pm-xs text-content-muted mr-1">{sub.id}</span> {sub.name}
              </td>
              {cols.map(col => (
                <td key={col} className={`px-2 ${cellPySub} text-center border-b border-line`}>
                  <input type="checkbox" checked={sub[col] as boolean} disabled={readOnly} onChange={() => onToggle(ai, si, col)}
                    className={`${checkSize} rounded accent-[var(--color-accent)] transition-smooth duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:opacity-40 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`} />
                </td>
              ))}
            </tr>
          )))}
        </tbody>
      </table>
    </div>
  );
}





function SpecsTab({ specs, onUpdateField, onUpdateHeader, onUpdateBeneficiar, compact, readOnly }: {
  specs: Specs; onUpdateField: (si: number, fi: number, value: unknown) => void; onUpdateHeader: (key: string, value: string) => void; onUpdateBeneficiar: (key: string, value: string) => void; compact?: boolean; readOnly?: boolean;
}) {
  const sectionPad = compact ? 'px-3 py-2' : 'px-4 py-3';
  const gridGap = compact ? 'gap-2' : 'gap-3';
  const roCls = readOnly ? ' cursor-default read-only:bg-surface-secondary/30' : '';
  const inputClass = (compact
    ? 'w-full rounded-lg border border-line/70 bg-surface-secondary/40 px-2 py-1 text-pm-xs text-content-primary placeholder:text-content-muted transition-smooth duration-150 hover:border-line focus:border-accent/50 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]'
    : 'w-full rounded-lg border border-line/70 bg-surface-secondary/40 px-2 py-1.5 text-pm-xs text-content-primary placeholder:text-content-muted transition-smooth duration-150 hover:border-line focus:border-accent/50 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]') + roCls;

  return (
    <div className="flex flex-col">
      {}
      <div className={`bg-surface-secondary border-b border-line ${sectionPad}`}>
        <h3 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted mb-3">Informatii generale</h3>
        <div className={`grid ${compact ? 'grid-cols-4' : 'grid-cols-3'} ${gridGap}`}>
          {[
            { key: 'tip_statie', label: 'Tip Statie' }, { key: 'loc', label: 'Locație' }, { key: 'beneficiar', label: 'Beneficiar' },
            { key: 'ing_proiect', label: 'Ing. Proiect' }, { key: 'data_inceput', label: 'Data inceput' }, { key: 'data_finalizare', label: 'Data finalizare' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-pm-2xs text-content-muted mb-1">{f.label}</label>
              <input value={specs.header?.[f.key] || ''} onChange={e => onUpdateHeader(f.key, e.target.value)}
                readOnly={readOnly} className={inputClass} />
            </div>
          ))}
        </div>
      </div>

      {}
      {specs.sections.map((section, si) => (
        <div key={section.id} className={`bg-surface-secondary border-b border-line ${sectionPad}`}>
          <h3 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted mb-3">
            <span className="text-accent mr-1">{section.id}.</span> {section.title}
          </h3>
          <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-2'} ${gridGap}`}>
            {section.fields.map((field, fi) => (
              <div key={field.key} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                <label className="block text-pm-2xs text-content-muted mb-1">{field.label}</label>
                {field.type === 'textarea' ? (
                  <textarea value={(field.value as string) || ''} onChange={e => onUpdateField(si, fi, e.target.value)} rows={compact ? 1 : 2}
                    readOnly={readOnly} className={inputClass} />
                ) : field.type === 'select' ? (
                  <select value={(field.value as string) || ''} onChange={e => onUpdateField(si, fi, e.target.value)}
                    disabled={readOnly} className={inputClass}>
                    <option value="">---</option>
                    {field.options?.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : field.type === 'checkbox' ? (
                  <input type="checkbox" checked={!!field.value} disabled={readOnly} onChange={e => onUpdateField(si, fi, e.target.checked)}
                    className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} rounded accent-[var(--color-accent)] transition-smooth duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] disabled:opacity-40 ${readOnly ? 'cursor-default' : 'cursor-pointer'}`} />
                ) : (
                  <input value={(field.value as string) || ''} onChange={e => onUpdateField(si, fi, e.target.value)}
                    readOnly={readOnly} className={inputClass} />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      {}
      <div className="bg-surface-secondary border-b-2 border-accent/20 px-4 py-3">
        <h3 className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted mb-3">APROBAT BENEFICIAR</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <div>
            <label className="block text-pm-2xs text-content-muted mb-1">Contact</label>
            <input value={specs.aprobat_beneficiar?.contact || ''} onChange={e => onUpdateBeneficiar('contact', e.target.value)}
              readOnly={readOnly} className={inputClass} />
          </div>
          <div>
            <label className="block text-pm-2xs text-content-muted mb-1">Tel</label>
            <input value={specs.aprobat_beneficiar?.tel || ''} onChange={e => onUpdateBeneficiar('tel', e.target.value)}
              readOnly={readOnly} className={inputClass} />
          </div>
          <div>
            <label className="block text-pm-2xs text-content-muted mb-1">Email</label>
            <input value={specs.aprobat_beneficiar?.email || ''} onChange={e => onUpdateBeneficiar('email', e.target.value)}
              readOnly={readOnly} className={inputClass} />
          </div>
        </div>
      </div>
    </div>
  );
}
