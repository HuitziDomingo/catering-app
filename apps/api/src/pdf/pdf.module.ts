import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OrderDocument } from '../database/entities/order-document.entity';
import { StorageModule } from '../storage/storage.module';
import { ReceiptPdfRenderer } from './receipt-pdf.renderer';
import { ReceiptsService } from './receipts.service';

/**
 * Documentos PDF de pedidos (ADR-007, ADR-028): por ahora el recibo. No
 * depende de OrdersModule -- recibe el pedido ya cargado -- para que
 * OrdersService pueda usarlo sin dependencia circular.
 */
@Module({
  imports: [TypeOrmModule.forFeature([OrderDocument]), StorageModule],
  providers: [ReceiptPdfRenderer, ReceiptsService],
  exports: [ReceiptsService],
})
export class PdfModule {}
