import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import { filter, type Observable } from 'rxjs';
import {
  isOrderPaid,
  OrderStatus,
  ReviewOrderAction,
  type OrderDetail,
} from '@catering-app/shared-types';
import { extractErrorMessage } from '../../../../core/http/extract-error-message';
import { OrdersDataAccessService } from '../../data-access/orders-data-access.service';
import { OrdersStateService } from '../../state/orders-state.service';
import {
  OrderAdjustForm,
  type OrderAdjustFormDialogData,
} from '../../ui/order-adjust-form/order-adjust-form';
import { OrderStatusBadge } from '../../ui/order-status-badge/order-status-badge';
import { formatDateTime, formatPrice } from '../../util/format';
import {
  canReviewOrder,
  hasPaymentToRefund,
  ORDER_STATUS_ACTION_LABELS,
  staffNextStatuses,
} from '../../util/order-status';

/**
 * Detalle de un pedido (ADR-027): cliente, platillos con su precio snapshot,
 * pago, cambio manual de status, revisión de pedidos fuera de rango
 * (ADR-021) y recibo PDF de los pedidos pagados (ADR-028).
 */
@Component({
  selector: 'app-order-detail-page',
  imports: [RouterLink, TuiButton, OrderStatusBadge],
  templateUrl: './order-detail-page.html',
  styleUrl: './order-detail-page.scss',
})
export class OrderDetailPage {
  protected readonly state = inject(OrdersStateService);
  private readonly dialogs = inject(TuiDialogService);
  private readonly ordersData = inject(OrdersDataAccessService);

  protected readonly selected = this.state.selected;
  protected readonly cancelled = OrderStatus.CANCELLED;
  protected readonly saving = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly openingReceipt = signal(false);
  protected readonly receiptError = signal<string | null>(null);

  protected readonly nextStatuses = computed(() => {
    const order = this.selected();
    return order ? staffNextStatuses(order.status) : [];
  });
  protected readonly canReview = computed(() => {
    const order = this.selected();
    return !!order && canReviewOrder(order);
  });
  protected readonly paymentToRefund = computed(() => {
    const order = this.selected();
    return !!order && hasPaymentToRefund(order);
  });

  protected readonly hasReceipt = computed(() => {
    const order = this.selected();
    return !!order && isOrderPaid(order);
  });

  protected readonly actionLabels = ORDER_STATUS_ACTION_LABELS;
  protected readonly formatDateTime = formatDateTime;
  protected readonly formatPrice = formatPrice;

  constructor() {
    inject(ActivatedRoute)
      .paramMap.pipe(takeUntilDestroyed())
      .subscribe((params) => {
        this.actionError.set(null);
        this.state.loadDetail(params.get('id') ?? '');
      });
  }

  protected changeStatus(order: OrderDetail, status: OrderStatus): void {
    if (status !== OrderStatus.CANCELLED) {
      this.run(this.state.updateStatus(order.id, status));
      return;
    }
    const refundWarning = order.paidAt
      ? ' El pedido ya está pagado: el reembolso se hace a mano en Mercado Pago.'
      : '';
    this.confirm('Cancelar pedido', `¿Cancelar este pedido?${refundWarning}`, 'Cancelar pedido')
      .subscribe(() => this.run(this.state.updateStatus(order.id, OrderStatus.CANCELLED)));
  }

  protected approve(order: OrderDetail): void {
    this.run(this.state.review(order.id, { action: ReviewOrderAction.APPROVE }));
  }

  protected reject(order: OrderDetail): void {
    this.confirm(
      'Rechazar pedido',
      '¿Rechazar este pedido? Se cancela y el cliente tendrá que pedir de nuevo.',
      'Rechazar',
    ).subscribe(() => this.run(this.state.review(order.id, { action: ReviewOrderAction.REJECT })));
  }

  protected adjust(order: OrderDetail): void {
    const data: OrderAdjustFormDialogData = {
      order,
      save: (dto) => this.state.review(order.id, dto),
    };
    this.dialogs
      .open<void>(new PolymorpheusComponent(OrderAdjustForm), {
        label: 'Ajustar pedido',
        size: 's',
        data,
      })
      .subscribe();
  }

  /**
   * Abre el recibo en otra pestaña, donde el visor de PDF del navegador
   * permite verlo, imprimirlo o descargarlo. La pestaña se abre en el mismo
   * click (antes de pedir la URL) para que el bloqueador de ventanas
   * emergentes no la frene; si la API falla, se cierra.
   */
  protected openReceipt(order: OrderDetail): void {
    const tab = window.open('', '_blank');
    this.receiptError.set(null);
    this.openingReceipt.set(true);
    this.ordersData.getReceipt(order.id).subscribe({
      next: ({ url }) => {
        this.openingReceipt.set(false);
        if (tab) {
          tab.opener = null;
          tab.location.href = url;
        } else {
          window.open(url, '_blank', 'noopener');
        }
      },
      error: (err: unknown) => {
        this.openingReceipt.set(false);
        tab?.close();
        this.receiptError.set(extractErrorMessage(err));
      },
    });
  }

  /** TUI_CONFIRM que solo emite si el staff confirma. */
  private confirm(label: string, content: string, yes: string): Observable<boolean> {
    return this.dialogs
      .open<boolean>(TUI_CONFIRM, { label, size: 's', data: { content, yes, no: 'Volver' } })
      .pipe(filter((confirmed) => confirmed));
  }

  private run(request: Observable<OrderDetail>): void {
    this.actionError.set(null);
    this.saving.set(true);
    request.subscribe({
      next: () => this.saving.set(false),
      error: (err: unknown) => {
        this.saving.set(false);
        this.actionError.set(extractErrorMessage(err));
      },
    });
  }
}
