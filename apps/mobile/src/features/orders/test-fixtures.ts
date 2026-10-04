import { OrderStatus, type OrderDetail } from '@catering-app/shared-types';

/** Pedido de ejemplo para tests de pantallas de orders/payments. */
export function buildOrder(overrides: Partial<OrderDetail> = {}): OrderDetail {
  return {
    id: 'order-1',
    customerId: 'user-1',
    status: OrderStatus.PENDING,
    peopleCount: 400,
    scheduledFor: '2030-05-10T15:00:00.000Z',
    subtotal: 3000,
    total: 3000,
    notes: null,
    needsReview: false,
    paymentPreferenceId: null,
    paymentId: null,
    paymentMethod: null,
    paidAt: null,
    customer: null,
    items: [
      {
        id: 1,
        orderId: 'order-1',
        menuItemId: 'item-a',
        menuItemName: 'Chilaquiles',
        quantity: 2,
        unitPrice: 1500,
        subtotal: 3000,
      },
    ],
    createdAt: '2026-10-03T20:00:00.000Z',
    updatedAt: '2026-10-03T20:00:00.000Z',
    ...overrides,
  };
}
