import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Twilio } from 'twilio';

/** Antepone el prefijo `whatsapp:` (formato exigido por la API de Twilio) si aún no lo tiene. */
function toWhatsAppAddress(rawNumber: string): string {
  return rawNumber.startsWith('whatsapp:') ? rawNumber : `whatsapp:${rawNumber}`;
}

/**
 * Envuelve el SDK de Twilio para enviar mensajes de WhatsApp (ver ADR-026).
 * Sin lógica de negocio propia -- `OrdersService` decide cuándo y qué texto
 * enviar; este servicio solo sabe hablar con la API de Twilio.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly client: Twilio;
  private readonly fromAddress: string;

  constructor(config: ConfigService) {
    const accountSid = config.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = config.get<string>('TWILIO_AUTH_TOKEN');
    this.fromAddress = toWhatsAppAddress(
      config.get<string>('TWILIO_WHATSAPP_NUMBER') ?? '',
    );
    this.client = new Twilio(accountSid, authToken);
  }

  /** Envía un mensaje de WhatsApp; deja que el error de Twilio se propague al llamador. */
  async sendMessage(to: string, body: string): Promise<void> {
    await this.client.messages.create({
      from: this.fromAddress,
      to: toWhatsAppAddress(to),
      body,
    });
    this.logger.log(`Mensaje de WhatsApp enviado a ${to}.`);
  }
}
