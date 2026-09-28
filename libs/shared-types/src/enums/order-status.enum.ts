export enum OrderStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  PREPARING = 'preparing',
  DELIVERED = 'delivered',
  CANCELLED = 'cancelled',
  /** Pago rechazado/cancelado en Mercado Pago (ver ADR-024). */
  PAYMENT_FAILED = 'payment_failed',
}
