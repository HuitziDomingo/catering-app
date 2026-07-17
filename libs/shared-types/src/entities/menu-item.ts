export interface MenuItem {
  id: string;
  categoryId: string;
  name: string;
  description: string | null;
  basePrice: number;
  servesPeople: number;
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
  servesPeople: number;
  attributes?: Record<string, unknown>;
  imageUrl?: string | null;
  isActive?: boolean;
}

export interface UpdateMenuItemDto {
  categoryId?: string;
  name?: string;
  description?: string | null;
  basePrice?: number;
  servesPeople?: number;
  attributes?: Record<string, unknown>;
  imageUrl?: string | null;
  isActive?: boolean;
}
