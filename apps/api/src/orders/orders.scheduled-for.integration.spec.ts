import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Order } from '../database/entities/order.entity';
import { User } from '../database/entities/user.entity';
import { NotificationGateway } from '../notifications/notification.gateway';
import { WhatsAppService } from '../notifications/whatsapp/whatsapp.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { SCHEDULED_FOR_IN_PAST_MESSAGE } from './scheduled-for.validation';

/**
 * POST /orders de punta a punta (servidor HTTP real, sin BD): controller +
 * OrdersService reales y el mismo ValidationPipe global de main.ts; solo se
 * mockean repositorios y canales de notificación. Verifica el contrato que
 * ve un cliente REST: 400 con mensaje claro si scheduledFor no es futura.
 */
describe('POST /orders — scheduledFor futura (integration)', () => {
  let app: INestApplication;
  const transaction = jest.fn();
  const menuItemId = '7f3c2a1e-4b5d-4c6e-9f80-1a2b3c4d5e6f';

  beforeAll(async () => {
    const manager = {
      find: jest.fn().mockResolvedValue([
        { id: menuItemId, name: 'Chilaquiles', basePrice: '100.00', isActive: true, servesMin: 1, servesMax: 50 },
      ]),
      create: jest.fn((_entity, data) => data),
      save: jest.fn((data) =>
        Promise.resolve(Array.isArray(data) ? data.map((d, i) => ({ id: i + 1, ...d })) : { id: 'order-1', ...data }),
      ),
    };
    transaction.mockImplementation((cb) => cb(manager));

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: { manager: { transaction } } },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn().mockResolvedValue(null) } },
        { provide: NotificationGateway, useValue: { emitNewOrder: jest.fn() } },
        { provide: WhatsAppService, useValue: { sendMessage: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
      ],
    })
      // Sin JWT real: el guard inyecta un cliente autenticado.
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest().user = {
            sub: 'customer-1',
            email: 'c@example.com',
            role: 'customer',
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => transaction.mockClear());

  const body = (scheduledFor: string) => ({
    peopleCount: 10,
    scheduledFor,
    items: [{ menuItemId, quantity: 1 }],
  });

  it('responde 400 con mensaje claro si scheduledFor está en el pasado, sin tocar la BD', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .send(body('2020-01-01T10:00:00.000Z'));

    expect(res.status).toBe(400);
    expect(res.body.message).toBe(SCHEDULED_FOR_IN_PAST_MESSAGE);
    expect(transaction).not.toHaveBeenCalled();
  });

  it('crea el pedido (201) si scheduledFor es futura', async () => {
    const res = await request(app.getHttpServer())
      .post('/orders')
      .send(body('2099-01-01T10:00:00.000Z'));

    expect(res.status).toBe(201);
    expect(res.body.id).toBe('order-1');
    expect(transaction).toHaveBeenCalledTimes(1);
  });
});
