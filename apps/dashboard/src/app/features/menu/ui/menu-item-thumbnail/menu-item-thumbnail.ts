import { Component, input, linkedSignal } from '@angular/core';

/**
 * Imagen de un platillo o, si no tiene o no carga, un placeholder (ADR-020:
 * presentación pura, sin lógica de negocio). Se usa en la tabla de Gestión
 * de menú y en el selector de imagen del formulario.
 */
@Component({
  selector: 'app-menu-item-thumbnail',
  templateUrl: './menu-item-thumbnail.html',
  styleUrl: './menu-item-thumbnail.scss',
  host: { '[attr.data-size]': 'size()' },
})
export class MenuItemThumbnail {
  readonly url = input<string | null>(null);
  readonly alt = input('');
  readonly size = input<'s' | 'l'>('s');

  // Se reinicia cada vez que cambia la URL: una imagen nueva merece otro intento.
  protected readonly failed = linkedSignal({ source: this.url, computation: () => false });
}
