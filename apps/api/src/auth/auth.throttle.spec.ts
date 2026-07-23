import { INestApplication, UnauthorizedException } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule, minutes } from '@nestjs/throttler';
import request from 'supertest';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

/**
 * Prueba de extremo a extremo (servidor HTTP real, sin BD) del rate limiting
 * en /auth/login. Reproduce el mismo cableado que AppModule (ThrottlerModule
 * global laxo + ThrottlerGuard como APP_GUARD + el @Throttle estricto de
 * AuthController), para que el comportamiento observado aquí sea el mismo
 * que en producción.
 */
describe('Auth rate limiting (integration)', () => {
  let app: INestApplication;
  let authService: { register: jest.Mock; login: jest.Mock; refresh: jest.Mock };

  beforeAll(async () => {
    authService = {
      register: jest.fn(),
      login: jest
        .fn()
        .mockRejectedValue(new UnauthorizedException('Credenciales inválidas.')),
      refresh: jest.fn(),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      imports: [
        // Mismo límite global laxo que AppModule; el login lo sobreescribe
        // a 5/min vía @Throttle en el propio controller.
        ThrottlerModule.forRoot({
          throttlers: [{ name: 'default', ttl: minutes(1), limit: 100 }],
        }),
      ],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: APP_GUARD, useClass: ThrottlerGuard },
      ],
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('permite 5 intentos de login por minuto y rechaza el 6to con 429', async () => {
    const credentials = { email: 'atacante@example.com', password: 'incorrecta' };

    for (let attempt = 1; attempt <= 5; attempt++) {
      const res = await request(app.getHttpServer())
        .post('/auth/login')
        .send(credentials);
      // Credenciales inválidas, pero todavía dentro del límite de la ventana.
      expect(res.status).toBe(401);
    }

    const sixth = await request(app.getHttpServer())
      .post('/auth/login')
      .send(credentials);

    expect(sixth.status).toBe(429);
    expect(authService.login).toHaveBeenCalledTimes(5); // el 6to nunca llega al servicio
  });
});
