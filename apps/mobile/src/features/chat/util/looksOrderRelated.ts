const ORDER_KEYWORDS = ['pedido', 'pedidos', 'orden', 'ordenes', 'órdenes', 'compra', 'compras'];

/**
 * Heurística simple de palabras clave (ver ChatScreen.tsx) -- no es NLU
 * real, es un v1 funcional y pattern-based. La integración con un LLM real
 * queda para una tarea futura.
 */
export function looksOrderRelated(message: string): boolean {
  const normalized = message.toLowerCase();
  return ORDER_KEYWORDS.some((keyword) => normalized.includes(keyword));
}
