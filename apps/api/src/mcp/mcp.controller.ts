import { Controller, UseGuards, Req, Res, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
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
@ApiTags('mcp')
@Controller('mcp')
@UseGuards(JwtAuthGuard)
export class McpController {
  constructor(private readonly mcpTransport: McpTransport) {}

  @Post()
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Endpoint MCP (Model Context Protocol) — transporte Streamable HTTP.',
    description:
      'No es un endpoint REST: implementa JSON-RPC 2.0 según la especificación MCP ' +
      '(https://modelcontextprotocol.io) sobre el transporte StreamableHTTPServerTransport ' +
      'del SDK oficial. El cuerpo y la respuesta siguen el framing JSON-RPC del protocolo, ' +
      'no un contrato REST documentable con schemas de request/response tradicionales.',
  })
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
