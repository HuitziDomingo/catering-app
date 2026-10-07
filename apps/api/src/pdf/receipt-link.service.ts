import { GoneException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService, TokenExpiredError } from '@nestjs/jwt';

/** Vigencia del link al recibo que va en WhatsApp (ADR-029). */
export const RECEIPT_LINK_TTL = '30d';
const RECEIPT_LINK_AUDIENCE = 'receipt-link';

/** Ruta pública que abre el recibo a partir del token (ReceiptLinkController). */
export const RECEIPT_LINK_PATH = 'receipts';

interface ReceiptLinkPayload {
  sub: string;
}

/**
 * Link al recibo que no caduca a los 15 minutos (ADR-029): el mensaje de
 * WhatsApp lleva un token firmado con RECEIPT_LINK_SECRET (distinto de los
 * secretos de sesión) que identifica el pedido y dura 30 días. Al abrirlo,
 * GET /receipts/:token genera en ese momento una URL firmada de 15 minutos
 * y redirige al PDF.
 *
 * Es un link portador: quien lo tenga ve el recibo mientras no caduque. Por
 * eso solo identifica un pedido, sirve solo para su recibo y no da acceso a
 * nada más de la API.
 */
@Injectable()
export class ReceiptLinkService {
  private readonly logger = new Logger(ReceiptLinkService.name);
  private warnedMissingSecret = false;

  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /** Token del link, o null (con un warning) si falta RECEIPT_LINK_SECRET. */
  createToken(orderId: string): string | null {
    const secret = this.secret();
    if (!secret) {
      if (!this.warnedMissingSecret) {
        this.warnedMissingSecret = true;
        this.logger.warn(
          'RECEIPT_LINK_SECRET no está definida: los avisos de WhatsApp no llevarán link al recibo.',
        );
      }
      return null;
    }
    return this.jwt.sign({ sub: orderId } satisfies ReceiptLinkPayload, {
      secret,
      expiresIn: RECEIPT_LINK_TTL,
      audience: RECEIPT_LINK_AUDIENCE,
    });
  }

  /**
   * URL pública completa del link (para compartir o probar en Bruno), o null
   * si falta API_PUBLIC_URL o RECEIPT_LINK_SECRET.
   */
  buildShareUrl(orderId: string): string | null {
    const publicUrl = this.config.get<string>('API_PUBLIC_URL')?.trim();
    if (!publicUrl) {
      return null;
    }
    const token = this.createToken(orderId);
    return token ? `${publicUrl.replace(/\/+$/, '')}/api/${RECEIPT_LINK_PATH}/${token}` : null;
  }

  /** id del pedido del token. 410 si caducó, 404 si no es válido. */
  verifyToken(token: string): string {
    const secret = this.secret();
    if (!secret) {
      throw new NotFoundException('El link del recibo no es válido.');
    }
    try {
      const payload = this.jwt.verify<ReceiptLinkPayload>(token, {
        secret,
        audience: RECEIPT_LINK_AUDIENCE,
      });
      return payload.sub;
    } catch (error) {
      if (error instanceof TokenExpiredError) {
        throw new GoneException(
          'El link del recibo caducó. Puedes verlo en la app, en Mis pedidos.',
        );
      }
      throw new NotFoundException('El link del recibo no es válido.');
    }
  }

  private secret(): string | null {
    return this.config.get<string>('RECEIPT_LINK_SECRET')?.trim() || null;
  }
}
