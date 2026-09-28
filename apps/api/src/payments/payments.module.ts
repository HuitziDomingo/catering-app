import { Module } from '@nestjs/common';
import { OrdersModule } from '../orders/orders.module';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

/**
 * Integración con Mercado Pago Checkout Pro (ver ADR-022, ADR-024). No
 * registra entidades propias: toda mutación de `orders` pasa por
 * OrdersService (importado de OrdersModule) para no exponer el repositorio
 * de Order fuera de su módulo dueño.
 */
@Module({
  imports: [OrdersModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
})
export class PaymentsModule {}
