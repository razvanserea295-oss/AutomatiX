import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  DynamicPage, DynamicPageTitle, Title, Button, BusyIndicator,
} from '@ui5/webcomponents-react';
import { apiCommand } from '@/api/commands';
import Ui5ClassicControl from '@/fiori/classic/Ui5ClassicControl';
import type { SapGlobal } from '@/fiori/classic/ui5Loader';
import type { User } from '@/core/types';

// Event types returned by `get_calendar_events` — the same shape the SaaS
// CalendarPage consumes. We mirror its field names exactly.
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
  meta?: Record<string, unknown>;
}

const TYPE_LABEL: Record<CalendarEventType, string> = {
  project_deadline: 'Deadline proiect',
  project_start: 'Start proiect',
  deplasare: 'Deplasare',
  maintenance: 'Mentenanță',
  compliance_task: 'Compliance',
  invoice_due: 'Scadență factură',
  quotation_valid_until: 'Expirare ofertă',
  personal: 'Personal',
};

// Map each event type to a classic CalendarDayType colour band (Type01..Type10),
// so the appointments are visually grouped by category in the planning calendar.
const TYPE_COLOR: Record<CalendarEventType, string> = {
  project_deadline: 'Type08',     // red
  project_start: 'Type09',        // blue
  deplasare: 'Type05',            // orange
  maintenance: 'Type07',          // purple
  compliance_task: 'Type10',      // teal
  invoice_due: 'Type01',          // green
  quotation_valid_until: 'Type06',// grey
  personal: 'Type07',             // purple
};

function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }
function endOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth() + 1, 0); }
function fmtIso(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

// Parse a yyyy-mm-dd (optionally with a HH:mm time) into a local Date.
function parseDate(dateIso: string, time?: string | null): Date {
  const [y, m, d] = dateIso.slice(0, 10).split('-').map(Number);
  if (time && /^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    const [h, min] = time.split(':').map(Number);
    return new Date(y, (m || 1) - 1, d || 1, h, min);
  }
  return new Date(y, (m || 1) - 1, d || 1);
}

// Build REAL classic sap.m.SinglePlanningCalendar appointments from the event list.
// Each appointment carries a JS Date start/end + the type colour, exactly as the
// classic control expects (it does not bind well to plain string dates).
function buildAppointments(sap: SapGlobal, events: CalendarEvent[]): SapGlobal[] {
  return events.map((ev) => {
    const startTime = (ev.meta?.start_time as string | null | undefined) ?? null;
    const endTime = (ev.meta?.end_time as string | null | undefined) ?? null;
    const start = parseDate(ev.date, startTime);

    let end: Date;
    if (ev.end_date) {
      end = parseDate(ev.end_date, endTime);
    } else if (endTime) {
      end = parseDate(ev.date, endTime);
    } else if (startTime) {
      end = new Date(start.getTime() + 60 * 60 * 1000); // default 1h block
    } else {
      end = parseDate(ev.date); // all-day
    }
    // Guard against an end that is not after start (classic control requires it).
    if (end.getTime() <= start.getTime()) {
      end = new Date(start.getTime() + 30 * 60 * 1000);
    }

    const fullDay = !startTime && !endTime;

    return new sap.m.SinglePlanningCalendarAppointment({
      title: ev.title,
      text: TYPE_LABEL[ev.type],
      type: TYPE_COLOR[ev.type],
      startDate: start,
      endDate: end,
      fullDay,
    });
  });
}

function buildCalendar(sap: SapGlobal, events: CalendarEvent[], startDate: Date): SapGlobal {
  const calendar = new sap.m.SinglePlanningCalendar({
    title: 'Calendarul meu',
    startDate,
    appointments: buildAppointments(sap, events),
    views: [
      new sap.m.SinglePlanningCalendarDayView({ key: 'day', title: 'Zi' }),
      new sap.m.SinglePlanningCalendarWeekView({ key: 'week', title: 'Săptămână' }),
      new sap.m.SinglePlanningCalendarMonthView({ key: 'month', title: 'Lună' }),
    ],
  });
  // Default to the month overview.
  if (calendar.setSelectedView && calendar.getViews) {
    const views = calendar.getViews();
    const monthView = views.find((v: SapGlobal) => v.getKey?.() === 'month');
    if (monthView) calendar.setSelectedView(monthView);
  }
  return calendar;
}

export default function FioriCalendar({ user }: { user: User }) {
  const [cursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(false);

  // Load the whole current month so the planning calendar has data across its views.
  const range = useMemo(() => ({
    from: fmtIso(startOfMonth(cursor)),
    to: fmtIso(endOfMonth(cursor)),
  }), [cursor]);

  const fetchEvents = useCallback(() => {
    setLoading(true);
    apiCommand<CalendarEvent[]>('get_calendar_events', { from: range.from, to: range.to })
      .then((rows) => setEvents(Array.isArray(rows) ? rows : []))
      .catch(() => setEvents([]))
      .finally(() => setLoading(false));
  }, [range.from, range.to]);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);

  const calStart = useMemo(() => startOfMonth(cursor), [cursor]);
  const monthLabel = cursor.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' });

  return (
    <DynamicPage
      style={{ height: '100%' }}
      titleArea={<DynamicPageTitle><Title slot="heading" level="H3">Calendar</Title></DynamicPageTitle>}
    >
      <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <Button design="Emphasized" onClick={fetchEvents}>Reîncarcă</Button>
          <Button design="Transparent" disabled>
            {`${monthLabel.charAt(0).toUpperCase()}${monthLabel.slice(1)} — ${events.length} evenimente`}
          </Button>
          <Button design="Transparent" disabled>{`Utilizator: ${user.full_name || user.username}`}</Button>
        </div>

        <div style={{ flex: 1, minHeight: 0 }}>
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
              <BusyIndicator active size="L" />
            </div>
          ) : (
            <Ui5ClassicControl
              key={`${range.from}-${events.length}`}
              height="100%"
              create={(sap) => buildCalendar(sap, events, calStart)}
            />
          )}
        </div>
      </div>
    </DynamicPage>
  );
}
