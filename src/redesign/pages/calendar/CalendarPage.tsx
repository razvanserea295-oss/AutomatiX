



































import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Download, Plus, Trash2, Lock, PanelLeft, List as ListIcon } from 'lucide-react';
import { useLocation } from 'wouter';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import { toast } from '@/store/toastStore';
import { confirmDialog } from '@/components/ConfirmDialog';
import CalendarEnhancements from '@/pages/calendar/CalendarEnhancements';

import Button from '@/redesign/ui/Button';
import Page from '@/redesign/ui/Page';
import { Skeleton, EmptyState } from '@/redesign/ui';
import { vtName, startMorphTransition } from '@/redesign/lib/viewTransition';

type CalendarEventType =
  | 'project_deadline' | 'project_start'
  | 'deplasare' | 'maintenance' | 'compliance_task'
  | 'invoice_due' | 'quotation_valid_until'
  | 'personal';

interface CalendarEvent {
  id: string;
  type: CalendarEventType;
  title: string;
  date: string;
  end_date?: string | null;
  url?: string;
  source_id: number;
  status?: string | null;
  meta?: Record<string, any>;
}

const TYPE_LABEL: Record<CalendarEventType, string> = {
  project_deadline: 'Deadline proiect',
  project_start: 'Start proiect',
  deplasare: 'Deplasare',
  maintenance: 'Mentenanta',
  compliance_task: 'Compliance',
  invoice_due: 'Scadenta factura',
  quotation_valid_until: 'Expirare oferta',
  personal: 'Personal',
};




const TYPE_DOT: Record<CalendarEventType, string> = {
  project_deadline: '#ef4444',
  project_start: '#3b82f6',
  deplasare: '#f59e0b',
  maintenance: '#8b5cf6',
  compliance_task: '#14b8a6',
  invoice_due: '#22c55e',
  quotation_valid_until: '#6b7280',
  personal: '#8b5cf6',
};


function eventColor(ev: CalendarEvent): string {
  if (ev.type === 'personal' && ev.meta?.color) return ev.meta.color as string;
  return TYPE_DOT[ev.type];
}

interface PersonalEventDraft {
  id?: number;
  title: string;
  date: string;
  end_date: string;
  start_time: string;
  end_time: string;
  recurrence: RecurrenceOption;
  notes: string;
  color: string;
}

const EMPTY_DRAFT: PersonalEventDraft = {
  title: '', date: '', end_date: '', start_time: '', end_time: '', recurrence: 'none', notes: '', color: '',
};

type ViewMode = 'month' | 'week' | 'day' | 'agenda';
type RecurrenceOption = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly' | 'workdays';

const VIEW_TABS: { id: ViewMode; label: string }[] = [
  { id: 'month', label: 'Lună' },
  { id: 'week', label: 'Săptămână' },
  { id: 'day', label: 'Zi' },
  { id: 'agenda', label: 'Agendă' },
];

const RECURRENCE_OPTIONS: Array<{ id: RecurrenceOption; label: string }> = [
  { id: 'none', label: 'Nu se repetă' },
  { id: 'daily', label: 'Zilnic' },
  { id: 'weekly', label: 'Săptămânal' },
  { id: 'monthly', label: 'Lunar' },
  { id: 'yearly', label: 'Anual' },
  { id: 'workdays', label: 'În fiecare zi lucrătoare' },
];

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function startOfWeek(d: Date) {
  const dow = (d.getDay() + 6) % 7; 
  const r = new Date(d);
  r.setDate(d.getDate() - dow);
  return r;
}
function addDays(d: Date, n: number) { const r = new Date(d); r.setDate(d.getDate() + n); return r; }
function fmtIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const SLOT_H = 48;          
const GRID_H = 24 * SLOT_H; 

function timeToMinutes(time: string | null | undefined): number | null {
  if (!time || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) return null;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(total: number): string {
  const h = Math.max(0, Math.min(23, Math.floor(total / 60)));
  const m = Math.max(0, Math.min(59, total % 60));
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function isTimedEvent(ev: CalendarEvent): boolean {
  return ev.type === 'personal' && timeToMinutes(ev.meta?.start_time as string | null) !== null;
}

function eventTimeLabel(ev: CalendarEvent): string {
  const start = ev.meta?.start_time as string | null | undefined;
  const end = ev.meta?.end_time as string | null | undefined;
  if (!start) return '';
  return end ? `${start}-${end}` : start;
}

function recurrenceFromMeta(value: unknown): RecurrenceOption {
  return value === 'daily' || value === 'weekly' || value === 'monthly' || value === 'yearly' || value === 'workdays'
    ? value
    : 'none';
}

export default function CalendarPage({ user: _user }: { user: User | null }) {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Set<CalendarEventType>>(new Set());
  const [sidebarOpen, setSidebarOpen] = useState(true);

  
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<PersonalEventDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  
  
  const range = useMemo(() => {
    if (view === 'day') {
      const iso = fmtIso(cursor);
      return { from: iso, to: iso };
    }
    if (view === 'week') {
      const ws = startOfWeek(cursor);
      return { from: fmtIso(ws), to: fmtIso(addDays(ws, 6)) };
    }
    
    const first = startOfMonth(cursor);
    const gridStart = startOfWeek(first);
    const gridEnd = addDays(gridStart, 41);
    return { from: fmtIso(gridStart), to: fmtIso(gridEnd) };
  }, [view, cursor]);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    apiCommand<CalendarEvent[]>('get_calendar_events', {
      from: range.from,
      to: range.to,
      types: filters.size > 0 ? Array.from(filters) : undefined,
    }).then(setEvents).catch(() => setEvents([])).finally(() => setLoading(false));
  }, [range.from, range.to, filters]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = ev.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
      
      if (ev.end_date && ev.end_date > ev.date) {
        let cur = new Date(ev.date);
        const end = new Date(ev.end_date);
        while (cur < end) {
          cur = addDays(cur, 1);
          const k = fmtIso(cur);
          if (!map.has(k)) map.set(k, []);
          if (!map.get(k)!.some(e => e.id === ev.id)) map.get(k)!.push(ev);
        }
      }
    }
    return map;
  }, [events]);

  const toggleFilter = (t: CalendarEventType) => {
    setFilters(prev => {
      const n = new Set(prev);
      if (n.has(t)) n.delete(t); else n.add(t);
      return n;
    });
  };

  
  
  const goPrev = () => {
    setCursor(c => (view === 'month' || view === 'agenda')
      ? new Date(c.getFullYear(), c.getMonth() - 1, 1)
      : addDays(c, view === 'week' ? -7 : -1));
  };
  const goNext = () => {
    setCursor(c => (view === 'month' || view === 'agenda')
      ? new Date(c.getFullYear(), c.getMonth() + 1, 1)
      : addDays(c, view === 'week' ? 7 : 1));
  };
  const goToday = () => setCursor(new Date());

  const downloadIcal = async () => {
    try {
      const { ical } = await apiCommand<{ ical: string }>('build_calendar_ical', {
        from: range.from, to: range.to,
      });
      const blob = new Blob([ical], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `promix-calendar-${range.from}_to_${range.to}.ics`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      toast.success('Fisier iCal descarcat');
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare iCal');
    }
  };

  const handleEventClick = (ev: CalendarEvent) => {
    
    
    if (ev.type === 'personal') {
      startMorphTransition(() => flushSync(() => {
        setDraft({
          id: ev.source_id,
          title: ev.title,
          date: (ev.meta?.base_date as string | null) || ev.date,
          end_date: (ev.meta?.repeat_until as string | null) || ev.end_date || '',
          start_time: (ev.meta?.start_time as string | null) || '',
          end_time: (ev.meta?.end_time as string | null) || '',
          recurrence: recurrenceFromMeta(ev.meta?.recurrence),
          notes: (ev.meta?.notes as string) || '',
          color: (ev.meta?.color as string) || '',
        });
        setEditorOpen(true);
      }), { dir: 'forward' });
      return;
    }
    if (ev.url) setLocation(ev.url);
  };

  const openCreateEditor = (presetDate?: string, presetStartTime?: string) => {
    setDraft({ ...EMPTY_DRAFT, date: presetDate || fmtIso(new Date()), start_time: presetStartTime || '' });
    setEditorOpen(true);
  };

  const savePersonal = useCallback(async () => {
    if (!draft.title.trim()) { toast.error('Titlu obligatoriu'); return; }
    if (!draft.date)         { toast.error('Data obligatorie'); return; }
    setSaving(true);
    try {
      if (draft.id) {
        await apiCommand('update_personal_calendar_event', {
          id: draft.id,
          title: draft.title.trim(),
          date: draft.date,
          end_date: draft.end_date || '',
          start_time: draft.start_time || '',
          end_time: draft.end_time || '',
          recurrence: draft.recurrence || 'none',
          notes: draft.notes || '',
          color: draft.color || '',
        });
        toast.success('Eveniment actualizat');
      } else {
        await apiCommand('create_personal_calendar_event', {
          title: draft.title.trim(),
          date: draft.date,
          end_date: draft.end_date || null,
          start_time: draft.start_time || null,
          end_time: draft.end_time || null,
          recurrence: draft.recurrence || 'none',
          notes: draft.notes || null,
          color: draft.color || null,
        });
        toast.success('Eveniment salvat');
      }
      setEditorOpen(false);
      setDraft(EMPTY_DRAFT);
      fetchEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Salvare eșuată');
    } finally {
      setSaving(false);
    }
  }, [draft, fetchEvents]);

  const deletePersonal = useCallback(async () => {
    if (!draft.id) return;
    
    if (!(await confirmDialog({
      title: 'Sigur ștergi acest eveniment personal?',
      danger: true,
      confirmLabel: 'Șterge',
    }))) return;
    setSaving(true);
    try {
      await apiCommand('delete_personal_calendar_event', { id: draft.id });
      toast.success('Eveniment șters');
      setEditorOpen(false);
      setDraft(EMPTY_DRAFT);
      fetchEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Ștergere eșuată');
    } finally {
      setSaving(false);
    }
  }, [draft.id, fetchEvents]);

  const handleDrop = async (ev: CalendarEvent, newDateIso: string) => {
    try {
      await apiCommand('reschedule_calendar_event', { event_id: ev.id, new_date: newDateIso });
      toast.success('Eveniment reprogramat');
      fetchEvents();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Reprogramare esuata');
    }
  };

  
  const openDay = (iso: string) => {
    const [y, m, d] = iso.split('-').map(Number);
    setCursor(new Date(y, m - 1, d));
    setView('day');
  };

  const headerLabel = view === 'day'
    ? cursor.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : view === 'week'
    ? (() => {
        const ws = startOfWeek(cursor);
        const we = addDays(ws, 6);
        return `${ws.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' })} – ${we.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short', year: 'numeric' })}`;
      })()
    : cursor.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });

  
  const todayIso = fmtIso(new Date());
  const kpiTotal = events.length;
  const kpiToday = events.filter(e => e.date.slice(0, 10) === todayIso).length;
  const kpiDeadlines = events.filter(e => e.type === 'project_deadline').length;
  const kpiDeplasari = events.filter(e => e.type === 'deplasare').length;

  
  const upcoming = useMemo(() => {
    return [...events]
      .filter(e => e.date.slice(0, 10) >= todayIso)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [events, todayIso]);

  return (
    <Page fit>
      <div className="flex flex-col flex-1 min-h-0 app-surface">

        {}
        <header className="shrink-0 flex flex-wrap items-center gap-2 px-4 py-2.5 border-b border-line/70">
          <button
            onClick={() => setSidebarOpen(o => !o)}
            title={sidebarOpen ? 'Ascunde panoul' : 'Arată panoul'}
            className="h-9 w-9 grid place-items-center rounded-full text-content-secondary hover:bg-surface-tertiary transition-smooth duration-150 active:scale-90 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
          >
            <PanelLeft className="h-4 w-4" />
          </button>
          <span className="h-8 w-8 rounded-xl bg-accent-muted text-accent grid place-items-center shrink-0">
            <CalendarIcon className="h-4 w-4" />
          </span>
          <h1 className="text-pm-lg font-semibold text-content-primary mr-2 hidden sm:block">Calendar</h1>

          <Button size="sm" variant="outline" onClick={goToday}>Astăzi</Button>
          <div className="flex items-center">
            <button onClick={goPrev} title="Anterior" className="h-9 w-9 grid place-items-center rounded-full text-content-secondary hover:bg-surface-tertiary transition-smooth duration-150 active:scale-90 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={goNext} title="Următor" className="h-9 w-9 grid place-items-center rounded-full text-content-secondary hover:bg-surface-tertiary transition-smooth duration-150 active:scale-90 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <span className="text-pm-lg font-medium text-content-primary capitalize ml-1 min-w-0 truncate">{headerLabel}</span>

          <div className="ml-auto flex items-center gap-2">
            {}
            <div className="hidden md:inline-flex items-center gap-0.5 rounded-full border border-line/70 bg-surface-secondary p-1">
              {VIEW_TABS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setView(t.id)}
                  aria-pressed={view === t.id}
                  className={`h-7 px-3 rounded-full text-pm-xs font-semibold transition-smooth duration-150 active:scale-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                    view === t.id ? 'bg-surface-primary text-accent shadow-[var(--elevation-1)]' : 'text-content-muted hover:text-content-primary'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            {}
            <select
              value={view}
              onChange={(e) => setView(e.target.value as ViewMode)}
              className="md:hidden h-9 rounded-xl border border-line bg-surface-primary px-2 text-pm-sm text-content-primary transition-smooth duration-150 focus:outline-none focus:border-accent focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
            >
              {VIEW_TABS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
            </select>
            <Button size="sm" variant="outline" onClick={downloadIcal}><Download className="h-3.5 w-3.5" /> iCal</Button>
            <Button size="sm" onClick={() => openCreateEditor()}><Plus className="h-3.5 w-3.5" /> Eveniment</Button>
          </div>
        </header>

        {}
        <div className="flex flex-1 min-h-0">

          {}
          {sidebarOpen && (
            <aside className="hidden md:flex w-72 shrink-0 flex-col border-r border-line/70 min-h-0 overflow-y-auto px-4 py-4 gap-4">
              <Button onClick={() => openCreateEditor()} className="w-full justify-center">
                <Plus className="h-4 w-4" /> Eveniment personal
              </Button>

              <MiniCalendar cursor={cursor} onPick={(d) => setCursor(d)} now={now} />

              {}
              <div>
                <p className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted px-1 mb-2">Calendarele mele</p>
                <ul className="space-y-0.5 stagger-in">
                  {(Object.keys(TYPE_LABEL) as CalendarEventType[]).map(t => {
                    const checked = filters.size === 0 || filters.has(t);
                    const color = TYPE_DOT[t];
                    return (
                      <li key={t}>
                        <button
                          onClick={() => toggleFilter(t)}
                          className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-surface-tertiary transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] group"
                        >
                          <span
                            className="h-4 w-4 rounded-[5px] border-2 grid place-items-center shrink-0"
                            style={{ borderColor: color, backgroundColor: checked ? color : 'transparent' }}
                          >
                            {checked && (
                              <svg viewBox="0 0 12 12" className="h-2.5 w-2.5 text-white" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
                              </svg>
                            )}
                          </span>
                          <span className={`text-pm-sm min-w-0 truncate ${checked ? 'text-content-primary' : 'text-content-muted'}`}>{TYPE_LABEL[t]}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
                {filters.size > 0 && (
                  <button onClick={() => setFilters(new Set())} className="mt-1 px-1.5 py-0.5 rounded-md text-pm-xs text-accent hover:underline transition-smooth duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">
                    Arată toate
                  </button>
                )}
              </div>

              {}
              <div className="pt-3 border-t border-line/60 grid grid-cols-2 gap-2">
                <MiniStat label="În interval" value={kpiTotal} />
                <MiniStat label="Astăzi" value={kpiToday} accent={kpiToday > 0} />
                <MiniStat label="Deadline-uri" value={kpiDeadlines} />
                <MiniStat label="Deplasări" value={kpiDeplasari} />
              </div>

              {}
              <div className="rounded-xl border border-line/60 overflow-hidden">
                <CalendarEnhancements events={events.map(e => ({
                  id: e.id, title: e.title, start: e.date, end: e.end_date ?? e.date, type: e.type,
                }))} />
              </div>
            </aside>
          )}

          {}
          <main className="flex-1 min-h-0 flex flex-col overflow-hidden">
            {loading ? (
              <div className="flex-1 p-4 space-y-2 overflow-hidden">
                {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} height={56} rounded="md" />)}
              </div>
            ) : view === 'month' ? (
              <MonthView range={range} cursor={cursor} eventsByDay={eventsByDay} now={now} onEventClick={handleEventClick} onDrop={handleDrop} onOpenDay={openDay} onCreate={openCreateEditor} />
            ) : view === 'agenda' ? (
              <AgendaView upcoming={upcoming} onEventClick={handleEventClick} />
            ) : (
              <HourlyGrid
                days={view === 'week'
                  ? Array.from({ length: 7 }, (_, i) => addDays(startOfWeek(cursor), i))
                  : [cursor]}
                eventsByDay={eventsByDay}
                now={now}
                onEventClick={handleEventClick}
                onDrop={handleDrop}
                onCreate={openCreateEditor}
              />
            )}
          </main>
        </div>
      </div>

      {editorOpen && (
        <PersonalEventEditor
          draft={draft}
          onChange={setDraft}
          onSave={savePersonal}
          onDelete={draft.id ? deletePersonal : undefined}
          onCancel={() => { setEditorOpen(false); setDraft(EMPTY_DRAFT); }}
          saving={saving}
        />
      )}
    </Page>
  );
}




function MiniStat({ label, value, accent }: { label: string; value: number; accent?: boolean }) {
  return (
    <div className="rounded-lg bg-surface-secondary px-2.5 py-2">
      <p className="text-pm-2xs text-content-muted truncate">{label}</p>
      <p className={`text-pm-lg font-semibold tabular-nums leading-tight ${accent ? 'text-status-amber' : 'text-content-primary'}`}>{value}</p>
    </div>
  );
}




function MiniCalendar({ cursor, onPick, now }: { cursor: Date; onPick: (d: Date) => void; now: Date }) {
  const [month, setMonth] = useState(() => startOfMonth(cursor));
  
  useEffect(() => { setMonth(startOfMonth(cursor)); }, [cursor]);

  const gridStart = startOfWeek(startOfMonth(month));
  const days = Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
  const todayIso = fmtIso(now);
  const cursorIso = fmtIso(cursor);
  const monthIdx = month.getMonth();

  return (
    <div className="px-1">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-pm-sm font-semibold text-content-primary capitalize">
          {month.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' })}
        </span>
        <div className="flex items-center">
          <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="h-6 w-6 grid place-items-center rounded-full text-content-muted hover:bg-surface-tertiary transition-smooth duration-150 active:scale-90 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setMonth(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="h-6 w-6 grid place-items-center rounded-full text-content-muted hover:bg-surface-tertiary transition-smooth duration-150 active:scale-90 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
          <span key={i} className="h-6 grid place-items-center text-pm-2xs font-semibold text-content-muted">{d}</span>
        ))}
        {days.map(d => {
          const iso = fmtIso(d);
          const isToday = iso === todayIso;
          const isSel = iso === cursorIso;
          const inMonth = d.getMonth() === monthIdx;
          return (
            <button
              key={iso}
              onClick={() => onPick(d)}
              className={`h-7 w-7 mx-auto grid place-items-center rounded-full text-pm-xs tabular-nums transition-smooth duration-150 active:scale-90 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                isSel ? 'bg-accent text-[var(--color-on-accent)] font-semibold'
                : isToday ? 'text-accent font-bold ring-1 ring-accent/50'
                : inMonth ? 'text-content-primary hover:bg-surface-tertiary'
                : 'text-content-muted/60 hover:bg-surface-tertiary'
              }`}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}




function PersonalEventEditor({
  draft, onChange, onSave, onDelete, onCancel, saving,
}: {
  draft: PersonalEventDraft;
  onChange: (d: PersonalEventDraft) => void;
  onSave: () => void;
  onDelete?: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const isEdit = !!draft.id;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 enter-fade" onClick={onCancel}>
      <div
        className="bg-surface-elevated border border-line rounded-2xl shadow-[var(--elevation-4)] w-full max-w-md p-5 vt-morph enter-scale"
        style={{ viewTransitionName: vtName('calevent', draft.id ?? 'new') }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <Lock className="h-3.5 w-3.5 text-content-muted" />
          <span className="text-pm-xs uppercase tracking-wider text-content-muted">Eveniment personal — privat</span>
        </div>
        <h2 className="text-pm-lg font-semibold text-content-primary mb-3">
          {isEdit ? 'Editează eveniment' : 'Eveniment nou'}
        </h2>
        <p className="text-pm-xs text-content-muted mb-4">
          Doar tu vezi acest eveniment. Data finală este opțională și limitează evenimentele pe mai multe zile sau seriile recurente.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Titlu</label>
            <input
              value={draft.title}
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
              placeholder="Ex: Întâlnire client, Concediu, Vizită medicală..."
              autoFocus
              className="w-full h-10 px-3 rounded-xl border border-line/70 bg-surface-secondary/40 text-pm-sm text-content-primary transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Data început</label>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => onChange({ ...draft, date: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-line/70 bg-surface-secondary/40 text-pm-sm text-content-primary transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]"
              />
            </div>
            <div>
              <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Data final / până la</label>
              <input
                type="date"
                value={draft.end_date}
                min={draft.date}
                onChange={(e) => onChange({ ...draft, end_date: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-line/70 bg-surface-secondary/40 text-pm-sm text-content-primary transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Ora început (opțional)</label>
              <input
                type="time"
                value={draft.start_time}
                onChange={(e) => onChange({ ...draft, start_time: e.target.value, end_time: draft.end_time && e.target.value && draft.end_time <= e.target.value ? '' : draft.end_time })}
                className="w-full h-10 px-3 rounded-xl border border-line/70 bg-surface-secondary/40 text-pm-sm text-content-primary transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]"
              />
            </div>
            <div>
              <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Ora final (opțional)</label>
              <input
                type="time"
                value={draft.end_time}
                min={draft.start_time || undefined}
                onChange={(e) => onChange({ ...draft, end_time: e.target.value })}
                className="w-full h-10 px-3 rounded-xl border border-line/70 bg-surface-secondary/40 text-pm-sm text-content-primary transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]"
              />
            </div>
          </div>

          <div>
            <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Repetare</label>
            <select
              value={draft.recurrence}
              onChange={(e) => onChange({ ...draft, recurrence: e.target.value as RecurrenceOption })}
              className="w-full h-10 px-3 rounded-xl border border-line/70 bg-surface-secondary/40 text-pm-sm text-content-primary transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)]"
            >
              {RECURRENCE_OPTIONS.map(opt => <option key={opt.id} value={opt.id}>{opt.label}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Note (opțional)</label>
            <textarea
              value={draft.notes}
              onChange={(e) => onChange({ ...draft, notes: e.target.value })}
              rows={3}
              placeholder="Detalii suplimentare..."
              className="w-full px-3 py-2 rounded-xl border border-line/70 bg-surface-secondary/40 text-pm-sm text-content-primary transition-smooth duration-150 focus:outline-none focus:border-accent/50 focus-visible:shadow-[var(--ring-soft)] resize-none"
            />
          </div>

          <div>
            <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Culoare (opțional)</label>
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { name: 'Implicit', value: '' },
                { name: 'Roșu',     value: '#ef4444' },
                { name: 'Portocaliu', value: '#f97316' },
                { name: 'Galben',   value: '#eab308' },
                { name: 'Verde',    value: '#22c55e' },
                { name: 'Cyan',     value: '#06b6d4' },
                { name: 'Albastru', value: '#3b82f6' },
                { name: 'Mov',      value: '#8b5cf6' },
                { name: 'Roz',      value: '#ec4899' },
              ].map((c) => (
                <button
                  key={c.value || 'default'}
                  type="button"
                  onClick={() => onChange({ ...draft, color: c.value })}
                  title={c.name}
                  className={`h-7 w-7 grid place-items-center rounded-full border-2 transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] ${
                    draft.color === c.value ? 'border-content-primary ring-2 ring-accent/40' : 'border-line'
                  }`}
                  style={{ background: c.value || 'transparent' }}
                >
                  {!c.value && <span className="text-pm-xs text-content-muted">×</span>}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-5 pt-4 border-t border-line">
          {onDelete && (
            <Button variant="danger" onClick={onDelete} disabled={saving}>
              <Trash2 className="h-3.5 w-3.5" />
              Șterge
            </Button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Button variant="outline" onClick={onCancel} disabled={saving}>
              Anulează
            </Button>
            <Button
              variant="primary"
              onClick={onSave}
              disabled={saving || !draft.title.trim() || !draft.date}
            >
              {saving ? 'Se salvează...' : isEdit ? 'Salvează' : 'Adaugă'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}




function MonthView({ range, cursor, eventsByDay, now, onEventClick, onDrop, onOpenDay, onCreate }: {
  range: { from: string; to: string };
  cursor: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  now: Date;
  onEventClick: (ev: CalendarEvent) => void;
  onDrop: (ev: CalendarEvent, newDate: string) => void;
  onOpenDay: (iso: string) => void;
  onCreate: (presetDate?: string) => void;
}) {
  const start = new Date(range.from);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const monthIdx = cursor.getMonth();
  const todayIso = fmtIso(now);
  
  const monthKey = `${cursor.getFullYear()}-${monthIdx}`;

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {}
      <div className="grid grid-cols-7 shrink-0 border-b border-line/70">
        {['Luni', 'Marți', 'Miercuri', 'Joi', 'Vineri', 'Sâmbătă', 'Duminică'].map(d => (
          <div key={d} className="text-pm-2xs font-semibold uppercase tracking-wide text-center py-2 text-content-muted">{d.slice(0, 3)}</div>
        ))}
      </div>
      {}
      <div key={monthKey} className="grid grid-cols-7 grid-rows-6 flex-1 min-h-0">
        {days.map((d, i) => {
          const iso = fmtIso(d);
          const inMonth = d.getMonth() === monthIdx;
          const isToday = iso === todayIso;
          const evs = eventsByDay.get(iso) || [];
          const col = i % 7;
          const row = Math.floor(i / 7);
          return (
            <div
              key={iso}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                const evJson = e.dataTransfer.getData('application/json');
                if (evJson) try { onDrop(JSON.parse(evJson), iso); } catch {  }
              }}
              onDoubleClick={() => onCreate(iso)}
              style={{ animationDelay: `${Math.min(i, 24) * 12}ms` }}
              className={`group relative flex flex-col min-h-0 px-1 pt-1 overflow-hidden transition-colors hover:bg-surface-secondary/60 ${
                col < 6 ? 'border-r' : ''} ${row < 5 ? 'border-b' : ''} border-line/60 ${
                inMonth ? '' : 'bg-surface-secondary/40'}`}
            >
              <div className="flex items-center justify-center shrink-0">
                <span className={`text-pm-xs tabular-nums h-6 min-w-6 px-1 grid place-items-center rounded-full transition-colors ${
                  isToday ? 'bg-accent text-[var(--color-on-accent)] font-bold'
                  : inMonth ? 'text-content-secondary group-hover:text-content-primary' : 'text-content-muted/60'
                }`}>
                  {d.getDate()}
                </span>
              </div>
              <div className="mt-0.5 space-y-0.5 overflow-hidden">
                {evs.slice(0, 3).map(ev => (
                  <div
                    key={ev.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify(ev))}
                    onClick={(e) => { e.stopPropagation(); onEventClick(ev); }}
                    className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md cursor-pointer hover:brightness-95 transition-colors duration-150"
                    style={{ backgroundColor: `${eventColor(ev)}1f` }}
                    title={`${TYPE_LABEL[ev.type]}: ${ev.title}`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: eventColor(ev) }} />
                    {eventTimeLabel(ev) && <span className="text-pm-2xs font-semibold shrink-0" style={{ color: eventColor(ev) }}>{eventTimeLabel(ev)}</span>}
                    <span className="text-pm-2xs font-medium min-w-0 truncate text-content-primary">{ev.title}</span>
                  </div>
                ))}
                {evs.length > 3 && (
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onOpenDay(iso); }}
                    className="w-full text-left text-pm-2xs font-medium text-content-muted hover:text-accent px-1.5 rounded-md transition-smooth duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
                    title={`Vezi toate cele ${evs.length} evenimente`}
                  >
                    +{evs.length - 3} mai multe
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}







function HourlyGrid({ days, eventsByDay, now, onEventClick, onDrop, onCreate }: {
  days: Date[];
  eventsByDay: Map<string, CalendarEvent[]>;
  now: Date;
  onEventClick: (ev: CalendarEvent) => void;
  onDrop: (ev: CalendarEvent, newDate: string) => void;
  onCreate: (presetDate?: string, presetStartTime?: string) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const todayIso = fmtIso(now);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const nowTop = (nowMin / (24 * 60)) * GRID_H;

  
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = Math.max(0, nowTop - 2 * SLOT_H);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days[0]?.toDateString()]);

  return (
    <div key={`hourly-${days.length}-${fmtIso(days[0])}`} className="flex flex-col flex-1 min-h-0">
      {}
      <div className="flex shrink-0 border-b border-line/70 pr-[var(--sb,0)]">
        <div className="w-14 shrink-0" />
        {days.map(d => {
          const iso = fmtIso(d);
          const isToday = iso === todayIso;
          return (
            <div key={iso} className="flex-1 text-center py-1.5 border-l border-line/60">
              <p className="text-pm-2xs uppercase tracking-wide text-content-muted capitalize">{d.toLocaleDateString('ro-RO', { weekday: 'short' })}</p>
              <p className={`mx-auto mt-0.5 h-8 w-8 grid place-items-center rounded-full text-pm-lg font-medium tabular-nums ${
                isToday ? 'bg-accent text-[var(--color-on-accent)]' : 'text-content-primary'}`}>{d.getDate()}</p>
            </div>
          );
        })}
      </div>

      {}
      <div className="flex shrink-0 border-b border-line/70 min-h-[2.75rem] max-h-36 overflow-y-auto">
        <div className="w-14 shrink-0 text-right pr-2 pt-2 text-pm-2xs uppercase tracking-wide text-content-muted">Toată ziua</div>
        {days.map(d => {
          const iso = fmtIso(d);
          const evs = (eventsByDay.get(iso) || []).filter(ev => !isTimedEvent(ev));
          return (
            <div
              key={iso}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { const j = e.dataTransfer.getData('application/json'); if (j) try { onDrop(JSON.parse(j), iso); } catch {  } }}
              className="flex-1 border-l border-line/60 p-1 space-y-1"
            >
              {evs.map(ev => (
                <div
                  key={ev.id}
                  draggable
                  onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify(ev))}
                  onClick={() => onEventClick(ev)}
                  className="flex items-center gap-1.5 px-2 py-1 rounded-md cursor-pointer hover:brightness-95 transition-colors duration-150"
                  style={{ backgroundColor: `${eventColor(ev)}26` }}
                  title={`${TYPE_LABEL[ev.type]}: ${ev.title}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full shrink-0" style={{ background: eventColor(ev) }} />
                  <span className="text-pm-2xs font-medium min-w-0 truncate" style={{ color: eventColor(ev) }}>{ev.title}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>

      {}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex" style={{ height: GRID_H }}>
          {}
          <div className="w-14 shrink-0 relative">
            {HOURS.map(h => (
              <div key={h} className="absolute right-2 -translate-y-1/2 text-pm-2xs tabular-nums text-content-muted" style={{ top: h * SLOT_H }}>
                {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
              </div>
            ))}
          </div>
          {}
          {days.map(d => {
            const iso = fmtIso(d);
            const isToday = iso === todayIso;
            const timed = (eventsByDay.get(iso) || []).filter(isTimedEvent);
            return (
              <div
                key={iso}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { const j = e.dataTransfer.getData('application/json'); if (j) try { onDrop(JSON.parse(j), iso); } catch {  } }}
                className="flex-1 relative border-l border-line/60"
              >
                {HOURS.map(h => (
                  <button
                    key={h}
                    type="button"
                    onClick={() => onCreate(iso, minutesToTime(h * 60))}
                    title="Adaugă eveniment personal"
                    className="absolute left-0 right-0 border-b border-line/40 hover:bg-accent-muted/40 transition-colors duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
                    style={{ top: h * SLOT_H, height: SLOT_H }}
                  />
                ))}
                {timed.map((ev, idx) => {
                  const start = timeToMinutes(ev.meta?.start_time as string | null) ?? 0;
                  const end = timeToMinutes(ev.meta?.end_time as string | null) ?? Math.min(start + 60, 24 * 60);
                  const top = (start / 60) * SLOT_H;
                  const height = Math.max(28, ((Math.max(end, start + 30) - start) / 60) * SLOT_H);
                  return (
                    <button
                      key={`${ev.id}-${idx}`}
                      type="button"
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify(ev))}
                      onClick={() => onEventClick(ev)}
                      className="absolute z-20 rounded-lg border px-2 py-1 text-left overflow-hidden shadow-[var(--elevation-1)] hover:brightness-95 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)]"
                      style={{
                        top,
                        height,
                        left: `${4 + (idx % 2) * 4}px`,
                        right: `${4 + (idx % 2) * 4}px`,
                        backgroundColor: `${eventColor(ev)}24`,
                        borderColor: `${eventColor(ev)}66`,
                      }}
                      title={`${eventTimeLabel(ev)} ${ev.title}`}
                    >
                      <span className="block text-pm-2xs font-semibold leading-tight" style={{ color: eventColor(ev) }}>{eventTimeLabel(ev)}</span>
                      <span className="block text-pm-xs font-medium text-content-primary leading-tight truncate">{ev.title}</span>
                    </button>
                  );
                })}
                {}
                {isToday && (
                  <div className="absolute left-0 right-0 z-10 pointer-events-none" style={{ top: nowTop }}>
                    <span className="absolute -left-1 -top-1 h-2.5 w-2.5 rounded-full bg-status-red anim-glow" />
                    <span className="block h-px bg-status-red" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}




function AgendaView({ upcoming, onEventClick }: {
  upcoming: CalendarEvent[];
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const groups = useMemo(() => {
    const m = new Map<string, CalendarEvent[]>();
    for (const ev of upcoming) {
      const k = ev.date.slice(0, 10);
      if (!m.has(k)) m.set(k, []);
      m.get(k)!.push(ev);
    }
    return Array.from(m.entries());
  }, [upcoming]);

  if (upcoming.length === 0) {
    return (
      <div className="flex-1 grid place-items-center p-8">
        <EmptyState icon={ListIcon} title="Agenda este goală" description="Nu sunt evenimente viitoare în intervalul afișat." />
      </div>
    );
  }

  return (
    <div className="flex-1 min-h-0 overflow-y-auto px-4 py-3 max-w-3xl mx-auto w-full enter-up">
      <div key={`agenda-${groups.length}`} className="space-y-5 stagger-in">
        {groups.map(([iso, list]) => {
          const d = new Date(iso);
          const isToday = iso === fmtIso(new Date());
          return (
            <div key={iso} className="flex gap-4">
              <div className="w-20 shrink-0 text-right pt-1">
                <p className={`text-pm-2xl font-semibold tabular-nums leading-none ${isToday ? 'text-accent' : 'text-content-primary'}`}>{d.getDate()}</p>
                <p className="text-pm-2xs uppercase tracking-wide text-content-muted mt-1 capitalize">{d.toLocaleDateString('ro-RO', { weekday: 'short', month: 'short' })}</p>
              </div>
              <div className="flex-1 space-y-1.5 border-l border-line/60 pl-4">
                {list.map(ev => (
                  <button
                    key={ev.id}
                    onClick={() => onEventClick(ev)}
                    className="group w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-surface-secondary hover:translate-x-0.5 active:scale-[0.99] transition-smooth duration-150 focus-visible:outline-none focus-visible:shadow-[var(--ring-soft)] motion-reduce:transform-none text-left"
                  >
                    <span className="h-2.5 w-2.5 rounded-full shrink-0 transition-transform duration-150 group-hover:scale-125 motion-reduce:transform-none" style={{ background: eventColor(ev) }} />
                    <span className="text-pm-sm font-medium text-content-primary min-w-0 truncate flex-1">{ev.title}</span>
                    <span className="text-pm-2xs text-content-muted shrink-0">{TYPE_LABEL[ev.type]}</span>
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
