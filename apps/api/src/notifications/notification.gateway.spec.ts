import type { Socket } from 'socket.io';
import { NotificationGateway, STAFF_NOTIFICATIONS_ROOM } from './notification.gateway';
import { WsJwtGuard } from '../auth/guards/ws-jwt.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';

describe('NotificationGateway', () => {
  let gateway: NotificationGateway;
  let wsJwtGuard: { authenticate: jest.Mock };

  const staffPayload: JwtPayload = {
    sub: 'user-1',
    email: 'staff@example.com',
    role: 'staff',
  };

  const buildClient = (): { socket: Socket; data: Record<string, unknown> } => {
    const data: Record<string, unknown> = {};
    const socket = {
      id: 'socket-1',
      data,
      join: jest.fn().mockResolvedValue(undefined),
      leave: jest.fn(),
      disconnect: jest.fn(),
    } as unknown as Socket;
    return { socket, data };
  };

  beforeEach(() => {
    wsJwtGuard = { authenticate: jest.fn() };
    gateway = new NotificationGateway(wsJwtGuard as unknown as WsJwtGuard);
  });

  it('joins the staff room and stashes the user when the JWT is valid', async () => {
    wsJwtGuard.authenticate.mockResolvedValue(staffPayload);
    const { socket } = buildClient();

    await gateway.handleConnection(socket);

    expect(socket.join).toHaveBeenCalledWith(STAFF_NOTIFICATIONS_ROOM);
    expect(socket.disconnect).not.toHaveBeenCalled();
    expect(socket.data.user).toEqual(staffPayload);
  });

  it('disconnects the socket without joining the room when the JWT is missing/invalid', async () => {
    wsJwtGuard.authenticate.mockResolvedValue(null);
    const { socket } = buildClient();

    await gateway.handleConnection(socket);

    expect(socket.join).not.toHaveBeenCalled();
    expect(socket.disconnect).toHaveBeenCalledWith(true);
  });

  it('emitNewOrder emits "new-order" only to the staff room', () => {
    const emit = jest.fn();
    const to = jest.fn().mockReturnValue({ emit });
    // @ts-expect-error -- private field, wired directly for the test.
    gateway.server = { to };

    const payload = {
      id: 'order-1',
      customerId: 'cust-1',
      total: 500,
      peopleCount: 10,
      scheduledFor: '2026-08-01T12:00:00.000Z',
      needsReview: false,
    };
    gateway.emitNewOrder(payload);

    expect(to).toHaveBeenCalledWith(STAFF_NOTIFICATIONS_ROOM);
    expect(emit).toHaveBeenCalledWith('new-order', payload);
  });
});
