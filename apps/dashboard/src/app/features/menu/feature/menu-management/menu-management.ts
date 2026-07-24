import { Component, inject, signal } from '@angular/core';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import type { CreateMenuItemDto, MenuItem } from '@catering-app/shared-types';
import { extractErrorMessage, MenuStateService } from '../../state/menu-state.service';
import { MenuItemForm } from '../../ui/menu-item-form/menu-item-form';
import { MenuItemList } from '../../ui/menu-item-list/menu-item-list';

/**
 * Pantalla real de gestión de menú (ver ADR-020): conecta data-access (via
 * el store) + estado (signals) + componentes de presentación de ui/.
 * Reemplaza la prueba de humo de Taiga UI. A diferencia del menú de mobile
 * (público, solo lectura), esta pantalla es para staff/admin/superadmin y
 * soporta CRUD completo.
 */
@Component({
  selector: 'app-menu-management',
  imports: [TuiButton, MenuItemList, MenuItemForm],
  templateUrl: './menu-management.html',
  styleUrl: './menu-management.scss',
})
export class MenuManagement {
  protected readonly state = inject(MenuStateService);
  private readonly dialogs = inject(TuiDialogService);

  protected readonly editingItem = signal<MenuItem | null>(null);
  protected readonly showForm = signal(false);
  protected readonly formError = signal<string | null>(null);

  constructor() {
    this.state.load();
  }

  protected startCreate(): void {
    this.editingItem.set(null);
    this.formError.set(null);
    this.showForm.set(true);
  }

  protected startEdit(item: MenuItem): void {
    this.editingItem.set(item);
    this.formError.set(null);
    this.showForm.set(true);
  }

  protected cancelForm(): void {
    this.showForm.set(false);
    this.editingItem.set(null);
    this.formError.set(null);
  }

  protected save(dto: CreateMenuItemDto): void {
    this.formError.set(null);
    const editing = this.editingItem();
    const request$ = editing
      ? this.state.updateItem(editing.id, dto)
      : this.state.createItem(dto);
    request$.subscribe({
      next: () => this.cancelForm(),
      error: (err: unknown) => this.formError.set(extractErrorMessage(err)),
    });
  }

  protected confirmDelete(item: MenuItem): void {
    // TuiConfirmService.withConfirm() solo abre diálogo si markAsDirty() fue
    // llamado antes (está pensado para "hay cambios sin guardar", no para
    // confirmaciones genéricas) -- por eso se usa TuiDialogService + TUI_CONFIRM
    // directamente aquí.
    this.dialogs
      .open<boolean>(TUI_CONFIRM, {
        label: 'Eliminar platillo',
        size: 's',
        data: {
          content: `¿Eliminar "${item.name}"? Esta acción no se puede deshacer.`,
          yes: 'Eliminar',
          no: 'Cancelar',
        },
      })
      .subscribe((confirmed) => {
        if (confirmed) {
          this.state.deleteItem(item.id).subscribe();
        }
      });
  }
}
