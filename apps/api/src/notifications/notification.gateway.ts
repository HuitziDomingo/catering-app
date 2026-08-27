import { Logger } from '@nestjs/common';
import {
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import { NEW_ORDER_EVENT, NewOrderEvent } from '@catering-app/shared-types';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';

/** Sala a la que se unen los sockets de staff/admin/superadmin ya autenticados. */
export const STAFF_NOTIFICATIONS_ROOM = 'staff-notifications';

/**
 * Gateway de notificaciones en vivo (ADR-004): namespace propio, sin
 * `@SubscribeMessage` -- solo emite `new-order` hacia el dashboard, nunca
 * recibe mensajes de los clientes conectados.
 *
 * cors.origin apunta al dev server del dashboard, mismo valor que
 * app.enableCors() en main.ts (nx serve dashboard, ADR-014).
 */
@WebSocketGateway({
  namespace: 'notifications',
  cors: { origin: 'http://localhost:4200' },
})
export class NotificationGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(NotificationGateway.name);

  @WebSocketServer()
  private readonly server!: Server;

  constructor(private readonly wsJwtGuard: WsJwtGuard) {}

  async handleConnection(client: Socket): Promise<void> {
    const user = await this.wsJwtGuard.authenticate(client);
    if (!user) {
      this.logger.warn(`Conexión rechazada (socket ${client.id}): sin JWT válido de staff.`);
      client.disconnect(true);
      return;
    }

    client.data.user = user;
    await client.join(STAFF_NOTIFICATIONS_ROOM);
  }

  handleDisconnect(client: Socket): void {
    client.leave(STAFF_NOTIFICATIONS_ROOM);
  }

  /** Emitido por OrdersService.createOrder al confirmar un pedido nuevo. */
  emitNewOrder(order: NewOrderEvent): void {
    this.server.to(STAFF_NOTIFICATIONS_ROOM).emit(NEW_ORDER_EVENT, order);
  }
}
