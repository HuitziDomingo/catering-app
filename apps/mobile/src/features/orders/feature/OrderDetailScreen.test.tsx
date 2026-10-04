import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { OrderStatus } from '@catering-app/shared-types';
import { renderWithProviders } from '../../../test-utils';
import { useOrdersStore } from '../state/useOrdersStore';
import { buildOrder } from '../test-fixtures';
import { OrderDetailScreen } from './OrderDetailScreen';

jest.setTimeout(30000);

jest.mock('../data-access/ordersDataAccess', () => ({ fetchOrder: jest.fn(), fetchMyOrders: jest.fn() }));
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

import { fetchOrder } from '../data-access/ordersDataAccess';
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
