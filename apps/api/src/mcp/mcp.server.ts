import { Injectable, UnauthorizedException } from '@nestjs/common';
import { McpToolLogsService } from './mcp-tool-logs.service';
import { OrdersService } from '../orders/orders.service';
import { consultarPedidosPorClienteTool, ConsultarPedidosPorClienteInput } from './tools/consultar-pedidos-por-cliente.tool';
import { JwtPayload } from '../auth/jwt-payload.interface';

/**
 * Servidor MCP que expone tools del dominio de catering.
 *
 * Integra autenticación JWT existente (ADR-010) - el clienteId se extrae
 * del payload validado, no se acepta como parámetro del tool.
 *
 * Cada invocación se audita en mcp_tool_logs (ADR-002, ADR-006).
 */
@Injectable()
export class McpServer {
  constructor(
    private readonly mcpToolLogsService: McpToolLogsService,
    private readonly ordersService: OrdersService,
  ) {}

  /**
   * Ejecuta el tool consultar_pedidos_por_cliente.
   *
   * @param user - Payload JWT validado (contiene sub = userId)
   * @param input - Parámetros validados del tool
   */
  async consultarPedidosPorCliente(
    user: JwtPayload,
    input: ConsultarPedidosPorClienteInput,
  ): Promise<unknown> {
    const toolName = 'consultar_pedidos_por_cliente';
    const invokedBy = user.sub;

    try {
      // Validar que el usuario sea customer
      if (user.role !== 'customer') {
        throw new UnauthorizedException(
          'Este tool solo está disponible para clientes',
        );
      }

      // Ejecutar la lógica del tool
      const orders = await this.ordersService.findByCustomer(invokedBy, {
        status: input.estado,
        limit: input.limite,
      });

      // Formatear respuesta para el LLM
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

      // Auditar invocación exitosa
      await this.mcpToolLogsService.logSuccess(
        toolName,
        invokedBy,
        input,
        result,
      );

      return result;
    } catch (error) {
      // Auditar invocación fallida
      const errorMessage =
        error instanceof Error ? error.message : 'Error desconocido';
      await this.mcpToolLogsService.logError(
        toolName,
        invokedBy,
        input,
        errorMessage,
      );

      throw error;
    }
  }

  /**
   * Registra los tools disponibles en el servidor MCP.
   * Este método sería usado por el transporte HTTP para exponer el schema.
   */
  getTools() {
    return {
      consultar_pedidos_por_cliente: consultarPedidosPorClienteTool,
    };
  }

  /**
   * Ejecuta un tool por nombre.
   * Este método sería usado por el transporte HTTP para despachar requests.
   */
  async executeTool(
    toolName: string,
    user: JwtPayload,
    input: unknown,
  ): Promise<unknown> {
    switch (toolName) {
      case 'consultar_pedidos_por_cliente': {
        const validatedInput =
          consultarPedidosPorClienteTool.inputSchema.parse(input);
        return this.consultarPedidosPorCliente(user, validatedInput);
      }
      default:
        throw new Error(`Tool desconocido: ${toolName}`);
    }
  }
}
