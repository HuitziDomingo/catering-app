import { Controller, Get, HttpException, HttpStatus, Logger, Param, Res } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { RECEIPT_LINK_PATH, ReceiptLinkService } from '../pdf/receipt-link.service';
import { ReceiptsService } from '../pdf/receipts.service';
import { OrdersService } from './orders.service';

/** Página mínima para el navegador: el link se abre desde WhatsApp, no desde la app. */
function errorPage(message: string): string {
  const safe = message.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  return (
    '<!doctype html><html lang="es"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Recibo</title></head><body style="font-family:system-ui,sans-serif;' +
    `max-width:32rem;margin:3rem auto;padding:0 1rem"><h1>Recibo</h1><p>${safe}</p></body></html>`
  );
}

/**
 * Link al recibo desde WhatsApp (ADR-029). Público a propósito: el
 * navegador que abre el link no manda JWT. El token (30 días) es la
 * credencial; cada apertura genera una URL firmada nueva de 15 minutos
 * (ADR-028) y redirige al PDF.
 */
@ApiTags('orders')
@Controller(RECEIPT_LINK_PATH)
export class ReceiptLinkController {
  private readonly logger = new Logger(ReceiptLinkController.name);

  constructor(
    private readonly links: ReceiptLinkService,
    private readonly orders: OrdersService,
    private readonly receipts: ReceiptsService,
  ) {}

  @Get(':token')
  @ApiOperation({
    summary:
      'Abre el recibo PDF desde el link de WhatsApp (sin JWT): valida el token de ' +
      '30 días, genera una URL firmada de 15 minutos y redirige a ella.',
  })
  @ApiParam({ name: 'token', description: 'Token del link (botón "Ver recibo").' })
  @ApiResponse({ status: HttpStatus.FOUND, description: 'Redirect a la URL firmada del PDF.' })
  @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Token inválido o pedido inexistente.' })
  @ApiResponse({ status: HttpStatus.GONE, description: 'El link caducó (30 días).' })
  @ApiResponse({ status: HttpStatus.CONFLICT, description: 'El pedido ya no tiene pago que documentar.' })
  async open(@Param('token') token: string, @Res() res: Response): Promise<void> {
    try {
      const orderId = this.links.verifyToken(token);
      const order = await this.orders.findDetailById(orderId);
      const { url } = await this.receipts.getReceiptUrl(order);
      // Sin caché: la URL de destino caduca en 15 minutos.
      res.setHeader('Cache-Control', 'no-store');
      res.redirect(HttpStatus.FOUND, url);
    } catch (error) {
      const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
      if (status >= 500) {
        this.logger.error(`No se pudo abrir el recibo desde el link: ${error}`);
      }
      const message =
        status === HttpStatus.GONE || status === HttpStatus.NOT_FOUND
          ? (error as HttpException).message
          : status === HttpStatus.CONFLICT
            ? 'Este pedido no tiene un recibo disponible.'
            : 'No pudimos abrir el recibo. Intenta de nuevo en unos minutos o revísalo en la app.';
      res.status(status).type('html').send(errorPage(message));
    }
  }
}
