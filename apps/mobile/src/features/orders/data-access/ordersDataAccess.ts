import type {
  CreateOrderDto,
  MyOrdersQuery,
  OrderDetail,
  OrderReceiptResponse,
  Paginated,
} from '@catering-app/shared-types';
import { apiClient } from '../../../core/http/apiClient';

// Capa data-access del feature de pedidos (ver ADR-020, ADR-027). Vive en
// features/orders/ (no en cart/) porque "Mis pedidos" y el pago la
// reutilizan; el carrito solo la consume al confirmar. customerId nunca
// viaja en body ni query: la API lo toma del JWT que adjunta apiClient.

export async function createOrder(dto: CreateOrderDto): Promise<OrderDetail> {
  const { data } = await apiClient.post<OrderDetail>('/orders', dto);
  return data;
}

/** GET /orders/mine: pedidos propios, más recientes primero. */
export async function fetchMyOrders(query: MyOrdersQuery = {}): Promise<Paginated<OrderDetail>> {
  const { data } = await apiClient.get<Paginated<OrderDetail>>('/orders/mine', {
    params: {
      page: query.page,
      pageSize: query.pageSize,
      status: query.status?.length ? query.status.join(',') : undefined,
    },
  });
  return data;
}

/** GET /orders/:id (la API solo devuelve pedidos propios a un cliente). */
export async function fetchOrder(orderId: string): Promise<OrderDetail> {
  const { data } = await apiClient.get<OrderDetail>(`/orders/${orderId}`);
  return data;
}

/**
 * GET /orders/:id/receipt: URL firmada (15 minutos) del recibo PDF. La API lo
 * genera si el pedido está pagado y todavía no lo tiene (ADR-028).
 */
export async function fetchOrderReceipt(orderId: string): Promise<OrderReceiptResponse> {
  const { data } = await apiClient.get<OrderReceiptResponse>(`/orders/${orderId}/receipt`);
  return data;
}
