import { McpToolLogsService } from '../mcp-tool-logs.service';
import { OrdersService } from '../../orders/orders.service';
import { crearPedidoTool, CrearPedidoInput } from '../tools/crear-pedido.tool';
import { JwtPayload } from '../../auth/jwt-payload.interface';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

/**
 * Handler for the crear_pedido MCP tool (ADR-023).
 *
 * This function contains the core business logic for the tool, separated
 * from the transport registration for testability.
 */
export async function handleCrearPedido(
  input: unknown,
  extra: { authInfo?: AuthInfo },
  services: {
    mcpToolLogsService: McpToolLogsService;
    ordersService: OrdersService;
  },
) {
  // Validate input using the Zod schema
  const validatedInput = crearPedidoTool.inputSchema.parse(input) as CrearPedidoInput;
  const user = extractJwtUserFromAuthInfo(extra.authInfo);

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  if (user.role !== 'customer') {
    throw new Error('Este tool solo está disponible para clientes');
  }

  const toolName = crearPedidoTool.name;

  try {
    const order = await services.ordersService.createOrder(user.sub, {
      items: validatedInput.items.map((item) => ({
        menuItemId: item.menuItemId,
        quantity: item.quantity,
      })),
      peopleCount: validatedInput.peopleCount,
      scheduledFor: validatedInput.scheduledFor,
      notes: validatedInput.notes,
    });

    const result = {
      success: true,
      data: {
        id: order.id,
        status: order.status,
        peopleCount: order.peopleCount,
        scheduledFor: order.scheduledFor.toISOString(),
        subtotal: Number(order.subtotal),
        total: Number(order.total),
        notes: order.notes,
        needsReview: order.needsReview,
        createdAt: order.createdAt.toISOString(),
      },
    };

    await services.mcpToolLogsService.logSuccess(
      toolName,
      user.sub,
      validatedInput,
      result,
    );

    return {
      content: [
        {
          type: 'text' as const,
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Error desconocido';

    await services.mcpToolLogsService.logError(
      toolName,
      user.sub,
      validatedInput as Record<string, unknown>,
      errorMessage,
    );

    throw error;
  }
}

/**
 * Extracts the JwtPayload from AuthInfo.extra.user.
 * Same logic as extractJwtUserFromAuthInfo in the consultar-pedidos-por-
 * cliente handler, kept separate to avoid circular dependencies in tests.
 */
function extractJwtUserFromAuthInfo(
  authInfo: AuthInfo | undefined,
): JwtPayload | undefined {
  const user = authInfo?.extra?.user;
  if (
    user &&
    typeof user === 'object' &&
    'sub' in user &&
    'email' in user &&
    'role' in user
  ) {
    return user as JwtPayload;
  }
  return undefined;
}
