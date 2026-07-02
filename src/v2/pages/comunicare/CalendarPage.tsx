import { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus } from '@/icons';
import { toast } from 'sonner';
import { apiCommand } from '@/api/commands';
import { cn } from '@/v2/lib/cn';
import { Page, PageHeader, PageBody } from '@/v2/components/app/Page';
import AsyncContent from '@/v2/components/app/AsyncContent';
import { Button } from '@/v2/components/ui/button';
import { Input } from '@/v2/components/ui/input';
import { Label } from '@/v2/components/ui/label';
import { Card } from '@/v2/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/v2/components/ui/dialog';

interface CalendarEvent {
  id: string; type: string; title: string; date: string;
}

const WEEKDAYS = ['Lun', 'Mar', 'Mie', 'Joi', 'Vin', 'Sâm', 'Dum'];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function iso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

function startOfWeekMonday(d: Date): Date {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7;
  x.setDate(x.getDate() - day);
  x.setHours(0, 0, 0, 0);
  return x;
}

function monthGrid(cursor: Date): { cells: Date[]; from: string; to: string; label: string } {
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const first = new Date(y, m, 1);
  const gridStart = startOfWeekMonday(first);
  const cells: Date[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push(d);
  }
  return {
    cells,
    from: iso(cells[0]!),
    to: iso(cells[cells.length - 1]!),
    label: first.toLocaleDateString('ro-RO', { month: 'long', year: 'numeric' }),
  };
}

const TYPE_COLORS: Record<string, string> = {
  personal: 'bg-primary',
  project_deadline: 'bg-red-500',
  project_start: 'bg-blue-500',
  deplasare: 'bg-amber-500',
  invoice_due: 'bg-purple-500',
};

export default function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [pickedDay, setPickedDay] = useState<string | null>(null);

  const grid = useMemo(() => monthGrid(cursor), [cursor]);

  const load = useCallback(() => {
    setLoading(true);
    apiCommand<CalendarEvent[]>('get_calendar_events', { from: grid.from, to: grid.to })
      .then((d) => setEvents(Array.isArray(d) ? d : []))
      .finally(() => setLoading(false));
  }, [grid.from, grid.to]);

  useEffect(() => { load(); }, [load]);

  const byDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const ev of events) {
      const key = ev.date.slice(0, 10);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(ev);
    }
    return map;
  }, [events]);

  const dayEvents = pickedDay ? (byDay.get(pickedDay) ?? []) : [];

  const openCreateFor = (dayIso: string) => {
    setDate(dayIso);
    setTitle('');
    setOpen(true);
  };

  const createEvent = async () => {
    if (!title.trim() || !date) {
      toast.error('Titlu și dată obligatorii');
      return;
    }
    try {
      await apiCommand('create_personal_calendar_event', {
        request: { title: title.trim(), date, end_date: date },
      });
      toast.success('Eveniment creat');
      setOpen(false);
      load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Eroare');
    }
  };

  const currentMonth = cursor.getMonth();

  return (
    <Page fill>
      <PageHeader
        title="Calendar"
        description={grid.label}
        actions={
          <>
            <Button size="sm" variant="outline" onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1))}><ChevronLeft className="h-4 w-4" /></Button>
            <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>Azi</Button>
            <Button size="sm" variant="outline" onClick={() => setCursor((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1))}><ChevronRight className="h-4 w-4" /></Button>
            <Button size="sm" onClick={() => openCreateFor(iso(new Date()))}><Plus className="mr-2 h-4 w-4" />Eveniment</Button>
          </>
        }
      />

      <PageBody>
        <div className="grid min-h-0 flex-1 gap-2 lg:grid-cols-[1fr_280px]">
          <AsyncContent loading={loading} error={null}>
            <Card className="shadow-none overflow-hidden p-3">
              <div className="grid grid-cols-7 gap-px text-center text-xs font-medium text-muted-foreground mb-1">
                {WEEKDAYS.map((w) => <div key={w} className="py-1">{w}</div>)}
              </div>
              <div className="grid grid-cols-7 gap-px bg-border rounded-lg overflow-hidden">
                {grid.cells.map((d) => {
                  const key = iso(d);
                  const evs = byDay.get(key) ?? [];
                  const inMonth = d.getMonth() === currentMonth;
                  const isToday = key === iso(new Date());
                  const isPicked = key === pickedDay;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPickedDay(key)}
                      onDoubleClick={() => openCreateFor(key)}
                      className={cn(
                        'min-h-[72px] bg-background p-1.5 text-left transition-colors hover:bg-muted/50',
                        !inMonth && 'text-muted-foreground/50 bg-muted/20',
                        isToday && 'ring-1 ring-inset ring-primary',
                        isPicked && 'bg-muted',
                      )}
                    >
                      <span className="text-xs font-medium">{d.getDate()}</span>
                      <div className="mt-1 space-y-0.5">
                        {evs.slice(0, 3).map((ev) => (
                          <div key={ev.id} className="flex items-center gap-1 truncate text-[10px]">
                            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', TYPE_COLORS[ev.type] ?? 'bg-muted-foreground')} />
                            <span className="truncate">{ev.title}</span>
                          </div>
                        ))}
                        {evs.length > 3 && <p className="text-[10px] text-muted-foreground">+{evs.length - 3}</p>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </AsyncContent>

          <Card className="shadow-none h-fit p-4">
            {!pickedDay ? (
              <p className="text-sm text-muted-foreground">Selectează o zi din calendar.</p>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold">{new Date(pickedDay).toLocaleDateString('ro-RO', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                  <Button size="sm" variant="outline" onClick={() => openCreateFor(pickedDay)}><Plus className="h-3 w-3" /></Button>
                </div>
                {dayEvents.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Niciun eveniment.</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {dayEvents.map((ev) => (
                      <li key={ev.id} className="rounded border px-2 py-1.5">
                        <p className="font-medium">{ev.title}</p>
                        <p className="text-xs text-muted-foreground">{ev.type}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </Card>
        </div>
      </PageBody>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Eveniment personal</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5"><Label>Titlu</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div className="grid gap-1.5"><Label>Dată</Label><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Anulează</Button>
            <Button onClick={() => void createEvent()}>Salvează</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
