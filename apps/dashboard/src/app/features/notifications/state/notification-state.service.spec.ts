import { TestBed } from '@angular/core/testing';
import { Subject, of } from 'rxjs';
import { TuiNotificationService } from '@taiga-ui/core';
import { RoleName, type NewOrderEvent } from '@catering-app/shared-types';
import { AuthStateService } from '../../auth/state/auth-state.service';
import { NotificationHistoryService } from '../data-access/notification-history.service';
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
  let history: {
    readLastSeenAt: jest.Mock;
    saveLastSeenAt: jest.Mock;
    findCreatedSince: jest.Mock;
  };
  let state: NotificationStateService;

  function createState(): NotificationStateService {
    const instance = TestBed.inject(NotificationStateService);
    TestBed.tick(); // corre el effect de conexión (y la carga del historial)
    return instance;
  }

  beforeEach(() => {
    newOrder$ = new Subject<NewOrderEvent>();
    socket = { newOrder$, connect: jest.fn(), disconnect: jest.fn() };
    notifications = { open: jest.fn().mockReturnValue(of(undefined)) };
    history = {
      readLastSeenAt: jest.fn().mockReturnValue('2026-10-01T00:00:00.000Z'),
      saveLastSeenAt: jest.fn(),
      findCreatedSince: jest.fn().mockReturnValue(of({ events: [], total: 0 })),
    };

    TestBed.configureTestingModule({
      providers: [
        { provide: NotificationSocketService, useValue: socket },
        { provide: TuiNotificationService, useValue: notifications },
        { provide: NotificationHistoryService, useValue: history },
        {
          provide: AuthStateService,
          useValue: {
            accessToken: () => 'access-token',
            user: () => ({ id: 'u1', email: 'staff@example.com', role: RoleName.STAFF }),
          },
        },
      ],
    });
  });

  describe('live events', () => {
    beforeEach(() => {
      state = createState();
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

  describe('missed orders (persistent history, ADR-027)', () => {
    const missed: NewOrderEvent = { ...event, id: 'order-missed' };

    it('loads orders created since lastSeenAt into the bell when connecting', () => {
      history.findCreatedSince.mockReturnValue(
        of({ events: [missed], total: 3 }),
      );

      state = createState();

      expect(history.findCreatedSince).toHaveBeenCalledWith(
        '2026-10-01T00:00:00.000Z',
        20,
      );
      expect(state.recent()).toEqual([missed]);
      expect(state.unreadCount()).toBe(3);
      expect(notifications.open).not.toHaveBeenCalled();
    });

    it('first visit in this browser: stores lastSeenAt and loads nothing', () => {
      history.readLastSeenAt.mockReturnValue(null);

      state = createState();

      expect(history.saveLastSeenAt).toHaveBeenCalledTimes(1);
      expect(history.findCreatedSince).not.toHaveBeenCalled();
      expect(state.unreadCount()).toBe(0);
    });

    it('does not count twice an order that arrives by WebSocket and in the history', () => {
      const response = new Subject<{
        events: NewOrderEvent[];
        total: number;
      }>();
      history.findCreatedSince.mockReturnValue(response);
      state = createState();

      newOrder$.next(missed);
      response.next({ events: [missed], total: 1 });

      expect(state.recent()).toEqual([missed]);
      expect(state.unreadCount()).toBe(1);
    });

    it('markAllRead() moves lastSeenAt to now', () => {
      state = createState();
      history.saveLastSeenAt.mockClear();

      state.markAllRead();

      expect(history.saveLastSeenAt).toHaveBeenCalledTimes(1);
    });
  });
});
