import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderDocument } from '../database/entities/order-document.entity';
import { StorageModule } from '../storage/storage.module';
import { ReceiptLinkService } from './receipt-link.service';
import { ReceiptPdfRenderer } from './receipt-pdf.renderer';
import { ReceiptsService } from './receipts.service';

/**
 * Documentos PDF de pedidos (ADR-007, ADR-028): por ahora el recibo, y el
 * link de 30 días que lo abre desde WhatsApp (ADR-029). No
 * depende de OrdersModule -- recibe el pedido ya cargado -- para que
 * OrdersService pueda usarlo sin dependencia circular.
 */
@Module({
  // Sin secreto global: ReceiptLinkService firma con RECEIPT_LINK_SECRET.
  imports: [TypeOrmModule.forFeature([OrderDocument]), StorageModule, JwtModule.register({})],
  providers: [ReceiptPdfRenderer, ReceiptsService, ReceiptLinkService],
  exports: [ReceiptsService, ReceiptLinkService],
})
export class PdfModule {}
