import { BadRequestException } from '@nestjs/common';

/**
 * Regla única de "el evento debe ser en el futuro" (ADR-023). La usan
 * OrdersService.createOrder (cubre POST /orders y la tool MCP crear_pedido,
 * que delega en él) y el schema zod de crear_pedido (para rechazar antes de
 * llegar al servicio) -- mismo predicado y mismo mensaje en ambos lados.
 */
export const SCHEDULED_FOR_IN_PAST_MESSAGE =
  'La fecha del evento (scheduledFor) debe ser futura.';

export function isFutureDate(value: string | Date, now: Date = new Date()): boolean {
  const time = new Date(value).getTime();
  return !Number.isNaN(time) && time > now.getTime();
}

/** Lanza 400 si scheduledFor no es una fecha futura. */
export function assertScheduledForInFuture(value: string | Date, now: Date = new Date()): void {
  if (!isFutureDate(value, now)) {
    throw new BadRequestException(SCHEDULED_FOR_IN_PAST_MESSAGE);
  }
}
