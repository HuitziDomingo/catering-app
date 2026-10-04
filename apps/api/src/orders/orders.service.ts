import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrderStatus } from '@catering-app/shared-types';
import { MenuItem } from '../database/entities/menu-item.entity';
import { Order } from '../database/entities/order.entity';
import { OrderItem } from '../database/entities/order-item.entity';
import { User } from '../database/entities/user.entity';
import { NotificationGateway } from '../notifications/notification.gateway';
import { WhatsAppService } from '../notifications/whatsapp/whatsapp.service';
import { CreateOrderDto } from './dto/create-order.dto';

/**
 * Estados de pedido que disparan un aviso de WhatsApp al cliente (ver
 * ADR-026). 'payment_failed' todavía no es un valor de OrderStatus -- llega
 * con el webhook de Mercado Pago (ADR-022, no mergeado en esta rama) -- se
 * compara como string mientras tanto.
 */
const CUSTOMER_NOTIFIABLE_STATUSES: string[] = [
  OrderStatus.CONFIRMED,
  'payment_failed',
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
   */
  async createOrder(customerId: string, dto: CreateOrderDto): Promise<Order> {
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
   * Obtiene un pedido con sus líneas. El cliente solo puede consultar sus
   * propios pedidos; staff/admin/superadmin puede consultar cualquiera.
   */
  async findByIdForRequester(
    id: string,
    requester: Requester,
  ): Promise<Order> {
    const order = await this.ordersRepository.findOne({
      where: { id },
      relations: { items: true },
    });
    if (!order) {
      throw new NotFoundException('El pedido no existe.');
    }

    const isOwner = order.customerId === requester.userId;
    const canReadAny = ORDER_READ_ANY_ROLES.includes(requester.role);
    if (!isOwner && !canReadAny) {
      throw new ForbiddenException('No tienes acceso a este pedido.');
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
   * Actualiza el estado de un pedido. Punto de enganche listo para cuando
   * llegue el webhook de Mercado Pago (ADR-022, no mergeado en esta rama):
   * quienquiera que llame a este método con `confirmed` o `payment_failed`
   * ya dispara el aviso de WhatsApp al cliente correspondiente (ADR-026).
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('Pedido no encontrado');
    }
    order.status = status;
    const savedOrder = await this.ordersRepository.save(order);

    await this.notifyStatusChangeByWhatsApp(savedOrder);

    return savedOrder;
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
