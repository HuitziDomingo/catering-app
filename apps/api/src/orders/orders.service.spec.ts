import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus } from '@catering-app/shared-types';
import { MenuItem } from '../database/entities/menu-item.entity';
import { Order } from '../database/entities/order.entity';
import { User } from '../database/entities/user.entity';
import { NotificationGateway } from '../notifications/notification.gateway';
import { WhatsAppService } from '../notifications/whatsapp/whatsapp.service';
import { OrdersService } from './orders.service';

describe('OrdersService', () => {
  let service: OrdersService;
  let ordersRepo: {
    findOne: jest.Mock;
    save: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let usersRepo: { findOne: jest.Mock };
  let manager: {
    find: jest.Mock;
    create: jest.Mock;
    save: jest.Mock;
  };
  let notificationGateway: { emitNewOrder: jest.Mock };
  let whatsAppService: { sendMessage: jest.Mock };
  let config: { get: jest.Mock };

  const customerId = '11111111-1111-1111-1111-111111111111';
  const otherCustomerId = '99999999-9999-9999-9999-999999999999';
  const menuItemId = '22222222-2222-2222-2222-222222222222';
  const missingMenuItemId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const orderId = '33333333-3333-3333-3333-333333333333';
  const businessNumber = 'whatsapp:+14155238886';

  const customerWithWhatsApp = {
    id: customerId,
    fullName: 'Ana Pérez',
    whatsappNumber: '+5215512345678',
  };

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
      save: jest.fn((data) => Promise.resolve(data)),
      manager: {
        transaction: jest.fn((cb) => cb(manager)),
      },
    };

    usersRepo = { findOne: jest.fn().mockResolvedValue(customerWithWhatsApp) };
    notificationGateway = { emitNewOrder: jest.fn() };
    whatsAppService = { sendMessage: jest.fn().mockResolvedValue(undefined) };
    config = {
      get: jest.fn((key: string) =>
        key === 'BUSINESS_WHATSAPP_NUMBER' ? businessNumber : undefined,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: getRepositoryToken(Order), useValue: ordersRepo },
        { provide: getRepositoryToken(User), useValue: usersRepo },
        { provide: NotificationGateway, useValue: notificationGateway },
        { provide: WhatsAppService, useValue: whatsAppService },
        { provide: ConfigService, useValue: config },
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

  describe('createOrder — notificación en vivo (ADR-004)', () => {
    it('emite "new-order" con el resumen del pedido tras confirmar la transacción', async () => {
      manager.find.mockResolvedValue([
        {
          id: menuItemId,
          basePrice: '100.00',
          isActive: true,
          servesMin: 1,
          servesMax: 10,
        } as unknown as MenuItem,
      ]);

      const order = await service.createOrder(customerId, {
        peopleCount: 5,
        scheduledFor: '2026-08-01T18:00:00.000Z',
        items: [{ menuItemId, quantity: 2 }],
      });

      expect(notificationGateway.emitNewOrder).toHaveBeenCalledTimes(1);
      expect(notificationGateway.emitNewOrder).toHaveBeenCalledWith({
        id: order.id,
        customerId,
        total: 200,
        peopleCount: 5,
        scheduledFor: '2026-08-01T18:00:00.000Z',
        needsReview: false,
      });
    });

    it('no emite nada si la transacción falla (rollback)', async () => {
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

      expect(notificationGateway.emitNewOrder).not.toHaveBeenCalled();
    });
  });

  describe('createOrder — notificaciones de WhatsApp (ADR-026)', () => {
    const menuItem = {
      id: menuItemId,
      name: 'Tacos al pastor',
      basePrice: '100.00',
      isActive: true,
      servesMin: 1,
      servesMax: 10,
    } as unknown as MenuItem;

    it('envía un mensaje al negocio y una confirmación al cliente', async () => {
      manager.find.mockResolvedValue([menuItem]);

      const order = await service.createOrder(customerId, {
        peopleCount: 5,
        scheduledFor: '2026-08-01T18:00:00.000Z',
        items: [{ menuItemId, quantity: 2 }],
      });

      expect(whatsAppService.sendMessage).toHaveBeenCalledTimes(2);
      expect(whatsAppService.sendMessage).toHaveBeenNthCalledWith(
        1,
        businessNumber,
        expect.stringContaining('2x Tacos al pastor'),
      );
      expect(whatsAppService.sendMessage).toHaveBeenNthCalledWith(
        2,
        customerWithWhatsApp.whatsappNumber,
        expect.stringContaining('2x Tacos al pastor'),
      );
      expect(usersRepo.findOne).toHaveBeenCalledWith({
        where: { id: order.customerId },
      });
    });

    it('incluye la nota de needsReview en el mensaje al negocio cuando aplica', async () => {
      manager.find.mockResolvedValue([
        { ...menuItem, servesMin: 300, servesMax: 500 },
      ]);

      await service.createOrder(customerId, {
        peopleCount: 5,
        scheduledFor: '2026-08-01T18:00:00.000Z',
        items: [{ menuItemId, quantity: 1 }],
      });

      expect(whatsAppService.sendMessage).toHaveBeenNthCalledWith(
        1,
        businessNumber,
        expect.stringContaining('Requiere revisión manual'),
      );
    });

    it('omite (sin lanzar) la confirmación al cliente si no tiene whatsappNumber registrado', async () => {
      manager.find.mockResolvedValue([menuItem]);
      usersRepo.findOne.mockResolvedValueOnce({ ...customerWithWhatsApp, whatsappNumber: null });

      await expect(
        service.createOrder(customerId, {
          peopleCount: 5,
          scheduledFor: '2026-08-01T18:00:00.000Z',
          items: [{ menuItemId, quantity: 1 }],
        }),
      ).resolves.toBeDefined();

      // Solo el mensaje al negocio -- el del cliente se omitió.
      expect(whatsAppService.sendMessage).toHaveBeenCalledTimes(1);
      expect(whatsAppService.sendMessage).toHaveBeenCalledWith(
        businessNumber,
        expect.any(String),
      );
    });

    it('no bloquea ni falla la creación del pedido si Twilio rechaza el envío', async () => {
      manager.find.mockResolvedValue([menuItem]);
      whatsAppService.sendMessage.mockRejectedValue(new Error('Twilio down'));

      const order = await service.createOrder(customerId, {
        peopleCount: 5,
        scheduledFor: '2026-08-01T18:00:00.000Z',
        items: [{ menuItemId, quantity: 1 }],
      });

      expect(order.id).toBe(orderId);
      // Igual se intentaron ambos envíos, cada uno atrapando su propio error.
      expect(whatsAppService.sendMessage).toHaveBeenCalledTimes(2);
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

  describe('createOrder — needsReview (peopleCount fuera de serves_min/serves_max, ADR-023)', () => {
    it('needsReview = false cuando peopleCount cae dentro del rango de al menos un platillo pedido', async () => {
      manager.find.mockResolvedValue([
        {
          id: menuItemId,
          basePrice: '100.00',
          isActive: true,
          servesMin: 300,
          servesMax: 500,
        } as unknown as MenuItem,
      ]);

      const order = await service.createOrder(customerId, {
        peopleCount: 400,
        scheduledFor: '2026-08-01T18:00:00.000Z',
        items: [{ menuItemId, quantity: 2 }],
      });

      expect(order.needsReview).toBe(false);
    });

    it('needsReview = true cuando peopleCount cae fuera del rango de todos los platillos pedidos, y el pedido igual se crea', async () => {
      manager.find.mockResolvedValue([
        {
          id: menuItemId,
          basePrice: '100.00',
          isActive: true,
          servesMin: 10,
          servesMax: 50,
        } as unknown as MenuItem,
      ]);

      const order = await service.createOrder(customerId, {
        peopleCount: 400,
        scheduledFor: '2026-08-01T18:00:00.000Z',
        items: [{ menuItemId, quantity: 2 }],
      });

      expect(order.needsReview).toBe(true);
      expect(manager.save).toHaveBeenCalled();
    });

    it('needsReview = false cuando peopleCount está en el borde exacto del rango (inclusive)', async () => {
      manager.find.mockResolvedValue([
        {
          id: menuItemId,
          basePrice: '100.00',
          isActive: true,
          servesMin: 300,
          servesMax: 500,
        } as unknown as MenuItem,
      ]);

      const order = await service.createOrder(customerId, {
        peopleCount: 500,
        scheduledFor: '2026-08-01T18:00:00.000Z',
        items: [{ menuItemId, quantity: 2 }],
      });

      expect(order.needsReview).toBe(false);
    });

    it('needsReview = false si peopleCount cae dentro del rango de al menos uno de varios platillos pedidos', async () => {
      const secondMenuItemId = '44444444-4444-4444-4444-444444444444';
      manager.find.mockResolvedValue([
        {
          id: menuItemId,
          basePrice: '100.00',
          isActive: true,
          servesMin: 10,
          servesMax: 50,
        } as unknown as MenuItem,
        {
          id: secondMenuItemId,
          basePrice: '80.00',
          isActive: true,
          servesMin: 300,
          servesMax: 500,
        } as unknown as MenuItem,
      ]);

      const order = await service.createOrder(customerId, {
        peopleCount: 400,
        scheduledFor: '2026-08-01T18:00:00.000Z',
        items: [
          { menuItemId, quantity: 1 },
          { menuItemId: secondMenuItemId, quantity: 1 },
        ],
      });

      expect(order.needsReview).toBe(false);
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

  describe('updateStatus — aviso de WhatsApp en confirmed/payment_failed (ADR-026, hook para Mercado Pago)', () => {
    it('avisa al cliente por WhatsApp cuando el pedido pasa a confirmed', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: orderId,
        customerId,
        status: OrderStatus.PENDING,
        scheduledFor: new Date('2026-08-01T18:00:00.000Z'),
      } as unknown as Order);

      await service.updateStatus(orderId, OrderStatus.CONFIRMED);

      expect(whatsAppService.sendMessage).toHaveBeenCalledWith(
        customerWithWhatsApp.whatsappNumber,
        expect.stringContaining('confirmado'),
      );
    });

    it('avisa al cliente por WhatsApp cuando el pedido pasa a payment_failed', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: orderId,
        customerId,
        status: OrderStatus.PENDING,
        scheduledFor: new Date('2026-08-01T18:00:00.000Z'),
      } as unknown as Order);

      await service.updateStatus(orderId, 'payment_failed' as OrderStatus);

      expect(whatsAppService.sendMessage).toHaveBeenCalledWith(
        customerWithWhatsApp.whatsappNumber,
        expect.stringContaining('no pudimos procesar el pago'),
      );
    });

    it('no envía nada para estados que no son confirmed/payment_failed', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: orderId,
        customerId,
        status: OrderStatus.PENDING,
        scheduledFor: new Date('2026-08-01T18:00:00.000Z'),
      } as unknown as Order);

      await service.updateStatus(orderId, OrderStatus.PREPARING);

      expect(whatsAppService.sendMessage).not.toHaveBeenCalled();
    });

    it('omite (sin lanzar) el aviso si el cliente no tiene whatsappNumber registrado', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: orderId,
        customerId,
        status: OrderStatus.PENDING,
        scheduledFor: new Date('2026-08-01T18:00:00.000Z'),
      } as unknown as Order);
      usersRepo.findOne.mockResolvedValueOnce({ ...customerWithWhatsApp, whatsappNumber: null });

      await expect(
        service.updateStatus(orderId, OrderStatus.CONFIRMED),
      ).resolves.toBeDefined();

      expect(whatsAppService.sendMessage).not.toHaveBeenCalled();
    });

    it('no lanza si Twilio rechaza el envío del aviso de cambio de estado', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: orderId,
        customerId,
        status: OrderStatus.PENDING,
        scheduledFor: new Date('2026-08-01T18:00:00.000Z'),
      } as unknown as Order);
      whatsAppService.sendMessage.mockRejectedValue(new Error('Twilio down'));

      await expect(
        service.updateStatus(orderId, OrderStatus.CONFIRMED),
      ).resolves.toBeDefined();
    });
  });
});
