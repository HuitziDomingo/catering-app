import { OrderStatus } from '@catering-app/shared-types';

// Presentación de OrderStatus para el cliente (ADR-024, ADR-027).

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  [OrderStatus.PENDING]: 'Pendiente de pago',
  [OrderStatus.CONFIRMED]: 'Confirmado',
  [OrderStatus.PREPARING]: 'En preparación',
  [OrderStatus.DELIVERED]: 'Entregado',
  [OrderStatus.CANCELLED]: 'Cancelado',
  [OrderStatus.PAYMENT_FAILED]: 'Pago rechazado',
};

/** status de UI Kitten (color) para cada estado. */
export const ORDER_STATUS_APPEARANCE: Record<OrderStatus, 'basic' | 'warning' | 'success' | 'info' | 'danger'> = {
  [OrderStatus.PENDING]: 'warning',
  [OrderStatus.CONFIRMED]: 'success',
  [OrderStatus.PREPARING]: 'info',
  [OrderStatus.DELIVERED]: 'basic',
  [OrderStatus.CANCELLED]: 'danger',
  [OrderStatus.PAYMENT_FAILED]: 'danger',
};

/**
 * Estados en los que el cliente puede pagar: pending, y payment_failed
 * (reintento -- la API lo regresa a pending al crear la nueva preferencia,
 * ADR-027).
 */
export function isPayable(status: OrderStatus): boolean {
  return status === OrderStatus.PENDING || status === OrderStatus.PAYMENT_FAILED;
}

// Compartido con el recibo PDF de la API (mismas etiquetas en los dos lados).
export { formatPaymentMethod } from '@catering-app/shared-types';
