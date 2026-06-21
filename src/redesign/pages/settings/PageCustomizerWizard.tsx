import { useState } from 'react';
import type { CSSProperties } from 'react';
import { X, ArrowLeft, ArrowRight, Check, RotateCcw, Search } from 'lucide-react';
import Segmented from '@/redesign/ui/Segmented';
import { usePageCustomizationStore, type PageCustom } from '@/store/pageCustomizationStore';

/* ── Target pages — ids MUST match App.tsx pathToPageId() output (workspace ids
 *    for tab routes, raw ids for standalone pages). Each override applies to the
 *    whole workspace the user navigates to. ── */
const WIZARD_PAGES: { id: string; label: string; hint: string }[] = [
  { id: 'dashboard',                    label: 'Tablou de bord',       hint: 'Pagina principală cu widgeturi' },
  { id: 'manager-control',              label: 'Control manager',      hint: 'Predări, anomalii, supraveghere' },
  { id: 'sales-workspace',              label: 'Vânzări',              hint: 'Sales hub, oferte, clienți' },
  { id: 'projects-contracts-workspace', label: 'Proiecte & Contracte', hint: 'Proiecte și contracte' },
  { id: 'engineering-workspace',        label: 'Inginerie',            hint: 'Fișe, arbore piese, biblioteci' },
  { id: 'production-workspace',         label: 'Producție',            hint: 'Stații, mentenanță, tichete' },
  { id: 'procurement-workspace',        label: 'Achiziții & Depozit',  hint: 'Materiale, furnizori, recepții' },
  { id: 'finance-workspace',            label: 'Financiar',            hint: 'Facturi, cheltuieli, rapoarte' },
  { id: 'personal-workspace',           label: 'Personal',             hint: 'Sarcini, calendar, deplasări' },
  { id: 'instrumente-workspace',        label: 'Instrumente',          hint: 'Chat, email, alerte, tutorial' },
  { id: 'sistem-workspace',             label: 'Sistem',               hint: 'Utilizatori, setări, sesiuni' },
];

/* ── Draft → inline preview style. For inherited (absent) fields we show the
 *    normal/default look, so the pane reads as "how this page's cards will be". ── */
function cardPreviewStyle(d: PageCustom): CSSProperties {
  const radius = ({ sharp: 0, normal: 14, rounded: 22 } as const)[d.cardRadius ?? 'normal'];
  const pad    = ({ tight: 10, normal: 20, loose: 26 } as const)[d.cardPadding ?? 'normal'];
  const minHeight = ({ auto: undefined, short: 72, tall: 140 } as const)[d.cardHeight ?? 'auto'];
  let boxShadow: string = ({ none: 'none', subtle: 'var(--elevation-1)', normal: 'var(--elevation-2)', dramatic: 'var(--elevation-3)' } as const)[d.cardShadow ?? 'normal'];
  let borderColor: string = ({ hidden: 'transparent', subtle: 'var(--color-border-subtle)', normal: 'var(--color-border)' } as const)[d.cardBorder ?? 'normal'];
  const style: CSSProperties = {
    borderRadius: radius, padding: pad, minHeight,
    borderWidth: 1, borderStyle: 'solid', borderColor, boxShadow,
    backgroundColor: 'var(--color-bg-primary)',
  };
  switch (d.cardBg ?? 'solid') {
    case 'transparent': style.backgroundColor = 'transparent'; break;
    case 'ghost':
      style.backgroundColor = 'transparent';
      style.borderColor = 'transparent';
      style.boxShadow = 'none';
      break;
    case 'glass':
      style.backgroundColor = 'color-mix(in srgb, var(--color-bg-elevated) 80%, transparent)';
      style.backdropFilter = 'saturate(160%) blur(20px)';
      (style as CSSProperties & { WebkitBackdropFilter?: string }).WebkitBackdropFilter = 'saturate(160%) blur(20px)';
      style.boxShadow = 'var(--elevation-2)';
      break;
  }
  return style;
}

const STEPS = ['Pagină', 'Formă card', 'Suprafață card', 'Layout pagină', 'Revizuire'] as const;
const INHERIT = '__inherit__';

/* A single labelled control with a leading "Global" (inherit) option. */
function OptRow<T extends string>({ label, hint, value, options, onChange }: {
  label: string;
  hint: string;
  value: T | undefined;
  options: readonly { id: T; label: string }[];
  onChange: (v: T | undefined) => void;
}) {
  return (
    <div className="border-t border-line/60 pt-4 first:border-t-0 first:pt-0">
      <p className="text-pm-sm font-semibold text-content-primary">{label}</p>
      <p className="mb-3 text-pm-xs text-content-muted">{hint}</p>
      <Segmented
        ariaLabel={label}
        value={(value ?? INHERIT) as string}
        onChange={(v) => onChange(v === INHERIT ? undefined : (v as T))}
        options={[{ id: INHERIT, label: 'Global' }, ...options] as { id: string; label: string }[]}
      />
    </div>
  );
}

const FIELD_LABELS: Record<keyof PageCustom, string> = {
  cardRadius: 'Colțuri', cardPadding: 'Spațiere', cardHeight: 'Înălțime card',
  cardShadow: 'Umbră', cardBorder: 'Borduri', cardBg: 'Fundal card',
  contentWidth: 'Lățime conținut', sectionGap: 'Spațiu secțiuni', heroMode: 'Antet pagină',
};

interface Props {
  initialPageId?: string;
  onClose: () => void;
}

export default function PageCustomizerWizard({ initialPageId, onClose }: Props) {
  const getPageCustom = usePageCustomizationStore((s) => s.getPageCustom);
  const setPageCustom = usePageCustomizationStore((s) => s.setPageCustom);
  const resetPage     = usePageCustomizationStore((s) => s.resetPage);

  const [step, setStep] = useState(0);
  const [query, setQuery] = useState('');
  const [targetPage, setTargetPage] = useState(
    initialPageId && WIZARD_PAGES.some((p) => p.id === initialPageId) ? initialPageId : 'dashboard',
  );
  const [draft, setDraft] = useState<PageCustom>(() => getPageCustom(targetPage));

  const patch = (p: Partial<PageCustom>) =>
    setDraft((d) => {
      const next = { ...d, ...p } as PageCustom;
      (Object.keys(next) as (keyof PageCustom)[]).forEach((k) => { if (next[k] == null) delete next[k]; });
      return next;
    });

  const onPickPage = (id: string) => { setTargetPage(id); setDraft(getPageCustom(id)); };
  const save  = () => { setPageCustom(targetPage, draft); onClose(); };
  const reset = () => { resetPage(targetPage); setDraft({}); };

  const targetLabel = WIZARD_PAGES.find((p) => p.id === targetPage)?.label ?? targetPage;
  const overrides = (Object.keys(draft) as (keyof PageCustom)[]).filter((k) => draft[k] != null);
  const filtered = WIZARD_PAGES.filter((p) => p.label.toLowerCase().includes(query.trim().toLowerCase()));

  const previewStyle = cardPreviewStyle(draft);
  const frameMaxW = draft.contentWidth === 'narrow' ? 220 : '100%';
  const frameGap  = draft.sectionGap === 'tight' ? 8 : draft.sectionGap === 'relaxed' ? 24 : 14;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 anim-fade-in">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-hidden />

      <div role="dialog" aria-modal="true" aria-label="Personalizare pe pagină"
        className="relative z-10 flex h-[min(88vh,720px)] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-line bg-surface-primary shadow-[var(--elevation-4)] anim-scale-in">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5 shrink-0">
          <div className="min-w-0">
            <h2 className="text-pm-md font-semibold text-content-primary leading-tight">Personalizare pe pagină</h2>
            <p className="text-pm-xs text-content-muted truncate">Aspectul cardurilor pentru: <span className="font-semibold text-content-secondary">{targetLabel}</span></p>
          </div>
          <button type="button" onClick={onClose} aria-label="Închide"
            className="shrink-0 h-8 w-8 grid place-items-center rounded-lg text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-smooth">
            <X className="h-[18px] w-[18px]" />
          </button>
        </div>

        {/* Step rail */}
        <div className="flex items-center gap-1 px-5 py-2.5 border-b border-line/60 shrink-0 overflow-x-auto">
          {STEPS.map((s, i) => (
            <button key={s} type="button" onClick={() => setStep(i)}
              className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-pm-2xs font-semibold whitespace-nowrap transition-smooth ${
                i === step ? 'bg-accent text-on-accent' : i < step ? 'text-accent hover:bg-accent/10' : 'text-content-muted hover:bg-surface-tertiary'
              }`}>
              <span className={`grid h-4 w-4 place-items-center rounded-full text-[9px] ${i === step ? 'bg-white/25' : 'bg-surface-tertiary'}`}>{i + 1}</span>
              {s}
            </button>
          ))}
        </div>

        {/* Body: controls (left) + preview (right) */}
        <div className="flex flex-1 min-h-0">
          <div className="flex-1 min-w-0 overflow-y-auto px-5 py-4">
            {step === 0 && (
              <div className="space-y-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-content-muted" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Caută pagina…"
                    className="w-full rounded-xl border border-line bg-surface-secondary pl-9 pr-3 py-2 text-pm-sm text-content-primary placeholder:text-content-muted focus-visible:outline-none focus-visible:border-accent" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {filtered.map((p) => {
                    const active = p.id === targetPage;
                    const customized = (getPageCustom(p.id) && Object.keys(getPageCustom(p.id)).length > 0);
                    return (
                      <button key={p.id} type="button" onClick={() => onPickPage(p.id)}
                        className={`relative text-left rounded-xl border p-3 transition-smooth ${
                          active ? 'border-accent bg-accent/8 shadow-[0_0_0_1px_var(--color-accent)]' : 'border-line bg-surface-primary hover:border-content-muted/40'
                        }`}>
                        <p className="text-pm-sm font-semibold text-content-primary leading-tight">{p.label}</p>
                        <p className="text-pm-2xs text-content-muted mt-0.5 truncate">{p.hint}</p>
                        {customized && <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-accent" title="Personalizat" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 1 && (
              <div className="space-y-4">
                <OptRow label="Colțuri card" hint="Rotunjirea colțurilor cardurilor de pe această pagină."
                  value={draft.cardRadius} onChange={(v) => patch({ cardRadius: v })}
                  options={[{ id: 'sharp', label: 'Drepte' }, { id: 'normal', label: 'Normale' }, { id: 'rounded', label: 'Rotunde' }]} />
                <OptRow label="Spațiere card" hint="Spațiul interior (padding) din carduri."
                  value={draft.cardPadding} onChange={(v) => patch({ cardPadding: v })}
                  options={[{ id: 'tight', label: 'Strânsă' }, { id: 'normal', label: 'Normală' }, { id: 'loose', label: 'Lejeră' }]} />
                <OptRow label="Înălțime card" hint="Înălțimea minimă a cardurilor (lungimea lor)."
                  value={draft.cardHeight} onChange={(v) => patch({ cardHeight: v })}
                  options={[{ id: 'short', label: 'Scund' }, { id: 'auto', label: 'Auto' }, { id: 'tall', label: 'Înalt' }]} />
              </div>
            )}

            {step === 2 && (
              <div className="space-y-4">
                <OptRow label="Umbră card" hint="Intensitatea umbrei sub carduri."
                  value={draft.cardShadow} onChange={(v) => patch({ cardShadow: v })}
                  options={[{ id: 'none', label: 'Fără' }, { id: 'subtle', label: 'Subtilă' }, { id: 'normal', label: 'Normală' }, { id: 'dramatic', label: 'Pronunțată' }]} />
                <OptRow label="Borduri card" hint="Vizibilitatea liniei de contur."
                  value={draft.cardBorder} onChange={(v) => patch({ cardBorder: v })}
                  options={[{ id: 'hidden', label: 'Ascunse' }, { id: 'subtle', label: 'Subtile' }, { id: 'normal', label: 'Normale' }]} />
                <OptRow label="Fundal card" hint="Transparența și efectul de sticlă."
                  value={draft.cardBg} onChange={(v) => patch({ cardBg: v })}
                  options={[{ id: 'solid', label: 'Solid' }, { id: 'transparent', label: 'Transparent' }, { id: 'ghost', label: 'Invizibil' }, { id: 'glass', label: 'Sticlă' }]} />
              </div>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <OptRow label="Lățime conținut" hint="Lățimea maximă a coloanei de conținut."
                  value={draft.contentWidth} onChange={(v) => patch({ contentWidth: v })}
                  options={[{ id: 'narrow', label: 'Îngustă' }, { id: 'normal', label: 'Normală' }, { id: 'full', label: 'Toată' }]} />
                <OptRow label="Spațiu între secțiuni" hint="Distanța verticală dintre carduri."
                  value={draft.sectionGap} onChange={(v) => patch({ sectionGap: v })}
                  options={[{ id: 'tight', label: 'Strâns' }, { id: 'normal', label: 'Normal' }, { id: 'relaxed', label: 'Aerisit' }]} />
                <OptRow label="Antet pagină" hint="Titlul mare din capul paginii."
                  value={draft.heroMode} onChange={(v) => patch({ heroMode: v })}
                  options={[{ id: 'full', label: 'Complet' }, { id: 'compact', label: 'Compact' }, { id: 'hidden', label: 'Ascuns' }]} />
              </div>
            )}

            {step === 4 && (
              <div className="space-y-3">
                <p className="text-pm-sm font-semibold text-content-primary">Sumar pentru {targetLabel}</p>
                {overrides.length === 0 ? (
                  <p className="text-pm-xs text-content-muted">Nicio modificare — pagina folosește presetul global.</p>
                ) : (
                  <ul className="space-y-1.5">
                    {overrides.map((k) => (
                      <li key={k} className="flex items-center justify-between gap-3 rounded-lg bg-surface-secondary px-3 py-2 text-pm-xs">
                        <span className="text-content-muted">{FIELD_LABELS[k]}</span>
                        <span className="font-semibold text-content-primary">{String(draft[k])}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <button type="button" onClick={reset}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-pm-xs font-semibold text-content-secondary hover:bg-surface-tertiary transition-smooth">
                  <RotateCcw className="h-3.5 w-3.5" /> Resetează pagina la global
                </button>
                <p className="text-pm-2xs text-content-muted/70 pt-1">
                  Poziționarea cardurilor (mutare / redimensionare / ascundere) se face direct pe pagină, cu butonul „Editează”.
                </p>
              </div>
            )}
          </div>

          {/* Preview pane */}
          <div className="hidden md:flex w-[44%] max-w-[400px] shrink-0 flex-col border-l border-line bg-surface-page/60 p-4 overflow-y-auto">
            <p className="text-pm-2xs font-bold uppercase tracking-widest text-content-muted mb-3">Previzualizare</p>
            <div className="mx-auto w-full" style={{ maxWidth: frameMaxW }}>
              <div className="flex flex-col" style={{ gap: frameGap }}>
                {draft.heroMode !== 'hidden' && (
                  <div className="flex items-center gap-2.5">
                    {draft.heroMode !== 'compact' && <span className="h-9 w-9 rounded-xl bg-accent-muted shrink-0" />}
                    <div className="min-w-0">
                      <div className={`rounded bg-content-primary/80 ${draft.heroMode === 'compact' ? 'h-2.5 w-24' : 'h-3.5 w-32'}`} />
                      {draft.heroMode !== 'compact' && <div className="mt-1.5 h-2 w-20 rounded bg-content-muted/40" />}
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-3 gap-2">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="pm-card pm-card-pad flex flex-col justify-between" style={previewStyle}>
                      <div className="h-1.5 w-10 rounded bg-content-muted/40" />
                      <div className="mt-2 h-4 w-12 rounded bg-content-primary/70" />
                    </div>
                  ))}
                </div>
                <div className="pm-card pm-card-pad" style={previewStyle}>
                  <div className="h-2.5 w-28 rounded bg-content-primary/70" />
                  <div className="mt-2.5 space-y-1.5">
                    <div className="h-1.5 w-full rounded bg-content-muted/25" />
                    <div className="h-1.5 w-4/5 rounded bg-content-muted/25" />
                    <div className="h-1.5 w-2/3 rounded bg-content-muted/25" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 shrink-0">
          <button type="button" onClick={onClose}
            className="rounded-lg px-3.5 py-2 text-pm-sm font-semibold text-content-muted hover:text-content-primary transition-smooth">
            Anulează
          </button>
          <div className="flex items-center gap-2">
            {step > 0 && (
              <button type="button" onClick={() => setStep((s) => s - 1)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3.5 py-2 text-pm-sm font-semibold text-content-secondary hover:bg-surface-tertiary transition-smooth">
                <ArrowLeft className="h-4 w-4" /> Înapoi
              </button>
            )}
            {step < STEPS.length - 1 ? (
              <button type="button" onClick={() => setStep((s) => s + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-pm-sm font-semibold text-on-accent hover:brightness-110 transition-smooth">
                Continuă <ArrowRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button" onClick={save}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-pm-sm font-semibold text-on-accent hover:brightness-110 transition-smooth">
                <Check className="h-4 w-4" /> Salvează pentru {targetLabel}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
