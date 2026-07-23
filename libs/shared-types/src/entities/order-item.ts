export interface OrderItem {
  id: number;
  orderId: string;
  menuItemId: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
}

/**
 * Línea solicitada al crear un pedido. `unitPrice`/`subtotal` no se reciben
 * del cliente: el servidor los calcula a partir del base_price vigente del
 * platillo al momento del pedido (snapshot, ver ADR-006).
 */
export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
}
