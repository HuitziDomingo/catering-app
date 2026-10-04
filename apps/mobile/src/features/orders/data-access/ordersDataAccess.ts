import type { CreateOrderDto, OrderDetail } from '@catering-app/shared-types';
import { apiClient } from '../../../core/http/apiClient';

// Capa data-access del feature de pedidos (ver ADR-020, ADR-027). Vive en
// features/orders/ (no en cart/) porque "Mis pedidos" y el pago la van a
// reutilizar; el carrito solo la consume al confirmar. customerId nunca
// viaja en el body: la API lo toma del JWT que adjunta apiClient.

export async function createOrder(dto: CreateOrderDto): Promise<OrderDetail> {
  const { data } = await apiClient.post<OrderDetail>('/orders', dto);
  return data;
}
