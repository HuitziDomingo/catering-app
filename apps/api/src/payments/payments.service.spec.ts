import {
  BadRequestException,
  ForbiddenException,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { OrderStatus } from '@catering-app/shared-types';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from './payments.service';

const mockPreferenceCreate = jest.fn();
const mockPaymentGet = jest.fn();
const mockValidate = jest.fn();

// Se mockean solo los clientes HTTP del SDK (Preference, Payment,
// MercadoPagoConfig) y el validador de firma -- InvalidWebhookSignatureError
// y SignatureFailureReason quedan como los reales (jest.requireActual) para
// que `err instanceof InvalidWebhookSignatureError` en PaymentsService siga
// funcionando contra los errores que lanzan estos tests.
// Los wrappers en flecha (en vez de pasar mockPreferenceCreate/etc.
// directamente) son necesarios porque ts-jest hoista jest.mock() por encima
// de estas const: al ejecutarse la factory, todavía no están inicializadas.
// Los wrappers solo las leen en el momento de la llamada real (ya
// inicializadas), no al construir el objeto mockeado.
jest.mock('mercadopago', () => {
  const actual = jest.requireActual('mercadopago');
  return {
    ...actual,
    MercadoPagoConfig: jest.fn().mockImplementation((config: unknown) => config),
    Preference: jest.fn().mockImplementation(() => ({
      create: (...args: unknown[]) => mockPreferenceCreate(...args),
    })),
    Payment: jest.fn().mockImplementation(() => ({
      get: (...args: unknown[]) => mockPaymentGet(...args),
    })),
    WebhookSignatureValidator: {
      validate: (...args: unknown[]) => mockValidate(...args),
    },
  };
});

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { InvalidWebhookSignatureError, SignatureFailureReason } = jest.requireActual('mercadopago');

describe('PaymentsService', () => {
  let service: PaymentsService;
  let ordersService: {
    findByIdForRequester: jest.Mock;
    findById: jest.Mock;
    updateStatus: jest.Mock;
    attachPaymentPreference: jest.Mock;
  };
  let config: { get: jest.Mock };

  const orderId = '11111111-1111-1111-1111-111111111111';
  const customerId = '22222222-2222-2222-2222-222222222222';
  const otherCustomerId = '33333333-3333-3333-3333-333333333333';
  const requester = { userId: customerId, role: 'customer', email: 'cliente@example.com' };

  const pendingOrder = {
    id: orderId,
    customerId,
    status: OrderStatus.PENDING,
    total: '499.00',
  };

  beforeEach(() => {
    ordersService = {
      findByIdForRequester: jest.fn(),
      findById: jest.fn(),
      updateStatus: jest.fn(),
      attachPaymentPreference: jest.fn(),
    };
    config = {
      get: jest.fn((key: string) => {
        if (key === 'MERCADOPAGO_ACCESS_TOKEN') return 'TEST-token';
        if (key === 'MERCADOPAGO_WEBHOOK_SECRET') return 'test-secret';
        return undefined;
      }),
    };
    service = new PaymentsService(
      config as unknown as ConfigService,
      ordersService as unknown as OrdersService,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createPreference — ownership y status', () => {
    it('crea la preferencia y devuelve el checkoutUrl cuando el pedido es propio y está pending', async () => {
      ordersService.findByIdForRequester.mockResolvedValue(pendingOrder);
      mockPreferenceCreate.mockResolvedValue({
        id: 'pref-123',
        init_point: 'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=pref-123',
      });

      const checkoutUrl = await service.createPreference(orderId, requester);

      expect(checkoutUrl).toBe(
        'https://www.mercadopago.com.mx/checkout/v1/redirect?pref_id=pref-123',
      );
      expect(mockPreferenceCreate).toHaveBeenCalledWith({
        body: expect.objectContaining({
          external_reference: orderId,
          payer: { email: requester.email },
          items: [
            expect.objectContaining({
              id: orderId,
              quantity: 1,
              unit_price: 499,
              currency_id: 'MXN',
            }),
          ],
        }),
      });
      expect(ordersService.attachPaymentPreference).toHaveBeenCalledWith(orderId, 'pref-123');
    });

    it('lanza ForbiddenException si el pedido no pertenece al requester (aunque findByIdForRequester lo haya devuelto, ej. staff)', async () => {
      ordersService.findByIdForRequester.mockResolvedValue({
        ...pendingOrder,
        customerId: otherCustomerId,
      });

      await expect(
        service.createPreference(orderId, { ...requester, role: 'staff' }),
      ).rejects.toThrow(ForbiddenException);

      expect(mockPreferenceCreate).not.toHaveBeenCalled();
    });

    it('lanza BadRequestException si el pedido no está pending', async () => {
      ordersService.findByIdForRequester.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.CONFIRMED,
      });

      await expect(service.createPreference(orderId, requester)).rejects.toThrow(
        BadRequestException,
      );

      expect(mockPreferenceCreate).not.toHaveBeenCalled();
    });

    it('lanza InternalServerErrorException si Mercado Pago no devuelve id/init_point', async () => {
      ordersService.findByIdForRequester.mockResolvedValue(pendingOrder);
      mockPreferenceCreate.mockResolvedValue({});

      await expect(service.createPreference(orderId, requester)).rejects.toThrow(
        InternalServerErrorException,
      );

      expect(ordersService.attachPaymentPreference).not.toHaveBeenCalled();
    });

    it('lanza InternalServerErrorException si falta MERCADOPAGO_ACCESS_TOKEN', async () => {
      ordersService.findByIdForRequester.mockResolvedValue(pendingOrder);
      config.get.mockImplementation((key: string) =>
        key === 'MERCADOPAGO_ACCESS_TOKEN' ? undefined : 'test-secret',
      );

      await expect(service.createPreference(orderId, requester)).rejects.toThrow(
        InternalServerErrorException,
      );
    });
  });

  describe('processWebhook — validación de firma', () => {
    const validHeaders = {
      xSignature: 'ts=1,v1=abc',
      xRequestId: 'req-1',
      dataId: 'payment-1',
      type: 'payment',
    };

    it('lanza UnauthorizedException cuando la firma es inválida', async () => {
      mockValidate.mockImplementation(() => {
        throw new InvalidWebhookSignatureError(SignatureFailureReason.SignatureMismatch);
      });

      await expect(service.processWebhook(validHeaders)).rejects.toThrow(UnauthorizedException);
      expect(mockPaymentGet).not.toHaveBeenCalled();
    });

    it('propaga errores inesperados del validador sin envolverlos', async () => {
      const unexpected = new Error('boom');
      mockValidate.mockImplementation(() => {
        throw unexpected;
      });

      await expect(service.processWebhook(validHeaders)).rejects.toThrow(unexpected);
    });

    it('lanza InternalServerErrorException si falta MERCADOPAGO_WEBHOOK_SECRET', async () => {
      config.get.mockImplementation((key: string) =>
        key === 'MERCADOPAGO_WEBHOOK_SECRET' ? undefined : 'TEST-token',
      );

      await expect(service.processWebhook(validHeaders)).rejects.toThrow(
        InternalServerErrorException,
      );
      expect(mockValidate).not.toHaveBeenCalled();
    });
  });

  describe('processWebhook — re-consulta y transición de estado', () => {
    const validHeaders = {
      xSignature: 'ts=1,v1=abc',
      xRequestId: 'req-1',
      dataId: 'payment-1',
      type: 'payment',
    };

    beforeEach(() => {
      mockValidate.mockImplementation(() => undefined);
    });

    it('ignora notificaciones que no son de tipo "payment" sin re-consultar nada', async () => {
      await service.processWebhook({ ...validHeaders, type: 'merchant_order' });

      expect(mockValidate).toHaveBeenCalled();
      expect(mockPaymentGet).not.toHaveBeenCalled();
    });

    it('marca el pedido como confirmed cuando el pago re-consultado está approved', async () => {
      mockPaymentGet.mockResolvedValue({ status: 'approved', external_reference: orderId });
      ordersService.findById.mockResolvedValue(pendingOrder);

      await service.processWebhook(validHeaders);

      expect(mockPaymentGet).toHaveBeenCalledWith({ id: 'payment-1' });
      expect(ordersService.updateStatus).toHaveBeenCalledWith(orderId, OrderStatus.CONFIRMED);
    });

    it.each(['rejected', 'cancelled'])(
      'marca el pedido como payment_failed cuando el pago re-consultado está %s',
      async (status) => {
        mockPaymentGet.mockResolvedValue({ status, external_reference: orderId });
        ordersService.findById.mockResolvedValue(pendingOrder);

        await service.processWebhook(validHeaders);

        expect(ordersService.updateStatus).toHaveBeenCalledWith(
          orderId,
          OrderStatus.PAYMENT_FAILED,
        );
      },
    );

    it.each(['pending', 'in_process', 'authorized'])(
      'no toca el pedido cuando el pago re-consultado sigue en estado intermedio (%s)',
      async (status) => {
        mockPaymentGet.mockResolvedValue({ status, external_reference: orderId });

        await service.processWebhook(validHeaders);

        expect(ordersService.updateStatus).not.toHaveBeenCalled();
      },
    );

    it('no confía en el payload del webhook: siempre re-consulta el pago contra la API antes de decidir', async () => {
      mockPaymentGet.mockResolvedValue({ status: 'approved', external_reference: orderId });
      ordersService.findById.mockResolvedValue(pendingOrder);

      await service.processWebhook(validHeaders);

      // La única fuente para status/external_reference es la respuesta de
      // paymentClient.get -- el webhook de entrada no trae más que el id.
      expect(mockPaymentGet).toHaveBeenCalledTimes(1);
      expect(ordersService.updateStatus).toHaveBeenCalledWith(orderId, OrderStatus.CONFIRMED);
    });

    it('descarta la notificación si el pago no trae external_reference', async () => {
      mockPaymentGet.mockResolvedValue({ status: 'approved', external_reference: undefined });

      await service.processWebhook(validHeaders);

      expect(ordersService.findById).not.toHaveBeenCalled();
      expect(ordersService.updateStatus).not.toHaveBeenCalled();
    });

    it('descarta la notificación si el pedido referenciado no existe', async () => {
      mockPaymentGet.mockResolvedValue({ status: 'approved', external_reference: orderId });
      ordersService.findById.mockResolvedValue(null);

      await service.processWebhook(validHeaders);

      expect(ordersService.updateStatus).not.toHaveBeenCalled();
    });

    it('descarta notificaciones de tipo "payment" sin data.id', async () => {
      await service.processWebhook({ ...validHeaders, dataId: undefined });

      expect(mockPaymentGet).not.toHaveBeenCalled();
    });
  });
});
