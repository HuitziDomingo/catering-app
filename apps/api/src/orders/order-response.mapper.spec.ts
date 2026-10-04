import { Order } from '../database/entities/order.entity';
import { toOrderResponse } from './order-response.mapper';

describe('toOrderResponse', () => {
  const baseOrder = {
    id: 'order-1',
    customerId: 'customer-1',
    status: 'confirmed',
    peopleCount: 400,
    scheduledFor: new Date('2026-10-10T15:00:00.000Z'),
    // numeric de Postgres llega como string por el driver pg.
    subtotal: '1250.50',
    total: '1250.50',
    notes: null,
    needsReview: false,
    paymentPreferenceId: 'pref-1',
    paymentId: '123',
    paymentMethod: 'visa',
    paidAt: new Date('2026-10-03T21:30:00.000Z'),
    createdAt: new Date('2026-10-03T20:00:00.000Z'),
    updatedAt: new Date('2026-10-03T21:30:00.000Z'),
    customer: {
      id: 'customer-1',
      fullName: 'Ana Pérez',
      email: 'ana@example.com',
      phone: null,
      whatsappNumber: '+5215512345678',
      passwordHash: '$argon2id$secreto',
      roleId: 1,
    },
    items: [
      {
        id: '7',
        orderId: 'order-1',
        menuItemId: 'item-1',
        quantity: 2,
        unitPrice: '625.25',
        subtotal: '1250.50',
        menuItem: { id: 'item-1', name: 'Chilaquiles', basePrice: '700.00' },
      },
    ],
  } as unknown as Order;

  it('convierte los numeric (string del driver pg) a number, también en las líneas', () => {
    const dto = toOrderResponse(baseOrder);

    expect(dto.subtotal).toBe(1250.5);
    expect(dto.total).toBe(1250.5);
    expect(dto.items[0]).toEqual({
      id: 7,
      orderId: 'order-1',
      menuItemId: 'item-1',
      menuItemName: 'Chilaquiles',
      quantity: 2,
      unitPrice: 625.25,
      subtotal: 1250.5,
    });
  });

  it('el unitPrice es el snapshot de la línea, no el basePrice vigente del platillo', () => {
    expect(toOrderResponse(baseOrder).items[0].unitPrice).toBe(625.25);
  });

  it('solo expone el resumen del cliente: nunca passwordHash ni roleId', () => {
    const dto = toOrderResponse(baseOrder);

    expect(dto.customer).toEqual({
      id: 'customer-1',
      fullName: 'Ana Pérez',
      email: 'ana@example.com',
      phone: null,
      whatsappNumber: '+5215512345678',
    });
    expect(JSON.stringify(dto)).not.toContain('argon2');
  });

  it('incluye el detalle del pago', () => {
    const dto = toOrderResponse(baseOrder);

    expect(dto.paymentId).toBe('123');
    expect(dto.paymentMethod).toBe('visa');
    expect(dto.paidAt).toEqual(new Date('2026-10-03T21:30:00.000Z'));
  });

  it('sin relaciones cargadas devuelve customer null, items [] y campos de pago null', () => {
    const dto = toOrderResponse({
      ...baseOrder,
      customer: undefined,
      items: undefined,
      paymentPreferenceId: undefined,
      paymentId: undefined,
      paymentMethod: undefined,
      paidAt: undefined,
    } as unknown as Order);

    expect(dto.customer).toBeNull();
    expect(dto.items).toEqual([]);
    expect(dto.paymentPreferenceId).toBeNull();
    expect(dto.paymentId).toBeNull();
    expect(dto.paidAt).toBeNull();
  });
});
