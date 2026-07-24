import { Component, input, output } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';
import type { MenuCategory, MenuItem } from '@catering-app/shared-types';

const currencyFormatter = new Intl.NumberFormat('es-MX', {
  style: 'currency',
  currency: 'MXN',
});

/**
 * Componente de presentación pura (sin lógica de negocio), vive en ui/
 * según ADR-020. Recibe items/categories ya resueltos.
 */
@Component({
  selector: 'app-menu-item-list',
  imports: [TuiButton],
  templateUrl: './menu-item-list.html',
  styleUrl: './menu-item-list.scss',
})
export class MenuItemList {
  readonly items = input.required<MenuItem[]>();
  readonly categories = input.required<MenuCategory[]>();
  readonly edit = output<MenuItem>();
  readonly delete = output<MenuItem>();

  protected categoryName(categoryId: string): string {
    return this.categories().find((category) => category.id === categoryId)?.name ?? '—';
  }

  // basePrice llega como string ("95.50") por NUMERIC + driver pg, aunque el
  // tipo diga number -- mismo caso que menu.service.ts en la API.
  protected formatPrice(basePrice: number): string {
    return currencyFormatter.format(Number(basePrice));
  }
}
