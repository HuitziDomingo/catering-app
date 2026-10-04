import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';
import {
  OrderStatus,
  STAFF_SETTABLE_ORDER_STATUSES,
  type UpdateOrderStatusDto as UpdateOrderStatusContract,
} from '@catering-app/shared-types';

/**
 * Cambio manual de status por el staff (ver ADR-027). `pending` y
 * `payment_failed` no se aceptan aquí: los maneja el flujo de pago.
 */
export class UpdateOrderStatusDto implements UpdateOrderStatusContract {
  @ApiProperty({ enum: STAFF_SETTABLE_ORDER_STATUSES, example: OrderStatus.PREPARING })
  @IsIn(STAFF_SETTABLE_ORDER_STATUSES)
  status!: OrderStatus;
}
