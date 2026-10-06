import type { MenuItem } from '@catering-app/shared-types';
import type { CartLine } from '../state/useCartStore';

/**
 * Imagen a mostrar para una línea del carrito. Manda el menú cargado: si el
 * platillo está ahí, se usa su imageUrl vigente, aunque sea null (el staff
 * pudo quitarla). La URL guardada en la línea solo se usa si el platillo no
 * está en el menú cargado (menú todavía sin cargar, o platillo dado de
 * baja): puede estar vencida, y en ese caso DishImage cae al placeholder.
 */
export function resolveCartLineImage(
  line: CartLine,
  menuItems: readonly MenuItem[],
): string | null {
  const current = menuItems.find((item) => item.id === line.menuItemId);
  if (current) {
    return current.imageUrl;
  }
  return line.imageUrl ?? null;
}
