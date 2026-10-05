// Helpers puros de status de pedido (sin lógica de UI), viven en util/ según ADR-020.
import {
  ORDER_STATUS_TRANSITIONS,
  OrderStatus,
  STAFF_SETTABLE_ORDER_STATUSES,
  type Order,
} from '@catering-app/shared-types';

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Pendiente de pago',
  [OrderStatus.PAYMENT_FAILED]: 'Pago rechazado',
  [OrderStatus.CONFIRMED]: 'Confirmado',
  [OrderStatus.PREPARING]: 'En preparación',
  [OrderStatus.DELIVERED]: 'Entregado',
  [OrderStatus.CANCELLED]: 'Cancelado',
};

/** Texto del botón que lleva a cada status (cambio manual del staff). */
export const ORDER_STATUS_ACTION_LABELS: Partial<Record<OrderStatus, string>> = {
  [OrderStatus.CONFIRMED]: 'Confirmar',
  [OrderStatus.PREPARING]: 'Pasar a preparación',
  [OrderStatus.DELIVERED]: 'Marcar entregado',
  [OrderStatus.CANCELLED]: 'Cancelar pedido',
};

/** Orden en que se listan los status en el filtro. */
export const ORDER_STATUS_OPTIONS: OrderStatus[] = [
  OrderStatus.PENDING,
  OrderStatus.PAYMENT_FAILED,
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

const FINAL_STATUSES: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.CANCELLED];

/**
 * Status a los que el staff puede mover el pedido a mano: la intersección de
 * la tabla de transiciones (ADR-027) con los status que el staff puede poner.
 * `payment_failed` y `pending` quedan fuera: solo los pone el flujo de pago.
 */
export function staffNextStatuses(current: OrderStatus): OrderStatus[] {
  return ORDER_STATUS_TRANSITIONS[current].filter((status) =>
    STAFF_SETTABLE_ORDER_STATUSES.includes(status),
  );
}

export function isFinalStatus(status: OrderStatus): boolean {
  return FINAL_STATUSES.includes(status);
}

/** La revisión (ADR-027) solo aplica a pedidos needsReview en estado no final. */
export function canReviewOrder(order: Pick<Order, 'needsReview' | 'status'>): boolean {
  return order.needsReview && !isFinalStatus(order.status);
}

/**
 * Pedido cancelado con un pago aprobado: el webhook guardó el pago sin mover
 * el status (ADR-027, recordPaymentResult), o el staff canceló un pedido que
 * ya estaba pagado. En ambos casos hay dinero del cliente que el staff tiene
 * que reembolsar a mano en Mercado Pago.
 */
export function hasPaymentToRefund(order: Pick<Order, 'status' | 'paidAt'>): boolean {
  return order.status === OrderStatus.CANCELLED && order.paidAt !== null;
}
