import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { TuiButton, TuiInput, type TuiDialogContext } from '@taiga-ui/core';
import { TuiSwitch, TuiTextareaComponent } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import type { Observable } from 'rxjs';
import type { CreateMenuItemDto, MenuCategory, MenuItem } from '@catering-app/shared-types';
import { extractErrorMessage } from '../../../../core/http/extract-error-message';

// servesMax debe ser >= servesMin (ver ADR-021, validación de rango).
function servesRangeValidator(control: AbstractControl): ValidationErrors | null {
  const min = control.get('servesMin')?.value;
  const max = control.get('servesMax')?.value;
  return typeof min === 'number' && typeof max === 'number' && max < min
    ? { servesRange: true }
    : null;
}

/**
 * Datos que recibe el diálogo (ver ADR-023-bis: MenuItemForm pasó de
 * inline a modal, mismo mecanismo que TUI_CONFIRM en menu-management.ts).
 * `save` lo decide el feature/ (crear vs actualizar, ver ADR-020) -- este
 * componente de ui/ solo lo invoca, sin conocer MenuStateService.
 */
export interface MenuItemFormDialogData {
  readonly item: MenuItem | null;
  readonly categories: MenuCategory[];
  readonly save: (dto: CreateMenuItemDto) => Observable<MenuItem>;
}

/**
 * Componente de presentación (formulario reactivo, validación de UI) según
 * ADR-020 -- vive en ui/, sin llamar a data-access ni al store directamente.
 *
 * Se abre como contenido de TuiDialogService.open() (igual que TUI_CONFIRM),
 * no con [item]/[categories]/(save)/(cancelled) por binding de plantilla --
 * un componente instanciado como contenido de diálogo no tiene un padre de
 * plantilla que pueda bindear outputs, así que lee sus datos de entrada vía
 * injectContext().data y cierra el diálogo con context.completeWith().
 */
@Component({
  selector: 'app-menu-item-form',
  imports: [ReactiveFormsModule, TuiButton, TuiInput, TuiSwitch, TuiTextareaComponent],
  templateUrl: './menu-item-form.html',
  styleUrl: './menu-item-form.scss',
})
export class MenuItemForm {
  private readonly fb = inject(FormBuilder);
  protected readonly context = injectContext<TuiDialogContext<void, MenuItemFormDialogData>>();

  protected readonly categories = this.context.data.categories;
  protected readonly item = this.context.data.item;
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);

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
    const current = this.item;
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
    }
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const value = this.form.getRawValue();
    const dto: CreateMenuItemDto = {
      name: value.name,
      description: value.description || null,
      categoryId: value.categoryId,
      basePrice: value.basePrice,
      servesMin: value.servesMin,
      servesMax: value.servesMax,
      isActive: value.isActive,
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
