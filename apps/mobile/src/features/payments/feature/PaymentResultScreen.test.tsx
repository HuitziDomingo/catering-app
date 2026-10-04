import * as React from 'react';
import { act, waitFor } from '@testing-library/react-native';
import { OrderStatus } from '@catering-app/shared-types';
import { renderWithProviders } from '../../../test-utils';
import { useOrdersStore } from '../../orders/state/useOrdersStore';
import { buildOrder } from '../../orders/test-fixtures';
import { PaymentResultScreen, POLL_INTERVAL_MS } from './PaymentResultScreen';

jest.setTimeout(30000);

jest.mock('../../orders/data-access/ordersDataAccess', () => ({
  fetchOrder: jest.fn(),
  fetchMyOrders: jest.fn(),
}));

let mockParams: Record<string, string> = {};
jest.mock('expo-router', () => ({
  useRouter: () => ({ navigate: jest.fn(), push: jest.fn(), replace: jest.fn() }),
  useLocalSearchParams: () => mockParams,
}));

import { fetchOrder } from '../../orders/data-access/ordersDataAccess';

beforeEach(() => {
  useOrdersStore.getState().clear();
  jest.clearAllMocks();
});

afterEach(() => {
  jest.useRealTimers();
});

test('regreso "success": re-consulta el pedido hasta que el webhook lo confirma', async () => {
  jest.useFakeTimers();
  mockParams = { result: 'success', orderId: 'order-1' };
  (fetchOrder as jest.Mock)
    .mockResolvedValueOnce(buildOrder({ status: OrderStatus.PENDING }))
    .mockResolvedValueOnce(buildOrder({ status: OrderStatus.CONFIRMED }));

  const utils = renderWithProviders(<PaymentResultScreen />);

  await waitFor(() => expect(utils.getByText('Estamos confirmando tu pago')).toBeTruthy());
  await act(async () => {
    jest.advanceTimersByTime(POLL_INTERVAL_MS);
  });

  await waitFor(() => expect(utils.getByText('¡Pago aprobado!')).toBeTruthy());
  expect(fetchOrder).toHaveBeenCalledTimes(2);
});

test('regreso "failure": no espera al webhook y ofrece intentar de nuevo', async () => {
  mockParams = { result: 'failure', orderId: 'order-1' };
  (fetchOrder as jest.Mock).mockResolvedValue(buildOrder({ status: OrderStatus.PENDING }));

  const utils = renderWithProviders(<PaymentResultScreen />);

  await waitFor(() => expect(utils.getByTestId('payment-retry')).toBeTruthy());
  expect(utils.getByText('El pago no se completó')).toBeTruthy();
  expect(fetchOrder).toHaveBeenCalledTimes(1);
});

test('el status real manda: regreso "success" con pedido payment_failed muestra el rechazo', async () => {
  mockParams = { result: 'success', orderId: 'order-1' };
  (fetchOrder as jest.Mock).mockResolvedValue(buildOrder({ status: OrderStatus.PAYMENT_FAILED }));

  const utils = renderWithProviders(<PaymentResultScreen />);

  await waitFor(() => expect(utils.getByText('El pago no se completó')).toBeTruthy());
});

test('sin orderId no consulta nada y lleva a Mis pedidos', () => {
  mockParams = { result: 'pending' };

  const utils = renderWithProviders(<PaymentResultScreen />);

  expect(utils.getByText('Ir a mis pedidos')).toBeTruthy();
  expect(fetchOrder).not.toHaveBeenCalled();
});
