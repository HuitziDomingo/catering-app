import { OrderStatus } from '../enums/order-status.enum';
import { Order } from '../entities/order';
import { OrderItem } from '../entities/order-item';

/**
 * Contrato de la API de gestión de pedidos (ver ADR-027): listados de
 * cliente y de staff, cambio de status y revisión de pedidos fuera de rango.
 */

/** Datos del cliente que el staff necesita ver en la lista/detalle de un pedido. */
export interface OrderCustomerSummary {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  whatsappNumber: string | null;
}

/** Línea de pedido tal como la devuelve la API: con el nombre del platillo. */
export interface OrderLine extends OrderItem {
  menuItemName: string;
  /** Imagen vigente del platillo (ADR-028); null si no tiene o está dado de baja. */
  menuItemImageUrl: string | null;
}

/**
 * Pedido tal como lo devuelven los endpoints de orders. `customer` siempre
 * viene en las respuestas de lectura (GET); POST /orders lo devuelve null.
 */
export interface OrderDetail extends Order {
  items: OrderLine[];
  customer: OrderCustomerSummary | null;
}

export type OrderSortField = 'scheduledFor' | 'createdAt';
export type SortDirection = 'asc' | 'desc';

/** Query de GET /orders (solo staff/admin/superadmin). Todos opcionales. */
export interface OrderListQuery {
  /** Fecha del evento (scheduledFor) desde, ISO 8601 inclusive. */
  from?: string;
  /** Fecha del evento (scheduledFor) hasta, ISO 8601 inclusive. */
  to?: string;
  /** Uno o varios status (en la query string: separados por coma). */
  status?: OrderStatus[];
  needsReview?: boolean;
  /** Solo pedidos creados estrictamente después de esta fecha (campanita). */
  createdSince?: string;
  /** Default: createdAt. */
  sort?: OrderSortField;
  /** Default: desc. */
  direction?: SortDirection;
  /** Default: 1. */
  page?: number;
  /** Default: 20, máximo 100. */
  pageSize?: number;
}

/** Query de GET /orders/mine (pedidos propios del usuario autenticado). */
export interface MyOrdersQuery {
  status?: OrderStatus[];
  page?: number;
  pageSize?: number;
}

/**
 * Transiciones de status permitidas (ADR-027). `delivered` y `cancelled` son
 * finales. `payment_failed` solo lo pone el webhook de Mercado Pago; volver a
 * `pending` desde ahí ocurre al generar una nueva preferencia de pago.
 */
export const ORDER_STATUS_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  [OrderStatus.PENDING]: [
    OrderStatus.CONFIRMED,
    OrderStatus.PAYMENT_FAILED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.PAYMENT_FAILED]: [
    OrderStatus.PENDING,
    OrderStatus.CONFIRMED,
    OrderStatus.CANCELLED,
  ],
  [OrderStatus.CONFIRMED]: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
  [OrderStatus.PREPARING]: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
  [OrderStatus.DELIVERED]: [],
  [OrderStatus.CANCELLED]: [],
};

/** Status que el staff puede poner a mano vía PATCH /orders/:id/status. */
export const STAFF_SETTABLE_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.DELIVERED,
  OrderStatus.CANCELLED,
];

export function canTransitionOrderStatus(from: OrderStatus, to: OrderStatus): boolean {
  return ORDER_STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}

/**
 * Status en los que el pedido ya está pagado (por Mercado Pago o confirmado
 * a mano por transferencia/efectivo, ADR-027) y sigue vigente.
 */
export const PAID_ORDER_STATUSES: OrderStatus[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PREPARING,
  OrderStatus.DELIVERED,
];

/**
 * El pedido tiene un pago que documentar con recibo (ADR-028): está en un
 * status pagado, o tiene un pago aprobado de Mercado Pago aunque después se
 * haya cancelado (el recibo es parte del rastro para el reembolso).
 */
export function isOrderPaid(order: {
  status: OrderStatus;
  paidAt?: string | Date | null;
}): boolean {
  return PAID_ORDER_STATUSES.includes(order.status) || order.paidAt != null;
}

/** Respuesta de GET /orders/:id/receipt: URL firmada del recibo PDF (ADR-028). */
export interface OrderReceiptResponse {
  url: string;
  /** Momento en que la URL deja de funcionar (ISO 8601); 15 minutos después de pedirla. */
  expiresAt: string;
  /**
   * Link de 30 días para compartir (el mismo del botón "Ver recibo" de
   * WhatsApp, ADR-029): al abrirlo genera una URL firmada nueva. null si la
   * API no tiene API_PUBLIC_URL o RECEIPT_LINK_SECRET.
   */
  shareUrl: string | null;
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
}

/** Acción sobre un pedido marcado needsReview (fuera de rango serves_min/max, ADR-021). */
export enum ReviewOrderAction {
  /** Se acepta tal cual: needsReview = false. */
  APPROVE = 'approve',
  /** Se cancela el pedido: status = cancelled, needsReview = false. */
  REJECT = 'reject',
  /** Se corrigen peopleCount y/o notas; needsReview se recalcula. */
  ADJUST = 'adjust',
}

export interface ReviewOrderDto {
  action: ReviewOrderAction;
  /** Solo con action = adjust. */
  peopleCount?: number;
  /** Solo con action = adjust. */
  notes?: string | null;
}
