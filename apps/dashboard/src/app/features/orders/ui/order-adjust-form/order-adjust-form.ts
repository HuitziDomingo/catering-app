import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { TuiButton, TuiInput, type TuiDialogContext } from '@taiga-ui/core';
import { TuiTextareaComponent } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import type { Observable } from 'rxjs';
import {
  ReviewOrderAction,
  type OrderDetail,
  type ReviewOrderDto,
} from '@catering-app/shared-types';
import { extractErrorMessage } from '../../../../core/http/extract-error-message';

/**
 * Datos del diálogo de ajuste. `save` lo decide el feature/ (ADR-020); este
 * componente de ui/ solo lo invoca, igual que MenuItemForm.
 */
export interface OrderAdjustFormDialogData {
  readonly order: OrderDetail;
  readonly save: (dto: ReviewOrderDto) => Observable<OrderDetail>;
}

/**
 * Ajuste de un pedido needsReview (ADR-027, action = adjust): solo
 * peopleCount y notas. Cambiar platillos queda fuera a propósito (habría que
 * recalcular totales y snapshots); en ese caso se rechaza y el cliente pide
 * de nuevo. Se abre como contenido de TuiDialogService.open(), mismo
 * mecanismo que MenuItemForm.
 */
@Component({
  selector: 'app-order-adjust-form',
  imports: [ReactiveFormsModule, TuiButton, TuiInput, TuiTextareaComponent],
  templateUrl: './order-adjust-form.html',
  styleUrl: './order-adjust-form.scss',
})
export class OrderAdjustForm {
  private readonly fb = inject(FormBuilder);
  protected readonly context =
    injectContext<TuiDialogContext<void, OrderAdjustFormDialogData>>();

  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    peopleCount: [
      this.context.data.order.peopleCount,
      [Validators.required, Validators.min(1)],
    ],
    notes: [this.context.data.order.notes ?? ''],
  });

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const dto: ReviewOrderDto = {
      action: ReviewOrderAction.ADJUST,
      peopleCount: value.peopleCount,
      notes: value.notes.trim() || null,
    };

    this.error.set(null);
    this.saving.set(true);
    this.context.data.save(dto).subscribe({
      next: () => this.context.completeWith(),
      error: (err: unknown) => {
        this.saving.set(false);
        this.error.set(extractErrorMessage(err));
      },
    });
  }

  protected cancel(): void {
    this.context.completeWith();
  }
}
