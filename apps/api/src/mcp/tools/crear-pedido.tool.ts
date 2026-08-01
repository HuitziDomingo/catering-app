import { z } from 'zod';

/**
 * MCP Tool: crear_pedido (ADR-023)
 *
 * Permite a un cliente crear un pedido de catering. El input es
 * estructurado (no texto libre): el cliente (chat mobile) es responsable
 * de extraer estos campos del mensaje del usuario antes de invocar la tool
 * (ADR-023 — NLU completa está fuera de alcance de v1).
 *
 * El customerId se obtiene del contexto de autenticación JWT (no es un
 * parámetro de entrada del tool), mismo patrón de seguridad que
 * consultar_pedidos_por_cliente.
 */
export const crearPedidoInputSchema = z.object({
  items: z
    .array(
      z.object({
        menuItemId: z.string().uuid().describe('id (uuid) del platillo de menú'),
        quantity: z.number().int().min(1).describe('Cantidad solicitada del platillo'),
      }),
    )
    .min(1)
    .describe('Platillos solicitados para el pedido'),
  peopleCount: z
    .number()
    .int()
    .min(1)
    .describe('Número de personas para el evento'),
  scheduledFor: z
    .string()
    .datetime({ offset: true })
    .refine((value) => new Date(value).getTime() > Date.now(), {
      message: 'scheduledFor debe ser una fecha futura',
    })
    .describe('Fecha y hora programada del evento (ISO 8601), debe ser futura'),
  notes: z.string().optional().describe('Notas adicionales del pedido'),
});

export const crearPedidoTool = {
  name: 'crear_pedido',
  description:
    'Crea un pedido de catering para el cliente autenticado a partir de los platillos, cantidad de personas y fecha programada.',
  inputSchema: crearPedidoInputSchema,
};

export type CrearPedidoInput = z.infer<typeof crearPedidoInputSchema>;
