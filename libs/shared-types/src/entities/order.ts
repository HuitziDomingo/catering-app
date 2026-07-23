import { OrderStatus } from '../enums/order-status.enum';
import { CreateOrderItemInput, OrderItem } from './order-item';

export interface Order {
  id: string;
  customerId: string;
  status: OrderStatus;
  peopleCount: number;
  scheduledFor: string;
  subtotal: number;
  total: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OrderWithItems extends Order {
  items: OrderItem[];
}

/**
 * `customerId` no viaja en el body: se toma del `sub` del JWT autenticado
 * (mismo patrón de seguridad que el tool MCP consultar_pedidos_por_cliente,
 * evita que un cliente pueda crear pedidos a nombre de otro).
 */
export interface CreateOrderDto {
  peopleCount: number;
  scheduledFor: string;
  notes?: string | null;
  items: CreateOrderItemInput[];
}

export interface UpdateOrderDto {
  status?: OrderStatus;
  peopleCount?: number;
  scheduledFor?: string;
  subtotal?: number;
  total?: number;
  notes?: string | null;
}
