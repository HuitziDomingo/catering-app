import { INestApplication, NotFoundException } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { OrderStatus } from '@catering-app/shared-types';
import { ReceiptLinkService } from '../pdf/receipt-link.service';
import { ReceiptsService } from '../pdf/receipts.service';
import { OrdersService } from './orders.service';
import { ReceiptLinkController } from './receipt-link.controller';

/**
 * GET /receipts/:token de punta a punta (servidor HTTP real): token real
 * firmado por ReceiptLinkService; se mockean el pedido y la URL firmada.
 * Público a propósito: no hay guard de JWT (ADR-029).
 */
describe('GET /receipts/:token (integration)', () => {
  let app: INestApplication;
  let links: ReceiptLinkService;
  const orderId = '3f2a9b1c-0000-4000-8000-000000000001';
  const orders = { findDetailById: jest.fn() };
  const receipts = { getReceiptUrl: jest.fn() };

  beforeAll(async () => {
    const config = {
      get: (key: string) => (key === 'RECEIPT_LINK_SECRET' ? 's'.repeat(48) : undefined),
    } as unknown as ConfigService;
    const moduleRef = await Test.createTestingModule({
      controllers: [ReceiptLinkController],
      providers: [
        { provide: ReceiptLinkService, useValue: new ReceiptLinkService(new JwtService({}), config) },
        { provide: OrdersService, useValue: orders },
        { provide: ReceiptsService, useValue: receipts },
      ],
    }).compile();
    links = moduleRef.get(ReceiptLinkService);
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(() => app.close());

  beforeEach(() => {
    jest.clearAllMocks();
    orders.findDetailById.mockResolvedValue({ id: orderId, status: OrderStatus.CONFIRMED });
    receipts.getReceiptUrl.mockResolvedValue({
      url: 'http://storage.test/order-documents/receipts/r.pdf?X-Amz-Expires=900',
      expiresAt: '2026-10-06T19:15:00.000Z',
    });
  });

  it('con un token válido genera una URL firmada nueva y redirige (302, sin caché)', async () => {
    const res = await request(app.getHttpServer()).get(`/receipts/${links.createToken(orderId)}`);

    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://storage.test/order-documents/receipts/r.pdf?X-Amz-Expires=900');
    expect(res.headers['cache-control']).toBe('no-store');
    expect(orders.findDetailById).toHaveBeenCalledWith(orderId);
    expect(receipts.getReceiptUrl).toHaveBeenCalledWith(expect.objectContaining({ id: orderId }));
  });

  it('un token inválido responde 404 con una página legible, sin tocar el pedido', async () => {
    const res = await request(app.getHttpServer()).get('/receipts/token-falso');

    expect(res.status).toBe(404);
    expect(res.headers['content-type']).toContain('text/html');
    expect(res.text).toContain('no es válido');
    expect(orders.findDetailById).not.toHaveBeenCalled();
  });

  it('un token caducado responde 410', async () => {
    jest.useFakeTimers({ now: new Date('2026-01-01T00:00:00Z'), doNotFake: ['nextTick', 'setImmediate'] });
    const token = links.createToken(orderId);
    jest.useRealTimers();

    const res = await request(app.getHttpServer()).get(`/receipts/${token}`);

    expect(res.status).toBe(410);
    expect(res.text).toContain('caducó');
  });

  it('si el pedido ya no existe responde 404', async () => {
    orders.findDetailById.mockRejectedValue(new NotFoundException('El pedido no existe.'));

    const res = await request(app.getHttpServer()).get(`/receipts/${links.createToken(orderId)}`);

    expect(res.status).toBe(404);
  });

  it('un fallo del almacenamiento responde 500 con mensaje genérico, sin detalles internos', async () => {
    receipts.getReceiptUrl.mockRejectedValue(new Error('S3 timeout en 10.0.0.5'));
    jest.spyOn(console, 'error').mockImplementation();

    const res = await request(app.getHttpServer()).get(`/receipts/${links.createToken(orderId)}`);

    expect(res.status).toBe(500);
    expect(res.text).toContain('No pudimos abrir el recibo');
    expect(res.text).not.toContain('10.0.0.5');
  });
});
