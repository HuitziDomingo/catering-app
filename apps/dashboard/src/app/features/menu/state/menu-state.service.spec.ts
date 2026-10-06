import { TestBed } from '@angular/core/testing';
import { of, Subject, throwError } from 'rxjs';
import type { MenuCategory, MenuItem } from '@catering-app/shared-types';
import { MenuDataAccessService } from '../data-access/menu-data-access.service';
import { MenuStateService } from './menu-state.service';

const category: MenuCategory = {
  id: 'cat-1',
  name: 'Desayunos',
  displayOrder: 1,
  isActive: true,
};

const item: MenuItem = {
  id: 'item-1',
  categoryId: 'cat-1',
  name: 'Chilaquiles',
  description: null,
  basePrice: 95,
  servesMin: 1,
  servesMax: 1,
  attributes: {},
  imageUrl: null,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const otherItem: MenuItem = { ...item, id: 'item-2', name: 'Huevos rancheros' };

describe('MenuStateService', () => {
  let dataAccess: {
    findActiveCategories: jest.Mock;
    findActiveItems: jest.Mock;
    createItem: jest.Mock;
    updateItem: jest.Mock;
    deleteItem: jest.Mock;
    uploadItemImage: jest.Mock;
    removeItemImage: jest.Mock;
  };
  let state: MenuStateService;

  beforeEach(() => {
    dataAccess = {
      findActiveCategories: jest.fn().mockReturnValue(of([category])),
      findActiveItems: jest.fn().mockReturnValue(of([item])),
      createItem: jest.fn(),
      updateItem: jest.fn(),
      deleteItem: jest.fn(),
      uploadItemImage: jest.fn(),
      removeItemImage: jest.fn(),
    };

    TestBed.configureTestingModule({
      providers: [{ provide: MenuDataAccessService, useValue: dataAccess }],
    });
    state = TestBed.inject(MenuStateService);
  });

  it('load() populates categories/items and sets status to success', () => {
    state.load();

    expect(state.status()).toBe('success');
    expect(state.categories()).toEqual([category]);
    expect(state.items()).toEqual([item]);
  });

  it('load() sets an error status when the API call fails', () => {
    dataAccess.findActiveItems.mockReturnValue(
      throwError(() => new Error('Network down')),
    );

    state.load();

    expect(state.status()).toBe('error');
    expect(state.error()).toBe('Network down');
  });

  it('createItem() refreshes the list so the new item appears', () => {
    state.load();
    expect(state.items()).toEqual([item]);

    dataAccess.createItem.mockReturnValue(of(otherItem));
    dataAccess.findActiveItems.mockReturnValue(of([item, otherItem]));

    state
      .createItem({
        categoryId: 'cat-1',
        name: 'Huevos rancheros',
        basePrice: 85,
        servesMin: 2,
        servesMax: 2,
      })
      .subscribe();

    expect(dataAccess.createItem).toHaveBeenCalled();
    expect(state.items()).toEqual([item, otherItem]);
  });

  it('updateItem() refreshes the list after a successful mutation', () => {
    state.load();
    const updated: MenuItem = { ...item, basePrice: 120 };

    dataAccess.updateItem.mockReturnValue(of(updated));
    dataAccess.findActiveItems.mockReturnValue(of([updated]));

    state.updateItem(item.id, { basePrice: 120 }).subscribe();

    expect(dataAccess.updateItem).toHaveBeenCalledWith(item.id, { basePrice: 120 });
    expect(state.items()).toEqual([updated]);
  });

  it('deleteItem() refreshes the list so the item disappears', () => {
    state.load();
    expect(state.items()).toEqual([item]);

    dataAccess.deleteItem.mockReturnValue(of(undefined));
    dataAccess.findActiveItems.mockReturnValue(of([]));

    state.deleteItem(item.id).subscribe();

    expect(dataAccess.deleteItem).toHaveBeenCalledWith(item.id);
    expect(state.items()).toEqual([]);
  });

  it('uploadItemImage() passes progress through and refreshes the list only when done', () => {
    state.load();
    const withImage: MenuItem = { ...item, imageUrl: 'http://storage.test/a.webp' };
    const upload$ = new Subject<
      { type: 'progress'; percent: number } | { type: 'done'; item: MenuItem }
    >();
    dataAccess.uploadItemImage.mockReturnValue(upload$);
    dataAccess.findActiveItems.mockClear();
    dataAccess.findActiveItems.mockReturnValue(of([withImage]));
    const file = new File(['x'], 'a.png', { type: 'image/png' });
    const seen: unknown[] = [];

    state.uploadItemImage(item.id, file).subscribe((event) => seen.push(event));
    upload$.next({ type: 'progress', percent: 40 });

    expect(dataAccess.uploadItemImage).toHaveBeenCalledWith(item.id, file);
    expect(dataAccess.findActiveItems).not.toHaveBeenCalled();

    upload$.next({ type: 'done', item: withImage });

    expect(seen).toEqual([
      { type: 'progress', percent: 40 },
      { type: 'done', item: withImage },
    ]);
    expect(state.items()).toEqual([withImage]);
  });

  it('removeItemImage() refreshes the list after removing', () => {
    state.load();
    dataAccess.removeItemImage.mockReturnValue(of(item));
    dataAccess.findActiveItems.mockReturnValue(of([item]));
    dataAccess.findActiveItems.mockClear();

    state.removeItemImage(item.id).subscribe();

    expect(dataAccess.removeItemImage).toHaveBeenCalledWith(item.id);
    expect(dataAccess.findActiveItems).toHaveBeenCalledTimes(1);
  });

  it('load() cancels a previous load still in flight so a stale response cannot win', () => {
    const stale$ = new Subject<MenuItem[]>();
    const withImage: MenuItem = { ...item, imageUrl: 'http://storage.test/a.webp' };
    dataAccess.findActiveItems.mockReturnValueOnce(stale$).mockReturnValueOnce(of([withImage]));

    state.load();
    state.load();
    // La primera respuesta (sin imagen) llega tarde: ya no debe aplicarse.
    stale$.next([item]);
    stale$.complete();

    expect(state.items()).toEqual([withImage]);
  });
});
