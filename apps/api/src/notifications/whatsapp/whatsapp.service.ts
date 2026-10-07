import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@catering-app/shared-types';
import type { Order } from '../../database/entities/order.entity';
import type { User } from '../../database/entities/user.entity';
import { orderFolio } from '../../pdf/receipt-content';
import {
  DEFAULT_MX_NUMBER_FORMAT,
  maskPhone,
  MX_NUMBER_FORMATS,
  toWhatsAppRecipient,
  type MexicanNumberFormat,
} from './phone-number';
import { WhatsAppProvider } from './whatsapp-provider';
import {
  buildTemplateMessage,
  DEFAULT_TEST_TEMPLATE,
  TEST_TEMPLATES,
  WhatsAppEvent,
  type WhatsAppTemplateData,
  type WhatsAppTemplateMode,
  type WhatsAppTestTemplate,
} from './whatsapp-templates';

const DEFAULT_TIME_ZONE = 'America/Mexico_City';

/** Status que avisan al cliente al cambiar, y con qué plantilla (ADR-029). */
const STATUS_EVENTS: Partial<Record<OrderStatus, WhatsAppEvent>> = {
  [OrderStatus.CONFIRMED]: WhatsAppEvent.ORDER_CONFIRMED,
  [OrderStatus.PREPARING]: WhatsAppEvent.ORDER_PREPARING,
  [OrderStatus.DELIVERED]: WhatsAppEvent.ORDER_DELIVERED,
  [OrderStatus.CANCELLED]: WhatsAppEvent.ORDER_CANCELLED,
  [OrderStatus.PAYMENT_FAILED]: WhatsAppEvent.PAYMENT_FAILED,
};

type Customer = Pick<User, 'fullName' | 'whatsappNumber'>;

/**
 * Avisos de pedidos por WhatsApp (ADR-026 para los eventos, ADR-029 para el
 * proveedor): decide qué plantilla va a quién y con qué variables, y la
 * manda por el WhatsAppProvider. OrdersService solo dice qué pasó.
 *
 * Nunca lanza: un número inválido, la falta de configuración o un rechazo de
 * Meta se registran y el pedido sigue su curso.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly mode: WhatsAppTemplateMode;
  private readonly testTemplate: WhatsAppTestTemplate;
  private readonly mxFormat: MexicanNumberFormat;
  private readonly businessNumber: string | null;
  private readonly dateTime: Intl.DateTimeFormat;
  private readonly currency = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  });

  constructor(
    private readonly provider: WhatsAppProvider,
    config: ConfigService,
  ) {
    this.mode = config.get<string>('WHATSAPP_TEMPLATE_MODE') === 'production' ? 'production' : 'test';
    const testTemplate = config.get<string>('WHATSAPP_TEST_TEMPLATE') as WhatsAppTestTemplate;
    this.testTemplate = TEST_TEMPLATES.includes(testTemplate) ? testTemplate : DEFAULT_TEST_TEMPLATE;
    const mxFormat = config.get<string>('WHATSAPP_MX_NUMBER_FORMAT') as MexicanNumberFormat;
    this.mxFormat = MX_NUMBER_FORMATS.includes(mxFormat) ? mxFormat : DEFAULT_MX_NUMBER_FORMAT;
    this.businessNumber = this.resolveBusinessNumber(config.get<string>('BUSINESS_WHATSAPP_NUMBER'));
    this.dateTime = new Intl.DateTimeFormat('es-MX', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: config.get<string>('BUSINESS_TIMEZONE')?.trim() || DEFAULT_TIME_ZONE,
    });
  }

  get isEnabled(): boolean {
    return this.provider.isEnabled;
  }

  /** null (con un warning al iniciar) si falta o no es un número válido. */
  private resolveBusinessNumber(raw: string | undefined): string | null {
    const value = raw?.trim();
    if (!value) {
      return null;
    }
    const number = toWhatsAppRecipient(value, this.mxFormat);
    if (!number) {
      this.logger.warn(
        'BUSINESS_WHATSAPP_NUMBER no es un número válido (¿sigue el valor de ejemplo?): ' +
          'no se enviará el aviso de pedido nuevo al negocio.',
      );
    }
    return number;
  }

  /** Pedido recién creado: acuse al cliente y aviso al negocio. */
  async notifyOrderCreated(
    order: Order,
    customer: Customer | null,
    itemSummaries: string[],
  ): Promise<void> {
    const data = this.templateData(order, customer, itemSummaries);

    if (!this.businessNumber) {
      this.logger.warn(
        `BUSINESS_WHATSAPP_NUMBER no está configurado, se omite el aviso al negocio del pedido ${order.id}.`,
      );
    } else {
      await this.send(WhatsAppEvent.NEW_ORDER_BUSINESS, this.businessNumber, data, order.id);
    }

    await this.sendToCustomer(WhatsAppEvent.ORDER_RECEIVED, customer, data, order.id);
  }

  /**
   * Cambio de status: avisa al cliente si el nuevo status tiene plantilla
   * (confirmed, preparing, delivered, cancelled, payment_failed).
   * `receiptLinkToken` va en el botón "Ver recibo" de pedido_confirmado.
   */
  async notifyStatusChanged(
    order: Order,
    customer: Customer | null,
    options: { receiptLinkToken?: string } = {},
  ): Promise<void> {
    const event = STATUS_EVENTS[order.status as OrderStatus];
    if (!event) {
      return;
    }
    const data = { ...this.templateData(order, customer, []), ...options };
    await this.sendToCustomer(event, customer, data, order.id);
  }

  private async sendToCustomer(
    event: WhatsAppEvent,
    customer: Customer | null,
    data: WhatsAppTemplateData,
    orderId: string,
  ): Promise<void> {
    if (!customer?.whatsappNumber) {
      this.logger.warn(
        `Pedido ${orderId}: el cliente no tiene whatsappNumber registrado, se omite el aviso ${event}.`,
      );
      return;
    }
    await this.send(event, customer.whatsappNumber, data, orderId);
  }

  private async send(
    event: WhatsAppEvent,
    rawNumber: string,
    data: WhatsAppTemplateData,
    orderId: string,
  ): Promise<void> {
    const to = toWhatsAppRecipient(rawNumber, this.mxFormat);
    if (!to) {
      this.logger.warn(
        `Pedido ${orderId}: "${maskPhone(rawNumber)}" no es un número de WhatsApp válido, se omite el aviso ${event}.`,
      );
      return;
    }
    try {
      await this.provider.sendTemplate(
        to,
        buildTemplateMessage(event, data, this.mode, this.testTemplate),
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar el aviso ${event} del pedido ${orderId} por WhatsApp: ` +
          `${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private templateData(
    order: Order,
    customer: Customer | null,
    itemSummaries: string[],
  ): WhatsAppTemplateData {
    return {
      customerName: customer?.fullName || 'cliente',
      folio: orderFolio(order.id),
      eventDate: this.dateTime.format(order.scheduledFor),
      peopleCount: String(order.peopleCount),
      // numeric de Postgres llega como string por el driver pg.
      total: this.currency.format(Number(order.total)),
      items: itemSummaries.join(', ') || '-',
      reviewNote: order.needsReview
        ? 'Requiere revisión: la cantidad de personas está fuera del rango de los platillos'
        : 'Sin observaciones',
    };
  }
}
