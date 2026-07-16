import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TuiButton } from '@taiga-ui/core';

@Component({
  imports: [RouterModule, TuiButton],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'dashboard';
  // Prueba de humo: confirma que un componente de Taiga UI renderiza y reacciona
  // bajo change detection zoneless (ADR-012).
  protected readonly clicks = signal(0);
}
