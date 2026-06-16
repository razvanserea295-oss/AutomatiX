import { useState, useEffect, useCallback, useMemo } from 'react';
import { ClipboardCheck, Save, Loader2, CheckSquare, FileText, Minimize2, Maximize2, Pencil, Eye, Gauge, Layers, ListChecks } from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import { formatDateTimeRo } from '@/lib/format';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';
import { HeroHeader, GlassCard, MetricValue } from '@/components/ui';
import StatusBadge from '@/components/ui/StatusBadge';
import { filterSelectCls } from '@/components/ui/filterControls';
import type { User } from '@/core/types';
import { useProjectStore } from '@/store/projectStore';
import { useDashboardStore } from '@/store/dashboardStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import { isViewerOnly } from '@/lib/access';
import FisaTemplatePicker from './FisaTemplatePicker';
import FisaSaveModal, { type SaveChoice } from './FisaSaveModal';

interface Checklist {
  id: number; project_id: number; project_name: string; designer_name: string;
  status: string; revision: number; tracking_json: string; specs_json: string;
  template_id: number | null; template_snapshot_name: string | null;
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
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  
  
  const [editMode, setEditMode] = useState(false);
  
  
  const [savedSnapshot, setSavedSnapshot] = useState('');

  
  
  const canEdit = !!user && !isViewerOnly(user.role_name, 'fisa-proiectant', user.custom_pages);

  const selectedProject = useMemo(() => projects.find(p => p.id === projectId) || null, [projects, projectId]);

  const dirty = useMemo(
    () => JSON.stringify({ tracking, specs }) !== savedSnapshot,
    [tracking, specs, savedSnapshot],
  );

  const progressData = useMemo(() => {
    if (!tracking.length) return { total: 0, done: 0, pct: 0 };
    let total = 0, done = 0;
    tracking.forEach(asm => {
      asm.subs?.forEach((sub: any) => {
        const checks = [sub.proiect, sub.dxf, sub.desene, sub.executie, sub.livrat];
        total += checks.length;
        done += checks.filter(Boolean).length;
      });
    });
    return { total, done, pct: total > 0 ? Math.round((done / total) * 100) : 0 };
  }, [tracking]);

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

  
  
  
  const buildTemplateSchema = () => JSON.stringify({
    tracking: tracking.map(a => ({
      ...a,
      subs: (a.subs ?? []).map(s => ({ ...s, proiect: false, dxf: false, desene: false, executie: false, livrat: false })),
    })),
    specs,
  });

  
  
  
  const handleSaveToTemplate = async (): Promise<boolean> => {
    if (!checklist) return false;
    if (checklist.template_id == null) { toast.error('Fișa nu are un șablon sursă'); return false; }
    setSaving(true);
    try {
      await apiCommand('update_fisa_template', { id: checklist.template_id, schema_json: buildTemplateSchema() });
      toast.success('Șablon actualizat');
      return true;
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Doar autorul șablonului sau un admin poate edita'); return false; }
    finally { setSaving(false); }
  };

  
  const handleSaveAsNewTemplate = async (name: string, description?: string): Promise<boolean> => {
    if (!checklist || !name.trim()) return false;
    setSaving(true);
    try {
      await apiCommand('create_fisa_template', {
        name: name.trim(),
        ...(description ? { description } : {}),
        schema_json: buildTemplateSchema(),
      });
      toast.success(`Șablon „${name.trim()}" creat`);
      return true;
    } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); return false; }
    finally { setSaving(false); }
  };

  
  
  const handleSaveConfirm = async (choice: SaveChoice) => {
    let ok = false;
    if (choice.dest === 'project') ok = await handleSave(false);
    else if (choice.dest === 'template') ok = await handleSaveToTemplate();
    else ok = await handleSaveAsNewTemplate(choice.name || '', choice.description);
    if (ok) setSaveModalOpen(false);
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

  return (
    <Page className="mod-shell">
      {}
      <div className="px-5 pt-4 pb-8 space-y-4 shrink-0">
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Proiectare"
          icon={ClipboardCheck}
          title="Fișa proiectant"
          subtitle="Tracking ansambluri + specificații tehnice, pe proiect"
        />
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={Gauge}      label="Progres fișă"   value={progressData.pct} format={(n) => `${n}%`} />
          <KpiMini icon={ListChecks} label="Puncte verificate" value={progressData.done} />
          <KpiMini icon={CheckSquare} label="Total puncte"   value={progressData.total} />
          <KpiMini icon={Layers}     label="Ansambluri"      value={tracking.length} />
        </div>
      </div>

      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {



}
        <div className="shrink-0 border-b border-line/70 bg-surface-secondary px-5 py-2">
          <div className="flex flex-wrap items-center gap-2">
            <select value={projectId || ''} onChange={e => { const v = Number(e.target.value); if (v) handleSelectProject(v); }}
              className={filterSelectCls(!!projectId)}>
              <option value="">Selectează proiect...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>

            {projectId && !checklist && !loading && (
              <Button size="sm" onClick={handleCreate}>Creează fișă</Button>
            )}

            {checklist && (
              <>
                <StatusBadge
                  tone={checklist.status === 'finalized' ? 'success' : 'accent'}
                  label={`${checklist.status} — Rev.${checklist.revision}`}
                />
                {checklist?.updated_at && (
                  <span className="text-pm-2xs text-content-muted tabular-nums">
                    Actualizat: {formatDateTimeRo(checklist.updated_at)}
                  </span>
                )}
                {selectedProject?.deadline && (() => {
                  const days = Math.ceil((new Date(selectedProject.deadline).getTime() - Date.now()) / 86400000);
                  const color = days <= 7 ? 'text-status-red bg-status-red/10' : days <= 14 ? 'text-status-amber bg-status-amber/10' : 'text-status-green bg-status-green/10';
                  return <span className={`text-pm-2xs font-semibold px-2 py-0.5 ${color}`}>{days > 0 ? `${days} zile ramase` : 'Expirat'}</span>;
                })()}
                {}
                <span className={`text-pm-2xs font-semibold px-2 py-0.5 rounded inline-flex items-center gap-1 ${editMode ? 'bg-accent/10 text-accent' : 'bg-surface-tertiary text-content-muted'}`}>
                  {editMode ? <Pencil className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                  {editMode ? 'Mod editare' : 'Vizualizare'}
                </span>

                {
}
                <div className="flex flex-wrap items-center gap-2 ml-auto">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCompactView(v => !v)}
                    title={compactView ? 'Vedere normala' : 'Vedere compacta'}
                  >
                    {compactView ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
                    {compactView ? 'Normal' : 'Compact'}
                  </Button>

                  {
}
                  <Button
                    variant={editMode ? 'secondary' : 'primary'}
                    size="sm"
                    onClick={toggleEditMode}
                    disabled={saving || (!editMode && !canEdit)}
                    title={!canEdit
                      ? 'Nu ai drepturi de editare (acces doar vizualizare)'
                      : editMode ? 'Revino la vizualizare' : 'Editează fișa'}
                  >
                    {editMode ? <Eye className="h-3.5 w-3.5" /> : <Pencil className="h-3.5 w-3.5" />}
                    {editMode ? 'Vizualizare' : 'Editează'}
                  </Button>

                  {editMode && (
                    <Button size="sm" onClick={() => setSaveModalOpen(true)} disabled={saving}
                      title="Alege unde salvezi: pe proiect, în șablon sau ca șablon nou">
                      <Save className="h-3.5 w-3.5" /> {saving ? 'Se salvează...' : dirty ? 'Salvează •' : 'Salvează'}
                    </Button>
                  )}
                  {editMode && checklist.status !== 'finalized' && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleFinalize}
                      disabled={saving}
                      className="border-status-green text-status-green hover:bg-status-green/10"
                    >
                      Finalizează fisa
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {}
        {checklist && (
          <div className="flex border-b border-line shrink-0 bg-surface-secondary">
            {([['tracking', 'Tracking Ansambluri', CheckSquare], ['specs', 'Specificatii Tehnice', FileText]] as [Tab, string, typeof CheckSquare][]).map(([id, label, Icon]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-xs transition-colors border-b-2 ${tab === id
                  ? 'text-accent border-accent font-semibold'
                  : 'text-content-muted hover:text-content-primary border-transparent'}`}>
                <Icon className="h-4 w-4" /> {label}
              </button>
            ))}
          </div>
        )}

        {}
        {checklist && (
          <div className="border-b border-line bg-surface-primary px-5 py-2 shrink-0">
            <div className="flex items-center gap-3">
              <div className="flex-1 h-2 bg-line overflow-hidden">
                <div className="h-full transition-all duration-500 bg-accent" style={{ width: `${progressData.pct}%` }} />
              </div>
              <span className="text-pm-2xs font-bold tabular-nums text-content-secondary shrink-0">{progressData.pct}%</span>
              <span className="text-pm-2xs text-content-muted shrink-0">{progressData.done}/{progressData.total}</span>
            </div>
          </div>
        )}

        {}
        <div className="flex-1 min-h-0 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center pt-16">
              <Loader2 className="h-6 w-6 animate-spin text-content-muted" />
            </div>
          ) : !projectId ? (
            <div className="p-5 enter-up">
              <div className="mb-4">
                <p className="text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted">Alege un proiect</p>
                <p className="mt-0.5 text-pm-sm text-content-muted">Selectează un proiect pentru a-i deschide sau crea fișa proiectant.</p>
              </div>
              {projects.length === 0 ? (
                <GlassCard size="regular" className="mx-auto w-full max-w-md flex flex-col items-center gap-3 px-8 py-12 text-center">
                  <span className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                    <ClipboardCheck className="h-8 w-8 text-accent/70" />
                  </span>
                  <p className="text-pm-md font-semibold text-content-primary">Niciun proiect disponibil</p>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {projects.slice(0, 9).map(p => (
                    <GlassCard
                      key={p.id}
                      size="regular"
                      interactive
                      onClick={() => handleSelectProject(p.id)}
                      className="flex h-full flex-col gap-3 p-5"
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <span className="h-9 w-9 rounded-lg bg-accent/12 text-accent flex items-center justify-center shrink-0">
                          <ClipboardCheck className="h-4 w-4" />
                        </span>
                        <p className="text-pm-sm font-semibold text-content-primary truncate">{p.name}</p>
                      </div>
                      {p.deadline && (
                        <p className="text-pm-2xs text-content-muted">Termen: {formatDateTimeRo(p.deadline)}</p>
                      )}
                      <span className="mt-auto text-pm-xs font-medium text-accent">Deschide fișa →</span>
                    </GlassCard>
                  ))}
                </div>
              )}
            </div>
          ) : !checklist ? (
            <div className="flex h-full items-center justify-center p-8">
              <GlassCard size="regular" className="enter-up w-full max-w-md flex flex-col items-center gap-3 px-8 py-12 text-center">
                <span className="h-16 w-16 rounded-2xl bg-accent/10 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-accent/70" />
                </span>
                <div>
                  <p className="text-pm-md font-semibold text-content-primary">Proiectul nu are fișă</p>
                  <p className="mt-1 text-pm-sm text-content-muted">Apasă „Creează fișă" în bara de sus pentru a începe o fișă proiectant nouă.</p>
                </div>
              </GlassCard>
            </div>
          ) : tab === 'tracking' ? (
            <TrackingTab tracking={tracking} onToggle={toggleTrackingField} onToggleZincare={toggleZincare} compact={compactView} readOnly={!editMode} />
          ) : specs ? (
            <SpecsTab specs={specs} onUpdateField={updateSpecField} onUpdateHeader={updateHeader} onUpdateBeneficiar={updateBeneficiar} compact={compactView} readOnly={!editMode} />
          ) : null}
        </div>
      </div>

      <FisaTemplatePicker
        open={templatePickerOpen}
        onClose={() => setTemplatePickerOpen(false)}
        onPick={handleTemplatePicked}
      />

      <FisaSaveModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onConfirm={handleSaveConfirm}
        saving={saving}
        dirty={dirty}
        hasTemplate={checklist?.template_id != null}
        templateName={checklist?.template_snapshot_name ?? null}
      />
    </Page>
  );
}


function KpiMini({ icon: Icon, label, value, warn, format }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; warn?: boolean; format?: (n: number) => string;
}) {
  return (
    <GlassCard size="compact" className="flex items-center gap-3.5 !p-5">
      <span className="h-11 w-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted truncate">{label}</p>
        <MetricValue value={value} size="display" warn={warn} format={format} className="mt-0.5 block" />
      </div>
    </GlassCard>
  );
}





function TrackingTab({ tracking, onToggle, onToggleZincare, compact, readOnly }: { tracking: Assembly[]; onToggle: (a: number, s: number, f: keyof Sub) => void; onToggleZincare: (a: number) => void; compact?: boolean; readOnly?: boolean }) {
  const cols: (keyof Sub)[] = ['proiect', 'dxf', 'desene', 'executie', 'livrat'];
  const colLabels = ['Proiect.', 'DXF', 'Desene', 'Executie', 'Livrat'];

  const cellPy = compact ? 'py-0.5' : 'py-2';
  const cellPySub = compact ? 'py-0.5' : 'py-1.5';
  const textSize = compact ? 'text-xs' : 'text-sm';
  const checkSize = compact ? 'h-3 w-3' : 'h-4 w-4';

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-secondary">
            <th className={`px-3 ${cellPy} text-xs font-semibold uppercase tracking-wide text-content-muted border-b border-line ${compact ? 'w-32' : 'w-40'}`}>ANSAMBLU</th>
            <th className={`px-2 ${cellPy} text-xs font-semibold uppercase tracking-wide text-content-muted border-b border-line text-center w-12`}>Zn</th>
            <th className={`px-3 ${cellPy} text-xs font-semibold uppercase tracking-wide text-content-muted border-b border-line ${compact ? 'w-36' : 'w-48'}`}>SUBANSAMBLU</th>
            {colLabels.map(h => <th key={h} className={`px-2 ${cellPy} text-xs font-semibold uppercase tracking-wide text-content-muted border-b border-line text-center ${compact ? 'w-12' : 'w-16'}`}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {tracking.map((asm, ai) => asm.subs.map((sub, si) => (
            <tr key={sub.id} className="hover:bg-surface-tertiary transition-colors">
              {si === 0 ? (
                <>
                  <td rowSpan={asm.subs.length} className={`px-3 ${cellPySub} ${textSize} font-semibold text-content-primary border-b border-line align-top bg-surface-secondary/50`}>
                    <span className="text-xs text-accent mr-1">{asm.id}.</span>{asm.assembly}
                  </td>
                  <td rowSpan={asm.subs.length} className={`px-2 ${cellPySub} text-center border-b border-line align-top`}>
                    <input type="checkbox" checked={asm.zincare} disabled={readOnly} onChange={() => onToggleZincare(ai)} className={`${checkSize} accent-[var(--color-accent)] ${readOnly ? 'cursor-default' : 'cursor-pointer'}`} />
                  </td>
                </>
              ) : null}
              <td className={`px-3 ${cellPySub} ${textSize} text-content-primary border-b border-line`}>
                <span className="text-xs text-content-muted mr-1">{sub.id}</span> {sub.name}
              </td>
              {cols.map(col => (
                <td key={col} className={`px-2 ${cellPySub} text-center border-b border-line`}>
                  <input type="checkbox" checked={sub[col] as boolean} disabled={readOnly} onChange={() => onToggle(ai, si, col)}
                    className={`${checkSize} accent-[var(--color-accent)] ${readOnly ? 'cursor-default' : 'cursor-pointer'}`} />
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
    ? 'w-full border border-line bg-surface-primary px-2 py-1 text-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent/60'
    : 'w-full border border-line bg-surface-primary px-2 py-1.5 text-xs text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-1 focus:ring-accent/60') + roCls;

  return (
    <div className="flex flex-col">
      {}
      <div className={`bg-surface-secondary border-b border-line ${sectionPad}`}>
        <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted mb-3">Informatii generale</h3>
        <div className={`grid ${compact ? 'grid-cols-4' : 'grid-cols-3'} ${gridGap}`}>
          {[
            { key: 'tip_statie', label: 'Tip Statie' }, { key: 'loc', label: 'Locație' }, { key: 'beneficiar', label: 'Beneficiar' },
            { key: 'ing_proiect', label: 'Ing. Proiect' }, { key: 'data_inceput', label: 'Data inceput' }, { key: 'data_finalizare', label: 'Data finalizare' },
          ].map(f => (
            <div key={f.key}>
              <label className="block text-xs text-content-muted mb-1">{f.label}</label>
              <input value={specs.header?.[f.key] || ''} onChange={e => onUpdateHeader(f.key, e.target.value)}
                readOnly={readOnly} className={inputClass} />
            </div>
          ))}
        </div>
      </div>

      {}
      {specs.sections.map((section, si) => (
        <div key={section.id} className={`bg-surface-secondary border-b border-line ${sectionPad}`}>
          <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted mb-3">
            <span className="text-accent mr-1">{section.id}.</span> {section.title}
          </h3>
          <div className={`grid ${compact ? 'grid-cols-3' : 'grid-cols-2'} ${gridGap}`}>
            {section.fields.map((field, fi) => (
              <div key={field.key} className={field.type === 'textarea' ? 'col-span-2' : ''}>
                <label className="block text-xs text-content-muted mb-1">{field.label}</label>
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
                    className={`${compact ? 'h-3 w-3' : 'h-4 w-4'} accent-[var(--color-accent)] ${readOnly ? 'cursor-default' : ''}`} />
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
        <h3 className="text-xs font-semibold uppercase tracking-wide text-content-muted mb-3">APROBAT BENEFICIAR</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          <div>
            <label className="block text-xs text-content-muted mb-1">Contact</label>
            <input value={specs.aprobat_beneficiar?.contact || ''} onChange={e => onUpdateBeneficiar('contact', e.target.value)}
              readOnly={readOnly} className={`w-full border border-line bg-surface-primary px-2 py-1.5 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60${readOnly ? ' cursor-default' : ''}`} />
          </div>
          <div>
            <label className="block text-xs text-content-muted mb-1">Tel</label>
            <input value={specs.aprobat_beneficiar?.tel || ''} onChange={e => onUpdateBeneficiar('tel', e.target.value)}
              readOnly={readOnly} className={`w-full border border-line bg-surface-primary px-2 py-1.5 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60${readOnly ? ' cursor-default' : ''}`} />
          </div>
          <div>
            <label className="block text-xs text-content-muted mb-1">Email</label>
            <input value={specs.aprobat_beneficiar?.email || ''} onChange={e => onUpdateBeneficiar('email', e.target.value)}
              readOnly={readOnly} className={`w-full border border-line bg-surface-primary px-2 py-1.5 text-xs text-content-primary focus:outline-none focus:ring-1 focus:ring-accent/60${readOnly ? ' cursor-default' : ''}`} />
          </div>
        </div>
      </div>
    </div>
  );
}
