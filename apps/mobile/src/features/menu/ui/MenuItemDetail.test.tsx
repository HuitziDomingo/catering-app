import * as React from 'react';
import type { MenuItem } from '@catering-app/shared-types';
import { renderWithProviders } from '../../../test-utils';
import { MenuItemDetail } from './MenuItemDetail';

const mockItem: MenuItem = {
  id: 'item-1',
  categoryId: 'cat-1',
  name: 'Enchiladas verdes',
  description: 'Con pollo deshebrado y crema',
  basePrice: 125.5,
  servesMin: 4,
  servesMax: 4,
  attributes: {},
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test('renders name, category, formatted price, serves range and description', () => {
  const { getByText, getByTestId } = renderWithProviders(
    <MenuItemDetail item={mockItem} categoryName="Platos fuertes" />
  );

  expect(getByText('Enchiladas verdes')).toBeTruthy();
  expect(getByText('Platos fuertes')).toBeTruthy();
  expect(getByText('Con pollo deshebrado y crema')).toBeTruthy();

  const expectedPrice = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
  }).format(125.5);
  expect(getByTestId('menu-item-detail-price')).toHaveTextContent(expectedPrice);
  expect(getByTestId('menu-item-detail-serves')).toHaveTextContent('Sirve 4 personas');
  expect(getByTestId('menu-item-detail-image-placeholder')).toBeTruthy();
});

test('renders a serves range when servesMin and servesMax differ', () => {
  const wideRangeItem = { ...mockItem, servesMin: 300, servesMax: 500 };
  const { getByTestId } = renderWithProviders(
    <MenuItemDetail item={wideRangeItem} categoryName="Platos fuertes" />
  );

  expect(getByTestId('menu-item-detail-serves')).toHaveTextContent(
    'Sirve de 300 a 500 personas'
  );
});

test('falls back to a placeholder message when the item has no description', () => {
  const itemWithoutDescription = { ...mockItem, description: null };
  const { getByText, queryByTestId } = renderWithProviders(
    <MenuItemDetail item={itemWithoutDescription} categoryName={null} />
  );

  expect(getByText('Este platillo no tiene descripción.')).toBeTruthy();
  expect(queryByTestId('menu-item-detail-category')).toBeNull();
});
