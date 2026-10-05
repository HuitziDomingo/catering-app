// Helper puro: filtros del formulario → query de GET /orders (ADR-027).
import type {
  OrderListQuery,
  OrderSortField,
  OrderStatus,
  SortDirection,
} from '@catering-app/shared-types';

/** Filtros tal como los maneja la UI (fechas de <input type="date">, 'YYYY-MM-DD'). */
export interface OrderListFilters {
  from: string;
  to: string;
  /** '' = todos los status. */
  status: OrderStatus | '';
  needsReview: boolean;
  sort: OrderSortField;
  direction: SortDirection;
}

export const DEFAULT_ORDER_LIST_FILTERS: OrderListFilters = {
  from: '',
  to: '',
  status: '',
  needsReview: false,
  sort: 'createdAt',
  direction: 'desc',
};

export const ORDER_LIST_PAGE_SIZE = 20;

/**
 * 'YYYY-MM-DD' → ISO del inicio (o fin) de ese día en la zona horaria local.
 * `new Date('2026-10-05')` se interpretaría como medianoche UTC, que en México
 * es el día anterior; por eso se arma con año/mes/día explícitos.
 */
export function localDayBoundary(date: string, boundary: 'start' | 'end'): string {
  const [year, month, day] = date.split('-').map(Number);
  const result =
    boundary === 'start'
      ? new Date(year, month - 1, day, 0, 0, 0, 0)
      : new Date(year, month - 1, day, 23, 59, 59, 999);
  return result.toISOString();
}

export function toOrderListQuery(filters: OrderListFilters, page: number): OrderListQuery {
  const query: OrderListQuery = {
    sort: filters.sort,
    direction: filters.direction,
    page,
    pageSize: ORDER_LIST_PAGE_SIZE,
  };
  if (filters.from) {
    query.from = localDayBoundary(filters.from, 'start');
  }
  if (filters.to) {
    query.to = localDayBoundary(filters.to, 'end');
  }
  if (filters.status) {
    query.status = [filters.status];
  }
  if (filters.needsReview) {
    query.needsReview = true;
  }
  return query;
}
