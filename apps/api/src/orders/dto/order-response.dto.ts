import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemResponseDto } from './order-item-response.dto';

export class OrderResponseDto {
  @ApiProperty({ description: 'id (uuid) del pedido.' })
  id!: string;

  @ApiProperty({ description: 'id (uuid) del cliente que hizo el pedido.' })
  customerId!: string;

  @ApiProperty({
    description: 'Estado del pedido.',
    example: 'pending',
  })
  status!: string;

  @ApiProperty({ description: 'Número de personas para el evento.' })
  peopleCount!: number;

  @ApiProperty({ description: 'Fecha y hora programada del evento.' })
  scheduledFor!: Date;

  @ApiProperty({ description: 'Subtotal del pedido (suma de las líneas).' })
  subtotal!: number;

  @ApiProperty({ description: 'Total del pedido.' })
  total!: number;

  @ApiPropertyOptional({ description: 'Notas adicionales.', nullable: true })
  notes?: string | null;

  @ApiProperty({ description: 'Líneas del pedido.', type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty({ description: 'Fecha de creación.' })
  createdAt!: Date;

  @ApiProperty({ description: 'Fecha de última actualización.' })
  updatedAt!: Date;
}
