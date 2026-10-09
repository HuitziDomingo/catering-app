/**
 * Tope de líneas (platillos) por pedido. Lo aplican CreateOrderDto (POST
 * /orders) y el schema zod de la tool MCP crear_pedido -- mismo límite y
 * mismo mensaje en ambos lados. Además de ser una regla de negocio razonable,
 * acota la memoria que puede consumir validar un array enorme: zod no tiene
 * parche para SNYK-JS-ZOD-20510278 (acumula un issue por cada elemento
 * inválido de un array sin límite).
 */
export const MAX_ORDER_ITEMS = 50;

export const MAX_ORDER_ITEMS_MESSAGE = `Un pedido admite como máximo ${MAX_ORDER_ITEMS} platillos (items).`;

export const MIN_ORDER_ITEMS_MESSAGE =
  'El pedido debe incluir al menos un platillo (items).';
