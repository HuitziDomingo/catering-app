import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { MenuItem } from '../database/entities/menu-item.entity';
import { Order } from '../database/entities/order.entity';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepo: {
    findOne: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let manager: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };

  const customerId = '11111111-1111-1111-1111-111111111111';
  const otherCustomerId = '99999999-9999-9999-9999-999999999999';
  const menuItemId = '22222222-2222-2222-2222-222222222222';
  const missingMenuItemId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const orderId = '33333333-3333-3333-3333-333333333333';

  beforeEach(async () => {
    manager = {
      find: jest.fn(),
      create: jest.fn((_entity, data) => data),
      save: jest.fn((data) =>
        Promise.resolve(Array.isArray(data) ? data : { id: orderId, ...data }),
      ),
    };

    ordersRepo = {
      findOne: jest.fn(),
      manager: {
        transaction: jest.fn((cb) => cb(manager)),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: ordersRepo },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createOrder — price snapshotting', () => {
    it('stores unitPrice as a snapshot of basePrice at creation time; a later price change never alters the stored order', async () => {
      // El driver pg devuelve numeric como string (mismo patrón que MenuService).
      manager.find.mockResolvedValue([
        { id: menuItemId, basePrice: '100.00', isActive: true } as unknown as MenuItem,
      ]);

      const firstOrder = await service.createOrder(customerId, {
        peopleCount: 5,
        scheduledFor: '2026-08-01T18:00:00.000Z',
        items: [{ menuItemId, quantity: 2 }],
      });

      expect(firstOrder.items[0].unitPrice).toBe(100);
      expect(firstOrder.subtotal).toBe(200);
      expect(firstOrder.total).toBe(200);

      // El platillo sube de precio después de creado el pedido...
      manager.find.mockResolvedValue([
        { id: menuItemId, basePrice: '150.00', isActive: true } as unknown as MenuItem,
      ]);

      const secondOrder = await service.createOrder(customerId, {
        peopleCount: 3,
        scheduledFor: '2026-08-01T18:00:00.000Z',
        items: [{ menuItemId, quantity: 1 }],
      });

      // ...el nuevo pedido usa el precio vigente...
      expect(secondOrder.items[0].unitPrice).toBe(150);
      // ...pero el pedido ya creado nunca se modifica (no es una referencia viva).
      expect(firstOrder.items[0].unitPrice).toBe(100);
      expect(firstOrder.subtotal).toBe(200);
    });
  });

  describe('createOrder — transacción todo o nada', () => {
    it('no crea nada (rollback) cuando alguno de los menuItemId no existe', async () => {
      // Solo devuelve 1 de los 2 ids solicitados: simula un menuItemId inexistente.
      manager.find.mockResolvedValue([
        { id: menuItemId, basePrice: '100.00', isActive: true } as unknown as MenuItem,
      ]);

      await expect(
        service.createOrder(customerId, {
          peopleCount: 5,
          scheduledFor: '2026-08-01T18:00:00.000Z',
          items: [
            { menuItemId, quantity: 1 },
            { menuItemId: missingMenuItemId, quantity: 1 },
          ],
        }),
      ).rejects.toThrow(NotFoundException);

      expect(manager.save).not.toHaveBeenCalled();
    });

    it('no crea nada (rollback) cuando el platillo existe pero no está activo', async () => {
      manager.find.mockResolvedValue([
        { id: menuItemId, basePrice: '100.00', isActive: false } as unknown as MenuItem,
      ]);

      await expect(
        service.createOrder(customerId, {
          peopleCount: 5,
          scheduledFor: '2026-08-01T18:00:00.000Z',
          items: [{ menuItemId, quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);

      expect(manager.save).not.toHaveBeenCalled();
    });
  });

  describe('findByIdForRequester — ownership check', () => {
    it('permite al cliente dueño consultar su propio pedido', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: orderId,
        customerId,
        items: [],
      } as unknown as Order);

      const order = await service.findByIdForRequester(orderId, {
        userId: customerId,
        role: 'customer',
      });

      expect(order.id).toBe(orderId);
    });

    it('lanza ForbiddenException si otro cliente intenta consultarlo', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: orderId,
        customerId,
        items: [],
      } as unknown as Order);

      await expect(
        service.findByIdForRequester(orderId, {
          userId: otherCustomerId,
          role: 'customer',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it.each(['staff', 'admin', 'superadmin'])(
      'permite a %s consultar cualquier pedido',
      async (role) => {
        ordersRepo.findOne.mockResolvedValue({
          id: orderId,
          customerId,
          items: [],
        } as unknown as Order);

        const order = await service.findByIdForRequester(orderId, {
          userId: otherCustomerId,
          role,
        });

        expect(order.id).toBe(orderId);
      },
    );

    it('lanza NotFoundException cuando el pedido no existe', async () => {
      ordersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.findByIdForRequester(orderId, {
          userId: customerId,
          role: 'customer',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
