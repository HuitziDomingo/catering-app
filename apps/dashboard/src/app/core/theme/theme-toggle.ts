import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TUI_DARK_MODE } from '@taiga-ui/core';
import { TuiSwitch } from '@taiga-ui/kit';

/**
 * Componente de presentación pura, vive en core/ igual que dev-token-input
 * (infraestructura transversal, no un feature de negocio -- ver ADR-020).
 *
 * TUI_DARK_MODE ya es "signals + persistencia" listo para usar: sigue
 * prefers-color-scheme por defecto y, al fijarse explícitamente con .set(),
 * persiste la elección en localStorage (clave "tuiDark") -- ver
 * @taiga-ui/core/tokens/dark-mode. Este componente solo lee/escribe ese
 * signal, igual que ThemeToggle.tsx hace con el store de mobile.
 *
 * tuiSwitch (como TuiRadioComponent, su base) se queda forzado a
 * [disabled] a menos que tenga un NgControl asociado (ver
 * TuiRadioComponent: '[disabled]': '!control || control.disabled') -- por
 * eso usa ngModel (igual que dev-token-input.ts) en vez de [checked]/
 * (change) planos, que dejarían el switch inutilizable.
 */
@Component({
  selector: 'app-theme-toggle',
  imports: [FormsModule, TuiSwitch],
  templateUrl: './theme-toggle.html',
  styleUrl: './theme-toggle.scss',
})
export class ThemeToggle {
  protected readonly darkMode = inject(TUI_DARK_MODE);
}
