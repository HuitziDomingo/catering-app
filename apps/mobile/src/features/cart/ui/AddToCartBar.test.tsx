import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import { renderWithProviders } from '../../../test-utils';
import { AddToCartBar } from './AddToCartBar';

jest.setTimeout(30000);

const baseProps = {
  unitPrice: 100,
  servesMin: 10,
  servesMax: 20,
  quantityInCart: 0,
  onAdd: jest.fn(),
  onViewCart: jest.fn(),
};

beforeEach(() => jest.clearAllMocks());

test('agrega la cantidad elegida y el botón muestra el total de esas órdenes', () => {
  const utils = renderWithProviders(<AddToCartBar {...baseProps} />);

  fireEvent.press(utils.getByTestId('add-to-cart-quantity-increment'));
  fireEvent.press(utils.getByTestId('add-to-cart-quantity-increment'));

  expect(utils.getByText('Agregar · $300.00')).toBeTruthy();
  fireEvent.press(utils.getByTestId('add-to-cart-button'));
  expect(baseProps.onAdd).toHaveBeenCalledWith(3);
});

test('muestra el rango que sirve cada orden', () => {
  const utils = renderWithProviders(<AddToCartBar {...baseProps} />);
  expect(utils.getByText('Cada orden sirve de 10 a 20 personas')).toBeTruthy();
});

test('"Ver carrito" solo aparece si el platillo ya está en el carrito', () => {
  // Renders separados: rerender() reemplaza la raíz sin el wrapper de
  // AppProviders (renderWithProviders).
  expect(
    renderWithProviders(<AddToCartBar {...baseProps} />).queryByTestId('view-cart-button')
  ).toBeNull();

  const utils = renderWithProviders(<AddToCartBar {...baseProps} quantityInCart={4} />);
  fireEvent.press(utils.getByTestId('view-cart-button'));
  expect(baseProps.onViewCart).toHaveBeenCalled();
});
