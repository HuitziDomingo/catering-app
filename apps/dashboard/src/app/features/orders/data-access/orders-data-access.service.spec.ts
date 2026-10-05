import { OrderStatus } from '@catering-app/shared-types';
import { toOrderListParams } from './orders-data-access.service';

describe('toOrderListParams', () => {
  it('joins statuses with commas and skips undefined values', () => {
    const params = toOrderListParams({
      status: [OrderStatus.PENDING, OrderStatus.CONFIRMED],
      needsReview: true,
      page: 1,
      from: undefined,
    });

    expect(params.toString()).toBe('status=pending,confirmed&needsReview=true&page=1');
  });
});
