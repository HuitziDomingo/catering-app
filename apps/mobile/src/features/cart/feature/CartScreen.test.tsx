import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils';
import { useMenuStore } from '../../menu/state/useMenuStore';
import { useCartStore } from '../state/useCartStore';
import { CartScreen } from './CartScreen';

jest.setTimeout(30000);

const mockPush = jest.fn();
const mockNavigate = jest.fn();
jest.mock('expo-router', () => ({
  useRouter: () => ({ push: mockPush, navigate: mockNavigate, replace: jest.fn() }),
}));

const baseItem = {
  categoryId: 'cat-a',
  description: null,
  attributes: {},
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const chilaquiles = { ...baseItem, id: 'item-a', name: 'Chilaquiles', basePrice: 100, servesMin: 10, servesMax: 20 };
const tamales = { ...baseItem, id: 'item-b', name: 'Tamales', basePrice: 50, servesMin: 5, servesMax: 10 };

beforeEach(() => {
  useCartStore.setState({ lines: [], submitStatus: 'idle', submitError: null, lastOrder: null });
  // Menú ya cargado: CartScreen solo lo pide si está en 'idle'.
  useMenuStore.setState({ items: [], status: 'success' });
  jest.clearAllMocks();
});

test('carrito vacío: mensaje y acceso al menú', () => {
  const utils = renderWithProviders(<CartScreen />);

  expect(utils.getByTestId('cart-empty')).toBeTruthy();
  fireEvent.press(utils.getByText('Ver menú'));
  expect(mockNavigate).toHaveBeenCalledWith('/menu');
});

test('muestra las líneas con su subtotal y el subtotal estimado del carrito', () => {
  useCartStore.getState().addItem(chilaquiles, 2);
  useCartStore.getState().addItem(tamales, 1);

  const utils = renderWithProviders(<CartScreen />);

  expect(utils.getByText('Chilaquiles')).toBeTruthy();
  expect(utils.getByText('Tamales')).toBeTruthy();
  expect(utils.getByTestId('cart-subtotal')).toHaveTextContent('$250.00');
});

test('el stepper cambia la cantidad y el botón de basura quita la línea', () => {
  useCartStore.getState().addItem(chilaquiles, 1);
  useCartStore.getState().addItem(tamales, 1);
  const utils = renderWithProviders(<CartScreen />);

  fireEvent.press(utils.getByTestId('cart-line-item-a-quantity-increment'));
  expect(useCartStore.getState().lines[0].quantity).toBe(2);

  fireEvent.press(utils.getByTestId('cart-line-item-b-remove'));
  expect(useCartStore.getState().lines.map((line) => line.menuItemId)).toEqual(['item-a']);
  expect(utils.queryByText('Tamales')).toBeNull();
});

test('"Continuar" lleva al checkout', () => {
  useCartStore.getState().addItem(chilaquiles, 1);
  const utils = renderWithProviders(<CartScreen />);

  fireEvent.press(utils.getByTestId('cart-checkout'));

  expect(mockPush).toHaveBeenCalledWith('/carrito/checkout');
});

test('la imagen de cada línea sale del menú vigente, no de la URL guardada al agregar', () => {
  useCartStore
    .getState()
    .addItem({ ...chilaquiles, imageUrl: 'http://storage.test/vieja.webp' }, 1);
  useMenuStore.setState({
    items: [{ ...chilaquiles, imageUrl: 'http://storage.test/nueva.webp' }],
    status: 'success',
  });

  const utils = renderWithProviders(<CartScreen />);

  expect(utils.getByTestId('cart-line-item-a-image-img').props.source).toEqual({
    uri: 'http://storage.test/nueva.webp',
  });
});

test('con un carrito guardado y el menú sin cargar, pide el menú', () => {
  const load = jest.fn().mockResolvedValue(undefined);
  useMenuStore.setState({ items: [], status: 'idle', load });
  useCartStore.getState().addItem(chilaquiles, 1);

  renderWithProviders(<CartScreen />);

  expect(load).toHaveBeenCalledTimes(1);
});
