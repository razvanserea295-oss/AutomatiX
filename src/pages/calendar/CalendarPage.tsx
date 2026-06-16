import { useState, useEffect, useMemo, useCallback, type CSSProperties } from 'react';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Filter, Download, Plus, Trash2, Lock, Clock, Flag, MapPin } from 'lucide-react';
import { useLocation } from 'wouter';
import { apiCommand } from '@/api/commands';
import type { User } from '@/core/types';
import Button from '@/components/ui/Button';
import Page from '@/components/ui/Page';
import StatusBadge from '@/components/ui/StatusBadge';
import { AnimatedTabs, Skeleton, EmptyState, HeroHeader, GlassCard, MetricValue } from '@/components/ui';
import { filterResetBtnCls } from '@/components/ui/filterControls';
import type { StatusTone } from '@/lib/statusTokens';
import { toast } from '@/store/toastStore';
import CalendarEnhancements from '@/pages/calendar/CalendarEnhancements';

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

const TYPE_COLOR: Record<CalendarEventType, string> = {
  project_deadline: 'bg-status-red/30 text-status-red border-status-red/50',
  project_start: 'bg-status-blue/30 text-status-blue border-status-blue/50',
  deplasare: 'bg-status-amber/30 text-status-amber border-status-amber/50',
  maintenance: 'bg-status-purple/30 text-status-purple border-status-purple/50',
  compliance_task: 'bg-status-teal/30 text-status-teal border-status-teal/50',
  invoice_due: 'bg-status-green/30 text-status-green border-status-green/50',
  quotation_valid_until: 'bg-accent/30 text-accent border-accent/50',
  
  
  
  personal: 'bg-violet-500/30 text-violet-500 border-violet-500/50',
};





const TYPE_TONE: Record<CalendarEventType, StatusTone> = {
  project_deadline: 'danger',
  project_start: 'info',
  deplasare: 'warning',
  maintenance: 'special',
  compliance_task: 'progress',
  invoice_due: 'success',
  quotation_valid_until: 'accent',
  personal: 'special',
};












function eventVisual(ev: CalendarEvent): { className: string; style?: CSSProperties } {
  const color = ev.type === 'personal' ? (ev.meta?.color as string | undefined) : undefined;
  if (!color) return { className: TYPE_COLOR[ev.type] };
  return {
    className: 'border',
    style: {
      
      
      backgroundColor: `${color}26`,
      borderColor: `${color}80`,
      color: color,
    },
  };
}

interface PersonalEventDraft {
  id?: number;
  title: string;
  date: string;
  end_date: string;
  notes: string;
  color: string;
}

const EMPTY_DRAFT: PersonalEventDraft = {
  title: '', date: '', end_date: '', notes: '', color: '',
};

type ViewMode = 'month' | 'week' | 'day';

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

export default function CalendarPage({ user: _user }: { user: User | null }) {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<ViewMode>('month');
  const [cursor, setCursor] = useState(new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState<Set<CalendarEventType>>(new Set());

  
  const [editorOpen, setEditorOpen] = useState(false);
  const [draft, setDraft] = useState<PersonalEventDraft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);

  
  
  
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
    setCursor(c => view === 'month'
      ? new Date(c.getFullYear(), c.getMonth() - 1, 1)
      : addDays(c, view === 'week' ? -7 : -1));
  };
  const goNext = () => {
    setCursor(c => view === 'month'
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
      setDraft({
        id: ev.source_id,
        title: ev.title,
        date: ev.date,
        end_date: ev.end_date || '',
        notes: (ev.meta?.notes as string) || '',
        color: (ev.meta?.color as string) || '',
      });
      setEditorOpen(true);
      return;
    }
    if (ev.url) setLocation(ev.url);
  };

  const openCreateEditor = (presetDate?: string) => {
    setDraft({ ...EMPTY_DRAFT, date: presetDate || fmtIso(new Date()) });
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
          notes: draft.notes || '',
          color: draft.color || '',
        });
        toast.success('Eveniment actualizat');
      } else {
        await apiCommand('create_personal_calendar_event', {
          title: draft.title.trim(),
          date: draft.date,
          end_date: draft.end_date || null,
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
    if (!confirm('Sigur ștergi acest eveniment personal?')) return;
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

  const headerLabel = view === 'day'
    ? cursor.toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
    : view === 'week'
    ? `${fmtIso(startOfWeek(cursor))} → ${fmtIso(addDays(startOfWeek(cursor), 6))}`
    : cursor.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });

  
  
  const todayIso = fmtIso(new Date());
  const kpiTotal = events.length;
  const kpiToday = events.filter(e => e.date.slice(0, 10) === todayIso).length;
  const kpiDeadlines = events.filter(e => e.type === 'project_deadline').length;
  const kpiDeplasari = events.filter(e => e.type === 'deplasare').length;

  
  const upcoming = useMemo(() => {
    return [...events]
      .filter(e => e.date.slice(0, 10) >= todayIso)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 8);
  }, [events, todayIso]);

  return (
    <Page className="mod-shell">
      <div className="mod-canvas">

        {}
        <HeroHeader
          className="enter-up" style={{ animationDelay: '0ms' }}
          eyebrow="Personal"
          icon={CalendarIcon}
          title="Calendar"
          subtitle="Toate deadline-urile, deplasările, mentenanțele și scadențele într-un singur loc"
          actions={<>
            <Button size="sm" variant="outline" onClick={downloadIcal}>
              <Download className="h-3.5 w-3.5" /> iCal
            </Button>
            <Button size="sm" onClick={() => openCreateEditor()}>
              <Plus className="h-3.5 w-3.5" /> Eveniment personal
            </Button>
          </>}
        />

        {}
        <div className="mod-kpis enter-up" style={{ animationDelay: '80ms' }}>
          <KpiMini icon={CalendarIcon} label="În interval"  value={kpiTotal} />
          <KpiMini icon={Clock}        label="Astăzi"       value={kpiToday} warn={kpiToday > 0} />
          <KpiMini icon={Flag}         label="Deadline-uri" value={kpiDeadlines} />
          <KpiMini icon={MapPin}       label="Deplasări"    value={kpiDeplasari} />
        </div>

        {}
        <div className="mod-bento">

          {}
          <GlassCard size="regular" className="enter-up !p-0 overflow-hidden" style={{ animationDelay: '160ms' }}>
            {}
            <div className="flex items-center gap-2 px-5 pt-5 pb-3 flex-wrap">
              <Button size="sm" variant="outline" onClick={goPrev}><ChevronLeft className="h-3.5 w-3.5" /></Button>
              <Button size="sm" variant="outline" onClick={goToday}>Astăzi</Button>
              <Button size="sm" variant="outline" onClick={goNext}><ChevronRight className="h-3.5 w-3.5" /></Button>
              <span className="text-sm font-semibold text-content-primary capitalize ml-1">{headerLabel}</span>
              <div className="ml-auto">
                <AnimatedTabs
                  active={view}
                  onChange={(id) => setView(id as ViewMode)}
                  tabs={[
                    { id: 'month', label: 'Luna' },
                    { id: 'week', label: 'Săptămâna' },
                    { id: 'day', label: 'Zi' },
                  ]}
                />
              </div>
            </div>

            {}
            <div className="flex items-center gap-2 px-5 pb-3 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-content-muted" />
              {(Object.keys(TYPE_LABEL) as CalendarEventType[]).map(t => {
                const isActive = filters.size === 0 || filters.has(t);
                return (
                  <button key={t} onClick={() => toggleFilter(t)}
                    className={`transition-all ${isActive ? '' : 'opacity-40 hover:opacity-70'}`}>
                    <StatusBadge tone={isActive ? TYPE_TONE[t] : 'neutral'} label={TYPE_LABEL[t]} size="sm" />
                  </button>
                );
              })}
              {filters.size > 0 && (
                <button onClick={() => setFilters(new Set())} className={filterResetBtnCls + ' ml-1'}>
                  resetează
                </button>
              )}
            </div>

            {}
            <div className="density-compact px-4 pb-4">
              <div className="min-h-[58vh] flex flex-col">
                {loading ? (
                  <div className="flex-1 space-y-2">
                    {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height={68} rounded="md" />)}
                  </div>
                ) : view === 'month' ? (
                  <MonthView
                    range={range}
                    cursor={cursor}
                    eventsByDay={eventsByDay}
                    onEventClick={handleEventClick}
                    onDrop={handleDrop}
                    onOpenDay={(iso) => {
                      
                      
                      const [y, m, d] = iso.split('-').map(Number);
                      setCursor(new Date(y, m - 1, d));
                      setView('day');
                    }}
                  />
                ) : view === 'week' ? (
                  <WeekView range={range} eventsByDay={eventsByDay} onEventClick={handleEventClick} onDrop={handleDrop} />
                ) : (
                  <DayView cursor={cursor} eventsByDay={eventsByDay} onEventClick={handleEventClick} />
                )}
              </div>
              <CalendarEnhancements events={events.map(e => ({
                id: e.id, title: e.title, start: e.date, end: e.end_date ?? e.date, type: e.type,
              }))} />
            </div>
          </GlassCard>

          {}
          <div className="mod-aside enter-up" style={{ animationDelay: '240ms' }}>
            <GlassCard size="regular" className="!p-0 overflow-hidden">
              <div className="flex items-center gap-2 px-5 pt-5 pb-3">
                <Clock className="h-3.5 w-3.5 text-accent shrink-0" />
                <span className="text-pm-2xs font-bold uppercase tracking-[0.12em] text-content-muted">Următoarele evenimente</span>
                {upcoming.length > 0 && <span className="text-pm-2xs font-bold tabular-nums text-accent">{upcoming.length}</span>}
              </div>
              <div className="density-compact px-5 pb-5">
                {loading ? (
                  <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} height={52} rounded="lg" />)}</div>
                ) : upcoming.length === 0 ? (
                  <EmptyState icon={CalendarIcon} title="Nimic în față" description="Nu sunt evenimente viitoare în intervalul afișat." />
                ) : (
                  <div className="space-y-2">
                    {upcoming.map(ev => {
                      const v = eventVisual(ev);
                      const d = new Date(ev.date);
                      const rel = ev.date.slice(0, 10) === todayIso
                        ? 'Azi'
                        : ev.date.slice(0, 10) === fmtIso(addDays(new Date(), 1))
                        ? 'Mâine'
                        : d.toLocaleDateString('ro-RO', { day: 'numeric', month: 'short' });
                      return (
                        <button key={ev.id} onClick={() => handleEventClick(ev)}
                          className="w-full glass-surface rounded-lg hover-lift p-3 flex items-center gap-3 text-left">
                          <span className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0 border"
                            style={v.style} >
                            <span className={`h-2 w-2 rounded-full ${v.style ? '' : v.className}`}
                              style={v.style ? { background: v.style.color as string } : undefined} />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm text-content-primary truncate">{ev.title}</p>
                            <p className="text-pm-2xs text-content-muted mt-0.5">{TYPE_LABEL[ev.type]}</p>
                          </div>
                          <span className="text-pm-2xs font-semibold text-content-secondary shrink-0 capitalize">{rel}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </GlassCard>
          </div>
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div className="bg-surface-primary border border-line rounded-lg shadow-xl w-full max-w-md p-5"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-1">
          <Lock className="h-3.5 w-3.5 text-content-muted" />
          <span className="text-pm-xs uppercase tracking-wider text-content-muted">Eveniment personal — privat</span>
        </div>
        <h2 className="text-pm-lg font-semibold text-content-primary mb-3">
          {isEdit ? 'Editează eveniment' : 'Eveniment nou'}
        </h2>
        <p className="text-pm-xs text-content-muted mb-4">
          Doar tu vezi acest eveniment. Restul utilizatorilor nu îl pot vedea.
        </p>

        <div className="space-y-3">
          <div>
            <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Titlu</label>
            <input
              value={draft.title}
              onChange={(e) => onChange({ ...draft, title: e.target.value })}
              placeholder="Ex: Întâlnire client, Concediu, Vizită medicală..."
              autoFocus
              className="w-full h-10 px-3 border border-line bg-surface-primary rounded-md text-pm-sm text-content-primary focus:outline-none focus:border-accent"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Data început</label>
              <input
                type="date"
                value={draft.date}
                onChange={(e) => onChange({ ...draft, date: e.target.value })}
                className="w-full h-10 px-3 border border-line bg-surface-primary rounded-md text-pm-sm text-content-primary focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Data final (opțional)</label>
              <input
                type="date"
                value={draft.end_date}
                min={draft.date}
                onChange={(e) => onChange({ ...draft, end_date: e.target.value })}
                className="w-full h-10 px-3 border border-line bg-surface-primary rounded-md text-pm-sm text-content-primary focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div>
            <label className="block text-pm-xs font-semibold text-content-secondary mb-1">Note (opțional)</label>
            <textarea
              value={draft.notes}
              onChange={(e) => onChange({ ...draft, notes: e.target.value })}
              rows={3}
              placeholder="Detalii suplimentare..."
              className="w-full px-3 py-2 border border-line bg-surface-primary rounded-md text-pm-sm text-content-primary focus:outline-none focus:border-accent resize-none"
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
                  className={`h-7 w-7 rounded-full border-2 transition-all ${
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
            <button
              onClick={onDelete}
              disabled={saving}
              className="h-9 px-3 rounded-md border border-status-red/40 bg-status-red/5 text-pm-sm text-status-red hover:bg-status-red/10 disabled:opacity-50 flex items-center gap-1.5"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Șterge
            </button>
          )}
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={onCancel}
              disabled={saving}
              className="h-9 px-4 rounded-md border border-line text-pm-sm text-content-secondary hover:bg-surface-tertiary disabled:opacity-50"
            >
              Anulează
            </button>
            <button
              onClick={onSave}
              disabled={saving || !draft.title.trim() || !draft.date}
              className="h-9 px-5 rounded-md bg-accent text-pm-sm font-semibold text-surface-primary hover:bg-accent/90 disabled:opacity-50"
            >
              {saving ? 'Se salvează...' : isEdit ? 'Salvează' : 'Adaugă'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MonthView({ range, cursor, eventsByDay, onEventClick, onDrop, onOpenDay }: {
  range: { from: string; to: string };
  cursor: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  onEventClick: (ev: CalendarEvent) => void;
  onDrop: (ev: CalendarEvent, newDate: string) => void;
  

  onOpenDay: (iso: string) => void;
}) {
  const start = new Date(range.from);
  const days = Array.from({ length: 42 }, (_, i) => addDays(start, i));
  const monthIdx = cursor.getMonth();
  const todayIso = fmtIso(new Date());

  return (
    <div className="grid grid-cols-7 grid-rows-[auto_repeat(6,1fr)] bg-line border border-line overflow-hidden flex-1 min-h-0" style={{ gap: '1px' }}>
      {['Lu', 'Ma', 'Mi', 'Jo', 'Vi', 'Sa', 'Du'].map(d => (
        <div key={d} className="bg-surface-secondary text-pm-2xs font-bold uppercase text-center py-1 text-content-muted">{d}</div>
      ))}
      {days.map(d => {
        const iso = fmtIso(d);
        const inMonth = d.getMonth() === monthIdx;
        const isToday = iso === todayIso;
        const isWeekend = d.getDay() === 0 || d.getDay() === 6;
        const evs = eventsByDay.get(iso) || [];
        return (
          <div key={iso}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const evJson = e.dataTransfer.getData('application/json');
              if (evJson) try { onDrop(JSON.parse(evJson), iso); } catch {  }
            }}
            className={`p-1 transition-colors ${
              !inMonth ? 'bg-surface-secondary/50 opacity-50' :
              isWeekend ? 'bg-surface-secondary' : 'bg-surface-primary'
            } ${isToday ? 'ring-2 ring-accent ring-inset' : ''}`}>
            <div className={`flex items-center justify-end mb-0.5 ${
              isToday ? 'text-accent font-bold' : inMonth ? 'text-content-primary' : 'text-content-muted'
            }`}>
              <span className={`text-xs ${isToday ? 'bg-accent text-surface-primary h-5 w-5 flex items-center justify-center font-bold' : ''}`}>
                {d.getDate()}
              </span>
            </div>
            <div className="space-y-0.5">
              {evs.slice(0, 3).map(ev => {
                const v = eventVisual(ev);
                return (
                  <div key={ev.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify(ev))}
                    onClick={() => onEventClick(ev)}
                    style={v.style}
                    className={`text-pm-2xs px-1.5 py-0.5 cursor-pointer truncate font-medium ${v.className}`}
                    title={`${TYPE_LABEL[ev.type]}: ${ev.title}`}>
                    {ev.title}
                  </div>
                );
              })}
              {evs.length > 3 && (
                <button
                  type="button"
                  onClick={(e) => {
                    
                    
                    e.stopPropagation();
                    onOpenDay(iso);
                  }}
                  className="w-full text-left text-pm-2xs text-content-muted hover:text-accent px-1 italic cursor-pointer"
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
  );
}

function WeekView({ range, eventsByDay, onEventClick, onDrop }: {
  range: { from: string; to: string };
  eventsByDay: Map<string, CalendarEvent[]>;
  onEventClick: (ev: CalendarEvent) => void;
  onDrop: (ev: CalendarEvent, newDate: string) => void;
}) {
  const start = new Date(range.from);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const todayIso = fmtIso(new Date());

  return (
    <div className="grid grid-cols-7 border border-line flex-1 min-h-0" style={{ gap: '1px', background: 'var(--color-border)' }}>
      {days.map(d => {
        const iso = fmtIso(d);
        const isToday = iso === todayIso;
        const evs = eventsByDay.get(iso) || [];
        return (
          <div key={iso}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              const evJson = e.dataTransfer.getData('application/json');
              if (evJson) try { onDrop(JSON.parse(evJson), iso); } catch {  }
            }}
            className={`bg-surface-primary p-2 ${isToday ? 'ring-2 ring-accent ring-inset' : ''}`}>
            <div className="flex items-baseline justify-between mb-2 pb-2 border-b border-line">
              <span className="text-xs font-semibold text-content-primary capitalize">
                {d.toLocaleDateString('ro-RO', { weekday: 'short' })}
              </span>
              <span className={`text-base font-semibold ${isToday ? 'text-accent' : 'text-content-secondary'}`}>{d.getDate()}</span>
            </div>
            <div className="space-y-1">
              {evs.length === 0 ? (
                <p className="text-pm-2xs text-content-muted italic text-center py-4">—</p>
              ) : evs.map(ev => {
                const v = eventVisual(ev);
                return (
                  <div key={ev.id}
                    draggable
                    onDragStart={(e) => e.dataTransfer.setData('application/json', JSON.stringify(ev))}
                    onClick={() => onEventClick(ev)}
                    style={v.style}
                    className={`text-xs px-2 py-1.5 cursor-pointer ${v.className}`}>
                    <p className="font-medium leading-tight">{ev.title}</p>
                    <p className="text-pm-2xs opacity-75 mt-0.5">{TYPE_LABEL[ev.type]}</p>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}






function DayView({ cursor, eventsByDay, onEventClick }: {
  cursor: Date;
  eventsByDay: Map<string, CalendarEvent[]>;
  onEventClick: (ev: CalendarEvent) => void;
}) {
  const iso = fmtIso(cursor);
  const isToday = iso === fmtIso(new Date());
  const evs = eventsByDay.get(iso) || [];
  
  const grouped = useMemo(() => {
    const m = new Map<CalendarEventType, CalendarEvent[]>();
    for (const ev of evs) {
      if (!m.has(ev.type)) m.set(ev.type, []);
      m.get(ev.type)!.push(ev);
    }
    return Array.from(m.entries());
  }, [evs]);

  return (
    <div className={`flex-1 min-h-0 border border-line bg-surface-primary p-5 overflow-y-auto ${isToday ? 'ring-2 ring-accent ring-inset' : ''}`}>
      {evs.length === 0 ? (
        <EmptyState icon={CalendarIcon} title="Nicio activitate planificată" description="Nu există evenimente în această zi." />
      ) : (
        <div className="space-y-5 max-w-3xl mx-auto">
          {grouped.map(([type, list]) => (
            <div key={type}>
              <h3 className="text-xs font-bold uppercase tracking-wide text-content-muted mb-2">
                {TYPE_LABEL[type]} <span className="text-content-secondary">({list.length})</span>
              </h3>
              <div className="space-y-1.5">
                {list.map(ev => {
                  const v = eventVisual(ev);
                  return (
                    <button key={ev.id} onClick={() => onEventClick(ev)}
                      style={v.style}
                      className={`w-full text-left px-3 py-2 transition-colors hover:opacity-80 ${v.className}`}>
                      <p className="text-sm font-medium">{ev.title}</p>
                      {ev.status && <p className="text-pm-2xs opacity-75 mt-0.5">Status: {ev.status}</p>}
                      {ev.end_date && ev.end_date !== ev.date && (
                        <p className="text-pm-2xs opacity-75">Până: {ev.end_date}</p>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
