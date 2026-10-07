import type { WhatsAppTemplateMessage } from './whatsapp-provider';

/**
 * Eventos que avisan por WhatsApp (ver ADR-029 y docs/whatsapp-plantillas.md,
 * donde está el texto de cada plantilla para registrarla en Meta).
 */
export enum WhatsAppEvent {
  /** Al cliente: pedido creado (pending). */
  ORDER_RECEIVED = 'order_received',
  /** Al negocio: pedido nuevo. */
  NEW_ORDER_BUSINESS = 'new_order_business',
  ORDER_CONFIRMED = 'order_confirmed',
  ORDER_PREPARING = 'order_preparing',
  ORDER_DELIVERED = 'order_delivered',
  ORDER_CANCELLED = 'order_cancelled',
  PAYMENT_FAILED = 'payment_failed',
}

/**
 * Datos ya formateados para las variables. Cada evento usa los suyos; los que
 * no aplican quedan vacíos.
 */
export interface WhatsAppTemplateData {
  customerName: string;
  folio: string;
  eventDate: string;
  peopleCount: string;
  total: string;
  items: string;
  reviewNote: string;
  /** Token del link al recibo (botón URL de pedido_confirmado). */
  receiptLinkToken?: string;
}

/** Idioma de las plantillas propias. */
export const PRODUCTION_TEMPLATE_LANGUAGE = 'es_MX';

interface ProductionTemplate {
  name: string;
  bodyParams: (data: WhatsAppTemplateData) => string[];
  /** La plantilla tiene un botón URL con sufijo dinámico. */
  urlButton?: (data: WhatsAppTemplateData) => string | undefined;
}

/**
 * Plantillas registradas en Meta (modo `production`). El orden de
 * bodyParams es el de {{1}}, {{2}}… en docs/whatsapp-plantillas.md: si se
 * cambia una plantilla en Meta, se cambia aquí y en ese documento.
 */
export const PRODUCTION_TEMPLATES: Record<WhatsAppEvent, ProductionTemplate> = {
  [WhatsAppEvent.ORDER_RECEIVED]: {
    name: 'pedido_recibido',
    bodyParams: (d) => [d.customerName, d.folio, d.eventDate, d.peopleCount],
  },
  [WhatsAppEvent.NEW_ORDER_BUSINESS]: {
    name: 'nuevo_pedido_negocio',
    bodyParams: (d) => [d.folio, d.customerName, d.eventDate, d.peopleCount, d.items, d.reviewNote],
  },
  [WhatsAppEvent.ORDER_CONFIRMED]: {
    name: 'pedido_confirmado',
    bodyParams: (d) => [d.customerName, d.folio, d.eventDate, d.total],
    urlButton: (d) => d.receiptLinkToken,
  },
  [WhatsAppEvent.ORDER_PREPARING]: {
    name: 'pedido_en_preparacion',
    bodyParams: (d) => [d.customerName, d.folio, d.eventDate],
  },
  [WhatsAppEvent.ORDER_DELIVERED]: {
    name: 'pedido_entregado',
    bodyParams: (d) => [d.customerName, d.folio],
  },
  [WhatsAppEvent.ORDER_CANCELLED]: {
    name: 'pedido_cancelado',
    bodyParams: (d) => [d.customerName, d.folio],
  },
  [WhatsAppEvent.PAYMENT_FAILED]: {
    name: 'pago_rechazado',
    bodyParams: (d) => [d.customerName, d.folio],
  },
};

/**
 * `production`: las plantillas propias de arriba (cuando Meta las apruebe).
 * `test`: mientras tanto, todos los eventos mandan una plantilla de ejemplo
 * que Meta ya trae aprobada (WHATSAPP_TEST_TEMPLATE).
 */
export type WhatsAppTemplateMode = 'test' | 'production';
export const TEMPLATE_MODES: readonly WhatsAppTemplateMode[] = ['test', 'production'];

/** Plantillas de ejemplo de Meta para el modo `test`. */
export type WhatsAppTestTemplate = 'jaspers_market_order_confirmation_v1' | 'hello_world';
export const TEST_TEMPLATES: readonly WhatsAppTestTemplate[] = [
  'jaspers_market_order_confirmation_v1',
  'hello_world',
];
export const DEFAULT_TEST_TEMPLATE: WhatsAppTestTemplate = 'jaspers_market_order_confirmation_v1';

/**
 * Plantilla y variables para un evento.
 *
 * En modo `test`, `jaspers_market_order_confirmation_v1` (en_US) tiene tres
 * variables, consultadas con GET /{waba-id}/message_templates: {{1}} nombre
 * ("Hi {{1}}"), {{2}} número de pedido y {{3}} entrega estimada; su botón
 * es una URL fija, sin sufijo. Se llenan con nombre, folio y fecha del
 * evento, sea cual sea el evento (el texto es en inglés y genérico: sirve
 * para ver que llega y con qué datos). Para el aviso al negocio, {{1}} es el
 * nombre del cliente. `hello_world` no lleva variables.
 */
export function buildTemplateMessage(
  event: WhatsAppEvent,
  data: WhatsAppTemplateData,
  mode: WhatsAppTemplateMode,
  testTemplate: WhatsAppTestTemplate = DEFAULT_TEST_TEMPLATE,
): WhatsAppTemplateMessage {
  if (mode === 'test') {
    if (testTemplate === 'hello_world') {
      return { name: 'hello_world', languageCode: 'en_US' };
    }
    return {
      name: 'jaspers_market_order_confirmation_v1',
      languageCode: 'en_US',
      bodyParams: [data.customerName, data.folio, data.eventDate],
    };
  }

  const template = PRODUCTION_TEMPLATES[event];
  const message: WhatsAppTemplateMessage = {
    name: template.name,
    languageCode: PRODUCTION_TEMPLATE_LANGUAGE,
    bodyParams: template.bodyParams(data),
  };
  const suffix = template.urlButton?.(data);
  if (suffix) {
    message.urlButtonSuffix = suffix;
  }
  return message;
}
