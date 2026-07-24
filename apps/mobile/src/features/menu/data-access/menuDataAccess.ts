import type { MenuCategory, MenuItem } from '@catering-app/shared-types';
import { apiClient } from './apiClient';

// Capa data-access del feature de menú (ver ADR-020). GET /menu/categories y
// GET /menu/items son públicos (ver ADR-006): no requieren Authorization.

export async function fetchMenuCategories(): Promise<MenuCategory[]> {
  const { data } = await apiClient.get<MenuCategory[]>('/menu/categories');
  return data;
}

export async function fetchMenuItems(categoryId?: string): Promise<MenuItem[]> {
  const { data } = await apiClient.get<MenuItem[]>('/menu/items', {
    params: categoryId ? { categoryId } : undefined,
  });
  return data;
}
