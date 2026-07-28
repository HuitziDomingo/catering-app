import * as React from 'react';
import { fireEvent } from '@testing-library/react-native';
import type { MenuItem } from '@catering-app/shared-types';
import { renderWithProviders } from '../../../test-utils';
import { MenuItemCard } from './MenuItemCard';

const mockItem: MenuItem = {
  id: 'item-1',
  categoryId: 'cat-1',
  name: 'Enchiladas verdes',
  description: 'Con pollo deshebrado y crema',
  basePrice: 125.5,
  servesMin: 2,
  servesMax: 2,
  attributes: {},
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test('renders name, description, formatted price and serves range', () => {
  const { getByText, getByTestId } = renderWithProviders(
    <MenuItemCard item={mockItem} />
  );

  expect(getByText('Enchiladas verdes')).toBeTruthy();
  expect(getByText('Con pollo deshebrado y crema')).toBeTruthy();

  const expectedPrice = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(125.5);
  expect(getByTestId('menu-item-price')).toHaveTextContent(expectedPrice);
  expect(getByTestId('menu-item-serves')).toHaveTextContent('Sirve 2 personas');
});

test('renders a serves range when servesMin and servesMax differ', () => {
  const wideRangeItem = { ...mockItem, servesMin: 300, servesMax: 500 };
  const { getByTestId } = renderWithProviders(
    <MenuItemCard item={wideRangeItem} />
  );

  expect(getByTestId('menu-item-serves')).toHaveTextContent(
    'Sirve de 300 a 500 personas'
  );
});

test('omits the description block when the item has none', () => {
  const itemWithoutDescription = { ...mockItem, description: null };
  const { queryByText } = renderWithProviders(
    <MenuItemCard item={itemWithoutDescription} />
  );
  expect(queryByText('Con pollo deshebrado y crema')).toBeNull();
});

test('calls onPress with the item when tapped', () => {
  const onPress = jest.fn();
  const { getByTestId } = renderWithProviders(
    <MenuItemCard item={mockItem} onPress={onPress} />
  );

  fireEvent.press(getByTestId('menu-item-card'));
  expect(onPress).toHaveBeenCalledWith(mockItem);
});
