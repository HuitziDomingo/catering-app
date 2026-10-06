import { Order } from '../database/entities/order.entity';
import { OrderItem } from '../database/entities/order-item.entity';
import type { StorageService } from '../storage/storage.service';
import { OrderResponseDto } from './dto/order-response.dto';

/**
 * Entidad Order → OrderResponseDto. Antes los controllers devolvían la
 * entidad tal cual, lo que tenía dos problemas: los `numeric` de Postgres
 * llegan como string por el driver pg (shared-types los declara number), y
 * cargar relaciones (customer, items.menuItem) habría serializado la entidad
 * completa -- incluido `users.password_hash`. Mapear explícito fija el
 * contrato de ADR-027 y deja fuera lo que no debe salir.
 */
export function toOrderResponse(
  order: Order,
  storage: Pick<StorageService, 'getPublicUrl'>,
): OrderResponseDto {
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
      menuItemImageUrl: menuItemImageUrl(item, storage),
      quantity: item.quantity,
      unitPrice: Number(item.unitPrice),
      subtotal: Number(item.subtotal),
    })),
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

/**
 * Imagen vigente del platillo de la línea (ADR-028), para la miniatura de
 * "Mis pedidos". null -- nunca error -- si la relación no viene cargada, si
 * el platillo no tiene imagen o si está dado de baja: el pedido histórico se
 * sigue mostrando, solo que con el placeholder.
 */
function menuItemImageUrl(
  item: OrderItem,
  storage: Pick<StorageService, 'getPublicUrl'>,
): string | null {
  const menuItem = item.menuItem;
  if (!menuItem || !menuItem.isActive || !menuItem.imageKey) {
    return null;
  }
  return storage.getPublicUrl('menuImages', menuItem.imageKey);
}
