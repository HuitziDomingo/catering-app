import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

/** Formato real de un Account SID de Twilio; los placeholders (`ACxxxx...`) no lo cumplen. */
const ACCOUNT_SID_PATTERN = /^AC[a-f0-9]{32}$/i;

/** Antepone el prefijo `whatsapp:` (formato exigido por la API de Twilio) si aún no lo tiene. */
function toWhatsAppAddress(rawNumber: string): string {
  return rawNumber.startsWith('whatsapp:') ? rawNumber : `whatsapp:${rawNumber}`;
}

/**
 * Envuelve el SDK de Twilio para enviar mensajes de WhatsApp (ver ADR-026).
 * Sin lógica de negocio propia -- `OrdersService` decide cuándo y qué texto
 * enviar; este servicio solo sabe hablar con la API de Twilio.
 *
 * Un problema con Twilio nunca debe tumbar el negocio: si faltan credenciales
 * o el Account SID no tiene formato válido, el servicio arranca deshabilitado
 * (un solo warning al iniciar) y `sendMessage` se vuelve un no-op registrado.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly client: Twilio | null;
  private readonly fromAddress: string;

  constructor(config: ConfigService) {
    const accountSid = config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = config.get<string>('TWILIO_AUTH_TOKEN');
    const whatsAppNumber = config.get<string>('TWILIO_WHATSAPP_NUMBER');
    this.fromAddress = toWhatsAppAddress(whatsAppNumber ?? '');

    const missing = [
      ['TWILIO_ACCOUNT_SID', accountSid],
      ['TWILIO_AUTH_TOKEN', authToken],
      ['TWILIO_WHATSAPP_NUMBER', whatsAppNumber],
    ]
      .filter(([, value]) => !value)
      .map(([key]) => key);

    if (missing.length > 0) {
      this.client = null;
      this.logger.warn(
        `WhatsApp deshabilitado: faltan variables de entorno (${missing.join(', ')}). ` +
          'Los pedidos siguen funcionando, pero no se enviarán avisos por WhatsApp.',
      );
    } else if (!ACCOUNT_SID_PATTERN.test(accountSid as string)) {
      this.client = null;
      this.logger.warn(
        'WhatsApp deshabilitado: TWILIO_ACCOUNT_SID no tiene formato válido ' +
          '(AC + 32 hex; ¿sigue el placeholder de .env.example?). ' +
          'Los pedidos siguen funcionando, pero no se enviarán avisos por WhatsApp.',
      );
    } else {
      this.client = new Twilio(accountSid, authToken);
    }
  }

  /** `false` si arrancó sin credenciales válidas y los envíos son no-op. */
  get isEnabled(): boolean {
    return this.client !== null;
  }

  /**
   * Envía un mensaje de WhatsApp. Si el servicio está deshabilitado, solo lo
   * registra y regresa sin lanzar; si está habilitado, deja que el error de
   * Twilio se propague al llamador.
   */
  async sendMessage(to: string, body: string): Promise<void> {
    if (!this.client) {
      this.logger.log(`WhatsApp deshabilitado; se omite el mensaje a ${to}.`);
      return;
    }

    await this.client.messages.create({
      from: this.fromAddress,
      to: toWhatsAppAddress(to),
      body,
    });
    this.logger.log(`Mensaje de WhatsApp enviado a ${to}.`);
  }
}
