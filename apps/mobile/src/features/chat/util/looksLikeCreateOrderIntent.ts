const CREATE_ORDER_KEYWORDS = [
  'pedirme',
  'puedes pedir',
  'quiero pedir',
  'necesito pedir',
  'hacer un pedido',
  'crear un pedido',
  'nuevo pedido',
  'nueva orden',
  'quiero ordenar',
  'quiero una orden',
  'necesito una orden',
];

/**
 * Heurística simple de palabras clave (ver ChatScreen.tsx, mismo v1
 * pattern-based que looksOrderRelated) para distinguir "quiero crear un
 * pedido" de "quiero consultar mis pedidos" -- se evalúa antes que
 * looksOrderRelated porque un mensaje de creación normalmente también
 * contiene "pedido"/"orden" y calzaría con esa heurística más genérica.
 */
export function looksLikeCreateOrderIntent(message: string): boolean {
  const normalized = message.toLowerCase();
  return CREATE_ORDER_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
