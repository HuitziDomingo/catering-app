import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Request } from 'express';
import { ErrorResponseDto } from '../auth/dto/error-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderResponseDto } from './dto/order-response.dto';
import { OrdersService } from './orders.service';

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Crea un pedido con sus líneas (cualquier usuario autenticado). El ' +
      'customerId se toma del access token, no del body. El precio de cada ' +
      'línea es un snapshot del base_price vigente del platillo en este ' +
      'momento (ver ADR-006).',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Pedido creado con sus líneas.',
    type: OrderResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'DTO inválido, o algún platillo indicado no está activo.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Falta el access token o es inválido/expirado.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Alguno de los platillos indicados no existe.',
    type: ErrorResponseDto,
  })
  createOrder(
    @Body() dto: CreateOrderDto,
    @Req() req: Request,
  ): Promise<OrderResponseDto> {
    const user = req.user as JwtPayload;
    return this.orders.createOrder(user.sub, dto);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Obtiene un pedido con sus líneas. El cliente solo puede consultar ' +
      'sus propios pedidos; staff/admin/superadmin puede consultar cualquiera.',
  })
  @ApiParam({ name: 'id', description: 'id (uuid) del pedido.' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Pedido encontrado.',
    type: OrderResponseDto,
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
  findById(
    @Param('id') id: string,
    @Req() req: Request,
  ): Promise<OrderResponseDto> {
    const user = req.user as JwtPayload;
    return this.orders.findByIdForRequester(id, {
      userId: user.sub,
      role: user.role,
    });
  }
}
