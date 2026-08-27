import { effect, inject, Injectable, signal } from '@angular/core';
import { TuiNotificationService } from '@taiga-ui/core';
import { RoleName, type NewOrderEvent } from '@catering-app/shared-types';
import { AuthStateService } from '../../auth/state/auth-state.service';
import { NotificationSocketService } from '../data-access/notification-socket.service';

/** Roles que reciben notificaciones en vivo de pedidos (mismo criterio que WsJwtGuard en la API). */
export const NOTIFIABLE_ROLES: RoleName[] = [
  RoleName.STAFF,
  RoleName.ADMIN,
  RoleName.SUPERADMIN,
];

const MAX_RECENT = 20;

/**
 * Estado del feature de notificaciones (ver ADR-020), maneja con signals de
 * Angular la conexión al WebSocket de pedidos nuevos (ADR-004): conecta/
 * desconecta el socket según la sesión, mantiene el historial reciente y el
 * contador de no leídas, y dispara el toast (TuiNotificationService).
 *
 * Cualquier feature de pedidos que se agregue a futuro puede suscribirse a
 * `newOrder$` (re-expuesto acá) para refrescar su propia lista, siguiendo el
 * mismo patrón de "refresh tras evento" que MenuStateService usa tras cada
 * mutación.
 */
@Injectable({ providedIn: 'root' })
export class NotificationStateService {
  private readonly socket = inject(NotificationSocketService);
  private readonly auth = inject(AuthStateService);
  private readonly notifications = inject(TuiNotificationService);

  private readonly _recent = signal<NewOrderEvent[]>([]);
  private readonly _unreadCount = signal(0);

  readonly recent = this._recent.asReadonly();
  readonly unreadCount = this._unreadCount.asReadonly();
  readonly newOrder$ = this.socket.newOrder$;

  constructor() {
    this.socket.newOrder$.subscribe((event) => this.handleNewOrder(event));

    effect(() => {
      const token = this.auth.accessToken();
      const role = this.auth.user()?.role;
      if (token && role && NOTIFIABLE_ROLES.includes(role)) {
        this.socket.connect(token);
      } else {
        this.socket.disconnect();
      }
    });
  }

  markAllRead(): void {
    this._unreadCount.set(0);
  }

  private handleNewOrder(event: NewOrderEvent): void {
    this._recent.update((list) => [event, ...list].slice(0, MAX_RECENT));
    this._unreadCount.update((count) => count + 1);
    this.notifications
      .open(
        `Pedido nuevo para ${event.peopleCount} personas — $${event.total}`,
        { label: 'Pedido nuevo', appearance: 'positive' },
      )
      .subscribe();
  }
}
