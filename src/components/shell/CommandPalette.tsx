import { useState, useRef, useEffect, useMemo, useCallback, useLayoutEffect } from 'react';
import type { CSSProperties, RefObject } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, X, Loader2, Clock, Zap, Files, Trash2,
} from '@/icons';
import { apiCommand } from '@/api/commands';
import { formatKeys } from '@/hooks/useKeyboardShortcuts';
import { type SearchHit, type SearchResult, TYPE_META } from './search-types';
import {
  PALETTE_PAGES, PALETTE_ACTIONS, normalizeText,
  type PaletteIcon,
} from './palette-data';

interface CommandPaletteProps {
  open: boolean;
  onClose: () => void;

  onSearchNavigate?: (hit: SearchHit) => void;

  onNavigatePage?: (pageId: string) => void;

  onOpenShortcuts?: () => void;
  query?: string;
  onQueryChange?: (value: string) => void;
  anchorRef?: RefObject<HTMLElement | null>;
  showInput?: boolean;
}

const RECENTS_KEY = 'promix_palette_recents';
const MAX_RECENTS = 10;


interface PaletteRecent {
  kind: 'page' | 'action' | 'hit';
  id: string;
  title: string;
  subtitle?: string;
  hit?: SearchHit;
}


interface Row {
  uid: string;
  group: string;
  icon: PaletteIcon;
  iconColor: string;
  title: string;
  subtitle?: string;
  shortcut?: string;
  recent: PaletteRecent;
  activate: () => void;
}


const GROUP_META: Record<string, { icon: PaletteIcon; color: string }> = {
  'Recente':   { icon: Clock, color: 'text-content-muted' },
  'Acțiuni':   { icon: Zap,   color: 'text-accent' },
  'Pagini':    { icon: Files, color: 'text-status-blue' },
  'Parteneri': { icon: TYPE_META.client.icon,   color: TYPE_META.client.color },
  'Articole':  { icon: TYPE_META.material.icon, color: TYPE_META.material.color },
  'Proiecte':  { icon: TYPE_META.project.icon,  color: TYPE_META.project.color },
  'Documente': { icon: TYPE_META.document.icon, color: TYPE_META.document.color },
  'Stații':    { icon: TYPE_META.station.icon,  color: TYPE_META.station.color },
  'Piese':     { icon: TYPE_META.piece.icon,    color: TYPE_META.piece.color },
};


const HIT_GROUP: Record<SearchHit['type'], string> = {
  client: 'Parteneri',
  material: 'Articole',
  project: 'Proiecte',
  document: 'Documente',
  station: 'Stații',
  piece: 'Piese',
};

/** A few pages carry a global navigation chord — surfaced as a hint pill. */
const PAGE_SHORTCUT: Record<string, string> = {
  dashboard: 'g d',
  projects: 'g r',
  tasks: 'g p',
  'sales-hub': 'g v',
  finance: 'g f',
};

function scoreMatch(field: string, query: string): number {
  if (!field || !query) return 0;
  if (field === query) return 420;
  if (field.startsWith(query)) return 320;

  const tokenPrefix = field.split(/\s+/).some((token) => token.startsWith(query));
  if (tokenPrefix) return 260;

  const idx = field.indexOf(query);
  if (idx === -1) return 0;
  return Math.max(140, 210 - Math.min(idx, 70));
}

function readRecents(): PaletteRecent[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function CommandPalette({
  open,
  onClose,
  onSearchNavigate,
  onNavigatePage,
  onOpenShortcuts,
  query,
  onQueryChange,
  anchorRef,
  showInput = true,
}: CommandPaletteProps) {
  const [internalQuery, setInternalQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [recents, setRecents] = useState<PaletteRecent[]>([]);
  const [panelStyle, setPanelStyle] = useState<CSSProperties>({});
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const queryValue = query ?? internalQuery;
  const setQueryValue = useCallback((value: string) => {
    if (query === undefined) setInternalQuery(value);
    onQueryChange?.(value);
  }, [onQueryChange, query]);

  const updatePanelPosition = useCallback(() => {
    const anchor = anchorRef?.current
      ?? Array.from(document.querySelectorAll<HTMLElement>('[data-global-search-anchor="true"]')).find((el) => {
        const rect = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
      });
    const gutter = 12;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (viewportWidth < 640) {
      const rect = anchor?.getBoundingClientRect();
      setPanelStyle({
        left: gutter,
        top: rect ? Math.max(rect.top - 2, gutter) : gutter,
        width: `calc(100vw - ${gutter * 2}px)`,
        maxHeight: rect ? viewportHeight - Math.max(rect.top - 2, gutter) - gutter : undefined,
      });
      return;
    }

    if (!anchor) {
      const width = Math.min(600, viewportWidth - gutter * 2);
      setPanelStyle({
        left: Math.max((viewportWidth - width) / 2, gutter),
        top: 46,
        width,
      });
      return;
    }

    const rect = anchor.getBoundingClientRect();
    const preferredWidth = showInput ? (rect.width < 160 ? 360 : rect.width) : rect.width;
    const width = Math.min(preferredWidth, viewportWidth - gutter * 2);
    const left = Math.min(Math.max(rect.left, gutter), viewportWidth - width - gutter);
    const top = Math.max(rect.bottom + (showInput ? 6 : 2), gutter);

    setPanelStyle({
      left,
      top,
      width,
      maxHeight: viewportHeight - top - gutter,
      transformOrigin: `${Math.max(12, rect.width * 0.14)}px top`,
    });
  }, [anchorRef, showInput]);

  useEffect(() => {
    if (!open) return undefined;

    setActiveIdx(0);
    setRecents(readRecents());

    if (showInput && query === undefined) {
      setInternalQuery('');
      setResult(null);
    } else if (!(query ?? '').trim()) {
      setResult(null);
    }

    if (showInput) {
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
    return undefined;
  }, [open, query, showInput]);

  useLayoutEffect(() => {
    if (!open) return;

    updatePanelPosition();
    window.addEventListener('resize', updatePanelPosition);
    window.addEventListener('scroll', updatePanelPosition, true);

    return () => {
      window.removeEventListener('resize', updatePanelPosition);
      window.removeEventListener('scroll', updatePanelPosition, true);
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    const q = queryValue.trim();
    if (!q) { setResult(null); setLoading(false); return; }
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await apiCommand<SearchResult>('global_search', { query: q, limit: 8 });
        setResult(data);
      } catch {
        setResult(null);
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => clearTimeout(t);
  }, [queryValue]);

  useEffect(() => {
    setActiveIdx(0);
  }, [queryValue]);

  useEffect(() => {
    if (!open || showInput) return;

    const onOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (!target) return;
      if (panelRef.current?.contains(target)) return;
      if (anchorRef?.current?.contains(target)) return;
      onClose();
    };

    document.addEventListener('pointerdown', onOutsidePointerDown);
    return () => document.removeEventListener('pointerdown', onOutsidePointerDown);
  }, [anchorRef, onClose, open, showInput]);

  const persistRecent = useCallback((rec: PaletteRecent) => {
    try {
      const list = readRecents();
      const next = [rec, ...list.filter((r) => !(r.kind === rec.kind && r.id === rec.id))].slice(0, MAX_RECENTS);
      localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {  }
  }, []);

  const run = useCallback((row: Row) => {
    persistRecent(row.recent);
    row.activate();
    onClose();
  }, [persistRecent, onClose]);

  
  const activateFor = useCallback((rec: PaletteRecent): (() => void) => {
    if (rec.kind === 'hit' && rec.hit) {
      const h = rec.hit;
      return () => onSearchNavigate?.(h);
    }
    if (rec.kind === 'action') {
      const a = PALETTE_ACTIONS.find((x) => x.id === rec.id);
      if (a?.command === 'shortcuts') return () => onOpenShortcuts?.();
      if (a?.page) return () => onNavigatePage?.(a.page!);
      return () => {};
    }
    
    return () => onNavigatePage?.(rec.id);
  }, [onSearchNavigate, onNavigatePage, onOpenShortcuts]);

  
  const { sections, rows } = useMemo(() => {
    const q = normalizeText(queryValue.trim());
    const out: { group: string; rows: Row[] }[] = [];
    const recentRank = new Map<string, number>();
    recents.forEach((rec, idx) => {
      recentRank.set(`${rec.kind}:${rec.id}`, Math.max(6, 60 - idx * 6));
    });
    const recentBoost = (kind: PaletteRecent['kind'], id: string) => recentRank.get(`${kind}:${id}`) ?? 0;

    if (!q) {
      
      if (recents.length) {
        out.push({
          group: 'Recente',
          rows: recents.map((rec, i) => {
            const meta = rec.kind === 'hit' && rec.hit ? TYPE_META[rec.hit.type] : null;
            const page = rec.kind === 'page' ? PALETTE_PAGES.find((p) => p.id === rec.id) : null;
            const action = rec.kind === 'action' ? PALETTE_ACTIONS.find((a) => a.id === rec.id) : null;
            const icon = meta?.icon ?? page?.icon ?? action?.icon ?? Clock;
            const iconColor = meta?.color ?? (rec.kind === 'action' ? 'text-accent' : 'text-status-blue');
            return {
              uid: `recent-${rec.kind}-${rec.id}-${i}`,
              group: 'Recente', icon, iconColor,
              title: rec.title, subtitle: rec.subtitle,
              shortcut: rec.kind === 'page' ? PAGE_SHORTCUT[rec.id] : undefined,
              recent: rec, activate: activateFor(rec),
            };
          }),
        });
      }
      out.push({
        group: 'Acțiuni',
        rows: PALETTE_ACTIONS.map((a) => ({
          uid: `action-${a.id}`,
          group: 'Acțiuni', icon: a.icon, iconColor: 'text-accent',
          title: a.title, subtitle: a.subtitle,
          shortcut: a.command === 'shortcuts' ? 'Shift+?' : undefined,
          recent: { kind: 'action', id: a.id, title: a.title, subtitle: a.subtitle },
          activate: a.command === 'shortcuts'
            ? () => onOpenShortcuts?.()
            : () => onNavigatePage?.(a.page!),
        })),
      });
    } else {
      const scoredActions: Array<{ score: number; row: Row }> = [];
      for (const a of PALETTE_ACTIONS) {
        const score = Math.max(
          scoreMatch(normalizeText(a.title), q),
          scoreMatch(normalizeText(a.subtitle), q) - 18,
          scoreMatch(a.keywords, q) - 36,
        ) + recentBoost('action', a.id);
        if (score <= 0) continue;
        scoredActions.push({
          score,
          row: {
            uid: `action-${a.id}`,
            group: 'Acțiuni', icon: a.icon, iconColor: 'text-accent',
            title: a.title, subtitle: a.subtitle,
            shortcut: a.command === 'shortcuts' ? 'Shift+?' : undefined,
            recent: { kind: 'action', id: a.id, title: a.title, subtitle: a.subtitle },
            activate: a.command === 'shortcuts'
              ? () => { onOpenShortcuts?.(); }
              : () => { if (a.page) onNavigatePage?.(a.page); },
          },
        });
      }
      const actionRows = scoredActions
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map((entry) => entry.row);
      if (actionRows.length) out.push({ group: 'Acțiuni', rows: actionRows });

      const scoredPages: Array<{ score: number; row: Row }> = [];
      for (const p of PALETTE_PAGES) {
        const score = Math.max(
          scoreMatch(normalizeText(p.title), q),
          scoreMatch(normalizeText(p.breadcrumb), q) - 18,
          scoreMatch(p.keywords, q) - 32,
        ) + recentBoost('page', p.id);
        if (score <= 0) continue;
        scoredPages.push({
          score,
          row: {
            uid: `page-${p.id}`,
            group: 'Pagini', icon: p.icon, iconColor: 'text-status-blue',
            title: p.title, subtitle: p.breadcrumb,
            shortcut: PAGE_SHORTCUT[p.id],
            recent: { kind: 'page', id: p.id, title: p.title, subtitle: p.breadcrumb },
            activate: () => onNavigatePage?.(p.id),
          },
        });
      }
      const pageRows = scoredPages
        .sort((a, b) => b.score - a.score)
        .slice(0, 6)
        .map((entry) => entry.row);
      if (pageRows.length) out.push({ group: 'Pagini', rows: pageRows });

      const hits = result?.hits ?? [];
      const order: SearchHit['type'][] = ['client', 'project', 'material', 'document', 'station', 'piece'];
      for (const type of order) {
        const typed = hits
          .filter((h) => h.type === type)
          .map((h) => {
            const score = Math.max(
              scoreMatch(normalizeText(h.title), q),
              scoreMatch(normalizeText(h.subtitle), q) - 16,
              scoreMatch(normalizeText(h.match_field), q),
            ) + recentBoost('hit', String(h.id));
            return { h, score };
          })
          .filter(({ score }) => score > 0)
          .sort((a, b) => b.score - a.score)
          .map(({ h }) => h);
        if (!typed.length) continue;
        const meta = TYPE_META[type];
        out.push({
          group: HIT_GROUP[type],
          rows: typed.map((h) => ({
            uid: `hit-${h.type}-${h.id}`,
            group: HIT_GROUP[type], icon: meta.icon, iconColor: meta.color,
            title: h.title, subtitle: h.subtitle,
            recent: { kind: 'hit', id: String(h.id), title: h.title, subtitle: h.subtitle, hit: h },
            activate: () => onSearchNavigate?.(h),
          })),
        });
      }
    }

    const flat = out.flatMap((s) => s.rows);
    return { sections: out, rows: flat };
  }, [activateFor, onNavigatePage, onOpenShortcuts, onSearchNavigate, queryValue, recents, result]);

  
  useEffect(() => { setActiveIdx((i) => (rows.length ? Math.min(i, rows.length - 1) : 0)); }, [rows.length]);

  
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  const handleKeyboardNavigate = useCallback((key: string, preventDefault: () => void) => {
    if (key === 'ArrowDown' && rows.length) {
      preventDefault();
      setActiveIdx((i) => (i + 1) % rows.length);
      return true;
    }
    if (key === 'ArrowUp' && rows.length) {
      preventDefault();
      setActiveIdx((i) => (i - 1 + rows.length) % rows.length);
      return true;
    }
    if (key === 'Enter') {
      preventDefault();
      if (rows[activeIdx]) run(rows[activeIdx]);
      return true;
    }
    if (key === 'Escape') {
      preventDefault();
      onClose();
      return true;
    }
    return false;
  }, [activeIdx, onClose, rows, run]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    handleKeyboardNavigate(e.key, () => e.preventDefault());
  }

  useEffect(() => {
    if (!open || showInput) return;

    const onKeyDownExternal = (event: KeyboardEvent) => {
      const active = document.activeElement;
      if (!active || !anchorRef?.current?.contains(active)) return;
      handleKeyboardNavigate(event.key, () => event.preventDefault());
    };

    window.addEventListener('keydown', onKeyDownExternal);
    return () => window.removeEventListener('keydown', onKeyDownExternal);
  }, [anchorRef, handleKeyboardNavigate, open, showInput]);

  function clearRecents() {
    try { localStorage.removeItem(RECENTS_KEY); } catch {  }
    setRecents([]);
  }

  if (!open) return null;

  const q = queryValue.trim();
  const searching = q.length > 0;
  const showEmpty = searching && !loading && result && rows.length === 0;

  return createPortal(
    <div className="fixed inset-0 z-50 pointer-events-none">
      {showInput && (
        <button
          type="button"
          aria-label="Închide căutarea"
          className="absolute inset-0 cursor-default pointer-events-auto"
          onClick={onClose}
        />
      )}

      <div
        role="dialog"
        aria-modal={showInput ? 'false' : undefined}
        aria-label="Paletă de comenzi"
        style={panelStyle}
        ref={panelRef}
        className={`command-palette-surface fixed z-10 overflow-hidden rounded-lg pointer-events-auto ${
          showInput ? '' : 'command-palette-anchored command-palette-attached'
        }`}
      >
        {showInput && (
          <div className="command-palette-input-row flex items-center gap-2 px-3">
            <Search className="h-4 w-4 shrink-0 text-content-muted" strokeWidth={2.25} />
            <input
              ref={inputRef}
              type="text"
              value={queryValue}
              onChange={(e) => { setQueryValue(e.target.value); setActiveIdx(0); }}
              onKeyDown={onKeyDown}
              placeholder="Caută…"
              aria-label="Caută"
              className="command-palette-input min-w-0 flex-1 bg-transparent outline-none"
            />
            {loading && <Loader2 className="h-4 w-4 animate-spin text-content-muted" />}
            {queryValue && !loading && (
              <button
                type="button"
                onClick={() => { setQueryValue(''); setResult(null); inputRef.current?.focus(); }}
                aria-label="Șterge căutarea"
                className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-smooth duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
            <kbd className="command-palette-kbd shrink-0">
              Esc
            </kbd>
          </div>
        )}

        <div ref={listRef} className="command-palette-list overflow-y-auto py-1">
          {showEmpty && (
            <div className="px-4 py-8 text-center">
              <p className="text-pm-base text-content-secondary">Nimic găsit — încearcă alt termen.</p>
              <p className="text-pm-sm text-content-muted mt-1">Caută pagini, acțiuni, parteneri sau articole.</p>
            </div>
          )}

          {searching && loading && rows.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-6 text-pm-sm text-content-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin shrink-0" /> Se caută...
            </div>
          )}

          {sections.map((section) => {
            const gm = GROUP_META[section.group];
            const GroupIcon = gm?.icon;
            return (
              <div key={section.group} className="command-palette-section">
                <div className="command-palette-section-label flex items-center gap-1.5">
                  {GroupIcon && <GroupIcon className={`h-3 w-3 shrink-0 ${gm.color}`} />}
                  <span className="truncate">
                    {section.group}
                  </span>
                  <span className="ml-auto shrink-0 tabular-nums">{section.rows.length}</span>
                </div>
                <ul className="px-1.5">
                  {section.rows.map((row) => {
                    const flatIdx = rows.indexOf(row);
                    const isActive = flatIdx === activeIdx;
                    const RowIcon = row.icon;
                    return (
                      <li key={row.uid}>
                        <button
                          type="button"
                          data-row-idx={flatIdx}
                          onClick={() => run(row)}
                          onMouseEnter={() => setActiveIdx(flatIdx)}
                          className={`command-palette-row flex w-full items-center gap-2 text-left transition-smooth duration-150 focus-visible:outline-none ${
                            isActive ? 'is-active' : ''
                          }`}
                        >
                          <RowIcon className={`h-4 w-4 shrink-0 ${isActive ? 'text-white' : 'text-content-muted'}`} />
                          <span className="min-w-0 flex-1">
                            <span className="command-palette-row-title block truncate">
                              {row.title}
                            </span>
                            {row.subtitle && (
                              <span className="command-palette-row-subtitle block truncate">{row.subtitle}</span>
                            )}
                          </span>
                          {row.shortcut && (
                            <kbd className="command-palette-kbd shrink-0 font-mono">
                              {formatKeys(row.shortcut)}
                            </kbd>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}

          {!searching && recents.length > 0 && (
            <button
              type="button"
              onClick={clearRecents}
              className="mt-1 mx-1.5 px-3 py-1.5 inline-flex items-center gap-1.5 rounded-md text-pm-2xs text-content-muted hover:text-content-secondary hover:bg-surface-tertiary/50 transition-smooth duration-150 active:scale-[0.98] focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
            >
              <Trash2 className="h-3 w-3 shrink-0" /> Curăță istoricul
            </button>
          )}
        </div>

        <div className="command-palette-footer flex items-center gap-4 px-3 py-1.5 text-pm-2xs text-content-muted">
          <span><kbd className="font-mono">↑↓</kbd> navighează</span>
          <span><kbd className="font-mono">↵</kbd> deschide</span>
          <span><kbd className="font-mono">Esc</kbd> închide</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export type { SearchHit };
