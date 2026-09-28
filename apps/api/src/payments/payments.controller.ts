import {
  Body,
  Controller,
  Headers,
  HttpCode,
  HttpStatus,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { ErrorResponseDto } from '../auth/dto/error-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreatePaymentPreferenceDto } from './dto/create-payment-preference.dto';
import { PaymentPreferenceResponseDto } from './dto/payment-preference-response.dto';
import { PaymentsService } from './payments.service';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('preferences')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Crea una Preferencia de Pago de Mercado Pago (Checkout Pro, ver ADR-024) para un ' +
      'pedido propio en status "pending", y devuelve la URL de checkout. Solo el cliente ' +
      'dueño del pedido puede generar su pago.',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Preferencia creada.',
    type: PaymentPreferenceResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'DTO inválido, o el pedido no está en status "pending".',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Falta el access token o es inválido/expirado.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'El pedido pertenece a otro cliente.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'El pedido no existe.',
    type: ErrorResponseDto,
  })
  async createPreference(
    @Body() dto: CreatePaymentPreferenceDto,
    @Req() req: Request,
  ): Promise<PaymentPreferenceResponseDto> {
    const user = req.user as JwtPayload;
    const checkoutUrl = await this.payments.createPreference(dto.orderId, {
      userId: user.sub,
      role: user.role,
      email: user.email,
    });
    return { checkoutUrl };
  }

  @Post('webhook')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Webhook público de Mercado Pago (sin JWT: lo llama Mercado Pago directamente, ver ' +
      'ADR-024). Valida la firma (header x-signature + MERCADOPAGO_WEBHOOK_SECRET), y para ' +
      'notificaciones de tipo "payment" re-consulta el pago real contra la API de Mercado ' +
      'Pago (nunca confía en el payload recibido) antes de actualizar orders.status.',
  })
  @ApiResponse({ status: HttpStatus.OK, description: 'Notificación procesada (u descartada si no aplica).' })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Firma de webhook ausente o inválida.',
    type: ErrorResponseDto,
  })
  async webhook(
    @Headers('x-signature') xSignature: string | undefined,
    @Headers('x-request-id') xRequestId: string | undefined,
    @Query('data.id') dataId: string | undefined,
    @Body('type') type: string | undefined,
  ): Promise<void> {
    await this.payments.processWebhook({ xSignature, xRequestId, dataId, type });
  }
}
