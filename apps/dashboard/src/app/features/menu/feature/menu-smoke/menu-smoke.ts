import { Component, signal } from '@angular/core';
import { MenuSmokeButton } from '../../ui/menu-smoke-button/menu-smoke-button';

/**
 * Piloto de arquitectura feature-first (ADR-020): la prueba de humo de
 * Taiga UI reorganizada bajo features/menu/, sin lógica de negocio de menú
 * real todavía (eso es una tarea futura separada).
 */
@Component({
  selector: 'app-menu-smoke',
  imports: [MenuSmokeButton],
  templateUrl: './menu-smoke.html',
})
export class MenuSmoke {
  protected readonly clicks = signal(0);
}
