import { computed, inject, Injectable, signal } from '@angular/core';
import { Observable, Subscription, tap } from 'rxjs';
import type { OrderDetail, OrderStatus, ReviewOrderDto } from '@catering-app/shared-types';
import { extractErrorMessage } from '../../../core/http/extract-error-message';
import { NotificationStateService } from '../../notifications/state/notification-state.service';
import { OrdersDataAccessService } from '../data-access/orders-data-access.service';
import {
  DEFAULT_ORDER_LIST_FILTERS,
  ORDER_LIST_PAGE_SIZE,
  toOrderListQuery,
  type OrderListFilters,
} from '../util/order-list-query';

export type OrdersLoadStatus = 'idle' | 'loading' | 'success' | 'error';

/**
 * Estado del feature de pedidos (ver ADR-020) con signals de Angular: la
 * lista paginada con sus filtros y el pedido abierto en el detalle.
 *
 * Es singleton (providedIn root) a propósito: los filtros y la página
 * sobreviven al ir al detalle y regresar a la lista.
 *
 * La lista se refresca sola con el evento new-order del WebSocket (re-expuesto
 * por NotificationStateService), sin pasar por 'loading' para no parpadear.
 */
@Injectable({ providedIn: 'root' })
export class OrdersStateService {
  private readonly dataAccess = inject(OrdersDataAccessService);
  private readonly notifications = inject(NotificationStateService);

  readonly filters = signal<OrderListFilters>(DEFAULT_ORDER_LIST_FILTERS);
  readonly page = signal(1);
  readonly orders = signal<OrderDetail[]>([]);
  readonly total = signal(0);
  readonly status = signal<OrdersLoadStatus>('idle');
  readonly error = signal<string | null>(null);
  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.total() / ORDER_LIST_PAGE_SIZE)),
  );

  readonly selected = signal<OrderDetail | null>(null);
  readonly detailStatus = signal<OrdersLoadStatus>('idle');
  readonly detailError = signal<string | null>(null);

  private listRequest: Subscription | null = null;

  constructor() {
    this.notifications.newOrder$.subscribe(() => {
      if (this.status() !== 'idle') {
        this.load({ silent: true });
      }
    });
  }

  load(options: { silent?: boolean } = {}): void {
    if (!options.silent) {
      this.status.set('loading');
      this.error.set(null);
    }
    this.listRequest?.unsubscribe();
    this.listRequest = this.dataAccess
      .list(toOrderListQuery(this.filters(), this.page()))
      .subscribe({
        next: (result) => {
          this.orders.set(result.items);
          this.total.set(result.total);
          this.status.set('success');
          this.error.set(null);
        },
        error: (err: unknown) => {
          this.status.set('error');
          this.error.set(extractErrorMessage(err));
        },
      });
  }

  applyFilters(filters: OrderListFilters): void {
    this.filters.set(filters);
    this.page.set(1);
    this.load();
  }

  goToPage(page: number): void {
    this.page.set(Math.min(Math.max(1, page), this.totalPages()));
    this.load();
  }

  loadDetail(id: string): void {
    if (this.selected()?.id !== id) {
      this.selected.set(null);
    }
    this.detailStatus.set('loading');
    this.detailError.set(null);
    this.dataAccess.findById(id).subscribe({
      next: (order) => {
        this.selected.set(order);
        this.detailStatus.set('success');
      },
      error: (err: unknown) => {
        this.detailStatus.set('error');
        this.detailError.set(extractErrorMessage(err));
      },
    });
  }

  updateStatus(id: string, status: OrderStatus): Observable<OrderDetail> {
    return this.dataAccess.updateStatus(id, status).pipe(tap((order) => this.replace(order)));
  }

  review(id: string, dto: ReviewOrderDto): Observable<OrderDetail> {
    return this.dataAccess.review(id, dto).pipe(tap((order) => this.replace(order)));
  }

  /** Refleja un pedido actualizado en el detalle y en la página actual de la lista. */
  private replace(order: OrderDetail): void {
    if (this.selected()?.id === order.id) {
      this.selected.set(order);
    }
    this.orders.update((list) => list.map((item) => (item.id === order.id ? order : item)));
  }
}
