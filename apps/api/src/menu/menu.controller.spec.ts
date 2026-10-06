import { BadRequestException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { MenuItem } from '../database/entities/menu-item.entity';
import { StorageService } from '../storage/storage.service';
import { MenuController } from './menu.controller';
import { MenuService } from './menu.service';

describe('MenuController', () => {
  let controller: MenuController;
  let menuService: {
    findActiveCategories: jest.Mock;
    findActiveItems: jest.Mock;
    createItem: jest.Mock;
    updateItem: jest.Mock;
    softDeleteItem: jest.Mock;
    setItemImage: jest.Mock;
    removeItemImage: jest.Mock;
  };
  let storage: { getPublicUrl: jest.Mock };

  const reflector = new Reflector();

  beforeEach(async () => {
    menuService = {
      findActiveCategories: jest.fn(),
      findActiveItems: jest.fn(),
      createItem: jest.fn(),
      updateItem: jest.fn(),
      softDeleteItem: jest.fn(),
      setItemImage: jest.fn(),
      removeItemImage: jest.fn(),
    };
    storage = {
      getPublicUrl: jest.fn(
        (bucket: string, key: string) => `http://storage.test/${bucket}/${key}`,
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [
        { provide: MenuService, useValue: menuService },
        { provide: StorageService, useValue: storage },
      ],
    }).compile();

    controller = module.get<MenuController>(MenuController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('role-gating on write endpoints', () => {
    // Estas aserciones prueban que POST/PATCH/DELETE realmente declaran
    // JwtAuthGuard + RolesGuard con roles staff/admin/superadmin (lo que
    // RolesGuard.spec ya prueba que se hace cumplir), y que las rutas GET
    // quedan públicas.
    const writeHandlers: Array<[string, (...args: never[]) => unknown]> = [
      ['createItem', MenuController.prototype.createItem],
      ['updateItem', MenuController.prototype.updateItem],
      ['deleteItem', MenuController.prototype.deleteItem],
      ['uploadItemImage', MenuController.prototype.uploadItemImage],
      ['removeItemImage', MenuController.prototype.removeItemImage],
    ];

    it.each(writeHandlers)('%s requires JwtAuthGuard and RolesGuard', (_name, handler) => {
      const guards = reflector.get<unknown[]>(GUARDS_METADATA, handler);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });

    it.each(writeHandlers)('%s restricts access to staff/admin/superadmin', (_name, handler) => {
      const roles = reflector.get<string[]>(ROLES_KEY, handler);
      expect(roles).toEqual(['staff', 'admin', 'superadmin']);
    });

    it('GET /menu/categories has no role restriction', () => {
      const guards = reflector.get<unknown[]>(
        GUARDS_METADATA,
        MenuController.prototype.findActiveCategories,
      );
      const roles = reflector.get<string[]>(
        ROLES_KEY,
        MenuController.prototype.findActiveCategories,
      );
      expect(guards).toBeUndefined();
      expect(roles).toBeUndefined();
    });

    it('GET /menu/items has no role restriction', () => {
      const guards = reflector.get<unknown[]>(
        GUARDS_METADATA,
        MenuController.prototype.findActiveItems,
      );
      const roles = reflector.get<string[]>(
        ROLES_KEY,
        MenuController.prototype.findActiveItems,
      );
      expect(guards).toBeUndefined();
      expect(roles).toBeUndefined();
    });
  });

  describe('delegation to MenuService', () => {
    it('findActiveCategories delegates to the service', async () => {
      menuService.findActiveCategories.mockResolvedValue([]);

      await controller.findActiveCategories();

      expect(menuService.findActiveCategories).toHaveBeenCalledWith();
    });

    it('findActiveItems forwards the categoryId query param', async () => {
      menuService.findActiveItems.mockResolvedValue([]);

      await controller.findActiveItems('cat-1');

      expect(menuService.findActiveItems).toHaveBeenCalledWith('cat-1');
    });

    it('createItem delegates to the service', async () => {
      const dto = {
        categoryId: 'cat-1',
        name: 'Tacos',
        basePrice: 50,
        servesMin: 1,
        servesMax: 1,
      };
      menuService.createItem.mockResolvedValue({ id: 'item-1', ...dto });

      await controller.createItem(dto);

      expect(menuService.createItem).toHaveBeenCalledWith(dto);
    });

    it('updateItem passes the authenticated user id (sub) as changedBy', async () => {
      const user: JwtPayload = {
        sub: 'user-1',
        email: 'admin@example.com',
        role: 'admin',
      };
      const req = { user } as unknown as Request;
      menuService.updateItem.mockResolvedValue({ id: 'item-1' });

      await controller.updateItem('item-1', { basePrice: 99 }, req);

      expect(menuService.updateItem).toHaveBeenCalledWith(
        'item-1',
        { basePrice: 99 },
        'user-1',
      );
    });

    it('deleteItem delegates to the service', async () => {
      menuService.softDeleteItem.mockResolvedValue(undefined);

      await controller.deleteItem('item-1');

      expect(menuService.softDeleteItem).toHaveBeenCalledWith('item-1');
    });
  });

  describe('responses (menu-item-response.mapper)', () => {
    const entity = {
      id: 'item-1',
      categoryId: 'cat-1',
      name: 'Tacos',
      description: null,
      basePrice: '50.00',
      servesMin: 1,
      servesMax: 10,
      attributes: {},
      imageKey: 'menu-items/item-1/abc.webp',
      isActive: true,
      createdAt: new Date('2026-10-01T00:00:00Z'),
      updatedAt: new Date('2026-10-01T00:00:00Z'),
    } as unknown as MenuItem;

    it('builds imageUrl from the stored key and never exposes the key', async () => {
      menuService.findActiveItems.mockResolvedValue([entity]);

      const [item] = await controller.findActiveItems();

      expect(storage.getPublicUrl).toHaveBeenCalledWith(
        'menuImages',
        'menu-items/item-1/abc.webp',
      );
      expect(item.imageUrl).toBe(
        'http://storage.test/menuImages/menu-items/item-1/abc.webp',
      );
      expect(item).not.toHaveProperty('imageKey');
    });

    it('returns imageUrl null when the item has no image', async () => {
      menuService.findActiveItems.mockResolvedValue([
        { ...entity, imageKey: null },
      ]);

      const [item] = await controller.findActiveItems();

      expect(item.imageUrl).toBeNull();
      expect(storage.getPublicUrl).not.toHaveBeenCalled();
    });

    it('normalizes basePrice (numeric string from pg) to number', async () => {
      menuService.findActiveItems.mockResolvedValue([entity]);

      const [item] = await controller.findActiveItems();

      expect(item.basePrice).toBe(50);
    });
  });

  describe('image endpoints', () => {
    it('uploadItemImage passes the file buffer to the service', async () => {
      const buffer = Buffer.from('fake');
      menuService.setItemImage.mockResolvedValue({
        id: 'item-1',
        imageKey: 'menu-items/item-1/new.webp',
      });

      const result = await controller.uploadItemImage('item-1', {
        buffer,
      } as Express.Multer.File);

      expect(menuService.setItemImage).toHaveBeenCalledWith('item-1', buffer);
      expect(result.imageUrl).toBe(
        'http://storage.test/menuImages/menu-items/item-1/new.webp',
      );
    });

    it('uploadItemImage without a file is 400 and does not call the service', async () => {
      await expect(
        controller.uploadItemImage('item-1', undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
      expect(menuService.setItemImage).not.toHaveBeenCalled();
    });

    it('removeItemImage delegates and returns imageUrl null', async () => {
      menuService.removeItemImage.mockResolvedValue({
        id: 'item-1',
        imageKey: null,
      });

      const result = await controller.removeItemImage('item-1');

      expect(menuService.removeItemImage).toHaveBeenCalledWith('item-1');
      expect(result.imageUrl).toBeNull();
    });
  });
});
