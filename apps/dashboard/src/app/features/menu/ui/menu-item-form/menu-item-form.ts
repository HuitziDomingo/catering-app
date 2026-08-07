import { Component, effect, inject, input, output } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { TuiButton, TuiInput } from '@taiga-ui/core';
import { TuiSwitch, TuiTextareaComponent } from '@taiga-ui/kit';
import type { CreateMenuItemDto, MenuCategory, MenuItem } from '@catering-app/shared-types';

// servesMax debe ser >= servesMin (ver ADR-021, validación de rango).
function servesRangeValidator(control: AbstractControl): ValidationErrors | null {
  const min = control.get('servesMin')?.value;
  const max = control.get('servesMax')?.value;
  return typeof min === 'number' && typeof max === 'number' && max < min
    ? { servesRange: true }
    : null;
}

/**
 * Componente de presentación (formulario reactivo, validación de UI) según
 * ADR-020 -- vive en ui/, sin llamar a data-access ni al store directamente.
 * El feature/ decide si el DTO emitido crea o actualiza un platillo.
 */
@Component({
  selector: 'app-menu-item-form',
  imports: [ReactiveFormsModule, TuiButton, TuiInput, TuiSwitch, TuiTextareaComponent],
  templateUrl: './menu-item-form.html',
  styleUrl: './menu-item-form.scss',
})
export class MenuItemForm {
  private readonly fb = inject(FormBuilder);

  readonly item = input<MenuItem | null>(null);
  readonly categories = input.required<MenuCategory[]>();
  readonly save = output<CreateMenuItemDto>();
  readonly cancelled = output<void>();

  protected readonly form = this.fb.nonNullable.group(
    {
      name: ['', [Validators.required, Validators.maxLength(150)]],
      description: [''],
      categoryId: ['', Validators.required],
      basePrice: [0, [Validators.required, Validators.min(0.01)]],
      servesMin: [1, [Validators.required, Validators.min(1)]],
      servesMax: [1, [Validators.required, Validators.min(1)]],
      isActive: [true],
    },
    { validators: servesRangeValidator },
  );

  constructor() {
    effect(() => {
      const current = this.item();
      if (current) {
        this.form.patchValue({
          name: current.name,
          description: current.description ?? '',
          categoryId: current.categoryId,
          basePrice: Number(current.basePrice),
          servesMin: current.servesMin,
          servesMax: current.servesMax,
          isActive: current.isActive,
        });
      } else {
        this.form.reset({
          name: '',
          description: '',
          categoryId: '',
          basePrice: 0,
          servesMin: 1,
          servesMax: 1,
          isActive: true,
        });
      }
    });
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    this.save.emit({
      name: value.name,
      description: value.description || null,
      categoryId: value.categoryId,
      basePrice: value.basePrice,
      servesMin: value.servesMin,
      servesMax: value.servesMax,
      isActive: value.isActive,
    });
  }
}
