import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { OrderStatus } from '@catering-app/shared-types';
import { renderWithProviders } from '../../../test-utils';
import { useOrdersStore } from '../state/useOrdersStore';
import { buildOrder } from '../test-fixtures';
import { OrderDetailScreen } from './OrderDetailScreen';

jest.setTimeout(30000);

jest.mock('../data-access/ordersDataAccess', () => ({
  fetchOrder: jest.fn(),
  fetchMyOrders: jest.fn(),
  fetchOrderReceipt: jest.fn(),
}));
jest.mock('../../payments/data-access/paymentsDataAccess', () => ({ createPaymentPreference: jest.fn() }));
jest.mock('../../payments/util/checkout', () => ({
  ...jest.requireActual('../../payments/util/checkout'),
  openCheckout: jest.fn(),
}));

const mockNavigate = jest.fn();
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    useRouter: () => ({ navigate: mockNavigate, push: jest.fn(), replace: jest.fn() }),
    useLocalSearchParams: () => ({ orderId: 'order-1' }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
    Stack: { Screen: () => null },
  };
});

import * as WebBrowser from 'expo-web-browser';
import { AxiosError, type AxiosResponse } from 'axios';
import { fetchOrder, fetchOrderReceipt } from '../data-access/ordersDataAccess';
import { createPaymentPreference } from '../../payments/data-access/paymentsDataAccess';
import { openCheckout } from '../../payments/util/checkout';

beforeEach(() => {
  useOrdersStore.getState().clear();
  jest.clearAllMocks();
});

test('muestra el detalle con el precio snapshot por línea y el total', async () => {
  (fetchOrder as jest.Mock).mockResolvedValue(buildOrder({ notes: 'Sin cebolla' }));

  const utils = renderWithProviders(<OrderDetailScreen />);

  await waitFor(() => expect(utils.getByTestId('order-detail')).toBeTruthy());
  expect(utils.getByText('2 × Chilaquiles')).toBeTruthy();
  expect(utils.getByTestId('order-detail-total')).toHaveTextContent('$3,000.00');
  expect(utils.getByText('Sin cebolla')).toBeTruthy();
});

test('pedido pending: "Pagar" crea la preferencia, abre el checkout y navega al regreso', async () => {
  (fetchOrder as jest.Mock).mockResolvedValue(buildOrder());
  (createPaymentPreference as jest.Mock).mockResolvedValue('https://mp/checkout');
  (openCheckout as jest.Mock).mockResolvedValue({
    result: 'success',
    orderId: 'order-1',
    paymentStatus: 'approved',
  });

  const utils = renderWithProviders(<OrderDetailScreen />);
  await waitFor(() => expect(utils.getByTestId('order-pay')).toBeTruthy());
  fireEvent.press(utils.getByTestId('order-pay'));

  await waitFor(() =>
    expect(mockNavigate).toHaveBeenCalledWith(
      '/payment/success?orderId=order-1&paymentStatus=approved'
    )
  );
  expect(createPaymentPreference).toHaveBeenCalledWith('order-1');
  expect(openCheckout).toHaveBeenCalledWith('https://mp/checkout');
});

test('pedido payment_failed: ofrece reintentar el pago', async () => {
  (fetchOrder as jest.Mock).mockResolvedValue(buildOrder({ status: OrderStatus.PAYMENT_FAILED }));

  const utils = renderWithProviders(<OrderDetailScreen />);

  await waitFor(() => expect(utils.getByText('Reintentar pago')).toBeTruthy());
});

test('pedido confirmado: no muestra "Pagar" y sí el detalle del pago', async () => {
  (fetchOrder as jest.Mock).mockResolvedValue(
    buildOrder({
      status: OrderStatus.CONFIRMED,
      paymentMethod: 'master',
      paidAt: '2026-10-03T21:30:00.000Z',
    })
  );

  const utils = renderWithProviders(<OrderDetailScreen />);

  await waitFor(() => expect(utils.getByTestId('order-detail-payment')).toBeTruthy());
  expect(utils.getByText('Mastercard')).toBeTruthy();
  expect(utils.queryByTestId('order-pay')).toBeNull();
});

test('si el cliente cierra el navegador sin pagar, no navega', async () => {
  (fetchOrder as jest.Mock).mockResolvedValue(buildOrder());
  (createPaymentPreference as jest.Mock).mockResolvedValue('https://mp/checkout');
  (openCheckout as jest.Mock).mockResolvedValue(null);

  const utils = renderWithProviders(<OrderDetailScreen />);
  await waitFor(() => expect(utils.getByTestId('order-pay')).toBeTruthy());
  fireEvent.press(utils.getByTestId('order-pay'));

  await waitFor(() => expect(openCheckout).toHaveBeenCalled());
  expect(mockNavigate).not.toHaveBeenCalled();
});

describe('Ver recibo (ADR-028)', () => {
  const paid = () =>
    buildOrder({
      status: OrderStatus.CONFIRMED,
      paymentId: '123',
      paymentMethod: 'visa',
      paidAt: '2026-10-03T21:00:00.000Z',
    });

  test('no aparece si el pedido no está pagado', async () => {
    (fetchOrder as jest.Mock).mockResolvedValue(buildOrder());

    const utils = renderWithProviders(<OrderDetailScreen />);

    await waitFor(() => expect(utils.getByTestId('order-pay')).toBeTruthy());
    expect(utils.queryByTestId('order-receipt')).toBeNull();
  });

  test('pedido pagado: pide la URL firmada y la abre con expo-web-browser', async () => {
    (fetchOrder as jest.Mock).mockResolvedValue(paid());
    (fetchOrderReceipt as jest.Mock).mockResolvedValue({
      url: 'http://storage/order-documents/receipts/order-1/r.pdf?X-Amz-Signature=abc',
      expiresAt: '2026-10-03T21:15:00.000Z',
    });

    const utils = renderWithProviders(<OrderDetailScreen />);
    await waitFor(() => expect(utils.getByTestId('order-receipt')).toBeTruthy());
    expect(utils.queryByTestId('order-pay')).toBeNull();
    fireEvent.press(utils.getByTestId('order-receipt'));

    await waitFor(() =>
      expect(WebBrowser.openBrowserAsync).toHaveBeenCalledWith(
        'http://storage/order-documents/receipts/order-1/r.pdf?X-Amz-Signature=abc',
      ),
    );
    expect(fetchOrderReceipt).toHaveBeenCalledWith('order-1');
  });

  test('pedido cancelado con pago aprobado: también ofrece el recibo', async () => {
    (fetchOrder as jest.Mock).mockResolvedValue({ ...paid(), status: OrderStatus.CANCELLED });

    const utils = renderWithProviders(<OrderDetailScreen />);

    await waitFor(() => expect(utils.getByTestId('order-receipt')).toBeTruthy());
  });

  test('si la API falla, muestra el mensaje y no abre nada', async () => {
    (fetchOrder as jest.Mock).mockResolvedValue(paid());
    (fetchOrderReceipt as jest.Mock).mockRejectedValue(
      new AxiosError('Request failed', '409', undefined, undefined, {
        status: 409,
        data: { message: 'El pedido todavía no está pagado, así que no tiene recibo.' },
      } as AxiosResponse),
    );

    const utils = renderWithProviders(<OrderDetailScreen />);
    await waitFor(() => expect(utils.getByTestId('order-receipt')).toBeTruthy());
    fireEvent.press(utils.getByTestId('order-receipt'));

    await waitFor(() =>
      expect(utils.getByTestId('order-receipt-error')).toHaveTextContent(
        'El pedido todavía no está pagado, así que no tiene recibo.',
      ),
    );
    expect(WebBrowser.openBrowserAsync).not.toHaveBeenCalled();
  });
});
