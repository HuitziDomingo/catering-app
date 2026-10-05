import { Order } from '../database/entities/order.entity';
import { OrderResponseDto } from './dto/order-response.dto';

/**
 * Entidad Order → OrderResponseDto. Antes los controllers devolvían la
 * entidad tal cual, lo que tenía dos problemas: los `numeric` de Postgres
 * llegan como string por el driver pg (shared-types los declara number), y
 * cargar relaciones (customer, items.menuItem) habría serializado la entidad
 * completa -- incluido `users.password_hash`. Mapear explícito fija el
 * contrato de ADR-027 y deja fuera lo que no debe salir.
 */
export function toOrderResponse(order: Order): OrderResponseDto {
  const customer = order.customer;
  return {
    id: order.id,
    customerId: order.customerId,
    status: order.status,
    peopleCount: order.peopleCount,
    scheduledFor: order.scheduledFor,
    subtotal: Number(order.subtotal),
    total: Number(order.total),
    notes: order.notes ?? null,
    needsReview: order.needsReview,
    paymentPreferenceId: order.paymentPreferenceId ?? null,
    paymentId: order.paymentId ?? null,
    paymentMethod: order.paymentMethod ?? null,
    paidAt: order.paidAt ?? null,
    customer: customer
      ? {
          id: customer.id,
          fullName: customer.fullName,
          email: customer.email,
          phone: customer.phone ?? null,
          whatsappNumber: customer.whatsappNumber ?? null,
        }
      : null,
    items: (order.items ?? []).map((item) => ({
      id: Number(item.id),
      orderId: item.orderId,
      menuItemId: item.menuItemId,
      menuItemName: item.menuItem?.name ?? '',
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}
