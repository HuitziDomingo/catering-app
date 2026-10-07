import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  WhatsAppProvider,
  WhatsAppSendError,
  type WhatsAppSendResult,
  type WhatsAppTemplateMessage,
} from './whatsapp-provider';
import { maskPhone } from './phone-number';

const GRAPH_API_BASE_URL = 'https://graph.facebook.com';
/** Versión de la Graph API si no se define WHATSAPP_API_VERSION. */
export const DEFAULT_GRAPH_API_VERSION = 'v25.0';

/**
 * Pistas para los errores de la Graph API que más salen al configurar
 * (https://developers.facebook.com/docs/whatsapp/cloud-api/support/error-codes).
 */
const ERROR_HINTS: Record<number, string> = {
  190: 'el access token caducó o es inválido: genera uno nuevo (WHATSAPP_ACCESS_TOKEN).',
  131005:
    'el token no tiene permiso para enviar con este número: usa un token de usuario de ' +
    'sistema con whatsapp_business_messaging sobre la cuenta, o el de "Configuración de la API".',
  131030:
    'el destinatario no está en la lista de números permitidos del número de prueba de Meta.',
  132000: 'la cantidad de variables no coincide con la plantilla.',
  132001: 'la plantilla no existe con ese nombre e idioma, o todavía no está aprobada.',
};

interface GraphErrorBody {
  error?: { message?: string; code?: number; error_subcode?: number };
}

interface GraphSendBody extends GraphErrorBody {
  contacts?: { input?: string; wa_id?: string }[];
  messages?: { id?: string }[];
}

/**
 * Adaptador de WhatsApp Cloud API de Meta (ver ADR-029): manda plantillas con
 * `POST /{phone-number-id}/messages` de la Graph API, con `fetch` (sin SDK).
 *
 * Un problema con WhatsApp nunca debe tumbar el negocio: si faltan
 * WHATSAPP_PHONE_NUMBER_ID o WHATSAPP_ACCESS_TOKEN, arranca deshabilitado
 * (un warning al iniciar) y cada envío se omite con un log. Con
 * configuración, un rechazo de Meta se lanza como WhatsAppSendError y lo
 * atrapa WhatsAppService.
 */
@Injectable()
export class MetaCloudWhatsAppProvider extends WhatsAppProvider {
  private readonly logger = new Logger(MetaCloudWhatsAppProvider.name);
  private readonly messagesUrl: string | null;
  private readonly accessToken: string | null;

  constructor(config: ConfigService) {
    super();
    const phoneNumberId = config.get<string>('WHATSAPP_PHONE_NUMBER_ID')?.trim();
    const accessToken = config.get<string>('WHATSAPP_ACCESS_TOKEN')?.trim();
    const apiVersion =
      config.get<string>('WHATSAPP_API_VERSION')?.trim() || DEFAULT_GRAPH_API_VERSION;

    const missing = [
      ['WHATSAPP_PHONE_NUMBER_ID', phoneNumberId],
      ['WHATSAPP_ACCESS_TOKEN', accessToken],
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      this.messagesUrl = null;
      this.accessToken = null;
      this.logger.warn(
        `WhatsApp deshabilitado: faltan variables de entorno (${missing.join(', ')}). ` +
          'Los pedidos siguen funcionando, pero no se enviarán avisos por WhatsApp.',
      );
      return;
    }

    this.messagesUrl = `${GRAPH_API_BASE_URL}/${apiVersion}/${phoneNumberId}/messages`;
    this.accessToken = accessToken as string;
  }

  get isEnabled(): boolean {
    return this.messagesUrl !== null;
  }

  async sendTemplate(
    to: string,
    message: WhatsAppTemplateMessage,
  ): Promise<WhatsAppSendResult | null> {
    if (!this.messagesUrl || !this.accessToken) {
      this.logger.log(
        `WhatsApp deshabilitado; se omite la plantilla ${message.name} a ${maskPhone(to)}.`,
      );
      return null;
    }

    let response: Response;
    try {
      response = await fetch(this.messagesUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildTemplatePayload(to, message)),
      });
    } catch (error) {
      throw new WhatsAppSendError(`No se pudo conectar con la Graph API: ${error}`, null, null);
    }

    const body = (await response.json().catch(() => ({}))) as GraphSendBody;
    if (!response.ok || body.error) {
      const code = body.error?.code ?? null;
      const hint = code !== null && ERROR_HINTS[code] ? ` Pista: ${ERROR_HINTS[code]}` : '';
      throw new WhatsAppSendError(
        `Meta rechazó la plantilla ${message.name} (HTTP ${response.status}, código ` +
          `${code ?? 'desconocido'}): ${body.error?.message ?? 'sin detalle'}.${hint}`,
        code,
        response.status,
      );
    }

    const result: WhatsAppSendResult = {
      messageId: body.messages?.[0]?.id ?? null,
      waId: body.contacts?.[0]?.wa_id ?? null,
    };
    this.logger.log(
      `Plantilla ${message.name} enviada a ${maskPhone(to)}` +
        (result.waId && result.waId !== to ? ` (wa_id ${maskPhone(result.waId)})` : '') +
        ` [${result.messageId ?? 'sin id'}].`,
    );
    return result;
  }
}

/** Body de `POST /{phone-number-id}/messages` para un mensaje de plantilla. */
export function buildTemplatePayload(to: string, message: WhatsAppTemplateMessage) {
  const components: Record<string, unknown>[] = [];
  if (message.bodyParams?.length) {
    components.push({
      type: 'body',
      parameters: message.bodyParams.map((text) => ({ type: 'text', text: toParamText(text) })),
    });
  }
  if (message.urlButtonSuffix !== undefined) {
    components.push({
      type: 'button',
      sub_type: 'url',
      index: '0',
      parameters: [{ type: 'text', text: message.urlButtonSuffix }],
    });
  }

  return {
    messaging_product: 'whatsapp',
    recipient_type: 'individual',
    to,
    type: 'template',
    template: {
      name: message.name,
      language: { code: message.languageCode },
      ...(components.length ? { components } : {}),
    },
  };
}

/**
 * Meta rechaza variables vacías o con saltos de línea, tabuladores o más de
 * 4 espacios seguidos (error 132018): se aplanan a un solo renglón.
 */
function toParamText(text: string): string {
  const flat = text.replace(/[\r\n\t]+/g, ' ').replace(/ {2,}/g, ' ').trim();
  return flat || '-';
}
