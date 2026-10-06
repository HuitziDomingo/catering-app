import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  canTransitionOrderStatus,
  OrderStatus,
  ReviewOrderAction,
  type Paginated,
} from '@catering-app/shared-types';
import { MenuItem } from '../database/entities/menu-item.entity';
import { Order } from '../database/entities/order.entity';
import { OrderItem } from '../database/entities/order-item.entity';
import { User } from '../database/entities/user.entity';
import { NotificationGateway } from '../notifications/notification.gateway';
import { ReceiptsService } from '../pdf/receipts.service';
import { WhatsAppService } from '../notifications/whatsapp/whatsapp.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  DEFAULT_PAGE_SIZE,
  ListOrdersQueryDto,
  MyOrdersQueryDto,
} from './dto/list-orders-query.dto';
import { ReviewOrderDto } from './dto/review-order.dto';
import { assertScheduledForInFuture } from './scheduled-for.validation';

/** Estados de pedido que disparan un aviso de WhatsApp al cliente (ver ADR-026). */
const CUSTOMER_NOTIFIABLE_STATUSES: string[] = [
  OrderStatus.CONFIRMED,
  OrderStatus.PAYMENT_FAILED,
];

function formatScheduledFor(date: Date): string {
  return date.toLocaleString('es-MX', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export interface FindByCustomerFilters {
  status?: OrderStatus;
  limit?: number;
}

interface Requester {
  userId: string;
  role: string;
}

/** Detalle del pago tomado de la re-consulta a Mercado Pago (ADR-024, ADR-027). */
export interface PaymentResult {
  paymentId: string;
  paymentMethod: string | null;
  /** date_approved; null si el pago no fue aprobado. */
  paidAt: Date | null;
}

/** Estados finales: un pedido ahí ya no se revisa ni cambia de status (ADR-027). */
const FINAL_STATUSES: string[] = [OrderStatus.DELIVERED, OrderStatus.CANCELLED];

/** Roles que pueden consultar cualquier pedido, no solo los propios. */
const ORDER_READ_ANY_ROLES = ['staff', 'admin', 'superadmin'];

function roundCurrency(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Servicio para gestión de pedidos (ver ADR-006).
 */
@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    private readonly notificationGateway: NotificationGateway,
    private readonly whatsAppService: WhatsAppService,
    private readonly config: ConfigService,
    private readonly receipts: ReceiptsService,
  ) {}

  /**
   * Busca pedidos por cliente con filtros opcionales.
   * Usado por el tool MCP consultar_pedidos_por_cliente.
   */
  async findByCustomer(
    customerId: string,
    filters: FindByCustomerFilters = {},
  ): Promise<Order[]> {
    const { status, limit = 5 } = filters;

    const queryBuilder = this.ordersRepository
      .createQueryBuilder('order')
      .where('order.customerId = :customerId', { customerId })
      .orderBy('order.createdAt', 'DESC')
      .take(Math.min(limit, 20)); // Max 20

    if (status) {
      queryBuilder.andWhere('order.status = :status', { status });
    }

    return queryBuilder.getMany();
  }

  /**
   * Crea un pedido con sus líneas en una sola transacción (todo o nada): si
   * algún menuItemId no existe o no está activo, no se crea nada. El precio
   * de cada línea es un snapshot del base_price vigente del platillo en este
   * momento (ver ADR-006) — un cambio de precio posterior nunca altera este
   * pedido.
   *
   * Si `peopleCount` no cae dentro del rango serves_min/serves_max de
   * ninguno de los platillos pedidos, el pedido no se rechaza — se crea con
   * `needsReview = true` para revisión manual del negocio (ver ADR-023).
   *
   * Al confirmar la transacción, emite `new-order` por NotificationGateway
   * (ADR-004) para el dashboard. Este método es el único punto de entrada
   * para crear pedidos -- lo usan tanto POST /orders como el tool MCP
   * crear_pedido -- así que ambos caminos quedan cubiertos con un solo emit.
   * Por la misma razón aquí se valida que scheduledFor sea futura (400 si
   * no, ADR-023): una sola regla para REST y MCP.
   */
  async createOrder(customerId: string, dto: CreateOrderDto): Promise<Order> {
    assertScheduledForInFuture(dto.scheduledFor);

    // Se llena dentro de la transacción (tiene los nombres de los platillos,
    // que la orden guardada ya no trae sin otro join) y se usa después para
    // armar los mensajes de WhatsApp -- si la transacción falla, nunca se
    // llega a usarla.
    const itemSummaries: string[] = [];

    const order = await this.ordersRepository.manager.transaction(async (manager) => {
      const menuItemIds = [
        ...new Set(dto.items.map((item) => item.menuItemId)),
      ];
      const menuItems = await manager.find(MenuItem, {
        where: { id: In(menuItemIds) },
      });
      const menuItemsById = new Map(menuItems.map((item) => [item.id, item]));

      let subtotal = 0;
      const lineItems = dto.items.map((input) => {
        const menuItem = menuItemsById.get(input.menuItemId);
        if (!menuItem) {
          throw new NotFoundException(
            `El platillo ${input.menuItemId} no existe.`,
          );
        }
        if (!menuItem.isActive) {
          throw new BadRequestException(
            `El platillo ${input.menuItemId} no está activo.`,
          );
        }

        // numeric de Postgres llega como string por el driver pg (mismo
        // patrón que MenuService al comparar basePrice).
        const unitPrice = Number(menuItem.basePrice);
        const lineSubtotal = roundCurrency(unitPrice * input.quantity);
        subtotal = roundCurrency(subtotal + lineSubtotal);

        itemSummaries.push(`${input.quantity}x ${menuItem.name}`);

        return {
          menuItemId: input.menuItemId,
          quantity: input.quantity,
          unitPrice,
          subtotal: lineSubtotal,
        };
      });

      const withinServesRange = menuItems.some(
        (menuItem) =>
          dto.peopleCount >= menuItem.servesMin &&
          dto.peopleCount <= menuItem.servesMax,
      );

      const order = manager.create(Order, {
        customerId,
        status: OrderStatus.PENDING,
        peopleCount: dto.peopleCount,
        scheduledFor: new Date(dto.scheduledFor),
        subtotal,
        total: subtotal,
        notes: dto.notes ?? null,
        needsReview: !withinServesRange,
      });
      const savedOrder = await manager.save(order);

      const orderItems = lineItems.map((line) =>
        manager.create(OrderItem, { ...line, orderId: savedOrder.id }),
      );
      savedOrder.items = await manager.save(orderItems);
      // El mapper de respuesta (order-response.mapper.ts) toma el nombre del
      // platillo de la relación; ya están cargados, no hace falta otro query.
      for (const item of savedOrder.items) {
        item.menuItem = menuItemsById.get(item.menuItemId) as MenuItem;
      }

      return savedOrder;
    });

    this.notificationGateway.emitNewOrder({
      id: order.id,
      customerId: order.customerId,
      total: order.total,
      peopleCount: order.peopleCount,
      scheduledFor: order.scheduledFor.toISOString(),
      needsReview: order.needsReview,
    });

    await this.notifyOrderCreatedByWhatsApp(order, itemSummaries);

    return order;
  }

  /**
   * Avisa por WhatsApp al negocio y al cliente de un pedido recién creado
   * (ver ADR-026). Un fallo de Twilio (o falta de whatsappNumber del
   * cliente) nunca debe deshacer ni bloquear la creación del pedido -- ya
   * quedó guardado -- por eso cada envío atrapa sus propios errores.
   */
  private async notifyOrderCreatedByWhatsApp(
    order: Order,
    itemSummaries: string[],
  ): Promise<void> {
    const itemsText = itemSummaries.join(', ');
    const scheduledForText = formatScheduledFor(order.scheduledFor);

    const businessNumber = this.config.get<string>('BUSINESS_WHATSAPP_NUMBER');
    if (!businessNumber) {
      this.logger.warn(
        `BUSINESS_WHATSAPP_NUMBER no está configurado, se omite el aviso al negocio del pedido ${order.id}.`,
      );
    } else {
      const reviewNote = order.needsReview
        ? ' Requiere revisión manual (cantidad de personas fuera de rango).'
        : '';
      try {
        await this.whatsAppService.sendMessage(
          businessNumber,
          `Nuevo pedido: ${itemsText}. Para ${order.peopleCount} personas, ` +
            `programado para ${scheduledForText}.${reviewNote}`,
        );
      } catch (error) {
        this.logger.warn(
          `No se pudo notificar al negocio por WhatsApp del pedido ${order.id}: ${error}`,
        );
      }
    }

    const customer = await this.usersRepository.findOne({
      where: { id: order.customerId },
    });
    if (!customer?.whatsappNumber) {
      this.logger.warn(
        `Pedido ${order.id}: el cliente no tiene whatsappNumber registrado, se omite la confirmación por WhatsApp.`,
      );
      return;
    }

    try {
      await this.whatsAppService.sendMessage(
        customer.whatsappNumber,
        `Hola ${customer.fullName}, recibimos tu pedido: ${itemsText}, para ` +
          `${order.peopleCount} personas el ${scheduledForText}. Te avisaremos ` +
          'cuando esté confirmado.',
      );
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar la confirmación de WhatsApp al cliente para el pedido ${order.id}: ${error}`,
      );
    }
  }

  /**
   * Pedidos propios del usuario autenticado (GET /orders/mine, ADR-027), más
   * recientes primero. A diferencia de findByCustomer (tool MCP, límite fijo
   * de 20), pagina y trae líneas con nombre de platillo.
   */
  async findMine(
    customerId: string,
    query: MyOrdersQueryDto,
  ): Promise<Paginated<Order>> {
    return this.findPaginated({ ...query, sort: 'createdAt', direction: 'desc' }, customerId);
  }

  /**
   * Lista de staff (GET /orders, ADR-027): filtros por rango de fecha del
   * evento, status, needsReview y createdSince (campanita), ordenable por
   * fecha de evento o de creación. El control de rol vive en el controller
   * (RolesGuard).
   */
  async findForStaff(query: ListOrdersQueryDto): Promise<Paginated<Order>> {
    return this.findPaginated(query);
  }

  private async findPaginated(
    query: ListOrdersQueryDto,
    customerId?: string,
  ): Promise<Paginated<Order>> {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? DEFAULT_PAGE_SIZE;
    const sortColumn = query.sort === 'scheduledFor' ? 'order.scheduledFor' : 'order.createdAt';
    const direction = query.direction === 'asc' ? 'ASC' : 'DESC';

    const qb = this.ordersRepository
      .createQueryBuilder('order')
      .withDeleted()
      .leftJoinAndSelect('order.customer', 'customer')
      .leftJoinAndSelect('order.items', 'item')
      .leftJoinAndSelect('item.menuItem', 'menuItem')
      .orderBy(sortColumn, direction)
      // Desempate estable para que la paginación no repita/salte pedidos
      // con la misma fecha.
      .addOrderBy('order.id', 'ASC')
      .skip((page - 1) * pageSize)
      .take(pageSize);

    if (customerId) {
      qb.andWhere('order.customerId = :customerId', { customerId });
    }
    if (query.status?.length) {
      qb.andWhere('order.status IN (:...statuses)', { statuses: query.status });
    }
    if (query.from) {
      qb.andWhere('order.scheduledFor >= :from', { from: query.from });
    }
    if (query.to) {
      qb.andWhere('order.scheduledFor <= :to', { to: query.to });
    }
    if (query.needsReview !== undefined) {
      qb.andWhere('order.needsReview = :needsReview', { needsReview: query.needsReview });
    }
    if (query.createdSince) {
      qb.andWhere('order.createdAt > :createdSince', { createdSince: query.createdSince });
    }

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, pageSize };
  }

  /**
   * Obtiene un pedido con sus líneas. El cliente solo puede consultar sus
   * propios pedidos; staff/admin/superadmin puede consultar cualquiera.
   */
  async findByIdForRequester(
    id: string,
    requester: Requester,
  ): Promise<Order> {
    const order = await this.findDetailById(id);

    const isOwner = order.customerId === requester.userId;
    const canReadAny = ORDER_READ_ANY_ROLES.includes(requester.role);
    if (!isOwner && !canReadAny) {
      throw new ForbiddenException('No tienes acceso a este pedido.');
    }

    return order;
  }

  /**
   * Pedido con líneas (y su platillo) y cliente, sin control de acceso --
   * quien lo llame ya validó el rol (controller con RolesGuard) o la
   * propiedad (findByIdForRequester).
   */
  async findDetailById(id: string): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: { items: { menuItem: true }, customer: true },
      // Un cliente dado de baja (soft delete, ADR-006) sigue apareciendo en
      // sus pedidos históricos.
      withDeleted: true,
    });
    if (!order) {
      throw new NotFoundException('El pedido no existe.');
    }
    return order;
  }

  /**
   * Obtiene un pedido por ID.
   */
  async findById(id: string): Promise<Order | null> {
    return this.ordersRepository.findOne({ where: { id } });
  }

  /**
   * Cambia el status de un pedido validando la tabla de transiciones de
   * ADR-027 (ORDER_STATUS_TRANSITIONS en shared-types). Lo usan el PATCH de
   * staff, el rechazo de una revisión, el webhook de Mercado Pago (vía
   * recordPaymentResult) y el reintento de pago. Pasar al mismo status que ya
   * tiene es un no-op -- Mercado Pago reenvía webhooks, y un duplicado no
   * debe volver a mandar el WhatsApp al cliente (ADR-026).
   *
   * Al pasar a confirmed (pago aprobado o confirmación manual) genera el
   * recibo PDF (ADR-028).
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.findById(id);
    if (!order) {
      throw new NotFoundException('El pedido no existe.');
    }
    if (order.status === status) {
      return order;
    }
    if (!canTransitionOrderStatus(order.status as OrderStatus, status)) {
      throw new ConflictException(
        `No se puede pasar un pedido de "${order.status}" a "${status}".`,
      );
    }

    order.status = status;
    const savedOrder = await this.ordersRepository.save(order);

    await this.notifyStatusChangeByWhatsApp(savedOrder);

    if (savedOrder.status === OrderStatus.CONFIRMED) {
      await this.generateReceiptSafely(savedOrder.id);
    }

    return savedOrder;
  }

  /**
   * Genera el recibo de un pedido recién confirmado (ADR-028). Se espera
   * (no se deja corriendo en segundo plano) porque Cloud Run reduce la CPU al
   * responder la petición. Un fallo no revierte la confirmación ni hace
   * fallar el webhook de Mercado Pago (que lo reintentaría para siempre):
   * se registra, y GET /orders/:id/receipt lo genera cuando se pida.
   */
  private async generateReceiptSafely(orderId: string): Promise<void> {
    try {
      await this.receipts.ensureReceipt(await this.findDetailById(orderId));
    } catch (error) {
      this.logger.error(
        `No se pudo generar el recibo del pedido ${orderId}; se generará al pedirlo ` +
          `(GET /orders/${orderId}/receipt): ${error}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * Aplica el resultado de un pago re-consultado a Mercado Pago (ADR-024):
   * guarda payment_id/método/fecha y mueve el status si la transición es
   * válida. Nunca lanza por una transición inválida (ej. un pago aprobado que
   * llega después de que el staff canceló el pedido): el webhook respondería
   * error y Mercado Pago reintentaría para siempre. En ese caso el detalle
   * del pago sí se guarda -- el staff lo ve en el detalle y decide (ej.
   * reembolso) -- y solo se registra un warning.
   */
  async recordPaymentResult(
    id: string,
    nextStatus: OrderStatus,
    payment: PaymentResult,
  ): Promise<void> {
    const order = await this.findById(id);
    if (!order) {
      this.logger.warn(`Pago ${payment.paymentId} para el pedido ${id}, que no existe -- se descarta.`);
      return;
    }

    order.paymentId = payment.paymentId;
    order.paymentMethod = payment.paymentMethod;
    if (payment.paidAt) {
      order.paidAt = payment.paidAt;
    }
    await this.ordersRepository.save(order);

    if (order.status === nextStatus) {
      return;
    }
    if (!canTransitionOrderStatus(order.status as OrderStatus, nextStatus)) {
      this.logger.warn(
        `Pago ${payment.paymentId}: el pedido ${id} está en "${order.status}", no se mueve a "${nextStatus}". Revisar a mano.`,
      );
      return;
    }
    await this.updateStatus(id, nextStatus);
  }

  /**
   * Revisión de un pedido marcado needsReview (ADR-021, ADR-027):
   * - approve: se acepta tal cual (needsReview = false).
   * - reject: se cancela (status = cancelled, needsReview = false).
   * - adjust: se corrigen peopleCount y/o notas y needsReview se recalcula
   *   contra el rango de los platillos pedidos (misma regla que createOrder).
   * Cambiar platillos queda fuera: se cancela y se pide de nuevo.
   */
  async reviewOrder(id: string, dto: ReviewOrderDto): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: { items: { menuItem: true } },
    });
    if (!order) {
      throw new NotFoundException('El pedido no existe.');
    }
    if (!order.needsReview) {
      throw new ConflictException('El pedido no está marcado para revisión.');
    }
    if (FINAL_STATUSES.includes(order.status)) {
      throw new ConflictException(`El pedido ya está en un estado final ("${order.status}").`);
    }

    const hasAdjustFields = dto.peopleCount !== undefined || dto.notes !== undefined;
    if (dto.action !== ReviewOrderAction.ADJUST && hasAdjustFields) {
      throw new BadRequestException('peopleCount y notes solo se aceptan con action = adjust.');
    }

    switch (dto.action) {
      case ReviewOrderAction.APPROVE:
        order.needsReview = false;
        break;
      case ReviewOrderAction.REJECT:
        // Primero se baja la marca y después se cancela vía updateStatus (que
        // recarga el pedido), para no pisar su save con esta instancia.
        await this.ordersRepository.update(id, { needsReview: false });
        await this.updateStatus(id, OrderStatus.CANCELLED);
        return this.findDetailById(id);
      case ReviewOrderAction.ADJUST: {
        if (!hasAdjustFields) {
          throw new BadRequestException('adjust requiere peopleCount y/o notes.');
        }
        if (dto.peopleCount !== undefined) {
          order.peopleCount = dto.peopleCount;
        }
        if (dto.notes !== undefined) {
          order.notes = dto.notes;
        }
        order.needsReview = !order.items.some(
          (item) =>
            order.peopleCount >= item.menuItem.servesMin &&
            order.peopleCount <= item.menuItem.servesMax,
        );
        break;
      }
    }

    await this.ordersRepository.save(order);
    return this.findDetailById(id);
  }

  /** Avisa por WhatsApp al cliente cuando su pedido pasa a confirmed/payment_failed. */
  private async notifyStatusChangeByWhatsApp(order: Order): Promise<void> {
    if (!CUSTOMER_NOTIFIABLE_STATUSES.includes(order.status)) {
      return;
    }

    const customer = await this.usersRepository.findOne({
      where: { id: order.customerId },
    });
    if (!customer?.whatsappNumber) {
      this.logger.warn(
        `Pedido ${order.id}: el cliente no tiene whatsappNumber registrado, se omite el aviso de cambio de estado por WhatsApp.`,
      );
      return;
    }

    const message =
      order.status === OrderStatus.CONFIRMED
        ? `Hola ${customer.fullName}, tu pedido fue confirmado y el pago fue ` +
          `aprobado. Te esperamos el ${formatScheduledFor(order.scheduledFor)}.`
        : `Hola ${customer.fullName}, no pudimos procesar el pago de tu ` +
          'pedido. Por favor intenta nuevamente o contáctanos.';

    try {
      await this.whatsAppService.sendMessage(customer.whatsappNumber, message);
    } catch (error) {
      this.logger.warn(
        `No se pudo enviar el aviso de WhatsApp de cambio de estado para el pedido ${order.id}: ${error}`,
      );
    }
  }

  /**
   * Asocia el pedido con el id de la Preferencia de Pago de Mercado Pago
   * generada para él (ver ADR-024, PaymentsService.createPreference). Vive
   * en OrdersService (no en PaymentsModule) para no exponer el repositorio
   * de Order fuera de este módulo -- mismo patrón que updateStatus.
   */
  async attachPaymentPreference(id: string, preferenceId: string): Promise<void> {
    await this.ordersRepository.update(id, { paymentPreferenceId: preferenceId });
  }
}
