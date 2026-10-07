import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
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
import { Roles } from '../auth/decorators/roles.decorator';
import { ErrorResponseDto } from '../auth/dto/error-response.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { CreateOrderDto } from './dto/create-order.dto';
import { ListOrdersQueryDto, MyOrdersQueryDto } from './dto/list-orders-query.dto';
import { OrderReceiptResponseDto } from './dto/order-receipt-response.dto';
import { OrderResponseDto, PaginatedOrdersResponseDto } from './dto/order-response.dto';
import { ReviewOrderDto } from './dto/review-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { ReceiptLinkService } from '../pdf/receipt-link.service';
import { ReceiptsService } from '../pdf/receipts.service';
import { StorageService } from '../storage/storage.service';
import { toOrderResponse } from './order-response.mapper';
import { OrdersService } from './orders.service';

/** Roles que gestionan pedidos desde el dashboard (mismo criterio que ORDER_READ_ANY_ROLES en el servicio). */
const ORDER_MANAGE_ROLES = ['staff', 'admin', 'superadmin'];

@ApiTags('orders')
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly orders: OrdersService,
    private readonly storage: StorageService,
    private readonly receipts: ReceiptsService,
    private readonly receiptLinks: ReceiptLinkService,
  ) {}

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
  async createOrder(
    @Body() dto: CreateOrderDto,
    @Req() req: Request,
  ): Promise<OrderResponseDto> {
    const user = req.user as JwtPayload;
    return toOrderResponse(
      await this.orders.createOrder(user.sub, dto),
      this.storage,
    );
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ORDER_MANAGE_ROLES)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Lista de pedidos para el dashboard (solo staff/admin/superadmin, ver ADR-027): ' +
      'filtros por fecha del evento (from/to), status, needsReview y createdSince, ' +
      'ordenable por scheduledFor o createdAt, paginada.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedOrdersResponseDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Query inválida.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Falta el access token o es inválido/expirado.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'El usuario autenticado no tiene rol staff/admin/superadmin.',
    type: ErrorResponseDto,
  })
  async findForStaff(
    @Query() query: ListOrdersQueryDto,
  ): Promise<PaginatedOrdersResponseDto> {
    const page = await this.orders.findForStaff(query);
    return {
      ...page,
      items: page.items.map((order) => toOrderResponse(order, this.storage)),
    };
  }

  // Declarada antes de GET :id para que "mine" no se interprete como un id.
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Pedidos propios del usuario autenticado ("Mis pedidos" en mobile, ADR-027), ' +
      'más recientes primero. El cliente sale del access token, nunca de la query.',
  })
  @ApiResponse({ status: HttpStatus.OK, type: PaginatedOrdersResponseDto })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Falta el access token o es inválido/expirado.',
    type: ErrorResponseDto,
  })
  async findMine(
    @Query() query: MyOrdersQueryDto,
    @Req() req: Request,
  ): Promise<PaginatedOrdersResponseDto> {
    const user = req.user as JwtPayload;
    const page = await this.orders.findMine(user.sub, query);
    return {
      ...page,
      items: page.items.map((order) => toOrderResponse(order, this.storage)),
    };
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
  async findById(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<OrderResponseDto> {
    const user = req.user as JwtPayload;
    const order = await this.orders.findByIdForRequester(id, {
      userId: user.sub,
      role: user.role,
    });
    return toOrderResponse(order, this.storage);
  }

  @Get(':id/receipt')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'URL firmada (15 minutos) del recibo PDF del pedido (ADR-028). El cliente ' +
      'solo puede pedir el de sus propios pedidos; staff/admin/superadmin, ' +
      'cualquiera. Si el pedido está pagado y todavía no tiene recibo, se ' +
      'genera en ese momento.',
  })
  @ApiParam({ name: 'id', description: 'id (uuid) del pedido.' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderReceiptResponseDto })
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
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'El pedido todavía no está pagado (pending o payment_failed).',
    type: ErrorResponseDto,
  })
  async getReceipt(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<OrderReceiptResponseDto> {
    const user = req.user as JwtPayload;
    const order = await this.orders.findByIdForRequester(id, {
      userId: user.sub,
      role: user.role,
    });
    return {
      ...(await this.receipts.getReceiptUrl(order)),
      shareUrl: this.receiptLinks.buildShareUrl(order.id),
    };
  }

  @Patch(':id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ORDER_MANAGE_ROLES)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Cambia el status de un pedido (solo staff/admin/superadmin, ver ADR-027). ' +
      'Valida la tabla de transiciones: delivered y cancelled son finales; ' +
      'pending → confirmed a mano cubre pagos por transferencia o efectivo.',
  })
  @ApiParam({ name: 'id', description: 'id (uuid) del pedido.' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Status no permitido para cambio manual, o id inválido.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Falta el access token o es inválido/expirado.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'El usuario autenticado no tiene rol staff/admin/superadmin.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'El pedido no existe.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'La transición desde el status actual no está permitida.',
    type: ErrorResponseDto,
  })
  async updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
  ): Promise<OrderResponseDto> {
    await this.orders.updateStatus(id, dto.status);
    return toOrderResponse(await this.orders.findDetailById(id), this.storage);
  }

  @Patch(':id/review')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(...ORDER_MANAGE_ROLES)
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'Revisa un pedido marcado needsReview (fuera de rango serves_min/serves_max, ' +
      'ADR-021/ADR-027): approve, reject (cancela) o adjust (peopleCount/notas, ' +
      'recalcula needsReview). Solo staff/admin/superadmin.',
  })
  @ApiParam({ name: 'id', description: 'id (uuid) del pedido.' })
  @ApiResponse({ status: HttpStatus.OK, type: OrderResponseDto })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'DTO inválido (ej. peopleCount sin action = adjust).',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.UNAUTHORIZED,
    description: 'Falta el access token o es inválido/expirado.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'El usuario autenticado no tiene rol staff/admin/superadmin.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'El pedido no existe.',
    type: ErrorResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.CONFLICT,
    description: 'El pedido no está marcado para revisión o ya está en un estado final.',
    type: ErrorResponseDto,
  })
  async review(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReviewOrderDto,
  ): Promise<OrderResponseDto> {
    return toOrderResponse(
      await this.orders.reviewOrder(id, dto),
      this.storage,
    );
  }
}
