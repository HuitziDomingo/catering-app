import { OrderStatus, type OrderDetail } from '@catering-app/shared-types';

/** Pedido de ejemplo para los specs del feature de pedidos (solo tests). */
export const sampleOrder: OrderDetail = {
  id: 'order-1',
  customerId: 'customer-1',
  status: OrderStatus.PENDING,
  peopleCount: 10,
  scheduledFor: '2026-10-20T18:00:00.000Z',
  subtotal: 950,
  total: 950,
  notes: null,
  needsReview: false,
  paymentPreferenceId: null,
  paymentId: null,
  paymentMethod: null,
  paidAt: null,
  createdAt: '2026-10-05T12:00:00.000Z',
  updatedAt: '2026-10-05T12:00:00.000Z',
  customer: {
    id: 'customer-1',
    fullName: 'Ana López',
    email: 'ana@example.com',
    phone: null,
    whatsappNumber: null,
  },
  items: [
    {
      id: 1,
      orderId: 'order-1',
      menuItemId: 'item-1',
      menuItemName: 'Chilaquiles',
      menuItemImageUrl: null,
      quantity: 10,
      unitPrice: 95,
      subtotal: 950,
    },
  ],
};
