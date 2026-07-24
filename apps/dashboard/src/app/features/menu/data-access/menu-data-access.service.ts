import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import type { Observable } from 'rxjs';
import type {
  CreateMenuItemDto,
  MenuCategory,
  MenuItem,
  UpdateMenuItemDto,
} from '@catering-app/shared-types';
import { API_BASE_URL } from '../../../core/api-config';

/**
 * Capa data-access del feature de menú (ver ADR-020). GET es público (ver
 * ADR-006); POST/PATCH/DELETE requieren JWT de staff/admin/superadmin
 * (adjuntado por el authInterceptor -- ver DevTokenStore mientras no exista
 * login real).
 */
@Injectable({ providedIn: 'root' })
export class MenuDataAccessService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/menu`;

  findActiveCategories(): Observable<MenuCategory[]> {
    return this.http.get<MenuCategory[]>(`${this.baseUrl}/categories`);
  }

  findActiveItems(categoryId?: string): Observable<MenuItem[]> {
    return this.http.get<MenuItem[]>(`${this.baseUrl}/items`, {
      params: categoryId ? { categoryId } : undefined,
    });
  }

  createItem(dto: CreateMenuItemDto): Observable<MenuItem> {
    return this.http.post<MenuItem>(`${this.baseUrl}/items`, dto);
  }

  updateItem(id: string, dto: UpdateMenuItemDto): Observable<MenuItem> {
    return this.http.patch<MenuItem>(`${this.baseUrl}/items/${id}`, dto);
  }

  deleteItem(id: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/items/${id}`);
  }
}
