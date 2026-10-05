import { Component, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { TuiButton, TuiInput, type TuiDialogContext } from '@taiga-ui/core';
import { TuiSwitch, TuiTextareaComponent } from '@taiga-ui/kit';
import { injectContext } from '@taiga-ui/polymorpheus';
import { filter, map, type Observable, of, switchMap, tap } from 'rxjs';
import type { CreateMenuItemDto, MenuCategory, MenuItem } from '@catering-app/shared-types';
import { extractErrorMessage } from '../../../../core/http/extract-error-message';
import type { MenuImageChange, MenuImageUploadEvent } from '../../util/menu-image';
import { MenuImagePicker } from '../menu-image-picker/menu-image-picker';

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
  /** `id` null = crear; si no, actualizar ese platillo. */
  readonly save: (dto: CreateMenuItemDto, id: string | null) => Observable<MenuItem>;
  readonly uploadImage: (id: string, file: File) => Observable<MenuImageUploadEvent>;
  readonly removeImage: (id: string) => Observable<MenuItem>;
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
  imports: [
    ReactiveFormsModule,
    TuiButton,
    TuiInput,
    TuiSwitch,
    TuiTextareaComponent,
    MenuImagePicker,
  ],
  templateUrl: './menu-item-form.html',
  styleUrl: './menu-item-form.scss',
})
export class MenuItemForm {
  private readonly fb = inject(FormBuilder);
  protected readonly context = injectContext<TuiDialogContext<void, MenuItemFormDialogData>>();

  protected readonly categories = this.context.data.categories;
  // Signal porque cambia si se crea el platillo y luego falla la imagen: el
  // siguiente intento debe actualizar ese platillo, no crear otro.
  protected readonly item = signal(this.context.data.item);
  protected readonly saving = signal(false);
  protected readonly error = signal<string | null>(null);
  protected readonly uploadProgress = signal<number | null>(null);
  private imageChange: MenuImageChange = { kind: 'keep' };

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
    // La imagen se sube después de guardar porque un platillo nuevo todavía
    // no tiene id (la API solo acepta la imagen en /menu/items/:id/image).
    let savedItem = false;
    this.context.data
      .save(dto, this.item()?.id ?? null)
      .pipe(
        tap((saved) => {
          savedItem = true;
          this.item.set(saved);
        }),
        switchMap((saved) => this.applyImageChange(saved)),
      )
      .subscribe({
        next: () => this.context.completeWith(),
        error: (err: unknown) => {
          this.saving.set(false);
          this.uploadProgress.set(null);
          const message = extractErrorMessage(err);
          this.error.set(
            savedItem
              ? `El platillo se guardó, pero la imagen no se pudo actualizar: ${message}`
              : message,
          );
        },
      });
  }

  protected onImageChanged(change: MenuImageChange): void {
    this.imageChange = change;
  }

  private applyImageChange(saved: MenuItem): Observable<unknown> {
    const change = this.imageChange;
    if (change.kind === 'remove') {
      return this.context.data
        .removeImage(saved.id)
        .pipe(tap(() => (this.imageChange = { kind: 'keep' })));
    }
    if (change.kind === 'replace') {
      this.uploadProgress.set(0);
      return this.context.data.uploadImage(saved.id, change.file).pipe(
        tap((event) => {
          if (event.type === 'progress') {
            this.uploadProgress.set(event.percent);
          }
        }),
        filter((event) => event.type === 'done'),
        map(() => (this.imageChange = { kind: 'keep' })),
      );
    }
    return of(null);
  }

  protected cancel(): void {
    this.context.completeWith();
  }
}
