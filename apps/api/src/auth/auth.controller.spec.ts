import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { JwtPayload } from './jwt-payload.interface';

// @nestjs/throttler no exporta sus claves de metadata públicamente (solo
// internamente en throttler.constants); son estables entre versiones minor,
// por eso se replican aquí en vez de hacer un deep-import a dist/.
const THROTTLER_LIMIT = 'THROTTLER:LIMIT';
const THROTTLER_TTL = 'THROTTLER:TTL';

describe('AuthController', () => {
  let controller: AuthController;
  let authService: {
    register: jest.Mock;
    login: jest.Mock;
    refresh: jest.Mock;
  };

  const reflector = new Reflector();

  beforeEach(async () => {
    authService = {
      register: jest.fn(),
      login: jest.fn(),
      refresh: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [{ provide: AuthService, useValue: authService }],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('rate limiting — register/login/refresh', () => {
    // El 6to intento en la misma ventana debe rechazarse con 429; ver
    // auth.throttle.spec.ts para la prueba de extremo a extremo contra un
    // servidor HTTP real. Aquí solo se verifica que el límite estricto
    // (5 por minuto) está declarado en los handlers correctos, y que la
    // ventana de "reseteo" es 1 minuto (ttl), tal como pide la tarea cuando
    // no es práctico adelantar el tiempo real en una prueba unitaria.
    const throttledHandlers: Array<
      [string, AuthController['register'] | AuthController['login'] | AuthController['refresh']]
    > = [
      ['register', AuthController.prototype.register],
      ['login', AuthController.prototype.login],
      ['refresh', AuthController.prototype.refresh],
    ];

    it.each(throttledHandlers)(
      '%s limita a 5 solicitudes por minuto (ttl = 60000ms) por IP',
      (_name, handler) => {
        const limit = reflector.get<number>(THROTTLER_LIMIT + 'default', handler);
        const ttl = reflector.get<number>(THROTTLER_TTL + 'default', handler);
        expect(limit).toBe(5);
        expect(ttl).toBe(60_000);
      },
    );

    it('GET /auth/me no tiene límite estricto propio (usa el default global del módulo)', () => {
      const limit = reflector.get<number>(
        THROTTLER_LIMIT + 'default',
        AuthController.prototype.me,
      );
      expect(limit).toBeUndefined();
    });
  });

  describe('guards', () => {
    it('GET /auth/me requiere JwtAuthGuard', () => {
      const guards = reflector.get<unknown[]>(
        GUARDS_METADATA,
        AuthController.prototype.me,
      );
      expect(guards).toContain(JwtAuthGuard);
    });
  });

  describe('delegation to AuthService', () => {
    it('register delega al servicio', async () => {
      const dto = { fullName: 'Ana', email: 'ana@example.com', password: 'password123' };
      authService.register.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });

      await controller.register(dto);

      expect(authService.register).toHaveBeenCalledWith(dto);
    });

    it('login delega al servicio', async () => {
      const dto = { email: 'ana@example.com', password: 'password123' };
      authService.login.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });

      await controller.login(dto);

      expect(authService.login).toHaveBeenCalledWith(dto);
    });

    it('refresh delega al servicio con el refreshToken', async () => {
      authService.refresh.mockResolvedValue({ accessToken: 'a', refreshToken: 'r' });

      await controller.refresh({ refreshToken: 'token-123' });

      expect(authService.refresh).toHaveBeenCalledWith('token-123');
    });

    it('me devuelve el payload del request', () => {
      const user: JwtPayload = { sub: 'user-1', email: 'ana@example.com', role: 'customer' };
      const req = { user } as unknown as Request;

      expect(controller.me(req)).toBe(user);
    });
  });
});
