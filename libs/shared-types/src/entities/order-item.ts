export interface OrderItem {
  id: number;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface CreateOrderItemDto {
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

export interface UpdateOrderItemDto {
  menuItemId?: string;
  quantity?: number;
  unitPrice?: number;
  subtotal?: number;
}
