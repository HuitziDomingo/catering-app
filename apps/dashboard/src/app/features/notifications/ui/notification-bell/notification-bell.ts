import { Component, inject, signal } from '@angular/core';
import { TuiButton } from '@taiga-ui/core';
import { TuiBadgeNotification, TuiBadgedContentComponent } from '@taiga-ui/kit';
import { NotificationStateService } from '../../state/notification-state.service';

/**
 * Componente de presentación pura (ver ADR-020): campana con contador de no
 * leídas + lista simple de los últimos pedidos notificados. No es un centro
 * de notificaciones completo -- alcanza para la v1 (ver ADR-004).
 */
@Component({
  selector: 'app-notification-bell',
  imports: [TuiButton, TuiBadgeNotification, TuiBadgedContentComponent],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
})
export class NotificationBell {
  private readonly state = inject(NotificationStateService);

  protected readonly unreadCount = this.state.unreadCount;
  protected readonly recent = this.state.recent;
  protected readonly open = signal(false);

  protected toggle(): void {
    const nextOpen = !this.open();
    this.open.set(nextOpen);
    if (nextOpen) {
      this.state.markAllRead();
    }
  }
}
