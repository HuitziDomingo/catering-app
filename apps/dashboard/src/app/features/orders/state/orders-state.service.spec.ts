import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import {
  OrderStatus,
  ReviewOrderAction,
  type NewOrderEvent,
  type OrderDetail,
} from '@catering-app/shared-types';
import { NotificationStateService } from '../../notifications/state/notification-state.service';
import { OrdersDataAccessService } from '../data-access/orders-data-access.service';
import { DEFAULT_ORDER_LIST_FILTERS, ORDER_LIST_PAGE_SIZE } from '../util/order-list-query';
import { sampleOrder } from '../testing/order-fixtures';
import { OrdersStateService } from './orders-state.service';

describe('OrdersStateService', () => {
  let dataAccess: {
    list: jest.Mock;
    findById: jest.Mock;
    updateStatus: jest.Mock;
    review: jest.Mock;
  };
  let newOrder$: Subject<NewOrderEvent>;
  let state: OrdersStateService;

  beforeEach(() => {
    dataAccess = {
      list: jest.fn().mockReturnValue(of({ items: [sampleOrder], total: 45, page: 1, pageSize: 20 })),
      findById: jest.fn().mockReturnValue(of(sampleOrder)),
      updateStatus: jest.fn(),
      review: jest.fn(),
    };
    newOrder$ = new Subject<NewOrderEvent>();

    TestBed.configureTestingModule({
      providers: [
        { provide: OrdersDataAccessService, useValue: dataAccess },
        { provide: NotificationStateService, useValue: { newOrder$ } },
      ],
    });
    state = TestBed.inject(OrdersStateService);
  });

  it('load() fetches the current page with the current filters', () => {
    state.load();

    expect(dataAccess.list).toHaveBeenCalledWith({
      sort: 'createdAt',
      direction: 'desc',
      page: 1,
      pageSize: ORDER_LIST_PAGE_SIZE,
    });
    expect(state.status()).toBe('success');
    expect(state.orders()).toEqual([sampleOrder]);
    expect(state.totalPages()).toBe(3);
  });

  it('load() exposes the API error message', () => {
    dataAccess.list.mockReturnValue(throwError(() => new Error('Sin conexión')));

    state.load();

    expect(state.status()).toBe('error');
    expect(state.error()).toBe('Sin conexión');
  });

  it('applyFilters() goes back to page 1', () => {
    state.load();
    state.goToPage(3);

    state.applyFilters({ ...DEFAULT_ORDER_LIST_FILTERS, needsReview: true });

    expect(state.page()).toBe(1);
    expect(dataAccess.list).toHaveBeenLastCalledWith(
      expect.objectContaining({ page: 1, needsReview: true }),
    );
  });

  it('reloads the list when a new-order event arrives, once the list was opened', () => {
    newOrder$.next({ ...sampleOrder, total: 950 });
    expect(dataAccess.list).not.toHaveBeenCalled();

    state.load();
    newOrder$.next({ ...sampleOrder, id: 'order-2' });

    expect(dataAccess.list).toHaveBeenCalledTimes(2);
    expect(state.status()).toBe('success');
  });

  it('updateStatus() refreshes the detail and the row in the list', () => {
    const confirmed: OrderDetail = { ...sampleOrder, status: OrderStatus.CONFIRMED };
    dataAccess.updateStatus.mockReturnValue(of(confirmed));
    state.load();
    state.loadDetail('order-1');

    state.updateStatus('order-1', OrderStatus.CONFIRMED).subscribe();

    expect(dataAccess.updateStatus).toHaveBeenCalledWith('order-1', OrderStatus.CONFIRMED);
    expect(state.selected()).toEqual(confirmed);
    expect(state.orders()).toEqual([confirmed]);
  });

  it('review() sends the action and stores the result', () => {
    const approved: OrderDetail = { ...sampleOrder, needsReview: false };
    dataAccess.review.mockReturnValue(of(approved));
    state.loadDetail('order-1');

    state.review('order-1', { action: ReviewOrderAction.APPROVE }).subscribe();

    expect(dataAccess.review).toHaveBeenCalledWith('order-1', { action: ReviewOrderAction.APPROVE });
    expect(state.selected()).toEqual(approved);
  });
});
