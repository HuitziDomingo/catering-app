import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideTaiga } from '@taiga-ui/core';
import { of, Subject } from 'rxjs';
import { OrderStatus, type OrderDetail } from '@catering-app/shared-types';
import { NotificationStateService } from '../../../notifications/state/notification-state.service';
import { OrdersDataAccessService } from '../../data-access/orders-data-access.service';
import { sampleOrder } from '../../testing/order-fixtures';
import { OrderDetailPage } from './order-detail-page';

async function render(order: OrderDetail): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [OrderDetailPage],
    providers: [
      provideRouter([]),
      provideTaiga(),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: order.id })) } },
      { provide: NotificationStateService, useValue: { newOrder$: new Subject() } },
      {
        provide: OrdersDataAccessService,
        useValue: { findById: jest.fn().mockReturnValue(of(order)) },
      },
    ],
  });
  const fixture = TestBed.createComponent(OrderDetailPage);
  await fixture.whenStable();
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

function statusActionLabels(element: HTMLElement): string[] {
  return Array.from(element.querySelectorAll('[data-testid="status-actions"] button')).map(
    (button) => button.textContent?.trim() ?? '',
  );
}

describe('OrderDetailPage', () => {
  it('shows the line items with their snapshot price and the total', async () => {
    const element = await render(sampleOrder);

    expect(element.textContent).toContain('Chilaquiles');
    expect(element.querySelector('[data-testid="order-total"]')?.textContent).toContain('950.00');
  });

  it('offers only the manual transitions allowed from the current status', async () => {
    const element = await render(sampleOrder);

    expect(statusActionLabels(element)).toEqual(['Confirmar', 'Cancelar pedido']);
  });

  it('shows the refund alert on a cancelled order with an approved payment', async () => {
    const element = await render({
      ...sampleOrder,
      status: OrderStatus.CANCELLED,
      paymentId: '123456789',
      paymentMethod: 'master',
      paidAt: '2026-10-05T13:00:00.000Z',
    });

    const alert = element.querySelector('[data-testid="refund-alert"]');
    expect(alert?.textContent).toContain('123456789');
    expect(statusActionLabels(element)).toEqual([]);
  });

  it('shows the review panel only for needsReview orders', async () => {
    const element = await render({ ...sampleOrder, needsReview: true });

    expect(element.querySelector('[data-testid="review-panel"]')).toBeTruthy();
    expect(element.querySelector('[data-testid="refund-alert"]')).toBeNull();
  });
});
