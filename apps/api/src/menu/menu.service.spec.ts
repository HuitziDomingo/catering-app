import { BadRequestException, NotFoundException } from '@nestjs/common';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { MenuCategory } from '../database/entities/menu-category.entity';
import { MenuItem } from '../database/entities/menu-item.entity';
import { MenuItemPriceHistory } from '../database/entities/menu-item-price-history.entity';
import { StorageService } from '../storage/storage.service';
import { MenuService } from './menu.service';
import { processMenuImage } from './menu-image.processor';

// sharp se prueba en menu-image.processor.spec.ts y en el integration spec;
// aquí solo importa qué hace el servicio con el resultado.
jest.mock('./menu-image.processor', () => ({
  processMenuImage: jest.fn(),
}));
const mockProcessMenuImage = processMenuImage as jest.MockedFunction<
  typeof processMenuImage
>;

type MockRepo<T extends object> = {
  [K in keyof T]?: jest.Mock;
} & Record<string, jest.Mock>;

describe('MenuService', () => {
  let service: MenuService;
  let itemsRepo: MockRepo<MenuItem>;
  let categoriesRepo: MockRepo<MenuCategory>;
  let priceHistoryRepo: MockRepo<MenuItemPriceHistory>;
  let storage: {
    putObject: jest.Mock;
    deleteObject: jest.Mock;
    getPublicUrl: jest.Mock;
    getSignedUrl: jest.Mock;
  };

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

    storage = {
      putObject: jest.fn().mockResolvedValue(undefined),
      deleteObject: jest.fn().mockResolvedValue(undefined),
      getPublicUrl: jest.fn(),
      getSignedUrl: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: StorageService, useValue: storage },
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
        servesMin: 1,
        servesMax: 1,
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
        servesMin: 1,
        servesMax: 1,
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
        servesMin: 1,
        servesMax: 1,
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
        servesMin: 1,
        servesMax: 1,
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
          servesMin: 1,
          servesMax: 1,
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
        servesMin: 1,
        servesMax: 1,
      });

      expect(itemsRepo.save).toHaveBeenCalled();
      expect(result.name).toBe('Tacos');
      expect(result.isActive).toBe(true);
    });

    it('creates the item with a wide serves range (ADR-021 catering case)', async () => {
      categoriesRepo.findOne.mockResolvedValue({ id: categoryId });

      const result = await service.createItem({
        categoryId,
        name: 'Charola grande',
        basePrice: 3000,
        servesMin: 300,
        servesMax: 500,
      });

      expect(itemsRepo.save).toHaveBeenCalled();
      expect(result.servesMin).toBe(300);
      expect(result.servesMax).toBe(500);
    });

    it('throws BadRequestException when servesMax is less than servesMin', async () => {
      categoriesRepo.findOne.mockResolvedValue({ id: categoryId });

      await expect(
        service.createItem({
          categoryId,
          name: 'Tacos',
          basePrice: 50,
          servesMin: 10,
          servesMax: 5,
        }),
      ).rejects.toThrow(BadRequestException);
      expect(itemsRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('updateItem — serves range validation (ADR-021)', () => {
    it('throws BadRequestException when the new servesMax is less than the new servesMin', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: itemId,
        categoryId,
        basePrice: '100.00',
        servesMin: 1,
        servesMax: 1,
        isActive: true,
      } as unknown as MenuItem);

      await expect(
        service.updateItem(itemId, { servesMin: 10, servesMax: 5 }, userId),
      ).rejects.toThrow(BadRequestException);
      expect(itemsRepo.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when only servesMax is updated below the saved servesMin', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: itemId,
        categoryId,
        basePrice: '100.00',
        servesMin: 300,
        servesMax: 500,
        isActive: true,
      } as unknown as MenuItem);

      await expect(
        service.updateItem(itemId, { servesMax: 100 }, userId),
      ).rejects.toThrow(BadRequestException);
      expect(itemsRepo.save).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when only servesMin is updated above the saved servesMax', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: itemId,
        categoryId,
        basePrice: '100.00',
        servesMin: 300,
        servesMax: 500,
        isActive: true,
      } as unknown as MenuItem);

      await expect(
        service.updateItem(itemId, { servesMin: 600 }, userId),
      ).rejects.toThrow(BadRequestException);
      expect(itemsRepo.save).not.toHaveBeenCalled();
    });

    it('allows updating servesMax alone when it still satisfies the saved servesMin', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: itemId,
        categoryId,
        basePrice: '100.00',
        servesMin: 300,
        servesMax: 500,
        isActive: true,
      } as unknown as MenuItem);

      const result = await service.updateItem(
        itemId,
        { servesMax: 600 },
        userId,
      );

      expect(itemsRepo.save).toHaveBeenCalledTimes(1);
      expect(result.servesMax).toBe(600);
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

  describe('setItemImage', () => {
    const processed = {
      buffer: Buffer.from('webp'),
      contentType: 'image/webp' as const,
    };
    const keyPattern = new RegExp(`^menu-items/${itemId}/[0-9a-f-]{36}\\.webp$`);

    beforeEach(() => {
      mockProcessMenuImage.mockResolvedValue(processed);
    });

    it('uploads the processed image under a new key and saves it on the item', async () => {
      itemsRepo.findOne.mockResolvedValue({ id: itemId, imageKey: null });

      const saved = await service.setItemImage(itemId, Buffer.from('raw'));

      expect(mockProcessMenuImage).toHaveBeenCalledWith(Buffer.from('raw'));
      const [bucket, key, body, contentType] = storage.putObject.mock.calls[0];
      expect(bucket).toBe('menuImages');
      expect(key).toMatch(keyPattern);
      expect(body).toBe(processed.buffer);
      expect(contentType).toBe('image/webp');
      expect(saved.imageKey).toBe(key);
      expect(storage.deleteObject).not.toHaveBeenCalled();
    });

    it('deletes the previous image only after saving the new one', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: itemId,
        imageKey: 'menu-items/old.webp',
      });
      const order: string[] = [];
      itemsRepo.save.mockImplementation((data) => {
        order.push('save');
        return Promise.resolve(data);
      });
      storage.deleteObject.mockImplementation(() => {
        order.push('delete');
        return Promise.resolve();
      });

      await service.setItemImage(itemId, Buffer.from('raw'));

      expect(storage.deleteObject).toHaveBeenCalledWith(
        'menuImages',
        'menu-items/old.webp',
      );
      expect(order).toEqual(['save', 'delete']);
    });

    it('gives a different key on every upload (no stale caches)', async () => {
      itemsRepo.findOne.mockResolvedValue({ id: itemId, imageKey: null });

      await service.setItemImage(itemId, Buffer.from('a'));
      await service.setItemImage(itemId, Buffer.from('b'));

      const [first, second] = storage.putObject.mock.calls.map((c) => c[1]);
      expect(first).not.toBe(second);
    });

    it('still succeeds if deleting the previous image fails', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: itemId,
        imageKey: 'menu-items/old.webp',
      });
      storage.deleteObject.mockRejectedValue(new Error('storage down'));

      const saved = await service.setItemImage(itemId, Buffer.from('raw'));

      expect(saved.imageKey).toMatch(keyPattern);
    });

    it('removes the just-uploaded object if saving the item fails', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: itemId,
        imageKey: 'menu-items/old.webp',
      });
      itemsRepo.save.mockRejectedValue(new Error('db down'));

      await expect(
        service.setItemImage(itemId, Buffer.from('raw')),
      ).rejects.toThrow('db down');

      const newKey = storage.putObject.mock.calls[0][1];
      expect(storage.deleteObject).toHaveBeenCalledTimes(1);
      expect(storage.deleteObject).toHaveBeenCalledWith('menuImages', newKey);
    });

    it('does not upload anything if the image is invalid', async () => {
      itemsRepo.findOne.mockResolvedValue({ id: itemId, imageKey: null });
      mockProcessMenuImage.mockRejectedValue(new BadRequestException());

      await expect(
        service.setItemImage(itemId, Buffer.from('raw')),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(storage.putObject).not.toHaveBeenCalled();
      expect(itemsRepo.save).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown item without processing the file', async () => {
      itemsRepo.findOne.mockResolvedValue(null);

      await expect(
        service.setItemImage(itemId, Buffer.from('raw')),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(mockProcessMenuImage).not.toHaveBeenCalled();
    });
  });

  describe('removeItemImage', () => {
    it('clears the key, saves, and deletes the object', async () => {
      itemsRepo.findOne.mockResolvedValue({
        id: itemId,
        imageKey: 'menu-items/old.webp',
      });

      const saved = await service.removeItemImage(itemId);

      expect(saved.imageKey).toBeNull();
      expect(itemsRepo.save).toHaveBeenCalledTimes(1);
      expect(storage.deleteObject).toHaveBeenCalledWith(
        'menuImages',
        'menu-items/old.webp',
      );
    });

    it('is a no-op when the item has no image', async () => {
      itemsRepo.findOne.mockResolvedValue({ id: itemId, imageKey: null });

      await service.removeItemImage(itemId);

      expect(itemsRepo.save).not.toHaveBeenCalled();
      expect(storage.deleteObject).not.toHaveBeenCalled();
    });

    it('throws NotFoundException for an unknown item', async () => {
      itemsRepo.findOne.mockResolvedValue(null);

      await expect(service.removeItemImage(itemId)).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });
});
