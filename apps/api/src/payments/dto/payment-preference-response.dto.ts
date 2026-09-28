import { ApiProperty } from '@nestjs/swagger';

export class PaymentPreferenceResponseDto {
  @ApiProperty({
    description:
      'URL de Checkout Pro (init_point) a la que redirigir al cliente para pagar (ver ADR-024).',
    example: 'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=123456789-abc',
  })
  checkoutUrl!: string;
}
