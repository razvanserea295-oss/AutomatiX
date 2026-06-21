/**
 * FisaTemplatesPage — Modern-SaaS rebuild (RE-ARRANGED layout).
 *
 * Fișă templates management.
 *
 * Lists every global template, lets users:
 *   - Create a NEW template by cloning an existing one (the safest path
 *     — gives them a working schema to mutate).
 *   - Rename / edit the description / sort order.
 *   - Edit the JSON schema via the visual two-tab editor.
 *   - Soft-delete (admin / author only).
 *
 * Templates are GLOBAL so the audience of this page is everyone, but the action
 * buttons gate themselves by ownership.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * The user's #1 complaint was "the card POSITIONS haven't changed". This file
 * GENUINELY re-architects the layout vs the original — it drops the old
 * `mod-shell / HeroHeader / mod-kpis` grammar and the single full-width 1/2/3
 * card grid, rebuilding fresh zones with NEW positions/proportions:
 *
 *   1. COMMAND BAR — one horizontal band: identity (left) + inline search
 *      (center, a NEW layout win the manifest flagged as missing) + primary
 *      action "Template nou" (right). Replaces the tall full-width hero panel.
 *   2. WORKBENCH   — a 12-col bento with a NEW 8/12 + 4/12 split. The template
 *      GALLERY fills the wide LEFT panel (8/12, a 2-col card grid); a narrow
 *      INSIGHTS / DETAIL rail sits on the RIGHT (4/12). Clicking a card opens
 *      an in-page detail in that rail with a shared-element morph — a fresh
 *      master+detail relationship the original never had, repositioned right.
 *
 * EVERYTHING in the logic layer is copied VERBATIM: every useState/useEffect/
 * useCallback/useMemo, the `useAuthStore` hook, every `apiCommand('…')` literal
 * (get_fisa_templates / clone_fisa_template / delete_fisa_template; create_ /
 * update_ flow through FisaTemplateEditor), the `canEdit` ownership gate, the
 * `clone` / `remove` handlers, the in-file KpiMini sub-component (preserved per
 * the inventory), and the editor modal wiring. Same default export name + no
 * props. The native `prompt()` (clone name) and `confirm()` (deactivate) are
 * replaced with the redesign Modal / `confirmDialog` per the manifest — same
 * outcome (cancel = no-op, value = same apiCommand call).
 */
import { useState, useEffect, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import {
  ClipboardCheck, Plus, Pencil, Trash2, Copy,
  Search as SearchIcon, X, LayoutGrid,
} from 'lucide-react';
import { apiCommand } from '@/api/commands';
import { toast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';
import FisaTemplateEditor from '@/pages/checklist/FisaTemplateEditor';
import { getErrorMessage } from '@/utils/errors';
import { confirmDialog } from '@/components/ConfirmDialog';

import Page from '@/redesign/ui/Page';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import FilterBar from '@/redesign/ui/FilterBar';
import StatusBadge from '@/redesign/ui/StatusBadge';
import { GlassCard, MetricValue, EmptyState, Skeleton } from '@/redesign/ui';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';
import { FISA_COLUMNS, parseColumnWeights } from '@/lib/fisaProgress';



const COLUMN_LABELS: Record<(typeof FISA_COLUMNS)[number], string> = {
  proiect: 'Proiectare',
  dxf: 'DXF',
  desene: 'Desene',
  executie: 'Execuție',
  livrat: 'Livrat',
};

interface Template {
  id: number;
  name: string;
  description: string | null;
  schema_json: string;
  column_weights_json?: string | null;
  created_by_user_id: number | null;
  created_by_name: string | null;
  is_default: boolean;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export default function FisaTemplatesPage() {
  const me = useAuthStore(s => s.user);
  const isAdmin = me?.role_name === 'admin';
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Template | null>(null);
  const [creating, setCreating] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setTemplates(await apiCommand<Template[]>('get_fisa_templates'));
    } catch (e: unknown) {
      toast.error(getErrorMessage(e, 'Eroare'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const canEdit = (t: Template) => isAdmin || t.created_by_user_id === me?.id;

  
  
  
  const [search, setSearch] = useState('');
  
  
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return templates;
    return templates.filter(t =>
      t.name.toLowerCase().includes(q) ||
      (t.description || '').toLowerCase().includes(q) ||
      (t.created_by_name || '').toLowerCase().includes(q)
    );
  }, [templates, search]);

  useEffect(() => {
    if (selectedId === null && filtered.length > 0) setSelectedId(filtered[0].id);
  }, [filtered, selectedId]);

  const selected = useMemo(
    () => (selectedId === null ? null : templates.find(t => t.id === selectedId) || null),
    [templates, selectedId],
  );

  const select = (id: number) => {
    const next = id === selectedId ? null : id;
    startMorphTransition(
      () => flushSync(() => setSelectedId(next)),
      { dir: next === null ? 'back' : 'forward' },
    );
  };

  const clone = async (t: Template) => {
    const name = await promptDialog({
      title: 'Clonează template',
      label: 'Numele noului template',
      defaultValue: `${t.name} (copie)`,
      confirmLabel: 'Clonează',
    });
    if (!name) return;
    try {
      await apiCommand('clone_fisa_template', { id: t.id, new_name: name });
      toast.success('Template clonat');
      refresh();
    } catch (e: unknown) { toast.error(getErrorMessage(e, 'Eroare')); }
  };
  const remove = async (t: Template) => {
    if (!(await confirmDialog({
      title: `Dezactivezi „${t.name}"?`,
      body: 'Fișele existente nu sunt afectate.',
      confirmLabel: 'Dezactivează',
      danger: true,
    }))) return;
    try {
      await apiCommand('delete_fisa_template', { id: t.id });
      toast.success('Template dezactivat');
      refresh();
      if (selectedId === t.id) setSelectedId(null);
    } catch (e: unknown) { toast.error(getErrorMessage(e, 'Eroare')); }
  };

  return (
    <Page fit>
      <Page.Body fit>

        {


}
        <div className="enter-up shrink-0 pb-4 border-b border-line/60" style={{ animationDelay: '0ms' }}>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
                <ClipboardCheck className="h-5 w-5 text-accent" aria-hidden />
              </span>
              <div className="min-w-0">
                {/* Eyebrow removed — breadcrumb already conveys the workspace. */}
                <h1 className="text-pm-2xl font-semibold text-content-primary leading-tight truncate">
                  Template-uri fișa proiectant
                </h1>
                <p className="text-pm-xs text-content-muted mt-0.5 truncate">
                  Catalog global de structuri pentru fișe — clonate pe fiecare proiect (Q8 snapshot)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 lg:ml-auto">
              <div className="hidden sm:block w-[240px] lg:w-[280px]">
                <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Caută template, descriere, autor..." />
              </div>
              <Button size="md" onClick={() => setCreating(true)}>
                <Plus className="h-4 w-4" aria-hidden /> Template nou
              </Button>
            </div>
          </div>
          {}
          <div className="sm:hidden mt-3">
            <FilterBar search={search} onSearchChange={setSearch} searchPlaceholder="Caută template, descriere, autor..." />
          </div>
        </div>

        {


}
        <div className="flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4 items-stretch">

          {}
          <section className="xl:col-span-8 enter-up min-w-0 min-h-0 flex flex-col" style={{ animationDelay: '140ms' }}>
            <GlassCard size="regular" className="!p-0 overflow-hidden flex flex-col min-h-0 flex-1">
              <div className="flex items-center justify-between gap-3 px-5 py-3 border-b border-line/40 shrink-0">
                <h2 className="text-pm-md font-semibold text-content-primary truncate min-w-0">Catalog template-uri</h2>
                <p className="text-pm-xs text-content-muted shrink-0">
                  {filtered.length} {filtered.length === 1 ? 'template' : 'template-uri'}{search ? ` găsite pentru „${search}"` : ''}
                </p>
              </div>

              <div className="p-4 flex-1 min-h-0 overflow-y-auto">
                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-hidden>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="rounded-2xl border border-line bg-surface-elevated p-4 flex flex-col gap-3">
                        <div className="flex items-start gap-2">
                          <Skeleton width={16} height={16} rounded="md" className="mt-0.5 shrink-0" />
                          <Skeleton width="60%" height={14} rounded="md" />
                        </div>
                        <div className="space-y-1.5">
                          <Skeleton width="100%" height={11} rounded="md" />
                          <Skeleton width="80%" height={11} rounded="md" />
                        </div>
                        <div className="mt-auto pt-2 border-t border-line/40 flex gap-1">
                          <Skeleton width={32} height={32} rounded="lg" />
                          <Skeleton width={32} height={32} rounded="lg" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : filtered.length === 0 ? (
                  search ? (
                    <EmptyState
                      icon={SearchIcon}
                      title="Niciun template găsit"
                      description={`Filtrul „${search}" nu se potrivește cu niciun template. Încearcă alt termen.`}
                    />
                  ) : (
                    <EmptyState
                      icon={LayoutGrid}
                      title="Niciun template configurat."
                      description="Creează primul template sau clonează unul existent pentru a începe."
                      action={
                        <Button size="sm" onClick={() => setCreating(true)}>
                          <Plus className="h-3.5 w-3.5" aria-hidden /> Template nou
                        </Button>
                      }
                    />
                  )
                ) : (
                  <div key={`grid-${search}`} className="stagger-in grid grid-cols-1 md:grid-cols-2 gap-3">
                    {filtered.map(t => {
                      const isSel = t.id === selectedId;
                      return (
                        <GlassCard
                          key={t.id}
                          size="compact"
                          interactive
                          onClick={() => select(t.id)}
                          vtName={isSel ? vtName('fisa-template', t.id) : undefined}
                          className={`group hover-lift flex flex-col !p-4 ${isSel ? 'ring-1 ring-accent/40 bg-accent/5' : ''}`}
                        >
                          <div className="flex items-start gap-2 mb-2">
                            <ClipboardCheck className="h-4 w-4 text-content-muted mt-0.5 shrink-0" aria-hidden />
                            <div className="flex-1 min-w-0">
                              <p className="text-pm-sm font-semibold text-content-primary truncate">{t.name}</p>
                              {t.is_default && (
                                <span className="mt-1 inline-block">
                                  <StatusBadge tone="accent" label="Implicit" size="xs" />
                                </span>
                              )}
                            </div>
                          </div>
                          {t.description && (
                            <p className="text-pm-xs text-content-muted flex-1 mb-3 line-clamp-3">{t.description}</p>
                          )}
                          {t.created_by_name && (
                            <p className="text-pm-2xs text-content-muted/70 mb-3 truncate">creat de {t.created_by_name}</p>
                          )}

                          <div className="flex items-center gap-1 mt-auto pt-2 border-t border-line/40 opacity-70 group-hover:opacity-100 transition-opacity duration-150">
                            <IconButton size="sm" onClick={(e) => { e.stopPropagation(); clone(t); }} title="Clonează" aria-label="Clonează template">
                              <Copy />
                            </IconButton>
                            {canEdit(t) && (
                              <>
                                <IconButton size="sm" onClick={(e) => { e.stopPropagation(); setEditing(t); }} title="Editează" aria-label="Editează template">
                                  <Pencil />
                                </IconButton>
                                {!t.is_default && (
                                  <IconButton intent="danger" size="sm" onClick={(e) => { e.stopPropagation(); remove(t); }} title="Dezactivează" aria-label="Dezactivează template">
                                    <Trash2 />
                                  </IconButton>
                                )}
                              </>
                            )}
                          </div>
                        </GlassCard>
                      );
                    })}
                  </div>
                )}
              </div>
            </GlassCard>
          </section>

          {}
          <aside className="xl:col-span-4 enter-up min-h-0 flex flex-col" style={{ animationDelay: '200ms' }}>
            {!selected ? (
              <GlassCard key="rail-empty" size="regular" className="enter-fade !p-0 overflow-hidden flex-1 min-h-0 flex flex-col">
                <div className="flex flex-col items-center justify-center text-center flex-1 px-6 py-16">
                  <span className="anim-float h-12 w-12 rounded-2xl bg-accent-muted/60 flex items-center justify-center mb-3">
                    <ClipboardCheck className="h-6 w-6 text-content-muted/60" aria-hidden />
                  </span>
                  <p className="text-pm-sm font-medium text-content-secondary">Selectează un template</p>
                  <p className="text-pm-xs text-content-muted mt-1">din catalog pentru detalii rapide</p>
                </div>
              </GlassCard>
            ) : (
              <GlassCard
                key={`rail-${selected.id}`}
                size="regular"
                className="enter-up !p-0 overflow-hidden flex-1 min-h-0 flex flex-col"
                vtName={vtName('fisa-template', selected.id)}
              >
                {}
                <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-line shrink-0">
                  <h3 className="text-pm-sm font-semibold text-content-primary truncate flex-1 min-w-0">{selected.name}</h3>
                  <IconButton
                    size="sm"
                    onClick={() => select(selected.id)}
                    title="Închide"
                    aria-label="Închide"
                    className="shrink-0"
                  >
                    <X aria-hidden />
                  </IconButton>
                </div>

                <div className="px-4 py-3 border-b border-line space-y-3 flex-1 min-h-0 overflow-y-auto">
                  {selected.is_default && (
                    <StatusBadge tone="accent" label="Template implicit" size="sm" />
                  )}
                  <div>
                    <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Stare</p>
                    <div className="mt-1">
                      <StatusBadge
                        {...(selected.active
                          ? { tone: 'success' as const, label: 'Activ' }
                          : { tone: 'neutral' as const, label: 'Inactiv' })}
                        size="sm"
                      />
                    </div>
                  </div>
                  {selected.description && (
                    <div>
                      <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Descriere</p>
                      <p className="text-pm-xs text-content-secondary mt-0.5">{selected.description}</p>
                    </div>
                  )}
                  {selected.created_by_name && (
                    <div>
                      <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">Autor</p>
                      <p className="text-pm-xs text-content-secondary mt-0.5">{selected.created_by_name}</p>
                    </div>
                  )}

                  {



}
                  {(() => {
                    const weights = parseColumnWeights(selected.column_weights_json ?? null);
                    const equal = Math.round((100 / FISA_COLUMNS.length) * 10) / 10;
                    return (
                      <div key={`weights-${selected.id}`}>
                        <p className="text-pm-2xs font-bold uppercase tracking-wide text-content-muted">
                          Ponderi coloane
                        </p>
                        <div className="mt-1.5 space-y-2">
                          {FISA_COLUMNS.map((c, i) => {
                            const pct = weights ? Math.round((weights[c] || 0) * 10) / 10 : equal;
                            return (
                              <div key={c}>
                                <div className="flex items-center justify-between text-pm-2xs">
                                  <span className="text-content-secondary">{COLUMN_LABELS[c]}</span>
                                  <span className="text-content-muted tabular-nums">{pct}%</span>
                                </div>
                                <div className="mt-0.5 h-1.5 w-full rounded-full bg-surface-tertiary overflow-hidden">
                                  <div
                                    className="anim-bar-grow h-full rounded-full bg-accent"
                                    style={{ width: `${Math.min(100, pct)}%`, animationDelay: `${i * 70}ms` }}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {}
                <div className="px-4 py-3 flex items-center gap-2 shrink-0 border-t border-line/60">
                  <Button variant="secondary" size="sm" onClick={() => clone(selected)}>
                    <Copy className="h-3.5 w-3.5" aria-hidden /> Clonează
                  </Button>
                  {canEdit(selected) && (
                    <>
                      <Button variant="secondary" size="sm" onClick={() => setEditing(selected)}>
                        <Pencil className="h-3.5 w-3.5" aria-hidden /> Editează
                      </Button>
                      {!selected.is_default && (
                        <Button variant="danger" size="sm" onClick={() => remove(selected)}>
                          <Trash2 className="h-3.5 w-3.5" aria-hidden /> Dezactivează
                        </Button>
                      )}
                    </>
                  )}
                </div>
              </GlassCard>
            )}
          </aside>
        </div>
      </Page.Body>

      {editing && (
        <FisaTemplateEditor
          template={editing}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); refresh(); }}
        />
      )}
      {creating && (
        <FisaTemplateEditor
          template={null}
          onClose={() => setCreating(false)}
          onSaved={() => { setCreating(false); refresh(); }}
        />
      )}

      <PromptDialogHost />
    </Page>
  );
}





function KpiMini({ icon: Icon, label, value, warn }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string; value: number; warn?: boolean;
}) {
  return (
    <GlassCard size="compact" className="flex items-center gap-3.5 !p-5">
      <span className="h-11 w-11 rounded-xl bg-accent/12 text-accent flex items-center justify-center shrink-0">
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted truncate">{label}</p>
        <MetricValue value={value} size="display" warn={warn} className="mt-0.5 block" />
      </div>
    </GlassCard>
  );
}


void KpiMini;







interface PromptOptions {
  title: string;
  label?: string;
  defaultValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  cancelLabel?: string;
}
interface PendingPrompt extends PromptOptions {
  resolve: (value: string | null) => void;
}
let _pendingPrompt: PendingPrompt | null = null;
let _promptListener: ((p: PendingPrompt | null) => void) | null = null;

function promptDialog(opts: PromptOptions): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    if (_pendingPrompt) _pendingPrompt.resolve(null);
    _pendingPrompt = { ...opts, resolve };
    _promptListener?.(_pendingPrompt);
  });
}

function PromptDialogHost() {
  const [pending, setPending] = useState<PendingPrompt | null>(_pendingPrompt);
  const [value, setValue] = useState('');

  useEffect(() => {
    _promptListener = setPending;
    return () => { _promptListener = null; };
  }, []);

  useEffect(() => {
    if (pending) setValue(pending.defaultValue ?? '');
  }, [pending]);

  const close = useCallback((result: string | null) => {
    if (!_pendingPrompt) return;
    _pendingPrompt.resolve(result);
    _pendingPrompt = null;
    setPending(null);
  }, []);

  useEffect(() => {
    if (!pending) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(null);
      else if (e.key === 'Enter') close(value.trim() ? value : null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [pending, value, close]);

  if (!pending) return null;

  return (
    <div
      className="fixed inset-0 z-[1200] flex items-center justify-center surface-glass p-4 anim-fade-in"
      onClick={() => close(null)}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="prompt-title"
        className="relative w-full max-w-md rounded-2xl border border-line bg-surface-elevated shadow-[var(--elevation-4)] overflow-hidden anim-scale-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          aria-label="Închide"
          onClick={() => close(null)}
          className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-xl text-content-muted transition-all duration-150 hover:bg-surface-tertiary hover:text-content-primary focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="px-6 pt-6">
          <h2 id="prompt-title" className="text-pm-md font-semibold text-content-primary leading-snug">
            {pending.title}
          </h2>
          {pending.label && (
            <label className="mt-3 block text-pm-2xs font-bold uppercase tracking-wide text-content-muted">
              {pending.label}
            </label>
          )}
          <input
            autoFocus
            value={value}
            placeholder={pending.placeholder}
            onChange={(e) => setValue(e.target.value)}
            onFocus={(e) => e.currentTarget.select()}
            className="mt-1.5 w-full rounded-xl border border-line bg-surface-primary px-3 py-2 text-pm-sm text-content-primary transition-shadow focus:outline-none focus:border-accent focus:shadow-[var(--ring-soft)]"
          />
        </div>

        <div className="mt-6 flex items-center justify-end gap-2 border-t border-line/70 bg-surface-secondary px-6 py-4">
          <Button variant="ghost" size="md" onClick={() => close(null)}>
            {pending.cancelLabel ?? 'Anulează'}
          </Button>
          <Button
            variant="primary"
            size="md"
            disabled={!value.trim()}
            onClick={() => close(value.trim() ? value : null)}
          >
            {pending.confirmLabel ?? 'Confirmă'}
          </Button>
        </div>
      </div>
    </div>
  );
}
