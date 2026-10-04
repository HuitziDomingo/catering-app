import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  InvalidWebhookSignatureError,
  MercadoPagoConfig,
  Payment as MercadoPagoPayment,
  Preference,
  WebhookSignatureValidator,
} from 'mercadopago';
import { OrderStatus, type PaymentReturnResult } from '@catering-app/shared-types';
import { OrdersService } from '../orders/orders.service';

interface Requester {
  userId: string;
  role: string;
  email: string;
}

export interface WebhookHeaders {
  xSignature: string | string[] | undefined;
  xRequestId: string | string[] | undefined;
  dataId: string | string[] | undefined;
  type: string | undefined;
}

/** Moneda única del negocio (catering en México, ver ADR-022). */
const CURRENCY_ID = 'MXN';

/** Notificación de tipo distinto a "payment" (ej. merchant_order): se descarta sin procesar. */
const PAYMENT_NOTIFICATION_TYPE = 'payment';

/** Deep link de regreso a la app por default (scheme de apps/mobile/app.json). */
const DEFAULT_MOBILE_PAYMENT_RETURN_URL = 'mobile://payment';

/** Estados de pago de Mercado Pago que mapean a un pedido confirmado/rechazado. */
const APPROVED_PAYMENT_STATUSES = new Set(['approved']);
const FAILED_PAYMENT_STATUSES = new Set(['rejected', 'cancelled']);

/**
 * Integración con Mercado Pago Checkout Pro (ver ADR-022, ADR-024):
 * creación de Preferencias de Pago y procesamiento del webhook de
 * notificaciones. El SDK oficial (`mercadopago`) se configura de forma
 * perezosa (mismo patrón que AuthService.requireSecret): si falta el access
 * token, el error surge al primer uso real, no al arrancar la app.
 */
@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private mpConfig?: MercadoPagoConfig;
  private preferenceClient?: Preference;
  private paymentClient?: MercadoPagoPayment;

  constructor(
    private readonly config: ConfigService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Crea una Preferencia de Pago para un pedido y devuelve la URL de
   * Checkout Pro. Solo el cliente dueño del pedido puede pagarlo (a
   * diferencia de OrdersService.findByIdForRequester, que también permite a
   * staff/admin/superadmin *consultar* cualquier pedido -- pagar es una
   * acción distinta de leer, y Checkout Pro de todos modos redirige al
   * cliente real a pagar, no a quien llama este endpoint).
   */
  async createPreference(orderId: string, requester: Requester): Promise<string> {
    const order = await this.ordersService.findByIdForRequester(orderId, requester);

    if (order.customerId !== requester.userId) {
      throw new ForbiddenException('Solo el cliente dueño del pedido puede generar su pago.');
    }
    if (order.status === OrderStatus.PAYMENT_FAILED) {
      // Reintento de pago tras un rechazo (ADR-027): el pedido vuelve a
      // pending y se genera una preferencia nueva.
      await this.ordersService.updateStatus(order.id, OrderStatus.PENDING);
    } else if (order.status !== OrderStatus.PENDING) {
      throw new BadRequestException(
        `El pedido no está pendiente de pago (status actual: ${order.status}).`,
      );
    }

    const preference = await this.getPreferenceClient().create({
      body: {
        items: [
          {
            id: order.id,
            title: `Pedido de catering #${order.id}`,
            quantity: 1,
            unit_price: Number(order.total),
            currency_id: CURRENCY_ID,
          },
        ],
        // Vincula la preferencia (y el payment resultante) con nuestro
        // pedido -- es lo que processWebhook usa para saber qué order
        // actualizar tras re-consultar el pago (ver ADR-024).
        external_reference: order.id,
        payer: { email: requester.email },
        ...this.buildBackUrls(),
      },
    });

    if (!preference.id || !preference.init_point) {
      throw new InternalServerErrorException(
        'Mercado Pago no devolvió una preferencia válida (falta id o init_point).',
      );
    }

    await this.ordersService.attachPaymentPreference(order.id, preference.id);

    return preference.init_point;
  }

  /**
   * Procesa el webhook de Mercado Pago (ver ADR-024):
   * 1. Valida la firma (rechaza con 401 si no es válida).
   * 2. Ignora notificaciones que no son de tipo "payment" (ej. merchant_order).
   * 3. Re-consulta el pago real contra la API de Mercado Pago -- nunca
   *    confía en el payload del webhook como fuente de verdad.
   * 4. Actualiza orders.status según el resultado (confirmed / payment_failed).
   *    Estados intermedios (pending, in_process, authorized) no modifican el
   *    pedido: se espera un webhook posterior con el resultado final.
   */
  async processWebhook(headers: WebhookHeaders): Promise<void> {
    try {
      WebhookSignatureValidator.validate({
        xSignature: headers.xSignature,
        xRequestId: headers.xRequestId,
        dataId: headers.dataId,
        secret: this.requireEnv('MERCADOPAGO_WEBHOOK_SECRET'),
      });
    } catch (err) {
      if (err instanceof InvalidWebhookSignatureError) {
        this.logger.warn(`Webhook de Mercado Pago con firma inválida: ${err.reason}`);
        throw new UnauthorizedException('Firma de webhook inválida.');
      }
      throw err;
    }

    if (headers.type !== PAYMENT_NOTIFICATION_TYPE) {
      return;
    }

    const dataId = normaliseHeaderValue(headers.dataId);
    if (!dataId) {
      this.logger.warn('Webhook de tipo "payment" sin data.id -- se descarta.');
      return;
    }

    const payment = await this.getPaymentClient().get({ id: dataId });

    const orderId = payment.external_reference;
    if (!orderId) {
      this.logger.warn(`Payment ${dataId} de Mercado Pago sin external_reference -- se descarta.`);
      return;
    }

    const nextStatus = mapPaymentStatusToOrderStatus(payment.status);
    if (!nextStatus) {
      // pending / in_process / authorized / etc.: todavía no hay un
      // resultado final, no se toca el pedido.
      return;
    }

    // El detalle del pago sale de la re-consulta (nunca del webhook) y se
    // guarda junto con el cambio de status (ADR-027). recordPaymentResult no
    // lanza por transiciones inválidas: un error acá haría que Mercado Pago
    // reintente el webhook indefinidamente.
    await this.ordersService.recordPaymentResult(orderId, nextStatus, {
      paymentId: String(payment.id ?? dataId),
      paymentMethod: payment.payment_method_id ?? null,
      paidAt: payment.date_approved ? new Date(payment.date_approved) : null,
    });
  }

  /**
   * URL de la app a la que se redirige al cliente cuando Mercado Pago lo
   * regresa a GET /payments/return/:result (addendum 01 de ADR-024). Solo se
   * reenvían orderId y el status de Mercado Pago como pista -- la app siempre
   * vuelve a consultar el pedido, el status real lo fija el webhook. El
   * destino sale de configuración, nunca de la query (sin open redirect).
   */
  buildAppReturnUrl(
    result: PaymentReturnResult,
    params: { orderId?: string; paymentStatus?: string },
  ): string {
    const base =
      this.config.get<string>('MOBILE_PAYMENT_RETURN_URL') ?? DEFAULT_MOBILE_PAYMENT_RETURN_URL;
    const query = new URLSearchParams();
    if (params.orderId) query.set('orderId', params.orderId);
    if (params.paymentStatus) query.set('paymentStatus', params.paymentStatus);
    const qs = query.toString();
    return `${base.replace(/\/$/, '')}/${result}${qs ? `?${qs}` : ''}`;
  }

  /**
   * back_urls de Checkout Pro (addendum 01 de ADR-024): HTTPS a la propia API,
   * que redirige al deep link de la app. Mercado Pago exige HTTPS público para
   * auto_return, así que sin API_PUBLIC_URL (ej. dev sin túnel) se omiten y el
   * flujo queda como antes: el cliente regresa a mano.
   */
  private buildBackUrls(): {
    back_urls?: { success: string; failure: string; pending: string };
    auto_return?: string;
  } {
    const publicUrl = this.config.get<string>('API_PUBLIC_URL');
    if (!publicUrl) {
      this.logger.warn('API_PUBLIC_URL no está definida: la preferencia se crea sin back_urls.');
      return {};
    }
    const base = `${publicUrl.replace(/\/$/, '')}/api/payments/return`;
    return {
      back_urls: {
        success: `${base}/success`,
        failure: `${base}/failure`,
        pending: `${base}/pending`,
      },
      auto_return: 'approved',
    };
  }

  private getPreferenceClient(): Preference {
    if (!this.preferenceClient) {
      this.preferenceClient = new Preference(this.getMpConfig());
    }
    return this.preferenceClient;
  }

  private getPaymentClient(): MercadoPagoPayment {
    if (!this.paymentClient) {
      this.paymentClient = new MercadoPagoPayment(this.getMpConfig());
    }
    return this.paymentClient;
  }

  private getMpConfig(): MercadoPagoConfig {
    if (!this.mpConfig) {
      this.mpConfig = new MercadoPagoConfig({
        accessToken: this.requireEnv('MERCADOPAGO_ACCESS_TOKEN'),
      });
    }
    return this.mpConfig;
  }

  private requireEnv(key: 'MERCADOPAGO_ACCESS_TOKEN' | 'MERCADOPAGO_WEBHOOK_SECRET'): string {
    const value = this.config.get<string>(key);
    if (!value) {
      throw new InternalServerErrorException(`${key} no está definida.`);
    }
    return value;
  }
}

function normaliseHeaderValue(value: string | string[] | undefined): string | undefined {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw && raw.trim().length > 0 ? raw.trim() : undefined;
}

function mapPaymentStatusToOrderStatus(status: string | undefined): OrderStatus | undefined {
  if (!status) return undefined;
  if (APPROVED_PAYMENT_STATUSES.has(status)) return OrderStatus.CONFIRMED;
  if (FAILED_PAYMENT_STATUSES.has(status)) return OrderStatus.PAYMENT_FAILED;
  return undefined;
}
