import { Controller, UseGuards, Req, Res, Post } from '@nestjs/common';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { McpTransport } from './mcp.transport';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { attachJwtAuthInfo } from './mcp-auth.adapter';

/**
 * Controlador HTTP para el servidor MCP.
 *
 * Usa el transporte oficial StreamableHTTPServerTransport del SDK MCP
 * para implementar JSON-RPC per la spec MCP.
 */
@Controller('mcp')
@UseGuards(JwtAuthGuard)
export class McpController {
  constructor(private readonly mcpTransport: McpTransport) {}

  @Post()
  async handleMcpRequest(
    @Req() req: IncomingMessage & { user: JwtPayload; body?: unknown },
    @Res() res: ServerResponse,
  ) {
    const authenticatedReq = attachJwtAuthInfo(req);
    // Nest's global body parser (express.json()) already consumed the
    // request stream and parsed it into `req.body`; the SDK transport
    // can't re-read the stream, so the parsed body must be passed
    // explicitly (see StreamableHTTPServerTransport.handleRequest docs).
    await this.mcpTransport.handleRequest(authenticatedReq, res, req.body);
  }
}
