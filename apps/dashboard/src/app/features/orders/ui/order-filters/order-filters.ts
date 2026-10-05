import { Component, effect, inject, input, output } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TuiButton } from '@taiga-ui/core';
import type { OrderSortField, OrderStatus, SortDirection } from '@catering-app/shared-types';
import {
  DEFAULT_ORDER_LIST_FILTERS,
  type OrderListFilters,
} from '../../util/order-list-query';
import { ORDER_STATUS_LABELS, ORDER_STATUS_OPTIONS } from '../../util/order-status';

/**
 * Componente de presentación (ADR-020): formulario de filtros de la lista de
 * pedidos. Solo emite los filtros elegidos; quien los aplica es el feature/.
 */
@Component({
  selector: 'app-order-filters',
  imports: [ReactiveFormsModule, TuiButton],
  templateUrl: './order-filters.html',
  styleUrl: './order-filters.scss',
})
export class OrderFilters {
  private readonly fb = inject(FormBuilder);

  readonly filters = input.required<OrderListFilters>();
  readonly apply = output<OrderListFilters>();

  protected readonly statusOptions = ORDER_STATUS_OPTIONS.map((status) => ({
    value: status,
    label: ORDER_STATUS_LABELS[status],
  }));

  protected readonly form = this.fb.nonNullable.group({
    from: [''],
    to: [''],
    status: ['' as OrderStatus | ''],
    needsReview: [false],
    sort: ['createdAt' as OrderSortField],
    direction: ['desc' as SortDirection],
  });

  constructor() {
    effect(() => this.form.setValue(this.filters()));
  }

  protected submit(): void {
    this.apply.emit(this.form.getRawValue());
  }

  protected reset(): void {
    this.apply.emit(DEFAULT_ORDER_LIST_FILTERS);
  }
}
