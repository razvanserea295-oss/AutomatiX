import { useEffect, useMemo, useState } from 'react';
import { ClipboardList, Plus, Minus, Trash2, Send, ShoppingBag, ChefHat, CheckCircle2, Clock, X, UtensilsCrossed } from 'lucide-react';
import { confirmDialog } from '@/components/ConfirmDialog';
import { ViewerBanner } from '@/components/ViewerBanner';
import { useViewerMode } from '@/hooks/useViewerMode';
import type { User } from '@/core/types';
import { useMenuStore, type MenuItem } from '@/store/menuStore';
import { useOrderStore, type Order, type NewOrderItem, type OrderStatus } from '@/store/orderStore';
import { toast } from '@/store/toastStore';
import { useSettingsStore, useMoney } from '@/store/settingsStore';

import Page from '@/redesign/ui/Page';
import Card from '@/redesign/ui/Card';
import KpiCard from '@/redesign/ui/KpiCard';
import Button from '@/redesign/ui/Button';
import IconButton from '@/redesign/ui/IconButton';
import StatusBadge from '@/redesign/ui/StatusBadge';
import SectionHeader from '@/redesign/ui/SectionHeader';
import EmptyState from '@/redesign/ui/EmptyState';
import { vtName } from '@/redesign/lib/viewTransition';

const STATUS_META: Record<string, { label: string; tone: 'info' | 'warning' | 'success' | 'neutral' | 'danger' | 'progress' }> = {
  noua: { label: 'Nouă', tone: 'info' },
  in_preparare: { label: 'În preparare', tone: 'progress' },
  gata: { label: 'Gata', tone: 'success' },
  livrata: { label: 'Livrată', tone: 'neutral' },
  anulata: { label: 'Anulată', tone: 'danger' },
};
const NEXT_STATUS: Record<string, OrderStatus | null> = {
  noua: 'in_preparare', in_preparare: 'gata', gata: 'livrata', livrata: null, anulata: null,
};
const TYPE_LABEL: Record<string, string> = { dine_in: 'La masă', takeaway: 'La pachet', delivery: 'Livrare' };

interface CartLine extends NewOrderItem { key: string }

export default function OrdersPage({ user: _user }: { user: User | null }) {
  const isViewer = useViewerMode('menu');
  const menuItems = useMenuStore(s => s.items);
  const fetchMenu = useMenuStore(s => s.fetchItems);
  const orders = useOrderStore(s => s.orders);
  const loading = useOrderStore(s => s.loading);
  const fetchOrders = useOrderStore(s => s.fetchOrders);
  const createOrder = useOrderStore(s => s.createOrder);
  const setStatus = useOrderStore(s => s.setStatus);
  const deleteOrder = useOrderStore(s => s.deleteOrder);
  const loadSettings = useSettingsStore(s => s.load);
  const money = useMoney();

  const [cart, setCart] = useState<CartLine[]>([]);
  const [orderType, setOrderType] = useState('dine_in');
  const [tableLabel, setTableLabel] = useState('');
  const [customer, setCustomer] = useState('');
  const [placing, setPlacing] = useState(false);

  useEffect(() => {
    void fetchMenu();
    void fetchOrders();
    void loadSettings();
  }, [fetchMenu, fetchOrders, loadSettings]);

  const available = useMemo(() => menuItems.filter(m => m.available === 1), [menuItems]);

  const addToCart = (m: MenuItem) => {
    setCart(prev => {
      const found = prev.find(l => l.menu_item_id === m.id);
      if (found) return prev.map(l => (l.menu_item_id === m.id ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { key: `m${m.id}`, menu_item_id: m.id, name: m.name, unit_price: m.price, quantity: 1 }];
    });
  };
  const bump = (key: string, d: number) => setCart(prev => prev
    .map(l => (l.key === key ? { ...l, quantity: Math.max(0, l.quantity + d) } : l))
    .filter(l => l.quantity > 0));
  const removeLine = (key: string) => setCart(prev => prev.filter(l => l.key !== key));
  const resetCart = () => { setCart([]); setTableLabel(''); setCustomer(''); setOrderType('dine_in'); };

  const cartTotal = useMemo(() => cart.reduce((s, l) => s + l.unit_price * l.quantity, 0), [cart]);

  const placeOrder = async () => {
    if (cart.length === 0) { toast.error('Adaugă produse în comandă'); return; }
    setPlacing(true);
    try {
      const o = await createOrder({
        order_type: orderType,
        table_label: tableLabel || null,
        customer_name: customer || null,
        items: cart.map(({ menu_item_id, name, unit_price, quantity }) => ({ menu_item_id, name, unit_price, quantity })),
      });
      toast.success(`Comanda ${o.code} trimisă`);
      resetCart();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Eroare la trimitere');
    } finally {
      setPlacing(false);
    }
  };

  const advance = async (o: Order) => {
    const next = NEXT_STATUS[o.status];
    if (!next) return;
    try { await setStatus(o.id, next); } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };
  const cancel = async (o: Order) => {
    if (!(await confirmDialog({ title: 'Anulează comanda?', body: `${o.code} va fi marcată anulată.`, danger: true }))) return;
    try { await setStatus(o.id, 'anulata'); } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };
  const remove = async (o: Order) => {
    if (!(await confirmDialog({ title: 'Șterge comanda?', body: `${o.code} va fi eliminată definitiv.`, danger: true }))) return;
    try { await deleteOrder(o.id); toast.success('Comandă ștearsă'); } catch (err) { toast.error(err instanceof Error ? err.message : 'Eroare'); }
  };

  const isToday = (s: string) => (s || '').slice(0, 10) === new Date().toISOString().slice(0, 10);
  const metrics = useMemo(() => {
    const active = orders.filter(o => o.status === 'noua' || o.status === 'in_preparare' || o.status === 'gata');
    const todayDone = orders.filter(o => o.status === 'livrata' && isToday(o.created_at));
    return {
      active: active.length,
      preparing: orders.filter(o => o.status === 'in_preparare').length,
      ready: orders.filter(o => o.status === 'gata').length,
      revenue: todayDone.reduce((s, o) => s + o.total, 0),
    };
  }, [orders]);

  const activeOrders = useMemo(() => orders.filter(o => o.status !== 'livrata' && o.status !== 'anulata'), [orders]);

  return (
    <Page fit>
      <Page.Body fit maxWidth="wide" padding="comfortable">
        <ViewerBanner page="menu" />

        <header className="enter-up shrink-0 pb-3.5 border-b border-line/60 flex items-center gap-4" style={{ animationDelay: '0ms' }}>
          <span className="h-11 w-11 rounded-2xl bg-accent-muted text-accent flex items-center justify-center shrink-0">
            <ClipboardList className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <p className="text-pm-eyebrow text-accent mb-1 flex items-center gap-2">
              <span className="inline-block h-px w-3.5 bg-accent/50" aria-hidden /> Restaurant
            </p>
            <h1 className="text-pm-2xl font-semibold text-content-primary truncate leading-tight">Comenzi</h1>
            <p className="mt-1 text-pm-sm text-content-muted">Preia comenzi și urmărește-le până la livrare</p>
          </div>
        </header>

        <div className="enter-up shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-4" style={{ animationDelay: '80ms' }}>
          <KpiCard vtName={vtName('ord-kpi', 'active')} label="Comenzi active" icon={ClipboardList} value={metrics.active} />
          <KpiCard vtName={vtName('ord-kpi', 'prep')} label="În preparare" icon={ChefHat} value={metrics.preparing} iconColor={metrics.preparing > 0 ? 'text-status-amber' : undefined} />
          <KpiCard vtName={vtName('ord-kpi', 'ready')} label="Gata de servit" icon={CheckCircle2} value={metrics.ready} iconColor={metrics.ready > 0 ? 'text-status-green' : undefined} />
          <KpiCard vtName={vtName('ord-kpi', 'rev')} label="Încasări azi" icon={ShoppingBag} value={money(Math.round(metrics.revenue), 'RON')} />
        </div>

        <div className="enter-up flex-1 min-h-0 grid grid-cols-1 xl:grid-cols-12 gap-4" style={{ animationDelay: '160ms' }}>
          {/* POS: menu picker */}
          <div className="xl:col-span-5 min-w-0 min-h-0 flex flex-col">
            <Card padding="md" tone="elevated" className="min-w-0 min-h-0 flex flex-col">
              <SectionHeader eyebrow="Comandă nouă" title="Alege produse" icon={UtensilsCrossed} meta={`${available.length} disponibile`} />
              {available.length > 0 ? (
                <div className="min-h-0 flex-1 overflow-y-auto grid grid-cols-2 gap-2 pr-1">
                  {available.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      disabled={isViewer}
                      onClick={() => addToCart(m)}
                      className="text-left rounded-xl border border-line/70 bg-surface-secondary/40 hover:bg-accent-muted hover:border-accent/40 px-3 py-2.5 transition-smooth active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
                    >
                      <span className="block font-medium text-pm-sm text-content-primary truncate" title={m.name}>{m.name}</span>
                      <span className="mt-0.5 flex items-center justify-between gap-2">
                        <StatusBadge tone="info" label={m.category} size="xs" />
                        <span className="tabular-nums text-pm-sm text-content-primary">{money(m.price, m.currency)}</span>
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <EmptyState icon={UtensilsCrossed} title="Niciun produs disponibil" description="Adaugă produse în Meniu sau marchează-le disponibile." />
              )}
            </Card>
          </div>

          {/* POS: cart */}
          <div className="xl:col-span-3 min-w-0 min-h-0 flex flex-col">
            <Card padding="md" tone="elevated" className="min-w-0 min-h-0 flex flex-col">
              <SectionHeader eyebrow="Bon" title="Comanda curentă" icon={ShoppingBag} meta={cart.length > 0 ? `${cart.length} produse` : 'gol'} />
              <div className="grid grid-cols-3 gap-1.5 mb-2.5">
                {(['dine_in', 'takeaway', 'delivery'] as const).map(t => (
                  <button key={t} type="button" onClick={() => setOrderType(t)}
                    className={['rounded-lg px-2 py-1.5 text-pm-xs font-medium transition-smooth active:scale-[0.98] border',
                      orderType === t ? 'bg-accent text-surface-primary border-accent' : 'bg-surface-secondary/40 text-content-muted border-line/70 hover:text-content-primary'].join(' ')}>
                    {TYPE_LABEL[t]}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-1.5 mb-2.5">
                <input value={tableLabel} onChange={e => setTableLabel(e.target.value)} placeholder="Masă"
                  className="rounded-lg border border-line/70 bg-surface-secondary/40 px-2.5 py-1.5 text-pm-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent/50" />
                <input value={customer} onChange={e => setCustomer(e.target.value)} placeholder="Client"
                  className="rounded-lg border border-line/70 bg-surface-secondary/40 px-2.5 py-1.5 text-pm-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:border-accent/50" />
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto space-y-1.5">
                {cart.length === 0 ? (
                  <p className="text-pm-xs text-content-muted italic py-6 text-center">Apasă pe produse pentru a le adăuga.</p>
                ) : cart.map(l => (
                  <div key={l.key} className="flex items-center gap-2 rounded-lg border border-line/60 px-2 py-1.5">
                    <div className="min-w-0 flex-1">
                      <span className="block text-pm-sm text-content-primary truncate" title={l.name}>{l.name}</span>
                      <span className="text-pm-2xs tabular-nums text-content-muted">{money(l.unit_price, 'RON')} × {l.quantity}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <IconButton intent="default" size="sm" onClick={() => bump(l.key, -1)} aria-label="Scade"><Minus aria-hidden /></IconButton>
                      <span className="w-5 text-center tabular-nums text-pm-sm">{l.quantity}</span>
                      <IconButton intent="primary" size="sm" onClick={() => bump(l.key, 1)} aria-label="Crește"><Plus aria-hidden /></IconButton>
                      <IconButton intent="danger" size="sm" onClick={() => removeLine(l.key)} aria-label="Elimină"><Trash2 aria-hidden /></IconButton>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2.5 pt-2.5 border-t border-line/70">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-pm-sm text-content-muted">Total</span>
                  <span className="text-pm-lg font-semibold tabular-nums text-content-primary">{money(cartTotal, 'RON')}</span>
                </div>
                <Button size="md" className="w-full justify-center" disabled={isViewer || placing || cart.length === 0} onClick={placeOrder}>
                  <Send className="h-4 w-4" /> {placing ? 'Se trimite…' : 'Trimite comanda'}
                </Button>
              </div>
            </Card>
          </div>

          {/* Active orders board */}
          <div className="xl:col-span-4 min-w-0 min-h-0 flex flex-col">
            <Card padding="md" tone="elevated" className="min-w-0 min-h-0 flex flex-col">
              <SectionHeader eyebrow="În lucru" title="Comenzi active" icon={Clock} meta={loading ? 'se încarcă…' : `${activeOrders.length} active`} />
              {activeOrders.length > 0 ? (
                <div className="min-h-0 flex-1 overflow-y-auto space-y-2">
                  {activeOrders.map(o => {
                    const meta = STATUS_META[o.status] ?? STATUS_META.noua;
                    const next = NEXT_STATUS[o.status];
                    return (
                      <div key={o.id} className="group rounded-xl border border-line/70 bg-surface-secondary/40 hover:bg-surface-tertiary/40 transition-smooth px-3 py-2.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-pm-sm text-content-primary truncate">{o.code}</span>
                          <StatusBadge tone={meta.tone} label={meta.label} size="xs" />
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-pm-2xs text-content-muted">
                          <span>{TYPE_LABEL[o.order_type] ?? o.order_type}</span>
                          {o.table_label && <span>Masă {o.table_label}</span>}
                          {o.customer_name && <span className="truncate">{o.customer_name}</span>}
                          <span className="tabular-nums text-content-primary">{money(o.total, o.currency)}</span>
                        </div>
                        <p className="mt-1 text-pm-2xs text-content-muted truncate" title={o.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}>
                          {o.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}
                        </p>
                        {!isViewer && (
                          <div className="mt-2 flex items-center gap-1.5">
                            {next && <Button size="sm" onClick={() => advance(o)}>{STATUS_META[next].label}</Button>}
                            <span className="flex items-center gap-1.5 opacity-70 group-hover:opacity-100 transition-opacity">
                              <IconButton intent="warning" size="sm" onClick={() => cancel(o)} title="Anulează" aria-label="Anulează"><X aria-hidden /></IconButton>
                              <IconButton intent="danger" size="sm" onClick={() => remove(o)} title="Șterge" aria-label="Șterge"><Trash2 aria-hidden /></IconButton>
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState icon={CheckCircle2} title="Nicio comandă activă" description="Comenzile noi apar aici până la livrare." />
              )}
            </Card>
          </div>
        </div>
      </Page.Body>
    </Page>
  );
}
