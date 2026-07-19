import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { isInitializeRequest } from '@modelcontextprotocol/sdk/types.js';
import type { AnySchema } from '@modelcontextprotocol/sdk/server/zod-compat.js';
import { McpToolLogsService } from './mcp-tool-logs.service';
import { OrdersService } from '../orders/orders.service';
import {
  consultarPedidosPorClienteTool,
} from './tools/consultar-pedidos-por-cliente.tool';
import { handleConsultarPedidosPorCliente } from './handlers/consultar-pedidos-por-cliente.handler';

/**
 * Transporte HTTP Streamable para el servidor MCP.
 *
 * Este es el transporte oficial del SDK que implementa JSON-RPC per la spec MCP.
 * Es interoperable con clientes MCP reales y testable con el MCP Inspector.
 *
 * El SDK exige una `StreamableHTTPServerTransport` (y un `McpServer` conectado a
 * ella) por SESIÓN, no un singleton global: en modo stateless cada transporte
 * solo admite una request antes de lanzar "Stateless transport cannot be reused
 * across requests"; en modo stateful (`sessionIdGenerator`) un mismo transporte
 * sí admite múltiples requests, pero solo las de la sesión para la que fue
 * creado. Por eso este servicio mantiene un mapa `sessionId -> transporte` y
 * crea un par `McpServer`/transporte nuevo en cada `initialize`.
 */
@Injectable()
export class McpTransport implements OnModuleDestroy {
  private readonly sessions = new Map<string, StreamableHTTPServerTransport>();

  constructor(
    private readonly mcpToolLogsService: McpToolLogsService,
    private readonly ordersService: OrdersService,
  ) {}

  async onModuleDestroy() {
    await Promise.all(
      [...this.sessions.values()].map((transport) => transport.close()),
    );
    this.sessions.clear();
  }

  async handleRequest(
    req: IncomingMessage,
    res: ServerResponse,
    parsedBody: unknown,
  ) {
    const sessionId = req.headers['mcp-session-id'];
    const existing =
      typeof sessionId === 'string' ? this.sessions.get(sessionId) : undefined;

    if (existing) {
      await existing.handleRequest(req, res, parsedBody);
      return;
    }

    if (sessionId === undefined && isInitializeRequest(parsedBody)) {
      const transport = this.createSessionTransport();
      await this.connectServer(transport);
      await transport.handleRequest(req, res, parsedBody);
      return;
    }

    res.writeHead(400, { 'Content-Type': 'application/json' }).end(
      JSON.stringify({
        jsonrpc: '2.0',
        error: { code: -32000, message: 'No se encontró una sesión MCP válida.' },
        id: null,
      }),
    );
  }

  private createSessionTransport(): StreamableHTTPServerTransport {
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: () => randomUUID(),
      onsessioninitialized: (sessionId) => {
        this.sessions.set(sessionId, transport);
      },
    });

    transport.onclose = () => {
      if (transport.sessionId) {
        this.sessions.delete(transport.sessionId);
      }
    };

    return transport;
  }

  private async connectServer(transport: StreamableHTTPServerTransport) {
    const mcpServer = new McpServer({
      name: 'catering-app-mcp-server',
      version: '1.0.0',
    });

    mcpServer.registerTool(
      consultarPedidosPorClienteTool.name,
      {
        title: 'Consultar pedidos por cliente',
        description: consultarPedidosPorClienteTool.description,
        inputSchema: consultarPedidosPorClienteTool.inputSchema as unknown as AnySchema,
      },
      async (input, extra) => {
        return handleConsultarPedidosPorCliente(input, extra, {
          mcpToolLogsService: this.mcpToolLogsService,
          ordersService: this.ordersService,
        });
      },
    );

    await mcpServer.connect(transport);
  }
}
