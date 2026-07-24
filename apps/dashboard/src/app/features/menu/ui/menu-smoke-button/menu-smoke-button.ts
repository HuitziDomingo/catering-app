import { Component, input, output } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';

/**
 * Botón de presentación pura (sin estado ni lógica de negocio), reutilizable
 * entre features — vive en ui/ según la separación de ADR-020.
 */
@Component({
  selector: 'app-menu-smoke-button',
  imports: [TuiButton],
  templateUrl: './menu-smoke-button.html',
})
export class MenuSmokeButton {
  readonly label = input.required<string>();
  readonly pressed = output<void>();
}
