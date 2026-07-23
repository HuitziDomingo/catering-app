import { NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { MenuCategory } from '../database/entities/menu-category.entity';
import { MenuItem } from '../database/entities/menu-item.entity';
import { MenuItemPriceHistory } from '../database/entities/menu-item-price-history.entity';
import { MenuService } from './menu.service';

type MockRepo<T extends object> = {
  [K in keyof T]?: jest.Mock;
} & Record<string, jest.Mock>;

describe('MenuService', () => {
  let service: MenuService;
  let itemsRepo: MockRepo<MenuItem>;
  let categoriesRepo: MockRepo<MenuCategory>;
  let priceHistoryRepo: MockRepo<MenuItemPriceHistory>;

  const categoryId = '11111111-1111-1111-1111-111111111111';
  const itemId = '22222222-2222-2222-2222-222222222222';
  const userId = '33333333-3333-3333-3333-333333333333';

  beforeEach(async () => {
    itemsRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
    };
    categoriesRepo = {
      find: jest.fn(),
      findOne: jest.fn(),
    };
    priceHistoryRepo = {
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve(data)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: getRepositoryToken(MenuCategory), useValue: categoriesRepo },
        { provide: getRepositoryToken(MenuItem), useValue: itemsRepo },
        {
          provide: getRepositoryToken(MenuItemPriceHistory),
          useValue: priceHistoryRepo,
        },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('updateItem — price history audit trail', () => {
    it('writes a price_history row with old/new price and changedBy when basePrice changes', async () => {
      // El driver pg devuelve columnas numeric como string; se simula aquí
      // para verificar que la comparación de precios lo normaliza.
      itemsRepo.findOne.mockResolvedValue({
        id: itemId,
        categoryId,
        basePrice: '100.00',
        isActive: true,
      } as unknown as MenuItem);

      await service.updateItem(itemId, { basePrice: 120 }, userId);

      expect(priceHistoryRepo.create).toHaveBeenCalledWith({
        menuItemId: itemId,
        oldPrice: 100,
        newPrice: 120,
        changedBy: userId,
      });
      expect(priceHistoryRepo.save).toHaveBeenCalledTimes(1);
    });

    it('does not write a price_history row when basePrice is absent from the update', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: itemId,
        categoryId,
        basePrice: '100.00',
        isActive: true,
      } as unknown as MenuItem);

      await service.updateItem(itemId, { name: 'Chilaquiles verdes' }, userId);

      expect(priceHistoryRepo.create).not.toHaveBeenCalled();
      expect(priceHistoryRepo.save).not.toHaveBeenCalled();
    });

    it('does not write a price_history row when basePrice is set to the same value', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: itemId,
        categoryId,
        basePrice: '100.00',
        isActive: true,
      } as unknown as MenuItem);

      await service.updateItem(itemId, { basePrice: 100 }, userId);

      expect(priceHistoryRepo.create).not.toHaveBeenCalled();
      expect(priceHistoryRepo.save).not.toHaveBeenCalled();
    });

    it('still saves the item update even when basePrice does not change', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: itemId,
        categoryId,
        name: 'Chilaquiles',
        basePrice: '100.00',
        isActive: true,
      } as unknown as MenuItem);

      const result = await service.updateItem(
        itemId,
        { name: 'Chilaquiles verdes' },
        userId,
      );

      expect(itemsRepo.save).toHaveBeenCalledTimes(1);
      expect(result.name).toBe('Chilaquiles verdes');
    });

    it('throws NotFoundException when the item does not exist', async () => {
      itemsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateItem(itemId, { basePrice: 120 }, userId),
      ).rejects.toThrow(NotFoundException);
      expect(priceHistoryRepo.create).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when categoryId is changed to a non-existent category', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: itemId,
        categoryId,
        basePrice: '100.00',
      } as unknown as MenuItem);
      categoriesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.updateItem(
          itemId,
          { categoryId: '99999999-9999-9999-9999-999999999999' },
          userId,
        ),
      ).rejects.toThrow(NotFoundException);
      expect(itemsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('createItem', () => {
    it('throws NotFoundException when the category does not exist', async () => {
      categoriesRepo.findOne.mockResolvedValue(null);

      await expect(
        service.createItem({
          categoryId,
          name: 'Tacos',
          basePrice: 50,
          servesPeople: 1,
        }),
      ).rejects.toThrow(NotFoundException);
      expect(itemsRepo.save).not.toHaveBeenCalled();
    });

    it('creates the item when the category exists', async () => {
      categoriesRepo.findOne.mockResolvedValue({ id: categoryId });

      const result = await service.createItem({
        categoryId,
        name: 'Tacos',
        basePrice: 50,
        servesPeople: 1,
      });

      expect(itemsRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('Tacos');
      expect(result.isActive).toBe(true);
    });
  });

  describe('softDeleteItem', () => {
    it('sets isActive to false instead of deleting the row', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: itemId,
        isActive: true,
      } as MenuItem);

      await service.softDeleteItem(itemId);

      expect(itemsRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ isActive: false }),
      );
    });

    it('throws NotFoundException when the item does not exist', async () => {
      itemsRepo.findOne.mockResolvedValue(null);

      await expect(service.softDeleteItem(itemId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('findActiveItems', () => {
    it('filters by categoryId when provided', async () => {
      itemsRepo.find.mockResolvedValue([]);

      await service.findActiveItems(categoryId);

      expect(itemsRepo.find).toHaveBeenCalledWith({
        where: { isActive: true, categoryId },
        order: { name: 'ASC' },
      });
    });

    it('omits categoryId from the filter when not provided', async () => {
      itemsRepo.find.mockResolvedValue([]);

      await service.findActiveItems();

      expect(itemsRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { name: 'ASC' },
      });
    });
  });
});
