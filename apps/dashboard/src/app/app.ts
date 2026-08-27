import { Component, computed, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TuiRoot } from '@taiga-ui/core';
import { LogoutButton } from './core/auth/logout-button';
import { ThemeToggle } from './core/theme/theme-toggle';
import { AuthStateService } from './features/auth/state/auth-state.service';
import { NOTIFIABLE_ROLES } from './features/notifications/state/notification-state.service';
import { NotificationBell } from './features/notifications/ui/notification-bell/notification-bell';

@Component({
  imports: [RouterModule, LogoutButton, ThemeToggle, NotificationBell, TuiRoot],
  selector: 'app-root',
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly auth = inject(AuthStateService);
  protected title = 'dashboard';

  protected readonly showNotifications = computed(() => {
    const role = this.auth.user()?.role;
    return !!role && NOTIFIABLE_ROLES.includes(role);
  });
}
