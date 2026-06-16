import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import {
  Search, X, Loader2, Clock, Zap, Files, Trash2,
} from 'lucide-react';
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

function readRecents(): PaletteRecent[] {
  try {
    const raw = localStorage.getItem(RECENTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export default function CommandPalette({
  open, onClose, onSearchNavigate, onNavigatePage, onOpenShortcuts,
}: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [recents, setRecents] = useState<PaletteRecent[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  
  useEffect(() => {
    if (open) {
      setQuery('');
      setResult(null);
      setActiveIdx(0);
      setRecents(readRecents());
      const t = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(t);
    }
  }, [open]);

  
  useEffect(() => {
    const q = query.trim();
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
  }, [query]);

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
    const q = normalizeText(query.trim());
    const out: { group: string; rows: Row[] }[] = [];

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
      
      const actionRows: Row[] = PALETTE_ACTIONS
        .filter((a) => normalizeText(a.title).includes(q) || a.keywords.includes(q))
        .map((a) => ({
          uid: `action-${a.id}`,
          group: 'Acțiuni', icon: a.icon, iconColor: 'text-accent',
          title: a.title, subtitle: a.subtitle,
          shortcut: a.command === 'shortcuts' ? 'Shift+?' : undefined,
          recent: { kind: 'action', id: a.id, title: a.title, subtitle: a.subtitle },
          activate: a.command === 'shortcuts'
            ? () => onOpenShortcuts?.()
            : () => onNavigatePage?.(a.page!),
        }));
      if (actionRows.length) out.push({ group: 'Acțiuni', rows: actionRows });

      const pageRows: Row[] = PALETTE_PAGES
        .filter((p) => normalizeText(p.title).includes(q) || p.keywords.includes(q))
        .slice(0, 6)
        .map((p) => ({
          uid: `page-${p.id}`,
          group: 'Pagini', icon: p.icon, iconColor: 'text-status-blue',
          title: p.title, subtitle: p.breadcrumb,
          shortcut: PAGE_SHORTCUT[p.id],
          recent: { kind: 'page', id: p.id, title: p.title, subtitle: p.breadcrumb },
          activate: () => onNavigatePage?.(p.id),
        }));
      if (pageRows.length) out.push({ group: 'Pagini', rows: pageRows });

      
      const hits = result?.hits ?? [];
      const order: SearchHit['type'][] = ['client', 'project', 'material', 'document', 'station', 'piece'];
      for (const type of order) {
        const typed = hits.filter((h) => h.type === type);
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
  }, [query, recents, result, activateFor, onNavigatePage, onSearchNavigate, onOpenShortcuts]);

  
  useEffect(() => { setActiveIdx((i) => (rows.length ? Math.min(i, rows.length - 1) : 0)); }, [rows.length]);

  
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'ArrowDown' && rows.length) {
      e.preventDefault();
      setActiveIdx((i) => (i + 1) % rows.length);
    } else if (e.key === 'ArrowUp' && rows.length) {
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + rows.length) % rows.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (rows[activeIdx]) run(rows[activeIdx]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  }

  function clearRecents() {
    try { localStorage.removeItem(RECENTS_KEY); } catch {  }
    setRecents([]);
  }

  if (!open) return null;

  const q = query.trim();
  const searching = q.length > 0;
  const showEmpty = searching && !loading && result && rows.length === 0;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh]">
      {}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Paletă de comenzi"
        className="surface-glass-strong relative w-full max-w-[640px] mx-4 rounded-xl overflow-hidden animate-scale-in motion-reduce:animate-none"
      >
        {}
        <div className="flex items-center gap-3 px-4 h-14 border-b border-line">
          <Search className="h-4 w-4 text-content-muted shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={onKeyDown}
            placeholder="Caută aplicații, acțiuni, pagini, parteneri, articole..."
            className="flex-1 bg-transparent text-[15px] text-content-primary placeholder:text-content-muted outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 animate-spin text-content-muted" />}
          {query && !loading && (
            <button
              type="button"
              onClick={() => { setQuery(''); setResult(null); inputRef.current?.focus(); }}
              aria-label="Șterge căutarea"
              className="h-5 w-5 flex items-center justify-center rounded text-content-muted hover:text-content-primary transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="px-1.5 py-0.5 rounded border border-line bg-surface-secondary text-[10px] font-medium text-content-muted">
            Esc
          </kbd>
        </div>

        {}
        <div ref={listRef} className="max-h-[52vh] overflow-y-auto py-1.5">
          {showEmpty && (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-content-secondary">Nimic găsit — încearcă alt termen.</p>
              <p className="text-xs text-content-muted mt-1">Caută pagini, acțiuni, parteneri sau articole.</p>
            </div>
          )}

          {searching && loading && rows.length === 0 && (
            <div className="flex items-center gap-2 px-4 py-6 text-xs text-content-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Se caută...
            </div>
          )}

          {sections.map((section) => {
            const gm = GROUP_META[section.group];
            const GroupIcon = gm?.icon;
            return (
              <div key={section.group} className="mb-1">
                <div className="flex items-center gap-2 px-4 pt-2 pb-1">
                  {GroupIcon && <GroupIcon className={`h-3 w-3 ${gm.color}`} />}
                  <span className="text-[10px] font-bold uppercase tracking-wider text-content-muted">
                    {section.group}
                  </span>
                  <span className="ml-auto text-[10px] text-content-muted tabular-nums">{section.rows.length}</span>
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
                          className={`w-full text-left px-2.5 rounded-lg py-2 flex items-center gap-3 transition-colors ${
                            isActive ? 'bg-accent/10' : 'hover:bg-surface-tertiary/50'
                          }`}
                        >
                          <RowIcon className={`h-4 w-4 shrink-0 ${isActive ? row.iconColor : 'text-content-muted'}`} />
                          <span className="min-w-0 flex-1">
                            <span className={`block text-sm truncate ${isActive ? 'text-content-primary font-medium' : 'text-content-secondary'}`}>
                              {row.title}
                            </span>
                            {row.subtitle && (
                              <span className="block text-[11px] text-content-muted truncate">{row.subtitle}</span>
                            )}
                          </span>
                          {row.shortcut && (
                            <kbd className="shrink-0 font-mono text-[10px] px-1.5 py-0.5 rounded border border-line bg-surface-secondary text-content-muted">
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
              onClick={clearRecents}
              className="mt-1 mx-1.5 px-3 py-1.5 flex items-center gap-1.5 text-[10px] text-content-muted hover:text-content-secondary transition-colors"
            >
              <Trash2 className="h-3 w-3" /> Curăță istoricul
            </button>
          )}
        </div>

        {}
        <div className="flex items-center gap-4 px-4 py-2 border-t border-line text-[10px] text-content-muted">
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
