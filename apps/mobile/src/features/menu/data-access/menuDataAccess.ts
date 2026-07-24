// Shell de la capa data-access del feature de menú (ver ADR-020). Cuando se
// construya la pantalla real de menú, esto consumirá GET /menu/items (ver
// ADR-006) vía axios (ADR-007). Por ahora solo el shell de la función, sin
// cliente HTTP ni llamada real todavía.

/** Forma mínima esperada de un platillo; se alineará con
 * `@catering-app/shared-types` cuando esa dependencia se conecte a mobile. */
export type MenuItem = {
  id: string;
  name: string;
  basePrice: number;
  isActive: boolean;
};

export async function fetchMenuItems(): Promise<MenuItem[]> {
  throw new Error('fetchMenuItems: aún no implementado (GET /menu/items).');
}
