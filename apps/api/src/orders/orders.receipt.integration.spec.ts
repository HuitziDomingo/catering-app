import { ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import request from 'supertest';
import { OrderStatus } from '@catering-app/shared-types';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { JwtPayload } from '../auth/jwt-payload.interface';
import { OrderDocument } from '../database/entities/order-document.entity';
import { Order } from '../database/entities/order.entity';
import { User } from '../database/entities/user.entity';
import { NotificationGateway } from '../notifications/notification.gateway';
import { WhatsAppService } from '../notifications/whatsapp/whatsapp.service';
import { paidOrder } from '../pdf/receipt-fixtures';
import { ReceiptPdfRenderer } from '../pdf/receipt-pdf.renderer';
import { ReceiptsService } from '../pdf/receipts.service';
import { StorageService } from '../storage/storage.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

/**
 * GET /orders/:id/receipt de punta a punta (servidor HTTP real, sin BD ni
 * almacenamiento): controller, OrdersService, ReceiptsService y el renderer
 * de PDF reales; se mockean repositorios y StorageService. Verifica los
 * permisos que ve un cliente REST (ADR-028).
 */
describe('GET /orders/:id/receipt (integration)', () => {
  let app: INestApplication;
  let currentUser: JwtPayload;
  let receiptRows: OrderDocument[];
  const storage = {
    putObject: jest.fn().mockResolvedValue(undefined),
    deleteObject: jest.fn(),
    getPublicUrl: jest.fn(),
    getSignedUrl: jest.fn((_bucket: string, key: string, ttl: number) =>
      Promise.resolve(`http://storage.test/order-documents/${key}?X-Amz-Expires=${ttl}`),
    ),
  };

  const ownerId = '11111111-1111-4111-8111-111111111111';
  const paidId = '3f2a9b1c-0000-4000-8000-000000000001';
  const pendingId = '4a4a4a4a-0000-4000-8000-000000000002';
  const missingId = '5b5b5b5b-0000-4000-8000-000000000003';
  const orders: Record<string, Order> = {
    [paidId]: paidOrder({ id: paidId, customerId: ownerId }),
    [pendingId]: paidOrder({
      id: pendingId,
      customerId: ownerId,
      status: OrderStatus.PENDING,
      paidAt: null,
      paymentId: null,
    }),
  };

  const as = (sub: string, role: string) => {
    currentUser = { sub, email: `${sub}@example.com`, role };
  };

  beforeAll(async () => {
    const documentsRepo = {
      findOne: jest.fn(({ where }) =>
        Promise.resolve(receiptRows.find((row) => row.orderId === where.orderId) ?? null),
      ),
      create: jest.fn((data) => data),
      save: jest.fn((data) => {
        const row = { id: `doc-${receiptRows.length + 1}`, createdAt: new Date(), ...data };
        receiptRows.push(row);
        return Promise.resolve(row);
      }),
    };

    const moduleRef: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        OrdersService,
        ReceiptsService,
        ReceiptPdfRenderer,
        {
          provide: getRepositoryToken(Order),
          useValue: { findOne: jest.fn(({ where }) => Promise.resolve(orders[where.id] ?? null)) },
        },
        { provide: getRepositoryToken(User), useValue: { findOne: jest.fn() } },
        { provide: getRepositoryToken(OrderDocument), useValue: documentsRepo },
        { provide: NotificationGateway, useValue: { emitNewOrder: jest.fn() } },
        { provide: WhatsAppService, useValue: { sendMessage: jest.fn() } },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: StorageService, useValue: storage },
      ],
    })
      // Sin JWT real: el guard inyecta el usuario que fija cada test.
      .overrideGuard(JwtAuthGuard)
      .useValue({
        canActivate: (context: ExecutionContext) => {
          context.switchToHttp().getRequest().user = currentUser;
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

  beforeEach(() => {
    receiptRows = [];
    jest.clearAllMocks();
  });

  const getReceipt = (id: string) => request(app.getHttpServer()).get(`/orders/${id}/receipt`);

  it('el cliente dueño recibe la URL firmada de 15 minutos (y el recibo se genera al vuelo)', async () => {
    as(ownerId, 'customer');

    const res = await getReceipt(paidId);

    expect(res.status).toBe(200);
    expect(res.body.url).toMatch(
      new RegExp(`^http://storage\\.test/order-documents/receipts/${paidId}/.+\\.pdf\\?X-Amz-Expires=900$`),
    );
    expect(new Date(res.body.expiresAt).getTime() - Date.now()).toBeGreaterThan(14 * 60 * 1000);
    // PDF real del renderer, subido al bucket privado.
    const [bucket, , body, contentType] = storage.putObject.mock.calls[0];
    expect(bucket).toBe('documents');
    expect((body as Buffer).subarray(0, 5).toString()).toBe('%PDF-');
    expect(contentType).toBe('application/pdf');
  });

  it('la segunda consulta reutiliza el recibo: no se vuelve a generar', async () => {
    as(ownerId, 'customer');

    await getReceipt(paidId);
    await getReceipt(paidId);

    expect(storage.putObject).toHaveBeenCalledTimes(1);
    expect(storage.getSignedUrl).toHaveBeenCalledTimes(2);
    expect(receiptRows).toHaveLength(1);
  });

  it('otro cliente recibe 403 y no se genera ni firma nada', async () => {
    as('99999999-9999-4999-8999-999999999999', 'customer');

    const res = await getReceipt(paidId);

    expect(res.status).toBe(403);
    expect(storage.putObject).not.toHaveBeenCalled();
    expect(storage.getSignedUrl).not.toHaveBeenCalled();
  });

  it.each(['staff', 'admin', 'superadmin'])('%s puede ver el recibo de cualquier pedido', async (role) => {
    as('22222222-2222-4222-8222-222222222222', role);

    const res = await getReceipt(paidId);

    expect(res.status).toBe(200);
    expect(res.body.url).toContain('X-Amz-Expires=900');
  });

  it('un pedido sin pagar responde 409', async () => {
    as(ownerId, 'customer');

    const res = await getReceipt(pendingId);

    expect(res.status).toBe(409);
    expect(storage.putObject).not.toHaveBeenCalled();
  });

  it('un pedido que no existe responde 404', async () => {
    as(ownerId, 'customer');

    expect((await getReceipt(missingId)).status).toBe(404);
  });

  it('un id que no es uuid responde 400', async () => {
    as(ownerId, 'customer');

    expect((await getReceipt('no-es-uuid')).status).toBe(400);
  });
});
