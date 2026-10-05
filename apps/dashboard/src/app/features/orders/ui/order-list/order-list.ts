import { Component, input, output } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';
import type { OrderDetail } from '@catering-app/shared-types';
import { formatDateTime, formatPrice } from '../../util/format';
import { hasPaymentToRefund } from '../../util/order-status';
import { OrderStatusBadge } from '../order-status-badge/order-status-badge';

/**
 * Componente de presentación pura (ADR-020): tabla de pedidos. Marca los que
 * requieren revisión (fuera de rango, ADR-021) y los cancelados con un pago
 * aprobado que hay que reembolsar (ADR-027).
 */
@Component({
  selector: 'app-order-list',
  imports: [TuiButton, OrderStatusBadge],
  templateUrl: './order-list.html',
  styleUrl: './order-list.scss',
})
export class OrderList {
  readonly orders = input.required<OrderDetail[]>();
  readonly open = output<OrderDetail>();

  protected readonly formatDateTime = formatDateTime;
  protected readonly formatPrice = formatPrice;
  protected readonly hasPaymentToRefund = hasPaymentToRefund;
}
