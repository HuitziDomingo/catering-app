import { HttpClient, HttpEventType } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { filter, map, type Observable } from 'rxjs';
import type {
  CreateMenuItemDto,
  MenuCategory,
  MenuItem,
  UpdateMenuItemDto,
} from '@catering-app/shared-types';
import { API_BASE_URL } from '../../../core/api-config';
import type { MenuImageUploadEvent } from '../util/menu-image';

/**
 * Capa data-access del feature de menú (ver ADR-020). GET es público (ver
 * ADR-006); POST/PATCH/DELETE requieren JWT de staff/admin/superadmin
 * (adjuntado por authInterceptor -- ver core/auth/).
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

  /**
   * Sube o reemplaza la imagen de un platillo (multipart, campo `image`,
   * ADR-028). Traduce los eventos HTTP a avance (0-100) y al platillo
   * actualizado, para que la UI no dependa de HttpEvent.
   */
  uploadItemImage(id: string, file: File): Observable<MenuImageUploadEvent> {
    const body = new FormData();
    body.append('image', file);
    return this.http
      .post<MenuItem>(`${this.baseUrl}/items/${id}/image`, body, {
        observe: 'events',
        reportProgress: true,
      })
      .pipe(
        map((event): MenuImageUploadEvent | null => {
          if (event.type === HttpEventType.UploadProgress) {
            const percent = event.total ? Math.round((event.loaded / event.total) * 100) : 0;
            return { type: 'progress', percent };
          }
          if (event.type === HttpEventType.Response && event.body) {
            return { type: 'done', item: event.body };
          }
          return null;
        }),
        filter((event): event is MenuImageUploadEvent => event !== null),
      );
  }

  removeItemImage(id: string): Observable<MenuItem> {
    return this.http.delete<MenuItem>(`${this.baseUrl}/items/${id}/image`);
  }
}
