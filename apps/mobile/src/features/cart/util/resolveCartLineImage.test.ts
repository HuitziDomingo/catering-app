import type { MenuItem } from '@catering-app/shared-types';
import type { CartLine } from '../state/useCartStore';
import { resolveCartLineImage } from './resolveCartLineImage';

const line: CartLine = {
  menuItemId: 'item-1',
  name: 'Chilaquiles',
  unitPrice: 95,
  servesMin: 1,
  servesMax: 10,
  quantity: 1,
  imageUrl: 'http://storage.test/vieja.webp',
};

const menuItem = (imageUrl: string | null): MenuItem => ({
  id: 'item-1',
  categoryId: 'cat-1',
  name: 'Chilaquiles',
  description: null,
  basePrice: 95,
  servesMin: 1,
  servesMax: 10,
  attributes: {},
  imageUrl,
  isActive: true,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
});

describe('resolveCartLineImage', () => {
  it('usa la imagen vigente del menú, no la guardada (el staff la reemplazó)', () => {
    expect(
      resolveCartLineImage(line, [menuItem('http://storage.test/nueva.webp')]),
    ).toBe('http://storage.test/nueva.webp');
  });

  it('si el menú dice que ya no tiene imagen, no revive la guardada', () => {
    expect(resolveCartLineImage(line, [menuItem(null)])).toBeNull();
  });

  it('con el menú sin cargar (o el platillo dado de baja), usa la guardada como respaldo', () => {
    expect(resolveCartLineImage(line, [])).toBe(
      'http://storage.test/vieja.webp',
    );
  });

  it('una línea de un carrito viejo, sin imageUrl guardada, da null', () => {
    const oldLine: CartLine = { ...line };
    delete oldLine.imageUrl;
    expect(resolveCartLineImage(oldLine, [])).toBeNull();
  });
});
