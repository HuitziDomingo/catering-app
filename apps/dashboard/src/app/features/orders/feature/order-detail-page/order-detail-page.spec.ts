import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { provideTaiga } from '@taiga-ui/core';
import { of, Subject, throwError } from 'rxjs';
import { HttpErrorResponse } from '@angular/common/http';
import { OrderStatus, type OrderDetail } from '@catering-app/shared-types';
import { NotificationStateService } from '../../../notifications/state/notification-state.service';
import { OrdersDataAccessService } from '../../data-access/orders-data-access.service';
import { sampleOrder } from '../../testing/order-fixtures';
import { OrderDetailPage } from './order-detail-page';

const paidOrder: OrderDetail = {
  ...sampleOrder,
  status: OrderStatus.CONFIRMED,
  paymentId: '123456789',
  paymentMethod: 'visa',
  paidAt: '2026-10-05T13:00:00.000Z',
};

async function render(
  order: OrderDetail,
  dataAccess: Record<string, jest.Mock> = {},
): Promise<HTMLElement> {
  TestBed.configureTestingModule({
    imports: [OrderDetailPage],
    providers: [
      provideRouter([]),
      provideTaiga(),
      { provide: ActivatedRoute, useValue: { paramMap: of(convertToParamMap({ id: order.id })) } },
      { provide: NotificationStateService, useValue: { newOrder$: new Subject() } },
      {
        provide: OrdersDataAccessService,
        useValue: { findById: jest.fn().mockReturnValue(of(order)), ...dataAccess },
      },
    ],
  });
  const fixture = TestBed.createComponent(OrderDetailPage);
  await fixture.whenStable();
  fixture.detectChanges();
  rendered = fixture;
  return fixture.nativeElement as HTMLElement;
}

let rendered: { detectChanges(): void };

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

  describe('recibo PDF (ADR-028)', () => {
    let tab: { opener: unknown; location: { href: string }; close: jest.Mock };
    let openSpy: jest.SpyInstance;

    beforeEach(() => {
      tab = { opener: window, location: { href: '' }, close: jest.fn() };
      openSpy = jest.spyOn(window, 'open').mockReturnValue(tab as unknown as Window);
    });

    afterEach(() => openSpy.mockRestore());

    const receiptButton = (element: HTMLElement) =>
      element.querySelector<HTMLButtonElement>('[data-testid="receipt-button"]');

    it('no ofrece el recibo si el pedido no está pagado', async () => {
      const element = await render(sampleOrder);

      expect(receiptButton(element)).toBeNull();
    });

    it('lo ofrece en un pedido confirmado a mano, sin pago de Mercado Pago', async () => {
      const element = await render({ ...sampleOrder, status: OrderStatus.CONFIRMED });

      expect(receiptButton(element)).toBeTruthy();
      expect(element.textContent).toContain('Confirmado a mano');
    });

    it('abre la URL firmada en otra pestaña, sin opener', async () => {
      const getReceipt = jest
        .fn()
        .mockReturnValue(of({ url: 'http://storage/firmada.pdf', expiresAt: '2026-10-05T13:15:00.000Z' }));
      const element = await render(paidOrder, { getReceipt });

      receiptButton(element)?.click();

      expect(openSpy).toHaveBeenCalledWith('', '_blank');
      expect(getReceipt).toHaveBeenCalledWith('order-1');
      expect(tab.location.href).toBe('http://storage/firmada.pdf');
      expect(tab.opener).toBeNull();
    });

    it('si la API falla, cierra la pestaña y muestra el error', async () => {
      const getReceipt = jest.fn().mockReturnValue(
        throwError(
          () =>
            new HttpErrorResponse({
              status: 409,
              error: { message: 'El pedido todavía no está pagado, así que no tiene recibo.' },
            }),
        ),
      );
      const element = await render(paidOrder, { getReceipt });

      receiptButton(element)?.click();
      rendered.detectChanges();

      expect(tab.close).toHaveBeenCalled();
      expect(element.querySelector('[data-testid="receipt-error"]')?.textContent).toContain(
        'no está pagado',
      );
    });
  });
});
