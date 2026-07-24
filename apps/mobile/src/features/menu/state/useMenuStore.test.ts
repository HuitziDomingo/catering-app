import { useMenuStore, selectVisibleItems, type MenuState } from './useMenuStore';
import { fetchMenuCategories, fetchMenuItems } from '../data-access/menuDataAccess';

jest.mock('../data-access/menuDataAccess');

const categoryA = { id: 'cat-a', name: 'Categoría A', displayOrder: 1, isActive: true };
const categoryB = { id: 'cat-b', name: 'Categoría B', displayOrder: 2, isActive: true };

const itemA = {
  id: 'item-a',
  categoryId: 'cat-a',
  name: 'Platillo A',
  description: null,
  basePrice: 50,
  servesPeople: 1,
  attributes: {},
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};
const itemB = { ...itemA, id: 'item-b', categoryId: 'cat-b', name: 'Platillo B' };

const initialState = useMenuStore.getState();

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

describe('selectVisibleItems', () => {
  const baseState: MenuState = {
    ...initialState,
    categories: [categoryA, categoryB],
    items: [itemA, itemB],
  };

  test('returns all items when no category is selected', () => {
    expect(selectVisibleItems({ ...baseState, selectedCategoryId: null })).toEqual([
      itemA,
      itemB,
    ]);
  });

  test('filters items by the selected category', () => {
    expect(selectVisibleItems({ ...baseState, selectedCategoryId: 'cat-b' })).toEqual([
      itemB,
    ]);
  });

  test('returns an empty list when no item matches the selected category', () => {
    expect(selectVisibleItems({ ...baseState, selectedCategoryId: 'cat-c' })).toEqual([]);
  });
});

test('selectCategory updates the selected category in the store', () => {
  useMenuStore.getState().selectCategory('cat-a');
  expect(useMenuStore.getState().selectedCategoryId).toBe('cat-a');

  useMenuStore.getState().selectCategory(null);
  expect(useMenuStore.getState().selectedCategoryId).toBeNull();
});

test('load() populates categories and items on success', async () => {
  (fetchMenuCategories as jest.Mock).mockResolvedValue([categoryA]);
  (fetchMenuItems as jest.Mock).mockResolvedValue([itemA]);

  await useMenuStore.getState().load();

  expect(useMenuStore.getState().status).toBe('success');
  expect(useMenuStore.getState().categories).toEqual([categoryA]);
  expect(useMenuStore.getState().items).toEqual([itemA]);
});

test('load() sets an error status when the API call fails', async () => {
  (fetchMenuCategories as jest.Mock).mockRejectedValue(new Error('Network down'));
  (fetchMenuItems as jest.Mock).mockResolvedValue([]);

  await useMenuStore.getState().load();

  expect(useMenuStore.getState().status).toBe('error');
  expect(useMenuStore.getState().error).toBe('Network down');
});
