import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import type { Request } from 'express';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
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
  };

  const reflector = new Reflector();

  beforeEach(async () => {
    menuService = {
      findActiveCategories: jest.fn(),
      findActiveItems: jest.fn(),
      createItem: jest.fn(),
      updateItem: jest.fn(),
      softDeleteItem: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MenuController],
      providers: [{ provide: MenuService, useValue: menuService }],
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
    const writeHandlers: Array<[string, MenuController['createItem'] | MenuController['updateItem'] | MenuController['deleteItem']]> = [
      ['createItem', MenuController.prototype.createItem],
      ['updateItem', MenuController.prototype.updateItem],
      ['deleteItem', MenuController.prototype.deleteItem],
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
      const dto = { categoryId: 'cat-1', name: 'Tacos', basePrice: 50, servesPeople: 1 };
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
});
