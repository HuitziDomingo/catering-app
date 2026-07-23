import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { OrderStatus } from '@catering-app/shared-types';
import { MenuItem } from '../database/entities/menu-item.entity';
import { Order } from '../database/entities/order.entity';
import { OrderItem } from '../database/entities/order-item.entity';
import { CreateOrderDto } from './dto/create-order.dto';

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
  constructor(
    @InjectRepository(Order)
    private readonly ordersRepository: Repository<Order>,
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
   */
  async createOrder(customerId: string, dto: CreateOrderDto): Promise<Order> {
    return this.ordersRepository.manager.transaction(async (manager) => {
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

        return {
          menuItemId: input.menuItemId,
          quantity: input.quantity,
          unitPrice,
          subtotal: lineSubtotal,
        };
      });

      const order = manager.create(Order, {
        customerId,
        status: OrderStatus.PENDING,
        peopleCount: dto.peopleCount,
        scheduledFor: new Date(dto.scheduledFor),
        subtotal,
        total: subtotal,
        notes: dto.notes ?? null,
      });
      const savedOrder = await manager.save(order);

      const orderItems = lineItems.map((line) =>
        manager.create(OrderItem, { ...line, orderId: savedOrder.id }),
      );
      savedOrder.items = await manager.save(orderItems);

      return savedOrder;
    });
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
   * Actualiza el estado de un pedido.
   */
  async updateStatus(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.findById(id);
    if (!order) {
      throw new Error('Pedido no encontrado');
    }
    order.status = status;
    return this.ordersRepository.save(order);
  }
}
