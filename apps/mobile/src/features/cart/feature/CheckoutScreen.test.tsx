import * as React from 'react';
import { act, fireEvent, waitFor } from '@testing-library/react-native';
import { IndexPath } from '@ui-kitten/components';
import { renderWithProviders } from '../../../test-utils';
import { useSessionStore } from '../../auth/state/useSessionStore';
import { useCartStore } from '../state/useCartStore';
import { CheckoutScreen } from './CheckoutScreen';

// Mismo motivo que MenuScreen.test.tsx: el primer render de UI Kitten en un
// proceso de Jest es lento.
jest.setTimeout(30000);

jest.mock('../../orders/data-access/ordersDataAccess', () => ({
  createOrder: jest.fn(),
}));

const mockReplace = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: jest.fn(), replace: mockReplace, navigate: jest.fn() }),
}));

import { createOrder } from '../../orders/data-access/ordersDataAccess';

const chilaquiles = {
  id: 'item-a',
  categoryId: 'cat-a',
  name: 'Chilaquiles',
  description: null,
  basePrice: 1500,
  servesMin: 300,
  servesMax: 500,
  attributes: {},
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const createdOrder = {
  id: 'order-1',
  customerId: 'user-1',
  status: 'pending',
  peopleCount: 400,
  scheduledFor: '2030-05-10T15:00:00.000Z',
  subtotal: 3000,
  total: 3000,
  notes: null,
  needsReview: false,
  paymentPreferenceId: null,
  paymentId: null,
  paymentMethod: null,
  paidAt: null,
  customer: null,
  items: [
    {
      id: 1,
      orderId: 'order-1',
      menuItemId: 'item-a',
      menuItemName: 'Chilaquiles',
      menuItemImageUrl: null,
      quantity: 2,
      unitPrice: 1500,
      subtotal: 3000,
    },
  ],
  createdAt: '2026-10-03T20:00:00.000Z',
  updatedAt: '2026-10-03T20:00:00.000Z',
};

const authenticated = {
  isBootstrapping: false,
  isAuthenticated: true,
  user: { id: 'user-1', email: 'c@example.com', role: 'customer' as never },
  accessToken: 'token',
  refreshToken: 'refresh',
};

beforeEach(() => {
  useSessionStore.setState(authenticated);
  useCartStore.setState({ lines: [], submitStatus: 'idle', submitError: null, lastOrder: null });
  useCartStore.getState().addItem(chilaquiles, 2);
  jest.clearAllMocks();
});

type Utils = ReturnType<typeof renderWithProviders>;

/** Llena el formulario: el Datepicker y el Select de UI Kitten se manejan por su onSelect. */
function fillForm(utils: Utils, peopleCount: string) {
  act(() => {
    fireEvent(utils.getByTestId('checkout-date'), 'select', new Date(2030, 4, 10));
  });
  act(() => {
    // '09:00' es el slot 4 (07:00, 07:30, 08:00, 08:30, 09:00).
    fireEvent(utils.getByTestId('checkout-time'), 'select', new IndexPath(4));
  });
  // UI Kitten Input no reenvía testID al TextInput nativo: se ubica por placeholder.
  fireEvent.changeText(utils.getByPlaceholderText('Ej. 150'), peopleCount);
}

test('sin sesión muestra el login embebido en vez del formulario', () => {
  useSessionStore.setState({ ...authenticated, isAuthenticated: false, user: null });

  const utils = renderWithProviders(<CheckoutScreen />);

  expect(utils.getByText('Inicia sesión para continuar')).toBeTruthy();
  expect(utils.queryByTestId('checkout-screen')).toBeNull();
});

test('con el carrito vacío no muestra el formulario', () => {
  useCartStore.setState({ lines: [] });

  const utils = renderWithProviders(<CheckoutScreen />);

  expect(utils.getByTestId('checkout-empty')).toBeTruthy();
});

test('no envía si faltan fecha, hora o personas', () => {
  const utils = renderWithProviders(<CheckoutScreen />);

  fireEvent.press(utils.getByTestId('checkout-confirm'));

  expect(utils.getByText('Elige la fecha del evento.')).toBeTruthy();
  expect(utils.getByText('Elige la hora del evento.')).toBeTruthy();
  expect(createOrder).not.toHaveBeenCalled();
});

test('dentro de rango: crea un solo pedido con todo el carrito y muestra la confirmación', async () => {
  (createOrder as jest.Mock).mockResolvedValue(createdOrder);
  const utils = renderWithProviders(<CheckoutScreen />);

  fillForm(utils, '400');
  fireEvent.changeText(
    utils.getByPlaceholderText('Alergias, dirección de entrega, indicaciones…'),
    '  Sin cebolla  '
  );
  fireEvent.press(utils.getByTestId('checkout-confirm'));

  await waitFor(() => expect(utils.getByTestId('order-placed')).toBeTruthy());
  expect(createOrder).toHaveBeenCalledWith({
    peopleCount: 400,
    scheduledFor: new Date(2030, 4, 10, 9, 0).toISOString(),
    notes: 'Sin cebolla',
    items: [{ menuItemId: 'item-a', quantity: 2 }],
  });
  expect(utils.queryByTestId('serves-range-warning')).toBeNull();
  expect(useCartStore.getState().lines).toEqual([]);
});

test('fuera de rango: avisa antes de enviar y solo envía al confirmar de todos modos', async () => {
  (createOrder as jest.Mock).mockResolvedValue({ ...createdOrder, peopleCount: 50, needsReview: true });
  const utils = renderWithProviders(<CheckoutScreen />);

  fillForm(utils, '50');
  fireEvent.press(utils.getByTestId('checkout-confirm'));

  expect(utils.getByTestId('serves-range-warning')).toBeTruthy();
  expect(utils.getByText('Chilaquiles: 300–500 personas')).toBeTruthy();
  expect(createOrder).not.toHaveBeenCalled();

  fireEvent.press(utils.getByTestId('serves-range-confirm'));

  await waitFor(() => expect(utils.getByTestId('order-placed-review')).toBeTruthy());
  expect(createOrder).toHaveBeenCalledWith(expect.objectContaining({ peopleCount: 50 }));
});

test('fuera de rango: "Ajustar" cierra el aviso sin enviar', () => {
  const utils = renderWithProviders(<CheckoutScreen />);

  fillForm(utils, '50');
  fireEvent.press(utils.getByTestId('checkout-confirm'));
  fireEvent.press(utils.getByTestId('serves-range-adjust'));

  expect(utils.queryByTestId('serves-range-warning')).toBeNull();
  expect(utils.getByTestId('checkout-confirm')).toBeTruthy();
  expect(createOrder).not.toHaveBeenCalled();
});

test('si la API falla muestra el error y conserva el carrito', async () => {
  (createOrder as jest.Mock).mockRejectedValue(new Error('Network Error'));
  const utils = renderWithProviders(<CheckoutScreen />);

  fillForm(utils, '400');
  fireEvent.press(utils.getByTestId('checkout-confirm'));

  await waitFor(() => expect(utils.getByTestId('checkout-error')).toBeTruthy());
  expect(utils.getByText('Network Error')).toBeTruthy();
  expect(useCartStore.getState().lines).toHaveLength(1);
});
