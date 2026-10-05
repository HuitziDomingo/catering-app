import { OrderStatus } from '@catering-app/shared-types';
import {
  DEFAULT_ORDER_LIST_FILTERS,
  localDayBoundary,
  ORDER_LIST_PAGE_SIZE,
  toOrderListQuery,
} from './order-list-query';

describe('localDayBoundary', () => {
  it('uses local midnight / end of day, not UTC', () => {
    expect(localDayBoundary('2026-10-05', 'start')).toBe(
      new Date(2026, 9, 5, 0, 0, 0, 0).toISOString(),
    );
    expect(localDayBoundary('2026-10-05', 'end')).toBe(
      new Date(2026, 9, 5, 23, 59, 59, 999).toISOString(),
    );
  });
});

describe('toOrderListQuery', () => {
  it('default filters only send sort, direction and paging', () => {
    expect(toOrderListQuery(DEFAULT_ORDER_LIST_FILTERS, 2)).toEqual({
      sort: 'createdAt',
      direction: 'desc',
      page: 2,
      pageSize: ORDER_LIST_PAGE_SIZE,
    });
  });

  it('maps every filter that is set', () => {
    const query = toOrderListQuery(
      {
        from: '2026-10-01',
        to: '2026-10-31',
        status: OrderStatus.CONFIRMED,
        needsReview: true,
        sort: 'scheduledFor',
        direction: 'asc',
      },
      1,
    );

    expect(query).toEqual({
      from: localDayBoundary('2026-10-01', 'start'),
      to: localDayBoundary('2026-10-31', 'end'),
      status: [OrderStatus.CONFIRMED],
      needsReview: true,
      sort: 'scheduledFor',
      direction: 'asc',
      page: 1,
      pageSize: ORDER_LIST_PAGE_SIZE,
    });
  });
});
