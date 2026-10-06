import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  OrderDetail,
  OrderListQuery,
  OrderReceiptResponse,
  OrderStatus,
  Paginated,
  ReviewOrderDto,
} from '@catering-app/shared-types';
import { API_BASE_URL } from '../../../core/api-config';

/** OrderListQuery → query string: status separados por coma, booleanos como 'true'/'false'. */
export function toOrderListParams(query: OrderListQuery): HttpParams {
  let params = new HttpParams();
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null) continue;
    params = params.set(key, Array.isArray(value) ? value.join(',') : String(value));
  }
  return params;
}

/**
 * Capa data-access del feature de pedidos (ver ADR-020). Todos los endpoints
 * son de staff/admin/superadmin (ADR-027); el JWT lo adjunta authInterceptor.
 */
@Injectable({ providedIn: 'root' })
export class OrdersDataAccessService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/orders`;

  list(query: OrderListQuery): Observable<Paginated<OrderDetail>> {
    return this.http.get<Paginated<OrderDetail>>(this.baseUrl, {
      params: toOrderListParams(query),
    });
  }

  findById(id: string): Observable<OrderDetail> {
    return this.http.get<OrderDetail>(`${this.baseUrl}/${id}`);
  }

  updateStatus(id: string, status: OrderStatus): Observable<OrderDetail> {
    return this.http.patch<OrderDetail>(`${this.baseUrl}/${id}/status`, { status });
  }

  review(id: string, dto: ReviewOrderDto): Observable<OrderDetail> {
    return this.http.patch<OrderDetail>(`${this.baseUrl}/${id}/review`, dto);
  }

  /** URL firmada (15 minutos) del recibo PDF; la API lo genera si falta (ADR-028). */
  getReceipt(id: string): Observable<OrderReceiptResponse> {
    return this.http.get<OrderReceiptResponse>(`${this.baseUrl}/${id}/receipt`);
  }
}
