import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { BadRequestException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';

describe('PaymentsController', () => {
  let controller: PaymentsController;
  let paymentsService: {
    createPreference: jest.Mock;
    processWebhook: jest.Mock;
    buildAppReturnUrl: jest.Mock;
  };

  const reflector = new Reflector();

  beforeEach(async () => {
    paymentsService = {
      createPreference: jest.fn(),
      processWebhook: jest.fn(),
      buildAppReturnUrl: jest.fn(() => 'mobile://payment/success?orderId=order-1'),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentsController],
      providers: [{ provide: PaymentsService, useValue: paymentsService }],
    }).compile();

    controller = module.get<PaymentsController>(PaymentsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('guards', () => {
    it('POST /payments/preferences requiere JwtAuthGuard', () => {
      const guards = reflector.get<unknown[]>(
        GUARDS_METADATA,
        PaymentsController.prototype.createPreference,
      );
      expect(guards).toContain(JwtAuthGuard);
    });

    it('POST /payments/webhook es público (sin JwtAuthGuard, lo llama Mercado Pago directamente)', () => {
      const guards = reflector.get<unknown[]>(
        GUARDS_METADATA,
        PaymentsController.prototype.webhook,
      );
      expect(guards).toBeUndefined();
    });
  });

  describe('delegation to PaymentsService', () => {
    it('createPreference usa sub/role/email del JWT como requester, no del body', async () => {
      const user: JwtPayload = { sub: 'user-1', email: 'cliente@example.com', role: 'customer' };
      const req = { user } as unknown as Request;
      paymentsService.createPreference.mockResolvedValue('https://mercadopago.com/checkout/x');

      const result = await controller.createPreference({ orderId: 'order-1' }, req);

      expect(paymentsService.createPreference).toHaveBeenCalledWith('order-1', {
        userId: 'user-1',
        role: 'customer',
        email: 'cliente@example.com',
      });
      expect(result).toEqual({ checkoutUrl: 'https://mercadopago.com/checkout/x' });
    });

    it('webhook pasa los headers/query/body crudos a PaymentsService.processWebhook', async () => {
      await controller.webhook('ts=1,v1=abc', 'req-1', 'payment-1', 'payment');

      expect(paymentsService.processWebhook).toHaveBeenCalledWith({
        xSignature: 'ts=1,v1=abc',
        xRequestId: 'req-1',
        dataId: 'payment-1',
        type: 'payment',
      });
    });

    it('GET /payments/return/:result es público y redirige (302) al deep link con external_reference/status', () => {
      const res = { redirect: jest.fn() } as unknown as Response;

      controller.paymentReturn('success', 'order-1', 'approved', res);

      expect(reflector.get<unknown[]>(GUARDS_METADATA, PaymentsController.prototype.paymentReturn))
        .toBeUndefined();
      expect(paymentsService.buildAppReturnUrl).toHaveBeenCalledWith('success', {
        orderId: 'order-1',
        paymentStatus: 'approved',
      });
      expect(res.redirect).toHaveBeenCalledWith(302, 'mobile://payment/success?orderId=order-1');
    });

    it('GET /payments/return/:result rechaza un result desconocido sin redirigir', () => {
      const res = { redirect: jest.fn() } as unknown as Response;

      expect(() => controller.paymentReturn('hacked', 'order-1', undefined, res)).toThrow(
        BadRequestException,
      );
      expect(res.redirect).not.toHaveBeenCalled();
    });
  });
});
