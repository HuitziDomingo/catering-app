import { ApiProperty } from '@nestjs/swagger';
import type { OrderReceiptResponse } from '@catering-app/shared-types';

/** Respuesta de GET /orders/:id/receipt (ADR-028). */
export class OrderReceiptResponseDto implements OrderReceiptResponse {
  @ApiProperty({
    description:
      'URL firmada del PDF en el bucket privado order-documents. Se abre sin ' +
      'header Authorization (navegador del sistema) y caduca a los 15 minutos.',
  })
  url!: string;

  @ApiProperty({
    description: 'Momento en que la URL deja de funcionar (ISO 8601).',
    example: '2026-10-06T19:15:00.000Z',
  })
  expiresAt!: string;

  @ApiProperty({
    nullable: true,
    type: String,
    description:
      'Link de 30 días para compartir (el del botón "Ver recibo" de WhatsApp, ADR-029); ' +
      'al abrirlo genera una URL firmada nueva. null sin API_PUBLIC_URL o RECEIPT_LINK_SECRET.',
  })
  shareUrl!: string | null;
}
