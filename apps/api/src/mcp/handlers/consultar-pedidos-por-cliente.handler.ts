import { McpToolLogsService } from '../mcp-tool-logs.service';
import { OrdersService } from '../../orders/orders.service';
import {
  consultarPedidosPorClienteTool,
  ConsultarPedidosPorClienteInput,
} from '../tools/consultar-pedidos-por-cliente.tool';
import { JwtPayload } from '../../auth/jwt-payload.interface';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

/**
 * Handler for the consultar_pedidos_por_cliente MCP tool.
 *
 * This function contains the core business logic for the tool, separated
 * from the transport registration for testability.
 */
export async function handleConsultarPedidosPorCliente(
  input: unknown,
  extra: { authInfo?: AuthInfo },
  services: {
    mcpToolLogsService: McpToolLogsService;
    ordersService: OrdersService;
  },
) {
  // Validate input using the Zod schema
  const validatedInput = consultarPedidosPorClienteTool.inputSchema.parse(input) as ConsultarPedidosPorClienteInput;
  const user = extractJwtUserFromAuthInfo(extra.authInfo);

  if (!user) {
    throw new Error('Usuario no autenticado');
  }

  if (user.role !== 'customer') {
    throw new Error('Este tool solo está disponible para clientes');
  }

  const toolName = consultarPedidosPorClienteTool.name;

  try {
    const orders = await services.ordersService.findByCustomer(user.sub, {
      status: validatedInput.estado,
      limit: validatedInput.limite,
    });

    const result = {
      success: true,
      data: orders.map((order) => ({
        id: order.id,
        status: order.status,
        peopleCount: order.peopleCount,
        scheduledFor: order.scheduledFor.toISOString(),
        subtotal: Number(order.subtotal),
        total: Number(order.total),
        notes: order.notes,
        createdAt: order.createdAt.toISOString(),
      })),
      count: orders.length,
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
 * This is the same logic as getJwtUserFromAuthInfo but kept separate
 * to avoid circular dependencies in tests.
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
