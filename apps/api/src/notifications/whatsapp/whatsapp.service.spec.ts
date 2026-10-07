import { Logger } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@catering-app/shared-types';
import type { Order } from '../../database/entities/order.entity';
import { WhatsAppProvider, WhatsAppSendError } from './whatsapp-provider';
import { WhatsAppService } from './whatsapp.service';

const baseEnv: Record<string, string | undefined> = {
  WHATSAPP_TEMPLATE_MODE: 'production',
  BUSINESS_WHATSAPP_NUMBER: '55 9876 5432',
};

const order = (overrides: Partial<Order> = {}) =>
  ({
    id: '3f2a9b1c-0000-4000-8000-000000000001',
    customerId: 'customer-1',
    status: OrderStatus.PENDING,
    peopleCount: 25,
    // 20:00 UTC = 14:00 en Ciudad de México.
    scheduledFor: new Date('2026-11-20T20:00:00.000Z'),
    total: '3700.00',
    needsReview: false,
    ...overrides,
  }) as unknown as Order;

const customer = { fullName: 'Ana Pérez', whatsappNumber: '+52 1 55 1234 5678' };

describe('WhatsAppService', () => {
  let provider: { isEnabled: boolean; sendTemplate: jest.Mock };
  let warnSpy: jest.SpyInstance;

  const build = (env: Record<string, string | undefined> = baseEnv) =>
    new WhatsAppService(
      provider as unknown as WhatsAppProvider,
      { get: (key: string) => env[key] } as unknown as ConfigService,
    );

  beforeEach(() => {
    provider = { isEnabled: true, sendTemplate: jest.fn().mockResolvedValue({ messageId: 'wamid.1', waId: null }) };
    warnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
  });

  afterEach(() => jest.restoreAllMocks());

  describe('notifyOrderCreated', () => {
    it('avisa al negocio (nuevo_pedido_negocio) y al cliente (pedido_recibido), con números normalizados', async () => {
      await build().notifyOrderCreated(order(), customer, ['2x Chilaquiles', '1x Café']);

      expect(provider.sendTemplate).toHaveBeenCalledTimes(2);
      expect(provider.sendTemplate).toHaveBeenNthCalledWith(1, '525598765432', {
        name: 'nuevo_pedido_negocio',
        languageCode: 'es_MX',
        bodyParams: [
          '3F2A9B1C',
          'Ana Pérez',
          expect.stringMatching(/20 nov 2026, 2:00 p\.m\./),
          '25',
          '2x Chilaquiles, 1x Café',
          'Sin observaciones',
        ],
      });
      expect(provider.sendTemplate).toHaveBeenNthCalledWith(2, '525512345678', {
        name: 'pedido_recibido',
        languageCode: 'es_MX',
        bodyParams: ['Ana Pérez', '3F2A9B1C', expect.stringMatching(/20 nov 2026/), '25'],
      });
    });

    it('marca needsReview en el aviso al negocio', async () => {
      await build().notifyOrderCreated(order({ needsReview: true }), customer, ['1x Tacos']);

      expect(provider.sendTemplate.mock.calls[0][1].bodyParams[5]).toContain('Requiere revisión');
    });

    it('con WHATSAPP_MX_NUMBER_FORMAT=521 manda los números con el 1', async () => {
      await build({ ...baseEnv, WHATSAPP_MX_NUMBER_FORMAT: '521' }).notifyOrderCreated(order(), customer, []);

      expect(provider.sendTemplate.mock.calls.map((c) => c[0])).toEqual(['5215598765432', '5215512345678']);
    });

    it('sin BUSINESS_WHATSAPP_NUMBER solo avisa al cliente', async () => {
      await build({ ...baseEnv, BUSINESS_WHATSAPP_NUMBER: undefined }).notifyOrderCreated(order(), customer, []);

      expect(provider.sendTemplate).toHaveBeenCalledTimes(1);
      expect(provider.sendTemplate.mock.calls[0][1].name).toBe('pedido_recibido');
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('BUSINESS_WHATSAPP_NUMBER'));
    });

    it('un BUSINESS_WHATSAPP_NUMBER inválido avisa al iniciar y solo se omite el aviso al negocio', async () => {
      const service = build({ ...baseEnv, BUSINESS_WHATSAPP_NUMBER: 'whatsapp:+52XXXXXXXXXX' });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('BUSINESS_WHATSAPP_NUMBER no es un número válido'));

      await service.notifyOrderCreated(order(), customer, []);

      expect(provider.sendTemplate.mock.calls.map((c) => c[1].name)).toEqual(['pedido_recibido']);
    });

    it('cliente sin whatsappNumber o con un número inválido: se omite su aviso sin lanzar', async () => {
      await build().notifyOrderCreated(order(), { ...customer, whatsappNumber: null }, []);
      await build().notifyOrderCreated(order(), { ...customer, whatsappNumber: '12345' }, []);

      // Solo los dos avisos al negocio.
      expect(provider.sendTemplate.mock.calls.map((c) => c[1].name)).toEqual([
        'nuevo_pedido_negocio',
        'nuevo_pedido_negocio',
      ]);
    });

    it('un rechazo de Meta en un envío no impide el otro ni lanza', async () => {
      provider.sendTemplate.mockRejectedValueOnce(new WhatsAppSendError('código 131030', 131030, 400));

      await expect(build().notifyOrderCreated(order(), customer, [])).resolves.toBeUndefined();

      expect(provider.sendTemplate).toHaveBeenCalledTimes(2);
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('131030'));
    });

    it('en modo test manda la plantilla de ejemplo de Meta', async () => {
      await build({ ...baseEnv, WHATSAPP_TEMPLATE_MODE: 'test' }).notifyOrderCreated(order(), customer, []);

      expect(provider.sendTemplate.mock.calls.map((c) => c[1].name)).toEqual([
        'jaspers_market_order_confirmation_v1',
        'jaspers_market_order_confirmation_v1',
      ]);
    });

    it('sin WHATSAPP_TEMPLATE_MODE usa el modo test', async () => {
      await build({ BUSINESS_WHATSAPP_NUMBER: '5598765432' }).notifyOrderCreated(order(), customer, []);

      expect(provider.sendTemplate.mock.calls[0][1].name).toBe('jaspers_market_order_confirmation_v1');
    });
  });

  describe('notifyStatusChanged', () => {
    it('confirmed manda pedido_confirmado con total y el token del recibo en el botón', async () => {
      await build().notifyStatusChanged(order({ status: OrderStatus.CONFIRMED }), customer, {
        receiptLinkToken: 'tok',
      });

      expect(provider.sendTemplate).toHaveBeenCalledWith('525512345678', {
        name: 'pedido_confirmado',
        languageCode: 'es_MX',
        bodyParams: ['Ana Pérez', '3F2A9B1C', expect.any(String), '$3,700.00'],
        urlButtonSuffix: 'tok',
      });
    });

    it.each([
      [OrderStatus.PREPARING, 'pedido_en_preparacion'],
      [OrderStatus.DELIVERED, 'pedido_entregado'],
      [OrderStatus.CANCELLED, 'pedido_cancelado'],
      [OrderStatus.PAYMENT_FAILED, 'pago_rechazado'],
    ])('%s manda %s', async (status, name) => {
      await build().notifyStatusChanged(order({ status }), customer);

      expect(provider.sendTemplate.mock.calls[0][1].name).toBe(name);
    });

    it('pending no avisa', async () => {
      await build().notifyStatusChanged(order({ status: OrderStatus.PENDING }), customer);

      expect(provider.sendTemplate).not.toHaveBeenCalled();
    });
  });
});
