import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable, signal } from '@angular/core';
import { forkJoin, Observable, tap } from 'rxjs';
import type {
  CreateMenuItemDto,
  MenuCategory,
  MenuItem,
  UpdateMenuItemDto,
} from '@catering-app/shared-types';
import { MenuDataAccessService } from '../data-access/menu-data-access.service';

export type MenuStatus = 'idle' | 'loading' | 'success' | 'error';

export function extractErrorMessage(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    return (err.error as { message?: string } | null)?.message ?? err.message;
  }
  return err instanceof Error ? err.message : 'Ocurrió un error inesperado.';
}

/** Estado del feature de menú (ver ADR-020) manejado con signals de Angular. */
@Injectable({ providedIn: 'root' })
export class MenuStateService {
  private readonly dataAccess = inject(MenuDataAccessService);

  readonly categories = signal<MenuCategory[]>([]);
  readonly items = signal<MenuItem[]>([]);
  readonly status = signal<MenuStatus>('idle');
  readonly error = signal<string | null>(null);

  load(): void {
    this.status.set('loading');
    this.error.set(null);
    forkJoin([
      this.dataAccess.findActiveCategories(),
      this.dataAccess.findActiveItems(),
    ]).subscribe({
      next: ([categories, items]) => {
        this.categories.set(categories);
        this.items.set(items);
        this.status.set('success');
      },
      error: (err: unknown) => {
        this.status.set('error');
        this.error.set(extractErrorMessage(err));
      },
    });
  }

  createItem(dto: CreateMenuItemDto): Observable<MenuItem> {
    return this.dataAccess.createItem(dto).pipe(tap(() => this.load()));
  }

  updateItem(id: string, dto: UpdateMenuItemDto): Observable<MenuItem> {
    return this.dataAccess.updateItem(id, dto).pipe(tap(() => this.load()));
  }

  deleteItem(id: string): Observable<void> {
    return this.dataAccess.deleteItem(id).pipe(tap(() => this.load()));
  }
}
