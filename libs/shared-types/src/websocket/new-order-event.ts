/**
 * Nombre del evento Socket.io emitido por NotificationGateway cuando se crea
 * un pedido (ver ADR-004). Compartido entre apps/api y apps/dashboard para
 * no depender de un literal duplicado en cada lado.
 */
export const NEW_ORDER_EVENT = 'new-order';

/** Payload del evento `new-order`: resumen del pedido, no el objeto completo. */
export interface NewOrderEvent {
  id: string;
  customerId: string;
  total: number;
  peopleCount: number;
  scheduledFor: string;
  needsReview: boolean;
}
