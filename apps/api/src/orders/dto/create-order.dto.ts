import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsDateString,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';
import { CreateOrderItemDto } from './create-order-item.dto';
import {
  MAX_ORDER_ITEMS,
  MAX_ORDER_ITEMS_MESSAGE,
  MIN_ORDER_ITEMS_MESSAGE,
} from '../order-items.validation';

/**
 * `customerId` no es parte del DTO: se toma del `sub` del JWT autenticado
 * (mismo patrón de seguridad que el tool MCP consultar_pedidos_por_cliente,
 * evita que el cliente pueda crear pedidos a nombre de otro usuario).
 */
export class CreateOrderDto {
  @ApiProperty({ description: 'Número de personas para el evento.', example: 10 })
  @IsInt()
  @Min(1)
  peopleCount!: number;

  @ApiProperty({
    description: 'Fecha y hora programada del evento (ISO 8601).',
    example: '2026-08-01T18:00:00.000Z',
  })
  @IsDateString()
  scheduledFor!: string;

  @ApiPropertyOptional({ description: 'Notas adicionales del pedido.' })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiProperty({
    description:
      'Platillos solicitados. El precio de cada línea se toma del base_price ' +
      'vigente del platillo al momento del pedido (snapshot, ver ADR-006).',
    type: [CreateOrderItemDto],
    minItems: 1,
    maxItems: MAX_ORDER_ITEMS,
  })
  @IsArray()
  @ArrayMinSize(1, { message: MIN_ORDER_ITEMS_MESSAGE })
  @ArrayMaxSize(MAX_ORDER_ITEMS, { message: MAX_ORDER_ITEMS_MESSAGE })
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];
}
