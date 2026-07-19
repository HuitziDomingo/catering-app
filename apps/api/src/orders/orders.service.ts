import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../database/entities/order.entity';
import { OrderStatus } from '@catering-app/shared-types';

export interface FindByCustomerFilters {
  status?: OrderStatus;
  limit?: number;
}

/**
 * Servicio para gestión de pedidos (ver ADR-006).
 * Implementación mínima para soportar el tool MCP consultar_pedidos_por_cliente.
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
   * Crea un nuevo pedido.
   */
  async create(orderData: Partial<Order>): Promise<Order> {
    const order = this.ordersRepository.create(orderData);
    return this.ordersRepository.save(order);
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
