import { Component, input, output } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';
import type { MenuCategory, MenuItem } from '@catering-app/shared-types';
import { formatServesRange } from '../../util/format-serves-range';
import { MenuItemThumbnail } from '../menu-item-thumbnail/menu-item-thumbnail';

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
  imports: [TuiButton, MenuItemThumbnail],
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

  // La API ya manda basePrice como number (menu-item-response.mapper.ts,
  // ADR-028); Number() se queda como defensa barata.
  protected formatPrice(basePrice: number): string {
    return currencyFormatter.format(Number(basePrice));
  }

  protected servesRange(item: MenuItem): string {
    return formatServesRange(item.servesMin, item.servesMax);
  }
}
