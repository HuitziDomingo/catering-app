import * as React from 'react';
import { waitFor } from '@testing-library/react-native';
import { renderWithProviders } from './test-utils';
import { useMenuStore } from './features/menu/state/useMenuStore';
import Index from './app/index';

// UI Kitten's eva theme mapping generation is expensive on its first render
// in a test process; the default 5s Jest timeout isn't enough here.
jest.setTimeout(15000);

jest.mock('./features/menu/data-access/menuDataAccess', () => ({
  fetchMenuCategories: jest.fn(),
  fetchMenuItems: jest.fn(),
}));

import {
  fetchMenuCategories,
  fetchMenuItems,
} from './features/menu/data-access/menuDataAccess';

const mockCategory = { id: 'cat-1', name: 'Desayuno', displayOrder: 1, isActive: true };
const mockItem = {
  id: 'item-1',
  categoryId: 'cat-1',
  name: 'Chilaquiles',
  description: 'Con pollo',
  basePrice: 95,
  servesPeople: 1,
  attributes: {},
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

beforeEach(() => {
  useMenuStore.setState({
    categories: [],
    items: [],
    selectedCategoryId: null,
    status: 'idle',
    error: null,
  });
  jest.clearAllMocks();
});

test('renders the real menu screen with categories and items once loaded', async () => {
  (fetchMenuCategories as jest.Mock).mockResolvedValue([mockCategory]);
  (fetchMenuItems as jest.Mock).mockResolvedValue([mockItem]);

  const { getByText, queryByTestId } = renderWithProviders(<Index />);

  await waitFor(() => expect(queryByTestId('menu-loading')).toBeNull());

  expect(getByText('Desayuno')).toBeTruthy();
  expect(getByText('Chilaquiles')).toBeTruthy();
});

test('shows an error state with a retry button when the API call fails', async () => {
  (fetchMenuCategories as jest.Mock).mockRejectedValue(new Error('Network down'));
  (fetchMenuItems as jest.Mock).mockResolvedValue([]);

  const { getByText, getByTestId } = renderWithProviders(<Index />);

  await waitFor(() => getByTestId('menu-error'));
  expect(getByText('Network down')).toBeTruthy();
  expect(getByText('Reintentar')).toBeTruthy();
});
