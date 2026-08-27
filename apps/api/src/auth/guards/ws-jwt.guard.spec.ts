import { ExecutionContext } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Socket } from 'socket.io';
import { WsJwtGuard } from './ws-jwt.guard';
import { JwtPayload } from '../jwt-payload.interface';

describe('WsJwtGuard', () => {
  let guard: WsJwtGuard;
  let jwtService: { verifyAsync: jest.Mock };
  let config: { get: jest.Mock };

  const staffPayload: JwtPayload = {
    sub: 'user-1',
    email: 'staff@example.com',
    role: 'staff',
  };

  const buildClient = (options: {
    authToken?: string;
    headerToken?: string;
  }): Socket =>
    ({
      handshake: {
        auth: options.authToken ? { token: options.authToken } : {},
        headers: options.headerToken
          ? { authorization: `Bearer ${options.headerToken}` }
          : {},
      },
    }) as unknown as Socket;

  const buildContext = (client: Socket): ExecutionContext =>
    ({
      switchToWs: () => ({
        getClient: () => client,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    jwtService = { verifyAsync: jest.fn() };
    config = { get: jest.fn().mockReturnValue('test-secret') };
    guard = new WsJwtGuard(
      jwtService as unknown as JwtService,
      config as unknown as ConfigService,
    );
  });

  it('allows a socket with a valid token in handshake.auth and a staff-family role', async () => {
    jwtService.verifyAsync.mockResolvedValue(staffPayload);
    const client = buildClient({ authToken: 'valid-token' });

    await expect(guard.canActivate(buildContext(client))).resolves.toBe(true);
    expect(jwtService.verifyAsync).toHaveBeenCalledWith('valid-token', {
      secret: 'test-secret',
    });
  });

  it.each(['staff', 'admin', 'superadmin'])(
    'authenticate() returns the payload for role %s',
    async (role) => {
      jwtService.verifyAsync.mockResolvedValue({ ...staffPayload, role });
      const client = buildClient({ authToken: 'valid-token' });

      await expect(guard.authenticate(client)).resolves.toEqual({
        ...staffPayload,
        role,
      });
    },
  );

  it('allows a socket that sends the token via the Authorization header instead of handshake.auth', async () => {
    jwtService.verifyAsync.mockResolvedValue(staffPayload);
    const client = buildClient({ headerToken: 'valid-token' });

    await expect(guard.canActivate(buildContext(client))).resolves.toBe(true);
  });

  it('denies a socket authenticated as customer (not a staff-family role)', async () => {
    jwtService.verifyAsync.mockResolvedValue({
      ...staffPayload,
      role: 'customer',
    });
    const client = buildClient({ authToken: 'valid-token' });

    await expect(guard.canActivate(buildContext(client))).resolves.toBe(
      false,
    );
  });

  it('denies a socket with no token at all', async () => {
    const client = buildClient({});

    await expect(guard.canActivate(buildContext(client))).resolves.toBe(
      false,
    );
    expect(jwtService.verifyAsync).not.toHaveBeenCalled();
  });

  it('denies a socket with an invalid or expired token', async () => {
    jwtService.verifyAsync.mockRejectedValue(new Error('jwt expired'));
    const client = buildClient({ authToken: 'expired-token' });

    await expect(guard.canActivate(buildContext(client))).resolves.toBe(
      false,
    );
  });
});
