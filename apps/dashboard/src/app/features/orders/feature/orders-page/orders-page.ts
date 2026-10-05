import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';
import type { OrderDetail } from '@catering-app/shared-types';
import { OrdersStateService } from '../../state/orders-state.service';
import { OrderFilters } from '../../ui/order-filters/order-filters';
import { OrderList } from '../../ui/order-list/order-list';

/**
 * Pantalla de gestión de pedidos (ADR-020, ADR-027): conecta el store con los
 * componentes de ui/. Al volver del detalle se recarga en silencio, conservando
 * filtros y página.
 */
@Component({
  selector: 'app-orders-page',
  imports: [TuiButton, OrderFilters, OrderList],
  templateUrl: './orders-page.html',
  styleUrl: './orders-page.scss',
})
export class OrdersPage {
  protected readonly state = inject(OrdersStateService);
  private readonly router = inject(Router);

  constructor() {
    this.state.load({ silent: this.state.status() === 'success' });
  }

  protected openOrder(order: OrderDetail): void {
    this.router.navigate(['/orders', order.id]);
  }
}
