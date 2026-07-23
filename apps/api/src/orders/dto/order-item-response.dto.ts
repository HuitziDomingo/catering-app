import { ApiProperty } from '@nestjs/swagger';

export class OrderItemResponseDto {
  @ApiProperty({ description: 'id de la línea de pedido.' })
  id!: number;

  @ApiProperty({ description: 'id (uuid) del platillo de menú.' })
  menuItemId!: string;

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
