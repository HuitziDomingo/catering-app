import { OrderStatus } from '@catering-app/shared-types';
import { canReviewOrder, hasPaymentToRefund, staffNextStatuses } from './order-status';

describe('staffNextStatuses', () => {
  it('pending: the staff can confirm (cash/transfer) or cancel, never set payment_failed', () => {
    expect(staffNextStatuses(OrderStatus.PENDING)).toEqual([
      OrderStatus.CONFIRMED,
      OrderStatus.CANCELLED,
    ]);
  });

  it('follows the transitions table for the kitchen flow', () => {
    expect(staffNextStatuses(OrderStatus.CONFIRMED)).toEqual([
      OrderStatus.PREPARING,
      OrderStatus.CANCELLED,
    ]);
    expect(staffNextStatuses(OrderStatus.PREPARING)).toEqual([
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
    ]);
  });

  it('final statuses have no actions', () => {
    expect(staffNextStatuses(OrderStatus.DELIVERED)).toEqual([]);
    expect(staffNextStatuses(OrderStatus.CANCELLED)).toEqual([]);
  });
});

describe('canReviewOrder', () => {
  it('only needsReview orders in a non-final status', () => {
    expect(canReviewOrder({ needsReview: true, status: OrderStatus.PENDING })).toBe(true);
    expect(canReviewOrder({ needsReview: false, status: OrderStatus.PENDING })).toBe(false);
    expect(canReviewOrder({ needsReview: true, status: OrderStatus.CANCELLED })).toBe(false);
    expect(canReviewOrder({ needsReview: true, status: OrderStatus.DELIVERED })).toBe(false);
  });
});

describe('hasPaymentToRefund', () => {
  const paidAt = '2026-10-04T18:00:00.000Z';

  it('flags a cancelled order with an approved payment', () => {
    expect(hasPaymentToRefund({ status: OrderStatus.CANCELLED, paidAt })).toBe(true);
  });

  it('does not flag a cancelled order without payment, nor a paid active order', () => {
    expect(hasPaymentToRefund({ status: OrderStatus.CANCELLED, paidAt: null })).toBe(false);
    expect(hasPaymentToRefund({ status: OrderStatus.CONFIRMED, paidAt })).toBe(false);
  });
});
