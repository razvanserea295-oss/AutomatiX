import { create } from 'zustand';
import { apiCommand } from '@/api/commands';

export const ORDER_STATUSES = ['noua', 'in_preparare', 'gata', 'livrata', 'anulata'] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export interface OrderItem {
  id: number;
  order_id: number;
  menu_item_id: number | null;
  name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
}

export interface Order {
  id: number;
  code: string;
  table_label: string | null;
  order_type: string;
  customer_name: string | null;
  status: string;
  total: number;
  currency: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
}

export interface NewOrderItem {
  menu_item_id?: number | null;
  name: string;
  unit_price: number;
  quantity: number;
}

interface OrderState {
  orders: Order[];
  loading: boolean;
  loaded: boolean;
  fetchOrders: (force?: boolean) => Promise<Order[]>;
  createOrder: (payload: Record<string, unknown>) => Promise<Order>;
  setStatus: (id: number, status: OrderStatus) => Promise<void>;
  deleteOrder: (id: number) => Promise<void>;
}

export const useOrderStore = create<OrderState>((set, get) => ({
  orders: [],
  loading: false,
  loaded: false,

  fetchOrders: async (force = false) => {
    if (!force && get().loaded) return get().orders;
    set({ loading: true });
    try {
      const data = await apiCommand<Order[]>('get_restaurant_orders');
      const orders = Array.isArray(data) ? data : [];
      set({ orders, loaded: true, loading: false });
      return orders;
    } catch (err) {
      console.error('[orderStore] fetchOrders failed:', err);
      set({ loading: false });
      return get().orders;
    }
  },

  createOrder: async (payload) => {
    const order = await apiCommand<Order>('create_restaurant_order', payload);
    await get().fetchOrders(true);
    return order;
  },

  setStatus: async (id, status) => {
    await apiCommand('update_restaurant_order_status', { id, status });
    set({ orders: get().orders.map(o => (o.id === id ? { ...o, status } : o)) });
  },

  deleteOrder: async (id) => {
    await apiCommand('delete_restaurant_order', { id });
    set({ orders: get().orders.filter(o => o.id !== id) });
  },
}));

export const useOrders = () => useOrderStore(s => s.orders);
