import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TuiButton, TuiTextfieldComponent } from '@taiga-ui/core';
import { DevTokenStore } from './dev-token.store';

/**
 * TEMPORAL: banner de solo desarrollo para pegar un JWT a mano (ver
 * DevTokenStore). Se elimina cuando exista una pantalla de login real.
 */
@Component({
  selector: 'app-dev-token-input',
  imports: [FormsModule, TuiButton, TuiTextfieldComponent],
  templateUrl: './dev-token-input.html',
  styleUrl: './dev-token-input.scss',
})
export class DevTokenInput {
  protected readonly store = inject(DevTokenStore);
  protected readonly draft = signal('');

  protected save(): void {
    this.store.setToken(this.draft());
    this.draft.set('');
  }

  protected clear(): void {
    this.store.clearToken();
  }
}
