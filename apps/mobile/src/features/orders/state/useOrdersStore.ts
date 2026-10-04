import { create } from 'zustand';
import type { OrderDetail } from '@catering-app/shared-types';
import { extractErrorMessage } from '../../../core/http/extractErrorMessage';
import { fetchMyOrders, fetchOrder } from '../data-access/ordersDataAccess';

export type LoadStatus = 'idle' | 'loading' | 'success' | 'error';

export const MY_ORDERS_PAGE_SIZE = 20;

export type OrdersState = {
  items: OrderDetail[];
  total: number;
  page: number;
  listStatus: LoadStatus;
  listError: string | null;
  loadingMore: boolean;
  /** Pedidos por id (detalle; también lo llena la lista). */
  byId: Record<string, OrderDetail>;
  detailStatus: LoadStatus;
  detailError: string | null;
  /** Primera página de "Mis pedidos" (también para refrescar). */
  load: () => Promise<void>;
  /** Siguiente página, si quedan. */
  loadMore: () => Promise<void>;
  /** GET /orders/:id; devuelve el pedido (o null si falló). */
  loadOrder: (orderId: string) => Promise<OrderDetail | null>;
  clear: () => void;
};

function indexById(orders: OrderDetail[], current: Record<string, OrderDetail>) {
  const next = { ...current };
  for (const order of orders) next[order.id] = order;
  return next;
}

const INITIAL = {
  items: [] as OrderDetail[],
  total: 0,
  page: 0,
  listStatus: 'idle' as LoadStatus,
  listError: null,
  loadingMore: false,
  byId: {} as Record<string, OrderDetail>,
  detailStatus: 'idle' as LoadStatus,
  detailError: null,
};

// Estado de "Mis pedidos" (ADR-020, ADR-027): lista paginada de GET
// /orders/mine y caché de detalle por id.
export const useOrdersStore = create<OrdersState>((set, get) => ({
  ...INITIAL,
  async load() {
    set({ listStatus: 'loading', listError: null });
    try {
      const page = await fetchMyOrders({ page: 1, pageSize: MY_ORDERS_PAGE_SIZE });
      set({
        items: page.items,
        total: page.total,
        page: 1,
        listStatus: 'success',
        byId: indexById(page.items, get().byId),
      });
    } catch (err) {
      set({ listStatus: 'error', listError: extractErrorMessage(err) });
    }
  },
  async loadMore() {
    const { items, total, page, loadingMore, listStatus } = get();
    if (loadingMore || listStatus !== 'success' || items.length >= total) return;
    set({ loadingMore: true });
    try {
      const next = await fetchMyOrders({ page: page + 1, pageSize: MY_ORDERS_PAGE_SIZE });
      // Por id: si llegó un pedido nuevo entre páginas, el desplazamiento
      // puede repetir uno -- no se duplica en la lista.
      const seen = new Set(items.map((order) => order.id));
      set({
        items: [...items, ...next.items.filter((order) => !seen.has(order.id))],
        total: next.total,
        page: page + 1,
        loadingMore: false,
        byId: indexById(next.items, get().byId),
      });
    } catch (err) {
      set({ loadingMore: false, listError: extractErrorMessage(err) });
    }
  },
  async loadOrder(orderId) {
    set({ detailStatus: 'loading', detailError: null });
    try {
      const order = await fetchOrder(orderId);
      set({
        detailStatus: 'success',
        byId: { ...get().byId, [order.id]: order },
        // Mantiene la lista coherente con el detalle (ej. status tras pagar).
        items: get().items.map((item) => (item.id === order.id ? order : item)),
      });
      return order;
    } catch (err) {
      set({ detailStatus: 'error', detailError: extractErrorMessage(err) });
      return null;
    }
  },
  clear() {
    set(INITIAL);
  },
}));
