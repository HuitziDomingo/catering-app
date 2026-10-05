import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty({ description: 'id de la línea de pedido.' })
  id!: number;

  @ApiProperty({ description: 'id (uuid) del pedido.' })
  orderId!: string;

  @ApiProperty({ description: 'id (uuid) del platillo de menú.' })
  menuItemId!: string;

  @ApiProperty({ description: 'Nombre del platillo (vigente, no snapshot).' })
  menuItemName!: string;

  @ApiPropertyOptional({
    description:
      'URL pública de la imagen vigente del platillo (ADR-028). null si no ' +
      'tiene imagen o si el platillo está dado de baja.',
    nullable: true,
  })
  menuItemImageUrl!: string | null;

  @ApiProperty({ description: 'Cantidad solicitada.' })
  quantity!: number;

  @ApiProperty({
    description:
      'Precio unitario al momento del pedido (snapshot del base_price ' +
      'vigente en ese momento; no cambia si el platillo cambia de precio después).',
  })
  unitPrice!: number;

  @ApiProperty({ description: 'Subtotal de la línea (quantity * unitPrice).' })
  subtotal!: number;
}
