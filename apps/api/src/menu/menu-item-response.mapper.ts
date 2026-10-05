import { MenuItem } from '../database/entities/menu-item.entity';
import { StorageService } from '../storage/storage.service';
import { MenuItemResponseDto } from './dto/menu-item-response.dto';

/**
 * Entidad MenuItem → MenuItemResponseDto. La base guarda la llave de la
 * imagen y aquí se convierte en URL pública con el host vigente
 * (`STORAGE_PUBLIC_URL`, ADR-028); la llave no sale de la API. `basePrice`
 * es numeric de Postgres y llega como string por el driver pg (mismo caso
 * que order-response.mapper.ts).
 */
export function toMenuItemResponse(
  item: MenuItem,
  storage: StorageService,
): MenuItemResponseDto {
  return {
    id: item.id,
    categoryId: item.categoryId,
    name: item.name,
    description: item.description ?? null,
    basePrice: Number(item.basePrice),
    servesMin: item.servesMin,
    servesMax: item.servesMax,
    attributes: item.attributes,
    imageUrl: item.imageKey
      ? storage.getPublicUrl('menuImages', item.imageKey)
      : null,
    isActive: item.isActive,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}
