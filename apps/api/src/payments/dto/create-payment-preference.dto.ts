import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class CreatePaymentPreferenceDto {
  @ApiProperty({ description: 'id (uuid) del pedido a pagar. Debe estar en status "pending".' })
  @IsUUID()
  orderId!: string;
}
