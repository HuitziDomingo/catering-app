import { z } from 'zod';
import { OrderStatus } from '@catering-app/shared-types';

/**
 * MCP Tool: consultar_pedidos_por_cliente
 *
 * Permite a un cliente consultar sus propios pedidos con filtros opcionales.
 * El clienteId se obtiene del contexto de autenticación JWT (no es un parámetro
 * de entrada del tool para evitar que el LLM pueda inyectar IDs arbitrarios).
 *
 * Este tool es invocado por el chatbot de soporte cuando un cliente pregunta
 * por el estado de su pedido o quiere ver su historial.
 */
export const consultarPedidosPorClienteInputSchema = z.object({
  estado: z
    .nativeEnum(OrderStatus)
    .optional()
    .describe(
      'Estado del pedido para filtrar (pending, confirmed, preparing, delivered, cancelled)',
    ),
  limite: z
    .number()
    .int()
    .min(1)
    .max(20)
    .default(5)
    .describe('Número máximo de resultados a retornar (1-20, default 5)'),
});

export const consultarPedidosPorClienteTool = {
  name: 'consultar_pedidos_por_cliente',
  description:
    'Consulta los pedidos de un cliente autenticado, con filtros opcionales por estado y límite de resultados.',
  inputSchema: consultarPedidosPorClienteInputSchema,
};

export type ConsultarPedidosPorClienteInput = z.infer<
  typeof consultarPedidosPorClienteInputSchema
>;
