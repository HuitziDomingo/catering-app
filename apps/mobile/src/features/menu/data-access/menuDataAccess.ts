import type { MenuCategory, MenuItem } from '@catering-app/shared-types';
import { apiClient } from '../../../core/http/apiClient';

// Capa data-access del feature de menú (ver ADR-020). GET /menu/categories y
// GET /menu/items son públicos (ver ADR-006): no requieren Authorization --
// apiClient les adjunta el token igual (si hay sesión) sin que haga falta,
// no hay endpoints protegidos en este feature todavía. apiClient ya no es
// una instancia duplicada por feature (ver core/http/apiClient.ts): el
// interceptor de refresh necesita ser el mismo en toda la app.

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
