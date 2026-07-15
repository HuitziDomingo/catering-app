import { Component, signal } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ButtonModule } from 'primeng/button';

@Component({
  imports: [RouterModule, ButtonModule],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected title = 'dashboard';
  // Prueba de humo: confirma que un componente de PrimeNG renderiza y reacciona
  // bajo change detection zoneless.
  protected readonly clicks = signal(0);
}
