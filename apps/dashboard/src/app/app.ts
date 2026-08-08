import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TuiRoot } from '@taiga-ui/core';
import { LogoutButton } from './core/auth/logout-button';
import { ThemeToggle } from './core/theme/theme-toggle';
import { AuthStateService } from './features/auth/state/auth-state.service';

@Component({
  imports: [RouterModule, LogoutButton, ThemeToggle, TuiRoot],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthStateService);
  protected title = 'dashboard';
}
