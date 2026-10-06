import { formatPaymentMethod } from '@catering-app/shared-types';
import type { Order } from '../database/entities/order.entity';

/** Datos del negocio que van en el encabezado del recibo (variables BUSINESS_*). */
export interface BusinessInfo {
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  /** Opcional: si falta, el recibo no muestra la línea (ADR-028). */
  rfc: string | null;
  /** Zona horaria con la que se muestran las fechas (default America/Mexico_City). */
  timeZone: string;
}

export interface ReceiptLine {
  description: string;
  quantity: number;
  unitPrice: string;
  subtotal: string;
}

/**
 * Todo lo que dice el recibo, ya formateado en texto. Se separa del dibujo
 * (receipt-pdf.renderer.ts) para poder probar el contenido sin parsear un
 * PDF, y el dibujo sin armar un pedido.
 */
export interface ReceiptContent {
  business: BusinessInfo;
  folio: string;
  orderId: string;
  orderedAt: string;
  scheduledFor: string;
  peopleCount: number;
  customer: { name: string; email: string; phone: string | null };
  lines: ReceiptLine[];
  total: string;
  payment: { method: string; paymentId: string; paidAt: string };
  issuedAt: string;
  legend: string;
}

export const RECEIPT_LEGEND =
  'Este documento no es un comprobante fiscal (CFDI).';

/** Pago confirmado a mano por el staff (transferencia/efectivo, ADR-027): no hay datos de Mercado Pago. */
const MANUAL_PAYMENT_LABEL = 'Registrado por el negocio (transferencia o efectivo)';
const NOT_APPLICABLE = 'No aplica';

/** Folio corto: el mismo prefijo del id con el que el dashboard muestra el pedido. */
export function orderFolio(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

/**
 * Arma el contenido del recibo. `order` debe venir con `items.menuItem` y
 * `customer` cargados (OrdersService.findDetailById).
 */
export function buildReceiptContent(
  order: Order,
  business: BusinessInfo,
  issuedAt: Date = new Date(),
): ReceiptContent {
  const currency = new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' });
  const dateTime = new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'long',
    timeStyle: 'short',
    timeZone: business.timeZone,
  });
  // numeric de Postgres llega como string por el driver pg.
  const money = (value: number | string) => currency.format(Number(value));

  return {
    business,
    folio: orderFolio(order.id),
    orderId: order.id,
    orderedAt: dateTime.format(order.createdAt),
    scheduledFor: dateTime.format(order.scheduledFor),
    peopleCount: order.peopleCount,
    customer: {
      name: order.customer?.fullName ?? '',
      email: order.customer?.email ?? '',
      phone: order.customer?.phone ?? null,
    },
    lines: (order.items ?? []).map((item) => ({
      description: item.menuItem?.name ?? 'Platillo',
      quantity: item.quantity,
      unitPrice: money(item.unitPrice),
      subtotal: money(item.subtotal),
    })),
    total: money(order.total),
    payment: {
      method: formatPaymentMethod(order.paymentMethod) ?? MANUAL_PAYMENT_LABEL,
      paymentId: order.paymentId ?? NOT_APPLICABLE,
      paidAt: order.paidAt ? dateTime.format(order.paidAt) : NOT_APPLICABLE,
    },
    issuedAt: dateTime.format(issuedAt),
    legend: RECEIPT_LEGEND,
  };
}
