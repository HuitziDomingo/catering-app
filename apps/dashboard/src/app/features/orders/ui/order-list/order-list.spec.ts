import { TestBed } from '@angular/core/testing';
import { provideTaiga } from '@taiga-ui/core';
import { OrderStatus, type OrderDetail } from '@catering-app/shared-types';
import { sampleOrder } from '../../testing/order-fixtures';
import { OrderList } from './order-list';

function render(orders: OrderDetail[]): HTMLElement {
  const fixture = TestBed.createComponent(OrderList);
  fixture.componentRef.setInput('orders', orders);
  fixture.detectChanges();
  return fixture.nativeElement as HTMLElement;
}

describe('OrderList', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({ imports: [OrderList], providers: [provideTaiga()] });
  });

  it('flags a cancelled order with an approved payment for refund', () => {
    const element = render([
      { ...sampleOrder, status: OrderStatus.CANCELLED, paidAt: '2026-10-05T13:00:00.000Z' },
    ]);

    expect(element.querySelector('[data-testid="refund-flag"]')).toBeTruthy();
  });

  it('does not flag regular orders', () => {
    const element = render([{ ...sampleOrder, paidAt: '2026-10-05T13:00:00.000Z' }]);

    expect(element.querySelector('[data-testid="refund-flag"]')).toBeNull();
    expect(element.querySelector('[data-testid="review-flag"]')).toBeNull();
  });

  it('emits open with the order when its row or its "Ver" button is clicked', () => {
    const fixture = TestBed.createComponent(OrderList);
    const other: OrderDetail = { ...sampleOrder, id: 'order-2' };
    fixture.componentRef.setInput('orders', [sampleOrder, other]);
    fixture.detectChanges();
    const opened: OrderDetail[] = [];
    fixture.componentInstance.open.subscribe((order) => opened.push(order));
    const rows = (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
      '[data-testid="order-row"]',
    );

    rows[1].querySelector('td')?.click();
    rows[0].querySelector<HTMLButtonElement>('button')?.click();

    expect(opened).toEqual([other, sampleOrder]);
  });

  it('flags orders that need review', () => {
    const element = render([{ ...sampleOrder, needsReview: true }]);

    expect(element.querySelector('[data-testid="review-flag"]')).toBeTruthy();
  });
});
