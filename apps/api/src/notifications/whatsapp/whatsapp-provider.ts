/** Mensaje de plantilla aprobada por Meta (los únicos que se pueden iniciar fuera de la ventana de 24 h). */
export interface WhatsAppTemplateMessage {
  /** Nombre de la plantilla tal como se registró (ej. `pedido_confirmado`). */
  name: string;
  /** Código de idioma de la plantilla (ej. `es_MX`, `en_US`). */
  languageCode: string;
  /** Valores de {{1}}, {{2}}… del cuerpo, en orden. */
  bodyParams?: string[];
  /** Sufijo dinámico del primer botón de tipo URL ({{1}} de su URL). */
  urlButtonSuffix?: string;
}

/** Resultado de un envío aceptado por el proveedor. */
export interface WhatsAppSendResult {
  /** id del mensaje en el proveedor (para rastrearlo en sus logs). */
  messageId: string | null;
  /** Identificador de WhatsApp del destinatario según el proveedor (`wa_id`). */
  waId: string | null;
}

/** El proveedor rechazó el envío. `code` es el código de error del proveedor. */
export class WhatsAppSendError extends Error {
  constructor(
    message: string,
    readonly code: number | null,
    readonly httpStatus: number | null,
  ) {
    super(message);
    this.name = 'WhatsAppSendError';
  }
}

/**
 * Puerto del proveedor de WhatsApp (ver ADR-029). WhatsAppService decide qué
 * plantilla mandar y a quién; el proveedor solo sabe hablar con su API. La
 * implementación vigente es MetaCloudWhatsAppProvider; cambiar de proveedor
 * es escribir otro adaptador, sin tocar OrdersService.
 */
export abstract class WhatsAppProvider {
  /** false si arrancó sin configuración: los envíos se omiten. */
  abstract get isEnabled(): boolean;

  /**
   * Envía una plantilla a `to` (solo dígitos, con código de país). Lanza
   * WhatsAppSendError si el proveedor la rechaza. Si el proveedor está
   * deshabilitado, no hace nada y devuelve null.
   */
  abstract sendTemplate(
    to: string,
    message: WhatsAppTemplateMessage,
  ): Promise<WhatsAppSendResult | null>;
}
