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
  imageUrl?: string | null;
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
  imageUrl?: string | null;
  isActive?: boolean;
}
