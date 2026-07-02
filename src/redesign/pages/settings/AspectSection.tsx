import { useState, type ReactNode } from 'react';
import {
  Sun, Moon, Palette, RotateCcw, ChevronDown, LayoutGrid, Type, PanelTop,
} from '@/icons';
import { useAccentStore } from '@/store/accentStore';
import { useLayoutStore } from '@/store/layoutStore';
import { useMotionStore } from '@/store/motionStore';
import { useTextScaleStore } from '@/store/textScaleStore';
import { useCardTransparencyStore } from '@/store/cardTransparencyStore';
import { useNavSyncStore } from '@/store/navSyncStore';
import { useShellLayoutStore } from '@/store/shellLayoutStore';
import { useLayoutModeStore } from '@/store/layoutModeStore';
import Segmented from '@/redesign/ui/Segmented';
import LayoutPresetPicker from './LayoutPresetPicker';
import PageCustomizerWizard from './PageCustomizerWizard';

const ACCENT_PRESETS = ['#2D5BE3', '#6D28D9', '#0E7490', '#0D9488', '#107E3E', '#E9730C', '#E11D48', '#DB2777'];

type AspectTab = 'tema' | 'citibilitate' | 'layout';

const ASPECT_TABS: { id: AspectTab; label: string; Icon: typeof Sun }[] = [
  { id: 'tema', label: 'Temă & culori', Icon: Sun },
  { id: 'citibilitate', label: 'Citibilitate', Icon: Type },
  { id: 'layout', label: 'Layout & shell', Icon: PanelTop },
];

function SettingPanel({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-surface-secondary/30 p-4">
      <p className="text-pm-sm font-semibold text-content-primary">{title}</p>
      {description && <p className="mt-1 mb-3 text-pm-xs text-content-muted">{description}</p>}
      {!description && <div className="mb-3" />}
      {children}
    </div>
  );
}

function SettingField({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div>
      <p className="text-pm-sm font-semibold text-content-primary">{label}</p>
      {hint && <p className="mb-3 mt-1 text-pm-xs text-content-muted">{hint}</p>}
      {children}
    </div>
  );
}

function CollapsiblePanel({
  title,
  description,
  defaultOpen = false,
  children,
}: {
  title: string;
  description?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-xl border border-line bg-surface-secondary/30 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-smooth hover:bg-surface-tertiary/40 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
      >
        <div className="min-w-0 flex-1">
          <p className="text-pm-sm font-semibold text-content-primary">{title}</p>
          {description && <p className="mt-0.5 text-pm-xs text-content-muted">{description}</p>}
        </div>
        <ChevronDown className={`h-4 w-4 shrink-0 text-content-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && <div className="space-y-5 border-t border-line/60 px-4 py-4">{children}</div>}
    </div>
  );
}

function PageStylePreview({ mode }: { mode: 'tiled' | 'flat' }) {
  if (mode === 'flat') {
    return (
      <div className="mt-3 rounded-lg border border-line/80 bg-surface-primary p-2">
        <div className="h-1.5 w-1/3 rounded bg-content-primary/20" />
        <div className="mt-2 h-1 w-full rounded bg-line" />
        <div className="mt-1 h-1 w-5/6 rounded bg-line" />
        <div className="mt-1 h-1 w-4/6 rounded bg-line" />
        <div className="my-2 h-px bg-line" />
        <div className="h-1 w-2/3 rounded bg-content-primary/15" />
        <div className="mt-1 h-1 w-full rounded bg-line" />
      </div>
    );
  }
  return (
    <div className="mt-3 space-y-1.5">
      {[0, 1].map(i => (
        <div key={i} className="rounded-lg border border-line bg-surface-primary p-2 shadow-sm">
          <div className="h-1.5 w-1/4 rounded bg-content-primary/25" />
          <div className="mt-1.5 h-1 w-full rounded bg-line" />
          <div className="mt-1 h-1 w-3/4 rounded bg-line" />
        </div>
      ))}
    </div>
  );
}

function ThemePreview({ theme }: { theme: 'light' | 'dark' }) {
  const isDark = theme === 'dark';
  return (
    <div
      className={`mt-3 overflow-hidden rounded-lg border ${isDark ? 'border-white/10' : 'border-line'}`}
      aria-hidden
    >
      <div className={`h-2 ${isDark ? 'bg-[#1A1B1D]' : 'bg-[#E8E8EC]'}`} />
      <div className={`p-2 ${isDark ? 'bg-canvas-void' : 'bg-surface-primary'}`}>
        <div className={`mb-1.5 h-1.5 w-1/2 rounded ${isDark ? 'bg-surface-primary/30' : 'bg-content-primary/25'}`} />
        <div className={`h-6 rounded ${isDark ? 'bg-surface-primary/8' : 'bg-surface-secondary'}`} />
      </div>
    </div>
  );
}

export default function AspectSection({
  currentTheme,
  onThemeChange,
}: {
  currentTheme: 'light' | 'dark';
  onThemeChange: (t: 'light' | 'dark') => void;
}) {
  const [tab, setTab] = useState<AspectTab>('tema');
  const [wizardOpen, setWizardOpen] = useState(false);

  const accent = useAccentStore(s => s.accent);
  const setAccent = useAccentStore(s => s.setAccent);
  const density = useLayoutStore(s => s.density);
  const setDensity = useLayoutStore(s => s.setDensity);
  const motion = useMotionStore(s => s.motion);
  const setMotion = useMotionStore(s => s.setMotion);
  const scale = useTextScaleStore(s => s.scale);
  const setScale = useTextScaleStore(s => s.setScale);
  const cardTransparency = useCardTransparencyStore(s => s.cardTransparency);
  const setCardTransparency = useCardTransparencyStore(s => s.setCardTransparency);
  const navSync = useNavSyncStore(s => s.navSync);
  const setNavSync = useNavSyncStore(s => s.setNavSync);
  const shellLayout = useShellLayoutStore(s => s.layout);
  const setShellLayout = useShellLayoutStore(s => s.setLayout);
  const layoutMode = useLayoutModeStore(s => s.layoutMode);
  const setLayoutMode = useLayoutModeStore(s => s.setLayoutMode);

  const themes = [
    { id: 'light' as const, label: 'Luminos', hint: 'Canvas alb, contrast aerisit', Icon: Sun },
    { id: 'dark' as const, label: 'Întunecat', hint: 'Industrial, coerent cu shell-ul', Icon: Moon },
  ];

  return (
    <div className="space-y-5">
      <Segmented
        ariaLabel="Categorii aspect"
        value={tab}
        onChange={v => setTab(v as AspectTab)}
        options={ASPECT_TABS.map(t => ({ id: t.id, label: t.label }))}
      />

      {tab === 'tema' && (
        <div className="space-y-4 anim-fade-slide-in">
          <SettingPanel title="Temă" description="Fundalul general al aplicației — luminos sau întunecat.">
            <div className="grid grid-cols-2 gap-3">
              {themes.map(t => {
                const active = currentTheme === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onThemeChange(t.id)}
                    className={`relative rounded-xl border-2 p-4 text-left transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                      active
                        ? 'border-accent bg-accent/5'
                        : 'border-line bg-surface-primary hover:border-accent/40 hover:bg-surface-tertiary/40'
                    }`}
                  >
                    <div className="mb-1 flex items-center gap-2">
                      <t.Icon className={`h-4 w-4 ${active ? 'text-accent' : 'text-content-muted'}`} />
                      <span className="text-pm-sm font-semibold text-content-primary">{t.label}</span>
                    </div>
                    <p className="text-pm-2xs text-content-muted">{t.hint}</p>
                    <ThemePreview theme={t.id} />
                    {active && (
                      <span className="absolute right-3 top-3 h-2.5 w-2.5 rounded-full bg-accent anim-scale-in" />
                    )}
                  </button>
                );
              })}
            </div>
          </SettingPanel>

          <SettingPanel
            title="Culoare accent"
            description="Butoane, linkuri și stări active — se aplică în ambele teme."
          >
            <div className="flex flex-wrap items-center gap-2.5">
              {ACCENT_PRESETS.map(c => {
                const active = (accent ?? '').toLowerCase() === c.toLowerCase();
                return (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setAccent(c)}
                    aria-label={`Accent ${c}`}
                    title={c}
                    style={{ backgroundColor: c }}
                    className={`h-7 w-7 rounded-full ring-2 ring-offset-2 ring-offset-surface-primary transition-smooth duration-150 focus-visible:outline-none ${
                      active ? 'scale-110 ring-content-primary' : 'ring-transparent hover:scale-110'
                    }`}
                  />
                );
              })}
              <label
                title="Culoare personalizată"
                className="relative grid h-7 w-7 cursor-pointer place-items-center overflow-hidden rounded-full border border-line bg-surface-secondary transition-smooth duration-150 hover:border-accent/50"
              >
                <Palette className="h-3.5 w-3.5 text-content-muted" />
                <input
                  type="color"
                  value={accent ?? '#2D5BE3'}
                  onChange={e => setAccent(e.target.value)}
                  aria-label="Culoare accent personalizată"
                  className="absolute inset-0 cursor-pointer opacity-0"
                />
              </label>
              {accent && (
                <button
                  type="button"
                  onClick={() => setAccent(null)}
                  className="ml-1 inline-flex h-7 items-center gap-1.5 rounded-full border border-line px-3 text-pm-xs font-medium text-content-secondary transition-smooth duration-150 hover:bg-surface-tertiary/50 active:scale-[0.98]"
                >
                  <RotateCcw className="h-3 w-3" /> Implicit
                </button>
              )}
            </div>
          </SettingPanel>

          <SettingPanel
            title="Stil pagini"
            description="Cum sunt afișate secțiunile pe toate paginile — carduri separate sau listă continuă."
          >
            <div className="grid grid-cols-2 gap-3">
              {([
                { id: 'tiled' as const, label: 'Carduri separate', hint: 'Chenare și umbre discrete' },
                { id: 'flat' as const, label: 'Listă continuă', hint: 'Dens, fără chenare — plat' },
              ]).map(opt => {
                const active = layoutMode === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setLayoutMode(opt.id)}
                    className={`rounded-xl border-2 p-3 text-left transition-smooth duration-150 active:scale-[0.99] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                      active
                        ? 'border-accent bg-accent/5'
                        : 'border-line bg-surface-primary hover:border-accent/40'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <LayoutGrid className={`h-4 w-4 ${active ? 'text-accent' : 'text-content-muted'}`} />
                      <span className="text-pm-sm font-semibold text-content-primary">{opt.label}</span>
                    </div>
                    <p className="mt-0.5 text-pm-2xs text-content-muted">{opt.hint}</p>
                    <PageStylePreview mode={opt.id} />
                  </button>
                );
              })}
            </div>
          </SettingPanel>
        </div>
      )}

      {tab === 'citibilitate' && (
        <div className="space-y-4 anim-fade-slide-in">
          <SettingPanel title="Densitate & text" description="Cât de compact apare conținutul și mărimea textului.">
            <div className="space-y-5">
              <SettingField label="Densitate" hint="Tabele, navigare și spațiere generală.">
                <Segmented
                  ariaLabel="Densitate"
                  value={density}
                  onChange={setDensity}
                  options={[
                    { id: 'comfortable', label: 'Confortabil' },
                    { id: 'compact', label: 'Compact' },
                    { id: 'dense', label: 'Dens' },
                  ]}
                />
              </SettingField>
              <SettingField label="Scală text" hint="Mărimea textului și a întregii interfețe.">
                <Segmented
                  ariaLabel="Scală text"
                  value={scale}
                  onChange={setScale}
                  options={[{ id: 'small', label: 'Mic' }, { id: 'normal', label: 'Normal' }, { id: 'large', label: 'Mare' }]}
                />
              </SettingField>
            </div>
          </SettingPanel>

          <SettingPanel title="Animații & suprafețe" description="Tranziții, fundal carduri și bara de navigare.">
            <div className="space-y-5">
              <SettingField label="Animații" hint="Reduce tranzițiile de pagină și animațiile din interfață.">
                <Segmented
                  ariaLabel="Animații"
                  value={motion}
                  onChange={setMotion}
                  options={[{ id: 'full', label: 'Activate' }, { id: 'reduced', label: 'Reduse' }]}
                />
              </SettingField>
              <SettingField label="Fundal carduri" hint="Util când ai un wallpaper cu accent vizibil.">
                <Segmented
                  ariaLabel="Fundal carduri"
                  value={cardTransparency}
                  onChange={setCardTransparency}
                  options={[
                    { id: 'default', label: 'Normal' },
                    { id: 'transparent', label: 'Transparent' },
                    { id: 'ghost', label: 'Invizibil' },
                  ]}
                />
              </SettingField>
              <SettingField label="Culoare bară navigare" hint="Sincronizează bara de workspace cu bara de titlu închisă.">
                <Segmented
                  ariaLabel="Culoare bară navigare"
                  value={navSync}
                  onChange={setNavSync}
                  options={[{ id: 'off', label: 'Luminoasă' }, { id: 'on', label: 'Sincronizată' }]}
                />
              </SettingField>
            </div>
          </SettingPanel>
        </div>
      )}

      {tab === 'layout' && (
        <div className="space-y-4 anim-fade-slide-in">
          <SettingPanel title="Preset layout" description="Alege un stil rapid sau personalizează manual mai jos.">
            <LayoutPresetPicker />
            {shellLayout.layoutPreset === 'custom' && (
              <p className="mt-3 text-center text-pm-2xs italic text-content-muted/60">— preset personalizat —</p>
            )}
          </SettingPanel>

          <div className="flex items-center justify-between gap-3 rounded-xl border border-line bg-surface-secondary/60 p-3">
            <div className="min-w-0">
              <p className="text-pm-sm font-semibold text-content-primary">Personalizare pe pagină</p>
              <p className="text-pm-xs text-content-muted">Reglează separat aspectul cardurilor pentru fiecare pagină.</p>
            </div>
            <button
              type="button"
              onClick={() => setWizardOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-accent px-3.5 py-2 text-pm-sm font-semibold text-on-accent transition-smooth hover:brightness-110 active:scale-[0.98]"
            >
              <Palette className="h-4 w-4" /> Deschide
            </button>
          </div>
          {wizardOpen && <PageCustomizerWizard onClose={() => setWizardOpen(false)} />}

          <CollapsiblePanel
            title="Structură aplicație"
            description="Bară titlu, antet pagină, notificări și spațiere între secțiuni."
            defaultOpen
          >
            <SettingField label="Antet pagină & acțiuni" hint="Clasic = titlu, tab-uri și butoane pe pagină. În bară = controalele urcă în bara de sus.">
              <Segmented
                ariaLabel="Antet pagină și acțiuni"
                value={shellLayout.pageHeader}
                onChange={v => setShellLayout({ pageHeader: v as 'navbar' | 'classic' })}
                options={[{ id: 'navbar', label: 'În bară (sus)' }, { id: 'classic', label: 'Clasic (pe pagină)' }]}
              />
            </SettingField>
            <SettingField label="Bară titlu" hint="Logo, căutare, avatar — poți reveni aici dacă o ascunzi.">
              <Segmented
                ariaLabel="Bară titlu"
                value={shellLayout.titlebar}
                onChange={v => setShellLayout({ titlebar: v as 'on' | 'off' })}
                options={[{ id: 'on', label: 'Vizibilă' }, { id: 'off', label: 'Ascunsă' }]}
              />
            </SettingField>
            <SettingField label="Bară de stare" hint="Rândul de jos cu ceas, utilizator și status conexiune.">
              <Segmented
                ariaLabel="Bară de stare"
                value={shellLayout.statusBar}
                onChange={v => setShellLayout({ statusBar: v as 'on' | 'off' })}
                options={[{ id: 'on', label: 'Vizibilă' }, { id: 'off', label: 'Ascunsă' }]}
              />
            </SettingField>
            <SettingField label="Poziție notificări" hint="Unde apar mesajele pop-up (toast) pe ecran.">
              <Segmented
                ariaLabel="Poziție notificări toast"
                value={shellLayout.toastPos}
                onChange={v => setShellLayout({ toastPos: v as 'bottom-right' | 'top-right' | 'bottom-center' })}
                options={[
                  { id: 'bottom-right', label: 'Jos·dreapta' },
                  { id: 'top-right', label: 'Sus·dreapta' },
                  { id: 'bottom-center', label: 'Jos·centru' },
                ]}
              />
            </SettingField>
            <SettingField label="Spațiu între secțiuni" hint="Distanța verticală dintre cardurile dintr-o pagină.">
              <Segmented
                ariaLabel="Spațiu între secțiuni"
                value={shellLayout.sectionGap}
                onChange={v => setShellLayout({ sectionGap: v as 'tight' | 'normal' | 'relaxed' })}
                options={[{ id: 'tight', label: 'Strâns' }, { id: 'normal', label: 'Normal' }, { id: 'relaxed', label: 'Aerisit' }]}
              />
            </SettingField>
          </CollapsiblePanel>

          <CollapsiblePanel
            title="Detalii carduri"
            description="Umbre, borduri, lățime conținut, colțuri și padding."
          >
            <SettingField label="Umbra carduri" hint="Intensitatea umbrei sub carduri și panouri.">
              <Segmented
                ariaLabel="Umbra carduri"
                value={shellLayout.cardShadow}
                onChange={v => setShellLayout({ cardShadow: v as 'none' | 'subtle' | 'normal' | 'dramatic' })}
                options={[
                  { id: 'none', label: 'Fără' },
                  { id: 'subtle', label: 'Subtilă' },
                  { id: 'normal', label: 'Normală' },
                  { id: 'dramatic', label: 'Pronunțată' },
                ]}
              />
            </SettingField>
            <SettingField label="Borduri" hint="Vizibilitatea liniilor de separare dintre suprafețe.">
              <Segmented
                ariaLabel="Borduri"
                value={shellLayout.borderVis}
                onChange={v => setShellLayout({ borderVis: v as 'hidden' | 'subtle' | 'normal' })}
                options={[{ id: 'hidden', label: 'Ascunse' }, { id: 'subtle', label: 'Subtile' }, { id: 'normal', label: 'Normale' }]}
              />
            </SettingField>
            <SettingField label="Lățime conținut" hint="Lățimea maximă a coloanei de conținut pe ecrane mari.">
              <Segmented
                ariaLabel="Lățime conținut"
                value={shellLayout.contentWidth}
                onChange={v => setShellLayout({ contentWidth: v as 'narrow' | 'normal' | 'full' })}
                options={[{ id: 'narrow', label: 'Îngustă' }, { id: 'normal', label: 'Normală' }, { id: 'full', label: 'Toată' }]}
              />
            </SettingField>
            <SettingField label="Colțuri carduri" hint="Rotunjirea colțurilor pentru toate cardurile și panourile.">
              <Segmented
                ariaLabel="Colțuri carduri"
                value={shellLayout.cardRadius}
                onChange={v => setShellLayout({ cardRadius: v as 'sharp' | 'normal' | 'rounded' })}
                options={[{ id: 'sharp', label: 'Drepte' }, { id: 'normal', label: 'Normale' }, { id: 'rounded', label: 'Rotunde' }]}
              />
            </SettingField>
            <SettingField label="Spațiere carduri" hint="Spațiul interior (padding) din cardurile cu conținut.">
              <Segmented
                ariaLabel="Spațiere carduri"
                value={shellLayout.cardPadding}
                onChange={v => setShellLayout({ cardPadding: v as 'tight' | 'normal' | 'loose' })}
                options={[{ id: 'tight', label: 'Strânsă' }, { id: 'normal', label: 'Normală' }, { id: 'loose', label: 'Lejeră' }]}
              />
            </SettingField>
          </CollapsiblePanel>
        </div>
      )}
    </div>
  );
}
