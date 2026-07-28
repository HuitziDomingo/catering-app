import { OrderStatus } from '@catering-app/shared-types';
import { formatOrdersReply } from './formatOrdersReply';

test('returns a not-found message when count is 0', () => {
  expect(formatOrdersReply({ success: true, data: [], count: 0 })).toBe(
    'No encontré pedidos registrados a tu nombre.',
  );
});

test('formats one or more orders as a numbered list', () => {
  const result = formatOrdersReply({
    success: true,
    count: 2,
    data: [
      {
        id: 'order-1',
        status: OrderStatus.PENDING,
        peopleCount: 300,
        scheduledFor: '2026-08-01T12:00:00.000Z',
        subtotal: 4000,
        total: 4200,
        notes: null,
        createdAt: '2026-07-20T10:00:00.000Z',
      },
      {
        id: 'order-2',
        status: OrderStatus.DELIVERED,
        peopleCount: 1,
        scheduledFor: '2026-06-01T12:00:00.000Z',
        subtotal: 100,
        total: 110,
        notes: null,
        createdAt: '2026-05-20T10:00:00.000Z',
      },
    ],
  });

  expect(result).toContain('Aquí están tus pedidos recientes:');
  expect(result).toContain('1. Pendiente');
  expect(result).toContain('300 personas');
  expect(result).toContain('2. Entregado');
});
