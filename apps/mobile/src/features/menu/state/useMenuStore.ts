import { create } from 'zustand';
import type { MenuCategory, MenuItem } from '@catering-app/shared-types';
import { fetchMenuCategories, fetchMenuItems } from '../data-access/menuDataAccess';

export type MenuStatus = 'idle' | 'loading' | 'success' | 'error';

export type MenuState = {
  categories: MenuCategory[];
  items: MenuItem[];
  selectedCategoryId: string | null;
  status: MenuStatus;
  error: string | null;
  load: () => Promise<void>;
  selectCategory: (categoryId: string | null) => void;
};

export const useMenuStore = create<MenuState>((set) => ({
  categories: [],
  items: [],
  selectedCategoryId: null,
  status: 'idle',
  error: null,
  async load() {
    set({ status: 'loading', error: null });
    try {
      const [categories, items] = await Promise.all([
        fetchMenuCategories(),
        fetchMenuItems(),
      ]);
      set({ categories, items, status: 'success' });
    } catch (err) {
      set({
        status: 'error',
        error: err instanceof Error ? err.message : 'No se pudo cargar el menú.',
      });
    }
  },
  selectCategory(categoryId) {
    set({ selectedCategoryId: categoryId });
  },
}));

/** Selector puro: platillos visibles según la categoría seleccionada. */
export function selectVisibleItems(state: MenuState): MenuItem[] {
  return state.selectedCategoryId === null
    ? state.items
    : state.items.filter((item) => item.categoryId === state.selectedCategoryId);
}
