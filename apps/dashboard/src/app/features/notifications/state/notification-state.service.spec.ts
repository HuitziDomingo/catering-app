import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { TuiNotificationService } from '@taiga-ui/core';
import { RoleName, type NewOrderEvent } from '@catering-app/shared-types';
import { AuthStateService } from '../../auth/state/auth-state.service';
import { NotificationSocketService } from '../data-access/notification-socket.service';
import { NotificationStateService } from './notification-state.service';

const event: NewOrderEvent = {
  id: 'order-1',
  customerId: 'customer-1',
  total: 500,
  peopleCount: 10,
  scheduledFor: '2026-08-01T12:00:00.000Z',
  needsReview: false,
};

describe('NotificationStateService', () => {
  let newOrder$: Subject<NewOrderEvent>;
  let socket: { newOrder$: Subject<NewOrderEvent>; connect: jest.Mock; disconnect: jest.Mock };
  let notifications: { open: jest.Mock };
  let state: NotificationStateService;

  beforeEach(() => {
    newOrder$ = new Subject<NewOrderEvent>();
    socket = { newOrder$, connect: jest.fn(), disconnect: jest.fn() };
    notifications = { open: jest.fn().mockReturnValue(of(undefined)) };

    TestBed.configureTestingModule({
      providers: [
        { provide: NotificationSocketService, useValue: socket },
        { provide: TuiNotificationService, useValue: notifications },
        {
          provide: AuthStateService,
          useValue: {
            accessToken: () => 'access-token',
            user: () => ({ id: 'u1', email: 'staff@example.com', role: RoleName.STAFF }),
          },
        },
      ],
    });
    state = TestBed.inject(NotificationStateService);
  });

  it('shows a toast and increments the unread badge count when a new-order event arrives', () => {
    newOrder$.next(event);

    expect(notifications.open).toHaveBeenCalledTimes(1);
    expect(state.unreadCount()).toBe(1);
    expect(state.recent()).toEqual([event]);
  });

  it('accumulates multiple events, most recent first, and keeps incrementing the badge', () => {
    const secondEvent: NewOrderEvent = { ...event, id: 'order-2' };

    newOrder$.next(event);
    newOrder$.next(secondEvent);

    expect(state.unreadCount()).toBe(2);
    expect(state.recent()).toEqual([secondEvent, event]);
  });

  it('markAllRead() resets the badge count without clearing the recent history', () => {
    newOrder$.next(event);

    state.markAllRead();

    expect(state.unreadCount()).toBe(0);
    expect(state.recent()).toEqual([event]);
  });
});
