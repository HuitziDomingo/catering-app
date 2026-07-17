export interface MenuItemPriceHistory {
  id: number;
  menuItemId: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
  changedAt: string;
}

export interface CreateMenuItemPriceHistoryDto {
  menuItemId: string;
  oldPrice: number;
  newPrice: number;
  changedBy: string;
}

export interface UpdateMenuItemPriceHistoryDto {
  menuItemId?: string;
  oldPrice?: number;
  newPrice?: number;
  changedBy?: string;
}
