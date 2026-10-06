import { TestBed } from '@angular/core/testing';
import type { MenuCategory, MenuItem } from '@catering-app/shared-types';
import { MenuItemList } from './menu-item-list';

const category: MenuCategory = { id: 'cat-1', name: 'Desayunos', displayOrder: 1, isActive: true };

const item: MenuItem = {
  id: 'item-1',
  categoryId: 'cat-1',
  name: 'Chilaquiles',
  description: null,
  basePrice: 95,
  servesMin: 1,
  servesMax: 10,
  attributes: {},
  imageUrl: 'http://storage.test/a.webp',
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

describe('MenuItemList', () => {
  const render = (items: MenuItem[]) => {
    const fixture = TestBed.createComponent(MenuItemList);
    fixture.componentRef.setInput('items', items);
    fixture.componentRef.setInput('categories', [category]);
    fixture.detectChanges();
    return fixture.nativeElement as HTMLElement;
  };

  it('shows a thumbnail per row, with a placeholder for items without image', () => {
    const el = render([item, { ...item, id: 'item-2', name: 'Molletes', imageUrl: null }]);

    const rows = el.querySelectorAll('tbody tr');
    expect(rows[0].querySelector<HTMLImageElement>('[data-testid="thumbnail-image"]')?.alt).toBe(
      'Chilaquiles',
    );
    expect(rows[1].querySelector('[data-testid="thumbnail-placeholder"]')).not.toBeNull();
  });

  it('spans the empty-state cell across all columns, including the image one', () => {
    const el = render([]);

    const headers = el.querySelectorAll('thead th').length;
    expect(el.querySelector('.menu-item-list__empty')?.getAttribute('colspan')).toBe(String(headers));
  });
});
