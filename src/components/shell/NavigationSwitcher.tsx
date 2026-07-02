import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Search, X, LayoutGrid } from '@/icons';
import { formatKeys } from '@/hooks/useKeyboardShortcuts';
import { getWorkspaceSubpages, workspaceIdForNav } from '@/config/workspaceNav';
import { normalizeText } from './palette-data';
import type { SidebarItem } from './WorkspacePanel';

interface NavigationSwitcherProps {
  open: boolean;
  onClose: () => void;
  navbarItems: SidebarItem[];
  role: string;
  currentPage: string;
  activeTabId?: string | null;
  onNavigate: (pageId: string) => void;
}

interface NavRow {
  uid: string;
  pageId: string;
  label: string;
  subtitle: string;
  icon: SidebarItem['icon'];
  isActive: boolean;
  activate: () => void;
}

interface NavSection {
  id: string;
  label: string;
  rows: NavRow[];
}

function scoreMatch(field: string, query: string): number {
  if (!field || !query) return 0;
  if (field === query) return 420;
  if (field.startsWith(query)) return 320;
  if (field.split(/\s+/).some((token) => token.startsWith(query))) return 260;
  const idx = field.indexOf(query);
  if (idx === -1) return 0;
  return Math.max(140, 210 - Math.min(idx, 70));
}

function buildSections(
  navbarItems: SidebarItem[],
  role: string,
  activePage: string,
  onNavigate: (pageId: string) => void,
): NavSection[] {
  const sections: NavSection[] = [];

  for (const item of navbarItems) {
    const wsId = workspaceIdForNav(item.id);
    const subpages = wsId ? getWorkspaceSubpages(wsId, role) : [];

    if (subpages.length > 0) {
      sections.push({
        id: item.id,
        label: item.label,
        rows: subpages.map((sub) => ({
          uid: `${item.id}-${sub.id}`,
          pageId: sub.id,
          label: sub.label,
          subtitle: item.label,
          icon: sub.icon,
          isActive: activePage === sub.id,
          activate: () => onNavigate(sub.id),
        })),
      });
    } else {
      sections.push({
        id: item.id,
        label: item.group || 'General',
        rows: [{
          uid: item.id,
          pageId: item.id,
          label: item.label,
          subtitle: item.group || 'General',
          icon: item.icon,
          isActive: activePage === item.id,
          activate: () => onNavigate(item.id),
        }],
      });
    }
  }

  return sections;
}

export default function NavigationSwitcher({
  open,
  onClose,
  navbarItems,
  role,
  currentPage,
  activeTabId,
  onNavigate,
}: NavigationSwitcherProps) {
  const [query, setQuery] = useState('');
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const activePage = activeTabId ?? currentPage;

  useEffect(() => {
    if (!open) return undefined;
    setQuery('');
    setActiveIdx(0);
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [open]);

  const allSections = useMemo(
    () => buildSections(navbarItems, role, activePage, onNavigate),
    [navbarItems, role, activePage, onNavigate],
  );

  const { sections, rows } = useMemo(() => {
    const q = normalizeText(query.trim());
    if (!q) {
      const flat = allSections.flatMap((s) => s.rows);
      return { sections: allSections, rows: flat };
    }

    const filtered: NavSection[] = [];
    for (const section of allSections) {
      const wsScore = scoreMatch(normalizeText(section.label), q);
      const matchedRows = section.rows
        .map((row) => {
          const score = Math.max(
            scoreMatch(normalizeText(row.label), q),
            scoreMatch(normalizeText(row.subtitle), q) - 18,
            wsScore - 24,
          );
          return { row, score };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .map(({ row }) => row);

      if (matchedRows.length) {
        filtered.push({ ...section, rows: matchedRows });
      }
    }

    const flat = filtered.flatMap((s) => s.rows);
    return { sections: filtered, rows: flat };
  }, [allSections, query]);

  useEffect(() => {
    setActiveIdx((i) => (rows.length ? Math.min(i, rows.length - 1) : 0));
  }, [rows.length]);

  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-row-idx="${activeIdx}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIdx, open]);

  const run = useCallback((row: NavRow) => {
    row.activate();
    onClose();
  }, [onClose]);

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
    if (!open) return;

    const onKeyDownGlobal = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };

    window.addEventListener('keydown', onKeyDownGlobal);
    return () => window.removeEventListener('keydown', onKeyDownGlobal);
  }, [onClose, open]);

  if (!open) return null;

  const q = query.trim();
  const showEmpty = q.length > 0 && rows.length === 0;

  return createPortal(
    <div className="fixed inset-0 z-[450] flex items-start justify-center pt-[min(12vh,6rem)] px-3 pointer-events-none">
      <button
        type="button"
        aria-label="Închide navigarea rapidă"
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[2px] pointer-events-auto"
        onClick={onClose}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Navigare rapidă"
        ref={panelRef}
        className="command-palette-surface navigation-switcher-surface relative z-10 flex w-full max-w-xl flex-col overflow-hidden pointer-events-auto"
      >
        <div className="command-palette-input-row flex items-center gap-2 px-3">
          <LayoutGrid className="h-4 w-4 shrink-0 text-content-muted" strokeWidth={2.25} />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => { setQuery(e.target.value); setActiveIdx(0); }}
            onKeyDown={onKeyDown}
            placeholder="Mergi la pagină…"
            aria-label="Filtrează pagini"
            className="command-palette-input min-w-0 flex-1 bg-transparent outline-none"
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(''); inputRef.current?.focus(); }}
              aria-label="Șterge filtrul"
              className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-md text-content-muted hover:bg-surface-tertiary hover:text-content-primary transition-smooth duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="command-palette-kbd shrink-0">
            Esc
          </kbd>
        </div>

        <div ref={listRef} className="command-palette-list overflow-y-auto py-1 max-h-[min(58vh,calc(100dvh-10rem))]">
          {showEmpty && (
            <div className="px-4 py-8 text-center">
              <Search className="mx-auto mb-2 h-5 w-5 text-content-muted" />
              <p className="text-pm-base text-content-secondary">Nicio pagină găsită.</p>
              <p className="text-pm-sm text-content-muted mt-1">Încearcă alt termen sau numele workspace-ului.</p>
            </div>
          )}

          {sections.map((section) => (
            <div key={section.id} className="command-palette-section">
              <div className="command-palette-section-label flex items-center gap-1.5">
                <span className="truncate">{section.label}</span>
                <span className="ml-auto shrink-0 tabular-nums">{section.rows.length}</span>
              </div>
              <ul className="px-1.5" role="listbox" aria-label={section.label}>
                {section.rows.map((row) => {
                  const flatIdx = rows.indexOf(row);
                  const isActiveRow = flatIdx === activeIdx;
                  const isCurrentPage = row.isActive;
                  const RowIcon = row.icon;
                  return (
                    <li key={row.uid} role="presentation">
                      <button
                        type="button"
                        role="option"
                        aria-selected={isActiveRow}
                        data-row-idx={flatIdx}
                        onClick={() => run(row)}
                        onMouseEnter={() => setActiveIdx(flatIdx)}
                        className={`command-palette-row flex w-full items-center gap-2 text-left transition-smooth duration-150 focus-visible:outline-none ${
                          isActiveRow ? 'is-active' : ''
                        } ${isCurrentPage && !isActiveRow ? 'ring-1 ring-inset ring-accent/40' : ''}`}
                      >
                        <RowIcon className={`h-4 w-4 shrink-0 ${isActiveRow ? 'text-white' : 'text-content-muted'}`} />
                        <span className="min-w-0 flex-1">
                          <span className="command-palette-row-title block truncate">
                            {row.label}
                            {isCurrentPage && (
                              <span className="ml-1.5 text-pm-2xs font-normal opacity-75">· curent</span>
                            )}
                          </span>
                          <span className="command-palette-row-subtitle block truncate">{row.subtitle}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="command-palette-footer flex items-center gap-4 px-3 py-1.5 text-pm-2xs text-content-muted">
          <span><kbd className="font-mono">↑↓</kbd> navighează</span>
          <span><kbd className="font-mono">↵</kbd> deschide</span>
          <span><kbd className="font-mono">{formatKeys('Mod+G')}</kbd> deschide</span>
          <span><kbd className="font-mono">Esc</kbd> închide</span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
