import { Component, computed, input } from '@angular/core';
import type { OrderStatus } from '@catering-app/shared-types';
import { ORDER_STATUS_LABELS } from '../../util/order-status';

/** Componente de presentación pura (ADR-020): pastilla con el status del pedido. */
@Component({
  selector: 'app-order-status-badge',
  template: `<span class="order-status-badge" [attr.data-status]="status()">{{ label() }}</span>`,
  styleUrl: './order-status-badge.scss',
})
export class OrderStatusBadge {
  readonly status = input.required<OrderStatus>();

  protected readonly label = computed(() => ORDER_STATUS_LABELS[this.status()]);
}
