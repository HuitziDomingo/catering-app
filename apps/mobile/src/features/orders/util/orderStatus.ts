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

const PAYMENT_METHOD_LABELS: Record<string, string> = {
  visa: 'Visa',
  master: 'Mastercard',
  amex: 'American Express',
  debvisa: 'Visa débito',
  debmaster: 'Mastercard débito',
  oxxo: 'OXXO',
  spei: 'Transferencia SPEI',
  account_money: 'Saldo de Mercado Pago',
};

/** payment_method_id de Mercado Pago → texto legible (o el id tal cual si no se conoce). */
export function formatPaymentMethod(paymentMethod: string | null): string | null {
  if (!paymentMethod) return null;
  return PAYMENT_METHOD_LABELS[paymentMethod] ?? paymentMethod;
}
