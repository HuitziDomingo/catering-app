import { Injectable } from '@angular/core';
import { io, type Socket } from 'socket.io-client';
import { Subject } from 'rxjs';
import { NEW_ORDER_EVENT, type NewOrderEvent } from '@catering-app/shared-types';
import { SOCKET_BASE_URL } from '../../../core/api-config';

/**
 * Capa data-access del feature de notificaciones (ver ADR-020): conexión
 * Socket.io al namespace `/notifications` (ADR-004), autenticada con el
 * access token JWT vigente del staff (mismo token que authInterceptor
 * adjunta a las requests REST). El servidor valida el rol vía WsJwtGuard y
 * desconecta el socket si no es staff/admin/superadmin.
 */
@Injectable({ providedIn: 'root' })
export class NotificationSocketService {
  private socket: Socket | null = null;
  private readonly newOrderSubject = new Subject<NewOrderEvent>();

  readonly newOrder$ = this.newOrderSubject.asObservable();

  connect(accessToken: string): void {
    if (this.socket) {
      return;
    }

    this.socket = io(`${SOCKET_BASE_URL}/notifications`, {
      auth: { token: accessToken },
    });
    this.socket.on(NEW_ORDER_EVENT, (event: NewOrderEvent) =>
      this.newOrderSubject.next(event),
    );
  }

  disconnect(): void {
    this.socket?.disconnect();
    this.socket = null;
  }
}
