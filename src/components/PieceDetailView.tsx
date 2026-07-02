import { lazy, Suspense, useState, useCallback, useEffect, useRef } from 'react';
import {
  ArrowLeft, CheckCircle2, Save, Loader2,
  MessageSquare, FileText, Wrench, Package, Truck, Settings,
  Paintbrush, ChevronDown,
} from '@/icons';
import { apiCommand } from '@/api/commands';
import type { ProjectPiece, ProductionTracking, TrackingPhase } from '@/types/piece';
import { parseProductionTracking, stringifyProductionTracking } from '@/types/piece';
import { usePieceStore } from '@/store/pieceStore';
import StatusBadge from '@/components/ui/StatusBadge';
import type { StatusTone } from '@/lib/statusTokens';



const DxfViewer = lazy(() => import('@/components/DxfViewer'));





interface Stage { id: number; name: string; }

const PIECE_STATUSES = [
  { value: 'planificat',    label: 'Planificat'    },
  { value: 'in_productie', label: 'In productie'  },
  { value: 'fabricat',     label: 'Fabricat'      },
  { value: 'livrat',       label: 'Livrat'        },
  { value: 'montat',       label: 'Montat'        },
  { value: 'testat',       label: 'Testat'        },
];

const PHASES: { key: keyof ProductionTracking; label: string; group: string; icon: typeof FileText }[] = [
  { key: 'proiectare',          label: 'Proiectare',          group: 'PROIECTARE', icon: FileText      },
  { key: 'dxf',                 label: 'Export DXF',          group: 'PROIECTARE', icon: FileText      },
  { key: 'desene',              label: 'Desene tehnice',      group: 'PROIECTARE', icon: FileText      },
  { key: 'achizitie_materiale', label: 'Achizitie materiale', group: 'MATERIALE',  icon: Package       },
  { key: 'debitare',            label: 'Debitare',            group: 'EXECUTIE',   icon: Wrench        },
  { key: 'sudare',              label: 'Sudare',              group: 'EXECUTIE',   icon: Wrench        },
  { key: 'prelucrare_mecanica', label: 'Prelucrare mecanica', group: 'EXECUTIE',   icon: Settings      },
  { key: 'vopsire',             label: 'Vopsire',             group: 'EXECUTIE',   icon: Paintbrush    },
  { key: 'asamblare',           label: 'Asamblare',           group: 'EXECUTIE',   icon: Wrench        },
  { key: 'executie',            label: 'Executie finala',     group: 'EXECUTIE',   icon: Wrench        },
  { key: 'testare',             label: 'Testare & QC',        group: 'FINALIZARE', icon: CheckCircle2  },
  { key: 'livrat',              label: 'Livrat',              group: 'FINALIZARE', icon: Truck         },
  { key: 'montat',              label: 'Montat pe santier',   group: 'FINALIZARE', icon: Wrench        },
  { key: 'punere_functiune',    label: 'Punere in functiune', group: 'FINALIZARE', icon: Settings      },
];

const STATUS_CFG: Record<TrackingPhase, {
  bar:   string;
  tone:  StatusTone;
  label: string;
}> = {
  finalizat: { bar: 'bg-status-green', tone: 'success', label: 'Finalizat'  },
  in_lucru:  { bar: 'bg-status-amber', tone: 'warning', label: 'In lucru'   },
  neinceput: { bar: 'bg-transparent',  tone: 'neutral', label: 'Neinceput' },
};

const NEXT: Record<TrackingPhase, TrackingPhase> = {
  neinceput: 'in_lucru', in_lucru: 'finalizat', finalizat: 'neinceput',
};

const NEXT_LABEL: Record<TrackingPhase, string> = {
  neinceput: 'In lucru',
  in_lucru:  'Finalizat',
  finalizat: 'Neinceput',
};

const GROUP_ACCENT: Record<string, string> = {
  PROIECTARE: 'text-accent',
  MATERIALE:  'text-status-purple',
  EXECUTIE:   'text-status-amber',
  FINALIZARE: 'text-status-green',
};

const GROUP_BAR: Record<string, string> = {
  PROIECTARE: 'bg-accent',
  MATERIALE:  'bg-status-purple',
  EXECUTIE:   'bg-status-amber',
  FINALIZARE: 'bg-status-green',
};





function CustomSelect({ value, onChange, options }: {
  value: string | number | null | undefined;
  onChange: (val: string) => void;
  options: { value: string | number; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = options.find(o => String(o.value) === String(value ?? ''));

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`w-full h-8 flex items-center px-2.5 rounded border text-xs text-content-primary cursor-pointer transition-all
          ${open
            ? 'border-accent ring-1 ring-accent/25 bg-surface-primary'
            : 'border-accent/35 bg-surface-primary hover:border-accent/70'
          }`}
      >
        <span className="flex-1 text-left truncate pr-4">{selected?.label ?? '—'}</span>
      </button>
      <ChevronDown
        className={`absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-content-muted pointer-events-none transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
      />
      {open && (
        <div className="absolute top-full left-0 right-0 mt-0.5 z-50 rounded border border-line bg-surface-secondary shadow-lg max-h-52 overflow-y-auto">
          {options.map(opt => (
            <button
              key={String(opt.value)}
              type="button"
              onClick={() => { onChange(String(opt.value)); setOpen(false); }}
              className={`w-full px-2.5 py-1.5 text-xs text-left transition-colors
                ${String(opt.value) === String(value ?? '')
                  ? 'bg-accent/10 text-accent font-semibold'
                  : 'text-content-primary hover:bg-surface-tertiary'
                }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}





interface Props {
  piece:      ProjectPiece;
  breadcrumb: string[];
  onBack:     () => void;
  onUpdate?:  () => void;
}

export default function PieceDetailView({ piece, breadcrumb, onBack, onUpdate }: Props) {
  const [tracking,     setTracking]     = useState<ProductionTracking>(() => parseProductionTracking(piece.production_tracking));
  const [hallNotes,    setHallNotes]    = useState(piece.hall_notes || '');
  const [stageId,      setStageId]      = useState(piece.stage_id);
  const [pieceStatus,  setPieceStatus]  = useState(piece.status || 'planificat');
  const [stages,       setStages]       = useState<Stage[]>([]);
  const [saving,       setSaving]       = useState(false);
  const [saved,        setSaved]        = useState(false);
  const [isDirty,      setIsDirty]      = useState(false);
  const [thumbnail,    setThumbnail]    = useState<string | null>(null);
  const [thumbLoading, setThumbLoading] = useState(false);

  useEffect(() => {
    setTracking(parseProductionTracking(piece.production_tracking));
    setHallNotes(piece.hall_notes || '');
    setStageId(piece.stage_id);
    setPieceStatus(piece.status || 'planificat');
    setSaved(false);
    setIsDirty(false);
  }, [piece.id, piece.production_tracking, piece.hall_notes, piece.stage_id, piece.status]);

  useEffect(() => {
    if (piece.project_id) {
      apiCommand<Stage[]>('get_project_stages_custom', { project_id: piece.project_id })
        .then(setStages).catch(() => {});
    }
  }, [piece.project_id]);

  
  useEffect(() => {
    setThumbnail(null);
    const fp = piece.source_file_path;
    if (!fp || !/\.(sldprt|sldasm)$/i.test(fp)) return;
    if (typeof window === 'undefined' || !('electron' in window)) return;

    setThumbLoading(true);
    window.electron.invoke('extract_sldprt_thumbnail', { file_path: fp })
      .then((b64: unknown) => setThumbnail((b64 as string | null) || null))
      .catch(() => setThumbnail(null))
      .finally(() => setThumbLoading(false));
  }, [piece.id, piece.source_file_path]);

  
  
  
  const GROUP_STAGE_KEYWORDS: Record<string, string[]> = {
    PROIECTARE: ['proiect', 'design', 'cad'],
    MATERIALE:  ['material', 'achizi', 'aprovizion'],
    EXECUTIE:   ['product', 'fabric', 'executi', 'structur', 'subansa'],
    FINALIZARE: ['asambl', 'testa', 'final', 'livr', 'monta', 'functiun'],
  };

  const findStageIdForPhase = useCallback((key: keyof ProductionTracking): number | null => {
    const phase = PHASES.find(p => p.key === key);
    if (!phase || stages.length === 0) return null;
    const keywords = GROUP_STAGE_KEYWORDS[phase.group] || [];
    const match = stages.find(s => keywords.some(k => s.name.toLowerCase().includes(k)));
    return match?.id ?? null;
  }, [stages]);

  const toggle = useCallback((key: keyof ProductionTracking) => {
    setTracking(prev => ({ ...prev, [key]: NEXT[prev[key]] }));
    
    
    
    const nextStageId = findStageIdForPhase(key);
    if (nextStageId != null && nextStageId !== (stageId ?? piece.stage_id)) {
      setStageId(nextStageId);
    }
    setSaved(false);
    setIsDirty(true);
  }, [findStageIdForPhase, stageId, piece.stage_id]);

  const save = useCallback(async () => {
    setSaving(true);
    try {
      
      
      
      await usePieceStore.getState().updatePiece(piece.id, piece.project_id, {
        stage_id:            stageId,
        status:              pieceStatus,
        production_tracking: stringifyProductionTracking(tracking),
        hall_notes:          hallNotes || null,
      });
      setSaved(true);
      setIsDirty(false);
      onUpdate?.();
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { console.error('Save failed:', e); }
    finally { setSaving(false); }
  }, [piece.id, piece.project_id, stageId, pieceStatus, tracking, hallNotes, onUpdate]);

  
  const vals   = Object.values(tracking);
  const done   = vals.filter(v => v === 'finalizat').length;
  const inProg = vals.filter(v => v === 'in_lucru').length;
  const pct    = Math.round((done / vals.length) * 100);
  const C      = 2 * Math.PI * 24;

  
  const groups = PHASES.reduce<Record<string, typeof PHASES>>((acc, p) => {
    (acc[p.group] ||= []).push(p); return acc;
  }, {});

  const currentStageName = stages.find(s => s.id === stageId)?.name ?? piece.stage_name;

  
  const stageOptions = stages.length > 0
    ? stages.map(s => ({ value: s.id, label: s.name }))
    : [{ value: piece.stage_id ?? 0, label: piece.stage_name || 'Etapa curenta' }];

  
  
  

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-surface-primary">

      {}
      <div className="shrink-0 flex items-center gap-2.5 px-4 h-12 border-b border-line bg-surface-secondary">

        <button
          onClick={onBack}
          className="shrink-0 h-7 px-2.5 rounded border border-line text-pm-xs font-medium text-content-secondary hover:bg-surface-tertiary flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="h-3 w-3" />
          Înapoi
        </button>

        {}
        <nav className="flex items-center text-pm-xs text-content-muted overflow-hidden min-w-0">
          {breadcrumb.map((seg, i) => (
            <span key={i} className="flex items-center shrink-0 min-w-0">
              {i > 0 && <span className="mx-1 opacity-25 shrink-0">/</span>}
              <span className={`truncate max-w-[120px] ${i === breadcrumb.length - 1 ? 'text-content-primary font-semibold' : ''}`}>
                {seg}
              </span>
            </span>
          ))}
        </nav>

        <div className="flex-1" />

        {}
        <div className="hidden sm:flex items-center gap-2 mr-1">
          <div className="flex items-center gap-1 text-pm-2xs text-content-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-status-green" />
            <span className="tabular-nums">{done}</span>
          </div>
          <div className="flex items-center gap-1 text-pm-2xs text-content-muted">
            <span className="h-1.5 w-1.5 rounded-full bg-status-amber" />
            <span className="tabular-nums">{inProg}</span>
          </div>
          <div className="w-16 h-1 rounded-full bg-line overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${pct}%`,
                background: pct === 100 ? 'var(--status-green)' : pct > 0 ? 'var(--status-amber)' : 'transparent',
              }}
            />
          </div>
          <span className="text-pm-2xs font-bold tabular-nums text-content-secondary w-7 text-right">{pct}%</span>
        </div>

        {}
        <button
          onClick={save}
          disabled={saving}
          className={`shrink-0 h-7 px-3 rounded text-pm-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50
            ${saved ? 'bg-status-green text-white' : 'bg-accent text-[var(--color-on-accent)] hover:opacity-90'}`}
        >
          {saving
            ? <Loader2 className="h-3 w-3 animate-spin" />
            : saved
            ? <CheckCircle2 className="h-3 w-3" />
            : <Save className="h-3 w-3" />}
          {saved ? 'Salvat!' : 'Salvează'}
        </button>
      </div>

      {}
      {isDirty && !saving && (
        <div className="shrink-0 flex items-center gap-2 px-4 h-6 bg-status-amber/8 border-b border-status-amber/15">
          <span className="h-1.5 w-1.5 rounded-full bg-status-amber animate-pulse shrink-0" />
          <span className="text-pm-2xs text-status-amber/90 font-medium">Modificari nesalvate</span>
        </div>
      )}

      {}
      <div
        className="flex-1 min-h-0 grid overflow-hidden"
        style={{ gridTemplateColumns: 'minmax(0,1fr) clamp(260px,34vw,480px)' }}
      >

        {

}
        <div className="flex flex-col min-h-0 overflow-hidden border-r border-line">

          {}
          <div className="shrink-0 flex items-center gap-3 px-5 py-3 border-b border-line bg-surface-secondary">
            <div className="flex-1 min-w-0">
              <h1 className="text-sm font-bold text-content-primary leading-snug truncate">{piece.name}</h1>
              {piece.original_name && piece.original_name !== piece.name && (
                <p
                  className="text-pm-2xs text-content-muted font-mono truncate mt-0.5"
                  title={piece.original_name}
                >
                  Nume complet: {piece.original_name}
                </p>
              )}
              <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                <span className="inline-flex items-center px-1.5 py-px rounded text-pm-2xs font-semibold uppercase tracking-wide bg-accent/10 text-accent">
                  {piece.category}
                </span>
                <span className="inline-flex items-center px-1.5 py-px rounded-sm text-pm-2xs bg-surface-tertiary text-content-muted">
                  ×{piece.quantity}
                </span>
                {currentStageName && (
                  <span className="inline-flex items-center px-1.5 py-px rounded-sm text-pm-2xs bg-surface-tertiary text-content-secondary truncate max-w-[180px]">
                    {currentStageName}
                  </span>
                )}
              </div>
            </div>

            {}
            <div className="relative h-11 w-11 shrink-0">
              <svg className="h-11 w-11 -rotate-90" viewBox="0 0 56 56">
                <circle cx="28" cy="28" r="24" fill="none" strokeWidth="2.5" stroke="var(--color-border)" />
                <circle
                  cx="28" cy="28" r="24" fill="none" strokeWidth="3"
                  stroke={pct === 100 ? '#22C55E' : pct > 0 ? '#F59E0B' : 'transparent'}
                  strokeDasharray={`${(pct / 100) * C} ${C}`}
                  strokeLinecap="round"
                  style={{ transition: 'stroke-dasharray 0.5s ease' }}
                />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-pm-2xs font-bold text-content-primary">
                {pct}%
              </span>
            </div>
          </div>

          {}
          <div className="flex-1 min-h-0 overflow-y-auto">
            {Object.entries(groups).map(([group, phases]) => {
              const gDone = phases.filter(p => tracking[p.key] === 'finalizat').length;
              const gPct  = Math.round((gDone / phases.length) * 100);

              return (
                <div key={group}>
                  {}
                  <div className="sticky top-0 z-10 flex items-center gap-2.5 px-5 py-1.5 bg-surface-secondary/95 backdrop-blur-sm border-b border-line">
                    <span className={`text-pm-2xs font-extrabold uppercase tracking-[0.2em] shrink-0 w-[72px] ${GROUP_ACCENT[group] ?? 'text-content-muted'}`}>
                      {group}
                    </span>
                    <div className="flex-1 h-0.5 rounded-full bg-line overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          gPct > 0 ? (GROUP_BAR[group] ?? 'bg-accent') : ''
                        }`}
                        style={{ width: `${gPct}%` }}
                      />
                    </div>
                    <span className="text-pm-2xs text-content-muted tabular-nums shrink-0 w-8 text-right">
                      {gDone}/{phases.length}
                    </span>
                  </div>

                  {}
                  {phases.map(phase => {
                    const st  = tracking[phase.key];
                    const cfg = STATUS_CFG[st];
                    const Icon = phase.icon;
                    return (
                      <button
                        key={phase.key}
                        type="button"
                        onClick={() => toggle(phase.key)}
                        title={`Click → ${NEXT_LABEL[st]}`}
                        className="w-full flex items-stretch border-b border-line/40 hover:bg-surface-tertiary/30 active:bg-surface-tertiary/50 transition-colors text-left group"
                      >
                        {}
                        <span className={`w-0.5 shrink-0 transition-colors duration-300 ${cfg.bar}`} />

                        <div className="flex items-center gap-2.5 px-4 py-2.5 flex-1 min-w-0">
                          <Icon className="h-3.5 w-3.5 text-content-muted shrink-0" />
                          <span className="text-xs text-content-primary font-medium flex-1 text-left leading-snug">
                            {phase.label}
                          </span>
                          {}
                          <span className="opacity-0 group-hover:opacity-40 transition-opacity text-pm-2xs text-content-muted shrink-0 mr-1">
                            → {NEXT_LABEL[st]}
                          </span>
                          <StatusBadge tone={cfg.tone} label={cfg.label} size="xs" dot className="shrink-0" />
                        </div>
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {}
          <div className="shrink-0 border-t border-line bg-surface-secondary px-4 pt-2.5 pb-3">
            <div className="flex items-center gap-1.5 mb-1.5">
              <MessageSquare className="h-3 w-3 text-content-muted" />
              <span className="text-pm-2xs font-semibold uppercase tracking-wide text-content-muted">Note hala productie</span>
            </div>
            <textarea
              value={hallNotes}
              onChange={e => { setHallNotes(e.target.value); setSaved(false); setIsDirty(true); }}
              placeholder="Instructiuni, observatii pentru echipa de productie..."
              style={{ height: 'clamp(72px, 11vh, 128px)' }}
              className="w-full rounded border border-line bg-surface-primary px-3 py-1.5 text-xs text-content-primary placeholder:text-content-muted resize-none focus:outline-none focus:ring-1 focus:ring-accent/60"
            />
          </div>
        </div>

        {

}
        <div className="overflow-y-auto bg-surface-secondary divide-y divide-line flex flex-col">

          {}
          <div className="p-4 space-y-4">
            {}
            <div>
              <label className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-accent/70 mb-1.5">
                Etapa productie
              </label>
              {stages.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {stages.map((s, idx) => {
                    const currentId = stageId ?? piece.stage_id;
                    const currentIdx = stages.findIndex(x => x.id === currentId);
                    const isCurrent = s.id === currentId;
                    const isDone    = currentIdx > idx;
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => { setStageId(s.id); setSaved(false); setIsDirty(true); }}
                        aria-current={isCurrent ? 'step' : undefined}
                        className={`flex items-center gap-2.5 rounded border px-3 py-2 text-left text-xs font-medium transition-colors ${
                          isCurrent
                            ? 'border-accent bg-accent/10 text-accent'
                            : isDone
                              ? 'border-status-green/30 bg-status-green/5 text-status-green'
                              : 'border-line bg-surface-primary text-content-secondary hover:bg-surface-tertiary'
                        }`}
                      >
                        <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-pm-2xs font-bold ${
                          isCurrent ? 'bg-accent text-[var(--color-on-accent)]'
                          : isDone    ? 'bg-status-green text-surface-primary'
                          :             'bg-surface-tertiary text-content-muted'
                        }`}>
                          {isDone ? '✓' : idx + 1}
                        </span>
                        <span className="flex-1 truncate">{s.name}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <CustomSelect
                  value={stageId ?? piece.stage_id}
                  onChange={val => { setStageId(Number(val) || piece.stage_id); setSaved(false); setIsDirty(true); }}
                  options={stageOptions}
                />
              )}
            </div>

            <div>
              <label className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-accent/70 mb-1.5">
                Status piesa
              </label>
              <CustomSelect
                value={pieceStatus}
                onChange={val => { setPieceStatus(val); setSaved(false); setIsDirty(true); }}
                options={PIECE_STATUSES}
              />
            </div>
          </div>

          {}
          <div className="p-4">
            <span className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-2">
              Previzualizare
            </span>
            {piece.source_file_path ? (
              thumbLoading ? (
                <div
                  className="rounded border border-line flex items-center justify-center gap-2 text-content-muted"
                  style={{ height: 'clamp(120px, 20vh, 260px)' }}
                >
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-pm-2xs">Se încarcă previzualizarea...</span>
                </div>
              ) : thumbnail ? (
                <div
                  className="rounded border border-line overflow-hidden bg-white flex items-center justify-center"
                  style={{ height: 'clamp(120px, 20vh, 260px)' }}
                >
                  <img
                    src={`data:image/png;base64,${thumbnail}`}
                    alt={piece.name}
                    className="max-w-full max-h-full object-contain"
                    style={{ maxHeight: 'clamp(120px, 20vh, 260px)' }}
                  />
                </div>
              ) : /\.(dxf)$/i.test(piece.source_file_path) ? (
                <div
                  className="rounded border border-line overflow-hidden"
                  style={{ height: 'clamp(120px, 20vh, 260px)' }}
                >
                  <Suspense fallback={<div className="ds-skeleton h-full w-full" />}>
                    <DxfViewer sldprtPath={piece.source_file_path} />
                  </Suspense>
                </div>
              ) : (
                <div
                  className="rounded border border-line/60 bg-surface-primary flex flex-col items-center justify-center gap-3"
                  style={{ height: 'clamp(120px, 20vh, 260px)' }}
                >
                  <svg viewBox="0 0 64 64" className="h-12 w-12 opacity-30" fill="none" stroke="currentColor" strokeWidth="1.5">
                    <rect x="8" y="8" width="48" height="48" rx="4" className="text-content-muted" />
                    <polyline points="8,24 32,16 56,24" className="text-content-muted" />
                    <polyline points="32,16 32,48" className="text-content-muted" />
                    <polyline points="8,24 8,48 56,48 56,24" className="text-content-muted" />
                    <polyline points="8,48 32,40 56,48" className="text-content-muted" />
                    <polyline points="32,40 32,16" className="text-content-muted" />
                  </svg>
                  <div className="text-center">
                    <div className="text-pm-xs text-content-secondary font-medium">
                      {piece.source_file_name?.split('.').pop()?.toUpperCase() || 'CAD'}
                    </div>
                    <div className="text-pm-2xs text-content-muted mt-0.5">Previzualizare indisponibila</div>
                  </div>
                </div>
              )
            ) : (
              <div
                className="rounded border border-dashed border-line/50 flex flex-col items-center justify-center text-content-muted gap-1.5"
                style={{ height: 'clamp(80px, 12vh, 140px)' }}
              >
                <FileText className="h-5 w-5 opacity-20" />
                <span className="text-pm-2xs opacity-50">Niciun fisier sursa</span>
              </div>
            )}
          </div>

          {}
          {(piece.fulfillment_type || piece.fulfillment_status || piece.assembly_key) && (
            <div className="p-4">
              <span className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-2">
                Executie
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {piece.fulfillment_type && (
                  <div className="rounded bg-surface-primary px-2.5 py-1.5">
                    <div className="text-pm-2xs text-content-muted uppercase tracking-wide">Tip exec.</div>
                    <div className="text-pm-xs text-content-primary font-medium mt-0.5 truncate">{piece.fulfillment_type}</div>
                  </div>
                )}
                {piece.fulfillment_status && piece.fulfillment_status !== 'draft' && (
                  <div className="rounded bg-surface-primary px-2.5 py-1.5">
                    <div className="text-pm-2xs text-content-muted uppercase tracking-wide">Status exec.</div>
                    <div className="text-pm-xs text-content-primary font-medium mt-0.5 truncate">{piece.fulfillment_status}</div>
                  </div>
                )}
                {piece.assembly_key && (
                  <div className="rounded bg-surface-primary px-2.5 py-1.5 col-span-2">
                    <div className="text-pm-2xs text-content-muted uppercase tracking-wide">Assembly</div>
                    <div className="text-pm-xs text-content-primary font-medium mt-0.5 truncate">{piece.assembly_key}</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {}
          {(piece.source_file_name || piece.source_file_path) && (
            <div className="p-4">
              <span className="block text-pm-2xs font-bold uppercase tracking-[0.14em] text-content-muted mb-2">
                Fisier sursa
              </span>
              <div className="space-y-0.5">
                {piece.source_file_name && (
                  <div className="text-pm-xs text-content-primary font-mono break-all leading-relaxed">
                    {piece.source_file_name}
                  </div>
                )}
                {piece.source_file_path && (
                  <div className="text-pm-2xs text-content-muted font-mono break-all leading-relaxed">
                    {piece.source_file_path}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
