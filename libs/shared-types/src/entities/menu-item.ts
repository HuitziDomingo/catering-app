export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: number;
  // Rango de personas que sirve una orden de este platillo (ver ADR-021):
  // reemplaza el servesPeople de un solo entero. servesMax >= servesMin.
  servesMin: number;
  servesMax: number;
  attributes: Record<string, unknown>;
  // URL pública armada por la API; se pone solo subiendo la imagen
  // (POST /menu/items/:id/image, ADR-028), nunca en create/update.
  imageUrl: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMenuItemDto {
  categoryId: string;
  name: string;
  description?: string | null;
  basePrice: number;
  servesMin: number;
  servesMax: number;
  attributes?: Record<string, unknown>;
  isActive?: boolean;
}

export interface UpdateMenuItemDto {
  categoryId?: string;
  name?: string;
  description?: string | null;
  basePrice?: number;
  servesMin?: number;
  servesMax?: number;
  attributes?: Record<string, unknown>;
  isActive?: boolean;
}
