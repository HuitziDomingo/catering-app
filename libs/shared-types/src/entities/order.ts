import { OrderStatus } from '../enums/order-status.enum';

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

export interface CreateOrderDto {
  customerId: string;
  status?: OrderStatus;
  peopleCount: number;
  scheduledFor: string;
  subtotal: number;
  total: number;
  notes?: string | null;
}

export interface UpdateOrderDto {
  status?: OrderStatus;
  peopleCount?: number;
  scheduledFor?: string;
  subtotal?: number;
  total?: number;
  notes?: string | null;
}
