import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: {
    createOrder: jest.Mock;
    findByIdForRequester: jest.Mock;
  };

  const reflector = new Reflector();

  beforeEach(async () => {
    ordersService = {
      createOrder: jest.fn(),
      findByIdForRequester: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [{ provide: OrdersService, useValue: ordersService }],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('guards', () => {
    it('POST /orders requires JwtAuthGuard (cualquier usuario autenticado, sin restricción de rol)', () => {
      const guards = reflector.get<unknown[]>(
        GUARDS_METADATA,
        OrdersController.prototype.createOrder,
      );
      expect(guards).toContain(JwtAuthGuard);
    });

    it('GET /orders/:id requires JwtAuthGuard (la restricción de ownership vive en el servicio)', () => {
      const guards = reflector.get<unknown[]>(
        GUARDS_METADATA,
        OrdersController.prototype.findById,
      );
      expect(guards).toContain(JwtAuthGuard);
    });
  });

  describe('delegation to OrdersService', () => {
    it('createOrder usa el sub del JWT como customerId, no un valor del body', async () => {
      const user: JwtPayload = {
        sub: 'user-1',
        email: 'cliente@example.com',
        role: 'customer',
      };
      const req = { user } as unknown as Request;
      const dto = {
        peopleCount: 5,
        scheduledFor: '2026-08-01T18:00:00.000Z',
        items: [{ menuItemId: 'item-1', quantity: 2 }],
      };
      ordersService.createOrder.mockResolvedValue({ id: 'order-1' });

      await controller.createOrder(dto, req);

      expect(ordersService.createOrder).toHaveBeenCalledWith('user-1', dto);
    });

    it('findById pasa userId y role del requester al servicio', async () => {
      const user: JwtPayload = {
        sub: 'user-1',
        email: 'staff@example.com',
        role: 'staff',
      };
      const req = { user } as unknown as Request;
      ordersService.findByIdForRequester.mockResolvedValue({ id: 'order-1' });

      await controller.findById('order-1', req);

      expect(ordersService.findByIdForRequester).toHaveBeenCalledWith(
        'order-1',
        { userId: 'user-1', role: 'staff' },
      );
    });
  });
});
