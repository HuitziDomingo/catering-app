import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, type Observable } from 'rxjs';
import type { NewOrderEvent, OrderDetail, Paginated } from '@catering-app/shared-types';
import { API_BASE_URL } from '../../../core/api-config';

const LAST_SEEN_AT_KEY = 'notifications-last-seen-at';

export interface MissedOrders {
  /** Los más recientes primero, como máximo `limit`. */
  readonly events: NewOrderEvent[];
  /** Cuántos llegaron en total desde lastSeenAt (puede ser más que events.length). */
  readonly total: number;
}

/**
 * Capa data-access del historial de la campanita (ADR-027): no existe todavía
 * la tabla `notifications`, así que lo llegado mientras el dashboard estaba
 * cerrado se carga con GET /orders?createdSince=<lastSeenAt>, guardando
 * lastSeenAt en localStorage (un staff por navegador).
 */
@Injectable({ providedIn: 'root' })
export class NotificationHistoryService {
  private readonly http = inject(HttpClient);

  readLastSeenAt(): string | null {
    try {
      return localStorage.getItem(LAST_SEEN_AT_KEY);
    } catch {
      return null;
    }
  }

  saveLastSeenAt(iso: string): void {
    try {
      localStorage.setItem(LAST_SEEN_AT_KEY, iso);
    } catch {
      // Sin localStorage (modo privado estricto) la campanita solo pierde el historial.
    }
  }

  findCreatedSince(since: string, limit: number): Observable<MissedOrders> {
    return this.http
      .get<Paginated<OrderDetail>>(`${API_BASE_URL}/orders`, {
        params: {
          createdSince: since,
          sort: 'createdAt',
          direction: 'desc',
          pageSize: limit,
        },
      })
      .pipe(
        map((page) => ({
          total: page.total,
          events: page.items.map((order) => ({
            id: order.id,
            customerId: order.customerId,
            total: order.total,
            peopleCount: order.peopleCount,
            scheduledFor: order.scheduledFor,
            needsReview: order.needsReview,
          })),
        })),
      );
  }
}
