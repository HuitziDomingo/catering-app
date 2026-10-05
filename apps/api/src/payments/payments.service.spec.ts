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
    updateStatus: jest.Mock;
    recordPaymentResult: jest.Mock;
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
      updateStatus: jest.fn(),
      recordPaymentResult: jest.fn(),
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

    it('reintento tras un pago rechazado: regresa el pedido payment_failed a pending y crea una preferencia nueva', async () => {
      ordersService.findByIdForRequester.mockResolvedValue({
        ...pendingOrder,
        status: OrderStatus.PAYMENT_FAILED,
      });
      mockPreferenceCreate.mockResolvedValue({ id: 'pref-2', init_point: 'https://mp/pref-2' });

      await expect(service.createPreference(orderId, requester)).resolves.toBe('https://mp/pref-2');

      expect(ordersService.updateStatus).toHaveBeenCalledWith(orderId, OrderStatus.PENDING);
      expect(ordersService.attachPaymentPreference).toHaveBeenCalledWith(orderId, 'pref-2');
    });

    it('arma back_urls HTTPS a la API (con auto_return) cuando API_PUBLIC_URL está definida', async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'MERCADOPAGO_ACCESS_TOKEN') return 'TEST-token';
        if (key === 'API_PUBLIC_URL') return 'https://abc.ngrok-free.app/';
        return undefined;
      });
      ordersService.findByIdForRequester.mockResolvedValue(pendingOrder);
      mockPreferenceCreate.mockResolvedValue({ id: 'pref-1', init_point: 'https://mp/pref-1' });

      await service.createPreference(orderId, requester);

      expect(mockPreferenceCreate).toHaveBeenCalledWith({
        body: expect.objectContaining({
          back_urls: {
            success: 'https://abc.ngrok-free.app/api/payments/return/success',
            failure: 'https://abc.ngrok-free.app/api/payments/return/failure',
            pending: 'https://abc.ngrok-free.app/api/payments/return/pending',
          },
          auto_return: 'approved',
        }),
      });
    });

    it('omite back_urls (flujo previo) cuando API_PUBLIC_URL no está definida', async () => {
      ordersService.findByIdForRequester.mockResolvedValue(pendingOrder);
      mockPreferenceCreate.mockResolvedValue({ id: 'pref-1', init_point: 'https://mp/pref-1' });

      await service.createPreference(orderId, requester);

      const body = mockPreferenceCreate.mock.calls[0][0].body;
      expect(body.back_urls).toBeUndefined();
      expect(body.auto_return).toBeUndefined();
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

    it('marca el pedido como confirmed y guarda el detalle del pago re-consultado cuando está approved', async () => {
      mockPaymentGet.mockResolvedValue({
        id: 123456789,
        status: 'approved',
        external_reference: orderId,
        payment_method_id: 'visa',
        date_approved: '2026-10-03T15:30:00.000-06:00',
      });

      await service.processWebhook(validHeaders);

      expect(mockPaymentGet).toHaveBeenCalledWith({ id: 'payment-1' });
      expect(ordersService.recordPaymentResult).toHaveBeenCalledWith(
        orderId,
        OrderStatus.CONFIRMED,
        {
          paymentId: '123456789',
          paymentMethod: 'visa',
          paidAt: new Date('2026-10-03T15:30:00.000-06:00'),
        },
      );
    });

    it.each(['rejected', 'cancelled'])(
      'marca el pedido como payment_failed (sin paidAt) cuando el pago re-consultado está %s',
      async (status) => {
        mockPaymentGet.mockResolvedValue({
          id: 987,
          status,
          external_reference: orderId,
          payment_method_id: 'master',
        });

        await service.processWebhook(validHeaders);

        expect(ordersService.recordPaymentResult).toHaveBeenCalledWith(
          orderId,
          OrderStatus.PAYMENT_FAILED,
          { paymentId: '987', paymentMethod: 'master', paidAt: null },
        );
      },
    );

    it.each(['pending', 'in_process', 'authorized'])(
      'no toca el pedido cuando el pago re-consultado sigue en estado intermedio (%s)',
      async (status) => {
        mockPaymentGet.mockResolvedValue({ status, external_reference: orderId });

        await service.processWebhook(validHeaders);

        expect(ordersService.recordPaymentResult).not.toHaveBeenCalled();
      },
    );

    it('no confía en el payload del webhook: siempre re-consulta el pago contra la API antes de decidir', async () => {
      mockPaymentGet.mockResolvedValue({ status: 'approved', external_reference: orderId });

      await service.processWebhook(validHeaders);

      // La única fuente para status/external_reference es la respuesta de
      // paymentClient.get -- el webhook de entrada no trae más que el id.
      expect(mockPaymentGet).toHaveBeenCalledTimes(1);
      expect(ordersService.recordPaymentResult).toHaveBeenCalledWith(
        orderId,
        OrderStatus.CONFIRMED,
        expect.objectContaining({ paymentId: 'payment-1' }),
      );
    });

    it('descarta la notificación si el pago no trae external_reference', async () => {
      mockPaymentGet.mockResolvedValue({ status: 'approved', external_reference: undefined });

      await service.processWebhook(validHeaders);

      expect(ordersService.recordPaymentResult).not.toHaveBeenCalled();
    });

    it('descarta notificaciones de tipo "payment" sin data.id', async () => {
      await service.processWebhook({ ...validHeaders, dataId: undefined });

      expect(mockPaymentGet).not.toHaveBeenCalled();
    });
  });

  describe('buildAppReturnUrl — redirect de back_urls al deep link', () => {
    it('usa mobile://payment por default y reenvía orderId y el status de Mercado Pago', () => {
      expect(
        service.buildAppReturnUrl('success', { orderId, paymentStatus: 'approved' }),
      ).toBe(`mobile://payment/success?orderId=${orderId}&paymentStatus=approved`);
    });

    it('respeta MOBILE_PAYMENT_RETURN_URL (ej. Expo web) y codifica los parámetros', () => {
      config.get.mockImplementation((key: string) =>
        key === 'MOBILE_PAYMENT_RETURN_URL' ? 'http://localhost:8081/payment/' : undefined,
      );

      expect(service.buildAppReturnUrl('failure', { orderId: 'a&b=c' })).toBe(
        'http://localhost:8081/payment/failure?orderId=a%26b%3Dc',
      );
    });

    it('no agrega query string si Mercado Pago no mandó parámetros', () => {
      expect(service.buildAppReturnUrl('pending', {})).toBe('mobile://payment/pending');
    });
  });
});
