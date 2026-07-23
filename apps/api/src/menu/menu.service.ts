import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MenuCategory } from '../database/entities/menu-category.entity';
import { MenuItem } from '../database/entities/menu-item.entity';
import { MenuItemPriceHistory } from '../database/entities/menu-item-price-history.entity';
import { CreateMenuItemDto } from './dto/create-menu-item.dto';
import { UpdateMenuItemDto } from './dto/update-menu-item.dto';

/**
 * Servicio del catálogo de menú (ver ADR-006). Cada cambio de basePrice en
 * un platillo queda registrado en menu_item_price_history (quién y cuándo),
 * no solo el precio vigente.
 */
@Injectable()
export class MenuService {
  constructor(
    @InjectRepository(MenuCategory)
    private readonly categories: Repository<MenuCategory>,
    @InjectRepository(MenuItem)
    private readonly items: Repository<MenuItem>,
    @InjectRepository(MenuItemPriceHistory)
    private readonly priceHistory: Repository<MenuItemPriceHistory>,
  ) {}

  findActiveCategories(): Promise<MenuCategory[]> {
    return this.categories.find({
      where: { isActive: true },
      order: { displayOrder: 'ASC' },
    });
  }

  findActiveItems(categoryId?: string): Promise<MenuItem[]> {
    return this.items.find({
      where: { isActive: true, ...(categoryId ? { categoryId } : {}) },
      order: { name: 'ASC' },
    });
  }

  async createItem(dto: CreateMenuItemDto): Promise<MenuItem> {
    await this.findCategoryOrThrow(dto.categoryId);

    const item = this.items.create({
      categoryId: dto.categoryId,
      name: dto.name,
      description: dto.description ?? null,
      basePrice: dto.basePrice,
      servesPeople: dto.servesPeople,
      attributes: dto.attributes ?? {},
      imageUrl: dto.imageUrl ?? null,
      isActive: dto.isActive ?? true,
    });
    return this.items.save(item);
  }

  /**
   * Actualiza un platillo. Si `basePrice` cambia, escribe la fila de
   * auditoría en menu_item_price_history con el precio anterior, el nuevo,
   * y quién lo cambió (ver ADR-006).
   */
  async updateItem(
    id: string,
    dto: UpdateMenuItemDto,
    changedBy: string,
  ): Promise<MenuItem> {
    const item = await this.findItemOrThrow(id);

    if (dto.categoryId) {
      await this.findCategoryOrThrow(dto.categoryId);
    }

    // numeric de Postgres llega como string por el driver pg; se normaliza
    // antes de comparar (mismo patrón que mcp.server.ts con subtotal/total).
    const oldPrice = Number(item.basePrice);
    const priceChanged =
      dto.basePrice !== undefined && dto.basePrice !== oldPrice;

    Object.assign(item, dto);
    const saved = await this.items.save(item);

    if (priceChanged) {
      const history = this.priceHistory.create({
        menuItemId: saved.id,
        oldPrice,
        newPrice: dto.basePrice as number,
        changedBy,
      });
      await this.priceHistory.save(history);
    }

    return saved;
  }

  async softDeleteItem(id: string): Promise<void> {
    const item = await this.findItemOrThrow(id);
    item.isActive = false;
    await this.items.save(item);
  }

  private async findItemOrThrow(id: string): Promise<MenuItem> {
    const item = await this.items.findOne({ where: { id } });
    if (!item) {
      throw new NotFoundException('El platillo indicado no existe.');
    }
    return item;
  }

  private async findCategoryOrThrow(
    categoryId: string,
  ): Promise<MenuCategory> {
    const category = await this.categories.findOne({
      where: { id: categoryId },
    });
    if (!category) {
      throw new NotFoundException('La categoría indicada no existe.');
    }
    return category;
  }
}
