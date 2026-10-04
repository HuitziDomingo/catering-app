import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { OrderStatus, ReviewOrderAction } from '@catering-app/shared-types';
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
    update: jest.Mock;
    createQueryBuilder: jest.Mock;
    manager: { transaction: jest.Mock };
  };
  let queryBuilder: Record<string, jest.Mock>;
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

    // QueryBuilder encadenable: cada método devuelve el mismo objeto, y
    // getManyAndCount resuelve la página.
    queryBuilder = {};
    for (const method of [
      'where',
      'andWhere',
      'withDeleted',
      'leftJoinAndSelect',
      'orderBy',
      'addOrderBy',
      'skip',
      'take',
    ]) {
      queryBuilder[method] = jest.fn(() => queryBuilder);
    }
    queryBuilder.getManyAndCount = jest.fn().mockResolvedValue([[], 0]);

    ordersRepo = {
      findOne: jest.fn(),
      save: jest.fn((data) => Promise.resolve(data)),
      update: jest.fn().mockResolvedValue(undefined),
      createQueryBuilder: jest.fn(() => queryBuilder),
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

      await service.updateStatus(orderId, OrderStatus.PAYMENT_FAILED);

      expect(whatsAppService.sendMessage).toHaveBeenCalledWith(
        customerWithWhatsApp.whatsappNumber,
        expect.stringContaining('no pudimos procesar el pago'),
      );
    });

    it('no envía nada para estados que no son confirmed/payment_failed', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: orderId,
        customerId,
        status: OrderStatus.CONFIRMED,
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

  describe('findMine / findForStaff — listados paginados (ADR-027)', () => {
    it('findMine filtra siempre por el customerId recibido y ordena por createdAt desc', async () => {
      queryBuilder.getManyAndCount.mockResolvedValue([[{ id: orderId }], 1]);

      const page = await service.findMine(customerId, { page: 2, pageSize: 5 });

      expect(page).toEqual({ items: [{ id: orderId }], total: 1, page: 2, pageSize: 5 });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('order.customerId = :customerId', {
        customerId,
      });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('order.createdAt', 'DESC');
      expect(queryBuilder.skip).toHaveBeenCalledWith(5);
      expect(queryBuilder.take).toHaveBeenCalledWith(5);
    });

    it('findForStaff no filtra por cliente y aplica defaults (página 1 de 20, createdAt desc)', async () => {
      const page = await service.findForStaff({});

      expect(page).toEqual({ items: [], total: 0, page: 1, pageSize: 20 });
      expect(queryBuilder.andWhere).not.toHaveBeenCalled();
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('order.createdAt', 'DESC');
      expect(queryBuilder.skip).toHaveBeenCalledWith(0);
    });

    it('findForStaff aplica rango de fecha del evento, status, needsReview, createdSince y orden', async () => {
      await service.findForStaff({
        from: '2026-10-01T00:00:00.000Z',
        to: '2026-10-31T23:59:59.999Z',
        status: [OrderStatus.PENDING, OrderStatus.CONFIRMED],
        needsReview: true,
        createdSince: '2026-10-03T08:00:00.000Z',
        sort: 'scheduledFor',
        direction: 'asc',
      });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('order.status IN (:...statuses)', {
        statuses: [OrderStatus.PENDING, OrderStatus.CONFIRMED],
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('order.scheduledFor >= :from', {
        from: '2026-10-01T00:00:00.000Z',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('order.scheduledFor <= :to', {
        to: '2026-10-31T23:59:59.999Z',
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('order.needsReview = :needsReview', {
        needsReview: true,
      });
      expect(queryBuilder.andWhere).toHaveBeenCalledWith('order.createdAt > :createdSince', {
        createdSince: '2026-10-03T08:00:00.000Z',
      });
      expect(queryBuilder.orderBy).toHaveBeenCalledWith('order.scheduledFor', 'ASC');
      expect(queryBuilder.addOrderBy).toHaveBeenCalledWith('order.id', 'ASC');
    });

    it('needsReview = false también filtra (no se confunde con "sin filtro")', async () => {
      await service.findForStaff({ needsReview: false });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('order.needsReview = :needsReview', {
        needsReview: false,
      });
    });
  });

  describe('updateStatus — tabla de transiciones (ADR-027)', () => {
    const orderIn = (status: OrderStatus) =>
      ({
        id: orderId,
        customerId,
        status,
        scheduledFor: new Date('2026-08-01T18:00:00.000Z'),
      }) as unknown as Order;

    it.each([
      [OrderStatus.PENDING, OrderStatus.CONFIRMED],
      [OrderStatus.CONFIRMED, OrderStatus.PREPARING],
      [OrderStatus.PREPARING, OrderStatus.DELIVERED],
      [OrderStatus.PAYMENT_FAILED, OrderStatus.PENDING],
      [OrderStatus.PAYMENT_FAILED, OrderStatus.CONFIRMED],
      [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    ])('permite %s → %s', async (from, to) => {
      ordersRepo.findOne.mockResolvedValue(orderIn(from));

      const saved = await service.updateStatus(orderId, to);

      expect(saved.status).toBe(to);
      expect(ordersRepo.save).toHaveBeenCalled();
    });

    it.each([
      [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
      [OrderStatus.CANCELLED, OrderStatus.CONFIRMED],
      [OrderStatus.PENDING, OrderStatus.PREPARING],
      [OrderStatus.PENDING, OrderStatus.DELIVERED],
      [OrderStatus.CONFIRMED, OrderStatus.PENDING],
    ])('rechaza %s → %s con ConflictException sin guardar', async (from, to) => {
      ordersRepo.findOne.mockResolvedValue(orderIn(from));

      await expect(service.updateStatus(orderId, to)).rejects.toThrow(ConflictException);
      expect(ordersRepo.save).not.toHaveBeenCalled();
    });

    it('pasar al mismo status es un no-op: no guarda ni reenvía el WhatsApp (webhooks duplicados)', async () => {
      ordersRepo.findOne.mockResolvedValue(orderIn(OrderStatus.CONFIRMED));

      await service.updateStatus(orderId, OrderStatus.CONFIRMED);

      expect(ordersRepo.save).not.toHaveBeenCalled();
      expect(whatsAppService.sendMessage).not.toHaveBeenCalled();
    });

    it('lanza NotFoundException si el pedido no existe', async () => {
      ordersRepo.findOne.mockResolvedValue(null);

      await expect(service.updateStatus(orderId, OrderStatus.CONFIRMED)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('recordPaymentResult — detalle del pago del webhook (ADR-024, ADR-027)', () => {
    const payment = {
      paymentId: '123456789',
      paymentMethod: 'visa',
      paidAt: new Date('2026-10-03T21:30:00.000Z'),
    };

    it('guarda payment_id, método y fecha, y confirma el pedido pending', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: orderId,
        customerId,
        status: OrderStatus.PENDING,
        scheduledFor: new Date('2026-08-01T18:00:00.000Z'),
      });

      await service.recordPaymentResult(orderId, OrderStatus.CONFIRMED, payment);

      expect(ordersRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentId: '123456789',
          paymentMethod: 'visa',
          paidAt: payment.paidAt,
        }),
      );
      expect(ordersRepo.save).toHaveBeenLastCalledWith(
        expect.objectContaining({ status: OrderStatus.CONFIRMED }),
      );
    });

    it('con una transición inválida (pago aprobado sobre un pedido cancelado) guarda el pago pero no mueve el status ni lanza', async () => {
      ordersRepo.findOne.mockResolvedValue({
        id: orderId,
        customerId,
        status: OrderStatus.CANCELLED,
      });

      await expect(
        service.recordPaymentResult(orderId, OrderStatus.CONFIRMED, payment),
      ).resolves.toBeUndefined();

      expect(ordersRepo.save).toHaveBeenCalledTimes(1);
      expect(ordersRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELLED, paymentId: '123456789' }),
      );
      expect(whatsAppService.sendMessage).not.toHaveBeenCalled();
    });

    it('un pago rechazado no pisa un paidAt previo', async () => {
      const previousPaidAt = new Date('2026-10-01T10:00:00.000Z');
      ordersRepo.findOne.mockResolvedValue({
        id: orderId,
        customerId,
        status: OrderStatus.PENDING,
        paidAt: previousPaidAt,
        scheduledFor: new Date('2026-08-01T18:00:00.000Z'),
      });

      await service.recordPaymentResult(orderId, OrderStatus.PAYMENT_FAILED, {
        paymentId: '987',
        paymentMethod: 'master',
        paidAt: null,
      });

      expect(ordersRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ paymentId: '987', paidAt: previousPaidAt }),
      );
    });

    it('descarta (sin lanzar) si el pedido no existe', async () => {
      ordersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.recordPaymentResult(orderId, OrderStatus.CONFIRMED, payment),
      ).resolves.toBeUndefined();
      expect(ordersRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('reviewOrder — pedidos fuera de rango (ADR-021, ADR-027)', () => {
    const reviewableOrder = (overrides: Partial<Order> = {}) =>
      ({
        id: orderId,
        customerId,
        status: OrderStatus.PENDING,
        peopleCount: 1000,
        notes: null,
        needsReview: true,
        scheduledFor: new Date('2026-08-01T18:00:00.000Z'),
        items: [{ menuItem: { servesMin: 300, servesMax: 500 } }],
        ...overrides,
      }) as unknown as Order;

    it('approve baja la marca sin tocar el resto', async () => {
      ordersRepo.findOne.mockResolvedValue(reviewableOrder());

      await service.reviewOrder(orderId, { action: ReviewOrderAction.APPROVE });

      expect(ordersRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ needsReview: false, peopleCount: 1000, status: OrderStatus.PENDING }),
      );
    });

    it('reject baja la marca y cancela vía la tabla de transiciones', async () => {
      ordersRepo.findOne.mockResolvedValue(reviewableOrder());

      await service.reviewOrder(orderId, { action: ReviewOrderAction.REJECT });

      expect(ordersRepo.update).toHaveBeenCalledWith(orderId, { needsReview: false });
      expect(ordersRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: OrderStatus.CANCELLED }),
      );
    });

    it('adjust dentro del rango de algún platillo baja la marca', async () => {
      ordersRepo.findOne.mockResolvedValue(reviewableOrder());

      await service.reviewOrder(orderId, {
        action: ReviewOrderAction.ADJUST,
        peopleCount: 400,
        notes: 'Se ajustó con el cliente por teléfono',
      });

      expect(ordersRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({
          peopleCount: 400,
          notes: 'Se ajustó con el cliente por teléfono',
          needsReview: false,
        }),
      );
    });

    it('adjust que sigue fuera de rango deja la marca puesta', async () => {
      ordersRepo.findOne.mockResolvedValue(reviewableOrder());

      await service.reviewOrder(orderId, { action: ReviewOrderAction.ADJUST, peopleCount: 800 });

      expect(ordersRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ peopleCount: 800, needsReview: true }),
      );
    });

    it('adjust sin peopleCount ni notes es BadRequest', async () => {
      ordersRepo.findOne.mockResolvedValue(reviewableOrder());

      await expect(
        service.reviewOrder(orderId, { action: ReviewOrderAction.ADJUST }),
      ).rejects.toThrow(BadRequestException);
    });

    it('peopleCount con approve/reject es BadRequest (solo se acepta con adjust)', async () => {
      ordersRepo.findOne.mockResolvedValue(reviewableOrder());

      await expect(
        service.reviewOrder(orderId, { action: ReviewOrderAction.APPROVE, peopleCount: 400 }),
      ).rejects.toThrow(BadRequestException);
      expect(ordersRepo.save).not.toHaveBeenCalled();
    });

    it('rechaza con ConflictException un pedido que no está marcado para revisión', async () => {
      ordersRepo.findOne.mockResolvedValue(reviewableOrder({ needsReview: false }));

      await expect(
        service.reviewOrder(orderId, { action: ReviewOrderAction.APPROVE }),
      ).rejects.toThrow(ConflictException);
    });

    it.each([OrderStatus.DELIVERED, OrderStatus.CANCELLED])(
      'rechaza con ConflictException un pedido en estado final (%s)',
      async (status) => {
        ordersRepo.findOne.mockResolvedValue(reviewableOrder({ status }));

        await expect(
          service.reviewOrder(orderId, { action: ReviewOrderAction.APPROVE }),
        ).rejects.toThrow(ConflictException);
      },
    );

    it('lanza NotFoundException si el pedido no existe', async () => {
      ordersRepo.findOne.mockResolvedValue(null);

      await expect(
        service.reviewOrder(orderId, { action: ReviewOrderAction.APPROVE }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
