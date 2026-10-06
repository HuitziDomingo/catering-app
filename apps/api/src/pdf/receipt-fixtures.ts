import { OrderStatus } from '@catering-app/shared-types';
import type { Order } from '../database/entities/order.entity';
import type { BusinessInfo } from './receipt-content';

/** Pedido pagado con Mercado Pago, con líneas y cliente cargados (como findDetailById). */
export function paidOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: '3f2a9b1c-0000-4000-8000-000000000001',
    customerId: 'customer-1',
    status: OrderStatus.CONFIRMED,
    peopleCount: 25,
    scheduledFor: new Date('2026-11-20T00:00:00.000Z'),
    // numeric de Postgres llega como string por el driver pg.
    subtotal: '3700.00',
    total: '3700.00',
    notes: null,
    needsReview: false,
    paymentPreferenceId: 'pref-1',
    paymentId: '1234567890',
    paymentMethod: 'visa',
    paidAt: new Date('2026-10-06T17:45:00.000Z'),
    createdAt: new Date('2026-10-06T17:30:00.000Z'),
    updatedAt: new Date('2026-10-06T17:45:00.000Z'),
    customer: {
      id: 'customer-1',
      fullName: 'Ana Pérez Núñez',
      email: 'ana@example.com',
      phone: '5512345678',
    },
    items: [
      {
        id: 1,
        quantity: 2,
        unitPrice: '1250.00',
        subtotal: '2500.00',
        menuItem: { name: 'Chilaquiles rojos con pollo' },
      },
      {
        id: 2,
        quantity: 1,
        unitPrice: '1200.00',
        subtotal: '1200.00',
        menuItem: { name: 'Café de olla (garrafa)' },
      },
    ],
    ...overrides,
  } as unknown as Order;
}

export const business: BusinessInfo = {
  name: 'Santo Sazón',
  address: 'Av. Siempre Viva 123, Col. Centro, CDMX',
  phone: '55 1234 5678',
  email: 'pedidos@santosazon.mx',
  rfc: null,
  timeZone: 'America/Mexico_City',
};
