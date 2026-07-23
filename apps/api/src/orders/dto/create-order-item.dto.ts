import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateOrderItemDto {
  @ApiProperty({ description: 'id (uuid) del platillo de menú.' })
  @IsUUID()
  menuItemId!: string;

  @ApiProperty({ description: 'Cantidad solicitada del platillo.', example: 2 })
  @IsInt()
  @Min(1)
  quantity!: number;
}
