import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderItemResponseDto } from './order-item-response.dto';

export class OrderCustomerSummaryDto {
  @ApiProperty({ description: 'id (uuid) del cliente.' })
  id!: string;

  @ApiProperty()
  fullName!: string;

  @ApiProperty()
  email!: string;

  @ApiPropertyOptional({ nullable: true })
  phone!: string | null;

  @ApiPropertyOptional({ nullable: true })
  whatsappNumber!: string | null;
}

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
  notes!: string | null;

  @ApiProperty({
    description:
      'true si peopleCount cayó fuera del rango serves_min/serves_max de ' +
      'todos los platillos pedidos: el pedido se creó igual pero requiere ' +
      'revisión manual del negocio (ver ADR-023).',
  })
  needsReview!: boolean;

  @ApiPropertyOptional({
    description: 'id de la Preferencia de Pago de Mercado Pago (ADR-024).',
    nullable: true,
  })
  paymentPreferenceId!: string | null;

  @ApiPropertyOptional({
    description: 'id del pago en Mercado Pago, de la re-consulta del webhook (ADR-027).',
    nullable: true,
  })
  paymentId!: string | null;

  @ApiPropertyOptional({
    description: 'payment_method_id de Mercado Pago (ej. visa, oxxo, spei).',
    nullable: true,
  })
  paymentMethod!: string | null;

  @ApiPropertyOptional({
    description: 'Fecha de aprobación del pago; null si no hay pago aprobado.',
    nullable: true,
  })
  paidAt!: Date | null;

  @ApiPropertyOptional({
    description:
      'Datos del cliente. Viene en las lecturas (GET); POST /orders lo devuelve null.',
    type: OrderCustomerSummaryDto,
    nullable: true,
  })
  customer!: OrderCustomerSummaryDto | null;

  @ApiProperty({ description: 'Líneas del pedido.', type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty({ description: 'Fecha de creación.' })
  createdAt!: Date;

  @ApiProperty({ description: 'Fecha de última actualización.' })
  updatedAt!: Date;
}

export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: [OrderResponseDto] })
  items!: OrderResponseDto[];

  @ApiProperty({ description: 'Total de pedidos que cumplen el filtro.' })
  total!: number;

  @ApiProperty({ description: 'Página actual, empezando en 1.' })
  page!: number;

  @ApiProperty()
  pageSize!: number;
}
