export interface MenuCategory {
  id: string;
  name: string;
  displayOrder: number;
  isActive: boolean;
}

export interface CreateMenuCategoryDto {
  name: string;
  displayOrder: number;
  isActive?: boolean;
}

export interface UpdateMenuCategoryDto {
  name?: string;
  displayOrder?: number;
  isActive?: boolean;
}
