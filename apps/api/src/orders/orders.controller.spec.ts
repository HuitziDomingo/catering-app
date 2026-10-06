import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ReviewOrderAction, OrderStatus } from '@catering-app/shared-types';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { StorageService } from '../storage/storage.service';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';

describe('OrdersController', () => {
  let controller: OrdersController;
  let ordersService: {
    createOrder: jest.Mock;
    findByIdForRequester: jest.Mock;
    findForStaff: jest.Mock;
    findMine: jest.Mock;
    findDetailById: jest.Mock;
    updateStatus: jest.Mock;
    reviewOrder: jest.Mock;
  };

  const reflector = new Reflector();

  beforeEach(async () => {
    ordersService = {
      createOrder: jest.fn(),
      findByIdForRequester: jest.fn(),
      findForStaff: jest.fn(),
      findMine: jest.fn(),
      findDetailById: jest.fn(),
      updateStatus: jest.fn(),
      reviewOrder: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        { provide: OrdersService, useValue: ordersService },
        { provide: StorageService, useValue: { getPublicUrl: jest.fn() } },
      ],
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

    it.each(['findForStaff', 'updateStatus', 'review'] as const)(
      '%s requiere JwtAuthGuard + RolesGuard con roles staff/admin/superadmin',
      (handler) => {
        const method = OrdersController.prototype[handler];
        expect(reflector.get<unknown[]>(GUARDS_METADATA, method)).toEqual([
          JwtAuthGuard,
          RolesGuard,
        ]);
        expect(reflector.get<string[]>(ROLES_KEY, method)).toEqual([
          'staff',
          'admin',
          'superadmin',
        ]);
      },
    );

    it('GET /orders/mine requiere solo JwtAuthGuard (cualquier usuario, sus propios pedidos)', () => {
      const method = OrdersController.prototype.findMine;
      expect(reflector.get<unknown[]>(GUARDS_METADATA, method)).toEqual([JwtAuthGuard]);
      expect(reflector.get<string[]>(ROLES_KEY, method)).toBeUndefined();
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

    it('findMine usa el sub del JWT y mapea cada pedido de la página', async () => {
      const req = { user: { sub: 'user-1', email: 'c@example.com', role: 'customer' } } as unknown as Request;
      ordersService.findMine.mockResolvedValue({
        items: [{ id: 'order-1', total: '100.00', subtotal: '100.00' }],
        total: 1,
        page: 1,
        pageSize: 20,
      });

      const page = await controller.findMine({ page: 1 }, req);

      expect(ordersService.findMine).toHaveBeenCalledWith('user-1', { page: 1 });
      expect(page.total).toBe(1);
      expect(page.items[0].total).toBe(100);
    });

    it('findForStaff pasa la query al servicio y mapea la página', async () => {
      ordersService.findForStaff.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });
      const query = { needsReview: true, sort: 'scheduledFor' as const };

      await expect(controller.findForStaff(query)).resolves.toEqual({
        items: [],
        total: 0,
        page: 1,
        pageSize: 20,
      });
      expect(ordersService.findForStaff).toHaveBeenCalledWith(query);
    });

    it('updateStatus cambia el status y devuelve el detalle recargado', async () => {
      ordersService.findDetailById.mockResolvedValue({ id: 'order-1', status: 'preparing' });

      const result = await controller.updateStatus('order-1', { status: OrderStatus.PREPARING });

      expect(ordersService.updateStatus).toHaveBeenCalledWith('order-1', OrderStatus.PREPARING);
      expect(result.status).toBe('preparing');
    });

    it('review delega en reviewOrder', async () => {
      ordersService.reviewOrder.mockResolvedValue({ id: 'order-1', needsReview: false });
      const dto = { action: ReviewOrderAction.APPROVE };

      const result = await controller.review('order-1', dto);

      expect(ordersService.reviewOrder).toHaveBeenCalledWith('order-1', dto);
      expect(result.needsReview).toBe(false);
    });
  });
});
