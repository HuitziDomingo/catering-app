import { Component, inject } from '@angular/core';
import { TuiButton, TuiDialogService } from '@taiga-ui/core';
import { TUI_CONFIRM } from '@taiga-ui/kit';
import { PolymorpheusComponent } from '@taiga-ui/polymorpheus';
import type { MenuItem } from '@catering-app/shared-types';
import { MenuStateService } from '../../state/menu-state.service';
import { MenuItemForm, type MenuItemFormDialogData } from '../../ui/menu-item-form/menu-item-form';
import { MenuItemList } from '../../ui/menu-item-list/menu-item-list';

/**
 * Pantalla real de gestión de menú (ver ADR-020): conecta data-access (via
 * el store) + estado (signals) + componentes de presentación de ui/.
 * A diferencia del menú de mobile (público, solo lectura), esta pantalla es
 * para staff/admin/superadmin y soporta CRUD completo.
 *
 * MenuItemForm se abre como diálogo modal (TuiDialogService.open), mismo
 * mecanismo que ya se usaba para confirmar el borrado con TUI_CONFIRM --
 * en vez de envolver el componente en TUI_CONFIRM ya armado, se envuelve
 * la propia clase en `new PolymorpheusComponent(MenuItemForm)` (ver su
 * doc-comment: un componente crudo no es contenido válido de diálogo por
 * sí solo, PolymorpheusOutlet lo trataría como PolymorpheusHandler e
 * intentaría invocarlo como función).
 */
@Component({
  selector: 'app-menu-management',
  imports: [TuiButton, MenuItemList],
  templateUrl: './menu-management.html',
  styleUrl: './menu-management.scss',
})
export class MenuManagement {
  protected readonly state = inject(MenuStateService);
  private readonly dialogs = inject(TuiDialogService);

  constructor() {
    this.state.load();
  }

  protected startCreate(): void {
    this.openForm(null);
  }

  protected startEdit(item: MenuItem): void {
    this.openForm(item);
  }

  private openForm(item: MenuItem | null): void {
    const data: MenuItemFormDialogData = {
      item,
      categories: this.state.categories(),
      // El formulario manda el id vigente: si crea el platillo y falla la
      // imagen, el reintento actualiza ese mismo platillo en vez de duplicarlo.
      save: (dto, id) => (id ? this.state.updateItem(id, dto) : this.state.createItem(dto)),
      uploadImage: (id, file) => this.state.uploadItemImage(id, file),
      removeImage: (id) => this.state.removeItemImage(id),
    };

    this.dialogs
      .open<void>(new PolymorpheusComponent(MenuItemForm), {
        label: item ? 'Editar platillo' : 'Nuevo platillo',
        size: 'm',
        data,
      })
      .subscribe();
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
