import { Component, computed, DestroyRef, inject, input, output, signal } from '@angular/core';
import { TuiButton, TuiNotification } from '@taiga-ui/core';
import { TuiProgress } from '@taiga-ui/kit';
import {
  MENU_IMAGE_ACCEPT,
  type MenuImageChange,
  validateMenuImageFile,
} from '../../util/menu-image';
import { MenuItemThumbnail } from '../menu-item-thumbnail/menu-item-thumbnail';

/**
 * Selector de imagen del formulario de platillo (ADR-020: ui/, sin llamar a
 * la API). Valida el archivo con las mismas reglas que la API, muestra la
 * vista previa y emite qué hacer al guardar (`keep` / `replace` / `remove`);
 * la subida real la hace el formulario después de guardar el platillo.
 */
@Component({
  selector: 'app-menu-image-picker',
  imports: [TuiButton, TuiNotification, TuiProgress, MenuItemThumbnail],
  templateUrl: './menu-image-picker.html',
  styleUrl: './menu-image-picker.scss',
})
export class MenuImagePicker {
  /** Imagen guardada del platillo (null si no tiene o es nuevo). */
  readonly currentUrl = input<string | null>(null);
  readonly itemName = input('');
  readonly disabled = input(false);
  /** Avance de la subida (0-100), o null si no se está subiendo. */
  readonly progress = input<number | null>(null);
  readonly changed = output<MenuImageChange>();

  protected readonly accept = MENU_IMAGE_ACCEPT;
  protected readonly change = signal<MenuImageChange>({ kind: 'keep' });
  protected readonly error = signal<string | null>(null);
  private readonly previewUrl = signal<string | null>(null);

  protected readonly displayedUrl = computed(() => {
    const change = this.change();
    if (change.kind === 'replace') {
      return this.previewUrl();
    }
    return change.kind === 'remove' ? null : this.currentUrl();
  });

  constructor() {
    inject(DestroyRef).onDestroy(() => this.revokePreview());
  }

  protected onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    // Limpiar el input permite volver a elegir el mismo archivo después.
    input.value = '';
    if (!file) {
      return;
    }

    const error = validateMenuImageFile(file);
    this.error.set(error);
    if (error) {
      return;
    }

    this.revokePreview();
    this.previewUrl.set(URL.createObjectURL(file));
    this.setChange({ kind: 'replace', file });
  }

  protected remove(): void {
    this.error.set(null);
    this.revokePreview();
    // Sin imagen guardada, "quitar" la recién elegida es volver a no tener nada.
    this.setChange(this.currentUrl() ? { kind: 'remove' } : { kind: 'keep' });
  }

  protected undo(): void {
    this.error.set(null);
    this.revokePreview();
    this.setChange({ kind: 'keep' });
  }

  private setChange(change: MenuImageChange): void {
    this.change.set(change);
    this.changed.emit(change);
  }

  private revokePreview(): void {
    const url = this.previewUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.previewUrl.set(null);
    }
  }
}
