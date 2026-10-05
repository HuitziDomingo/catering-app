import * as React from 'react';
import { fireEvent, waitFor } from '@testing-library/react-native';
import { OrderStatus } from '@catering-app/shared-types';
import { renderWithProviders } from '../../../test-utils';
import { useSessionStore } from '../../auth/state/useSessionStore';
import { useOrdersStore } from '../state/useOrdersStore';
import { buildOrder } from '../test-fixtures';
import { MyOrdersScreen } from './MyOrdersScreen';

jest.setTimeout(30000);

jest.mock('../data-access/ordersDataAccess', () => ({ fetchMyOrders: jest.fn(), fetchOrder: jest.fn() }));

const mockPush = jest.fn();
jest.mock('expo-router', () => {
  const React = jest.requireActual('react');
  return {
    useRouter: () => ({ push: mockPush, navigate: jest.fn(), replace: jest.fn() }),
    useFocusEffect: (cb: () => void) => React.useEffect(cb, [cb]),
  };
});

import { fetchMyOrders } from '../data-access/ordersDataAccess';

const authenticated = {
  isBootstrapping: false,
  isAuthenticated: true,
  user: { id: 'user-1', email: 'c@example.com', role: 'customer' as never },
  accessToken: 'token',
};

beforeEach(() => {
  useSessionStore.setState(authenticated);
  useOrdersStore.getState().clear();
  jest.clearAllMocks();
});

test('lista los pedidos propios con su status y abre el detalle al tocarlos', async () => {
  (fetchMyOrders as jest.Mock).mockResolvedValue({
    items: [
      buildOrder({ id: 'o-1', status: OrderStatus.CONFIRMED }),
      buildOrder({ id: 'o-2', status: OrderStatus.PAYMENT_FAILED }),
    ],
    total: 2,
    page: 1,
    pageSize: 20,
  });

  const utils = renderWithProviders(<MyOrdersScreen />);

  await waitFor(() => expect(utils.getByTestId('order-item-o-1')).toBeTruthy());
  expect(utils.getByText('Confirmado')).toBeTruthy();
  expect(utils.getByText('Pago rechazado')).toBeTruthy();

  fireEvent.press(utils.getByTestId('order-item-o-2'));
  expect(mockPush).toHaveBeenCalledWith('/pedidos/o-2');
});

test('sin pedidos muestra el estado vacío', async () => {
  (fetchMyOrders as jest.Mock).mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20 });

  const utils = renderWithProviders(<MyOrdersScreen />);

  await waitFor(() => expect(utils.getByTestId('my-orders-empty')).toBeTruthy());
});

test('sin sesión muestra el login y no llama a la API', () => {
  useSessionStore.setState({ ...authenticated, isAuthenticated: false, user: null });

  const utils = renderWithProviders(<MyOrdersScreen />);

  expect(utils.getByText('Inicia sesión para continuar')).toBeTruthy();
  expect(fetchMyOrders).not.toHaveBeenCalled();
});
