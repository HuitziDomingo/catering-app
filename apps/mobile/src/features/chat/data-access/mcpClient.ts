import type { OrderStatus } from '@catering-app/shared-types';

// Capa data-access del feature de chat (ver ADR-020, ADR-002). Cliente MCP
// mínimo: habla JSON-RPC 2.0 directo con /api/mcp en vez de usar el SDK
// cliente completo (@modelcontextprotocol/sdk/client) -- ese SDK es pesado
// para React Native y este wrapper solo necesita el handshake mínimo
// (initialize + notifications/initialized) más tools/call.
//
// Protocolo verificado contra el código real del transporte instalado
// (@modelcontextprotocol/sdk@1.29.0, server/webStandardStreamableHttp.js;
// ver también apps/api/src/mcp/mcp.transport.ts):
// - Todo POST requiere `Accept: application/json, text/event-stream` y
//   `Content-Type: application/json`, o el servidor responde 406/415.
// - La respuesta de cualquier request (no notificación) SIEMPRE viene como
//   Server-Sent Events (`event: message\ndata: <json>\n\n`) porque
//   McpTransport no activa `enableJsonResponse` -- no basta con
//   `response.json()`, hay que extraer la línea `data:`.
// - `initialize` no lleva Mcp-Session-Id; el servidor lo devuelve en el
//   header `mcp-session-id` de la respuesta y hay que reenviarlo en todos
//   los requests siguientes de esa sesión (400 si falta, 404 si es
//   inválido -- ver validateSession en el SDK).
// - `Mcp-Protocol-Version` es opcional en requests posteriores al
//   initialize (el servidor usa la versión negociada si no viene), así que
//   se omite aquí para simplificar.
// - Un tool que lanza un error de negocio (ej. "Usuario no autenticado")
//   NO llega como error JSON-RPC de protocolo: el SDK lo envuelve en un
//   result exitoso con `isError: true` y el mensaje en texto plano (ver
//   McpServer.createToolError) -- distinto del caso de éxito, donde `text`
//   es un JSON.stringify de verdad.
//
// No se mantiene una sesión MCP viva entre mensajes del chat: cada llamada
// a un tool hace su propio handshake completo. Es más simple y evita tener
// que manejar expiración/recuperación de sesión entre mensajes -- aceptable
// para este v1 (ver ChatScreen.tsx).

const DEFAULT_API_URL = 'http://localhost:3000/api';
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? DEFAULT_API_URL;
const MCP_URL = `${API_BASE_URL}/mcp`;

const MCP_PROTOCOL_VERSION = '2025-11-25';
const CLIENT_INFO = { name: 'catering-app-mobile', version: '1.0.0' };

export class McpToolError extends Error {}

type JsonRpcMessage = {
  jsonrpc: '2.0';
  id?: number;
  result?: unknown;
  error?: { code: number; message: string };
};

type PostJsonRpcResult = {
  message?: JsonRpcMessage;
  sessionId?: string;
};

async function postJsonRpc(
  accessToken: string,
  sessionId: string | undefined,
  body: Record<string, unknown>,
): Promise<PostJsonRpcResult> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: `Bearer ${accessToken}`,
  };
  if (sessionId) {
    headers['Mcp-Session-Id'] = sessionId;
  }

  const response = await fetch(MCP_URL, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });

  // Las notificaciones (sin id, ej. notifications/initialized) responden
  // 202 sin cuerpo -- ver webStandardStreamableHttp.js.
  if (response.status === 202) {
    return { sessionId: response.headers.get('mcp-session-id') ?? undefined };
  }

  if (!response.ok) {
    throw new McpToolError(`El servidor MCP respondió con status ${response.status}.`);
  }

  const text = await response.text();
  return {
    message: parseSseJsonRpcMessage(text),
    sessionId: response.headers.get('mcp-session-id') ?? undefined,
  };
}

function parseSseJsonRpcMessage(sseText: string): JsonRpcMessage | undefined {
  const dataLine = sseText.split('\n').find((line) => line.startsWith('data:'));
  if (!dataLine) {
    return undefined;
  }
  const json = dataLine.slice('data:'.length).trim();
  return json ? (JSON.parse(json) as JsonRpcMessage) : undefined;
}

/** Handshake MCP mínimo: initialize + notifications/initialized. Devuelve el mcp-session-id de la sesión creada. */
async function initializeMcpSession(accessToken: string): Promise<string> {
  const { message, sessionId } = await postJsonRpc(accessToken, undefined, {
    jsonrpc: '2.0',
    id: 1,
    method: 'initialize',
    params: {
      protocolVersion: MCP_PROTOCOL_VERSION,
      capabilities: {},
      clientInfo: CLIENT_INFO,
    },
  });

  if (message?.error) {
    throw new McpToolError(message.error.message);
  }
  if (!sessionId) {
    throw new McpToolError('El servidor MCP no devolvió un mcp-session-id.');
  }

  await postJsonRpc(accessToken, sessionId, {
    jsonrpc: '2.0',
    method: 'notifications/initialized',
  });

  return sessionId;
}

export type McpTool = {
  name: string;
  description?: string;
};

/** tools/list -- no se usa todavía en la UI; queda lista para extensiones futuras (ej. sugerencias de preguntas). */
export async function listMcpTools(accessToken: string): Promise<McpTool[]> {
  const sessionId = await initializeMcpSession(accessToken);
  const { message } = await postJsonRpc(accessToken, sessionId, {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/list',
    params: {},
  });

  if (message?.error) {
    throw new McpToolError(message.error.message);
  }

  const result = message?.result as { tools?: McpTool[] } | undefined;
  return result?.tools ?? [];
}

// Mismo subconjunto de campos que handleConsultarPedidosPorCliente mapea en
// la API (ver apps/api/src/mcp/handlers/consultar-pedidos-por-cliente.handler.ts)
// -- no es el Order completo de shared-types (sin customerId/updatedAt/items).
export type OrderSummary = {
  id: string;
  status: OrderStatus;
  peopleCount: number;
  scheduledFor: string;
  subtotal: number;
  total: number;
  notes: string | null;
  createdAt: string;
};

export type ConsultarPedidosPorClienteResult = {
  success: boolean;
  data: OrderSummary[];
  count: number;
};

export async function consultarPedidosPorCliente(
  accessToken: string,
  args: { estado?: OrderStatus; limite?: number } = {},
): Promise<ConsultarPedidosPorClienteResult> {
  const sessionId = await initializeMcpSession(accessToken);
  const { message } = await postJsonRpc(accessToken, sessionId, {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'consultar_pedidos_por_cliente', arguments: args },
  });

  if (message?.error) {
    throw new McpToolError(message.error.message);
  }

  const result = message?.result as
    | { content?: Array<{ type: string; text: string }>; isError?: boolean }
    | undefined;
  const text = result?.content?.[0]?.text;
  if (!text) {
    throw new McpToolError('El tool MCP no devolvió contenido.');
  }
  if (result?.isError) {
    throw new McpToolError(text);
  }

  return JSON.parse(text) as ConsultarPedidosPorClienteResult;
}

// Mismo subconjunto de campos que handleCrearPedido devuelve en la API (ver
// apps/api/src/mcp/handlers/crear-pedido.handler.ts).
export type CreatedOrderSummary = OrderSummary & { needsReview: boolean };

export type CrearPedidoResult = {
  success: boolean;
  data: CreatedOrderSummary;
};

export type CrearPedidoArgs = {
  items: Array<{ menuItemId: string; quantity: number }>;
  peopleCount: number;
  scheduledFor: string;
  notes?: string;
};

export async function crearPedido(
  accessToken: string,
  args: CrearPedidoArgs,
): Promise<CrearPedidoResult> {
  const sessionId = await initializeMcpSession(accessToken);
  const { message } = await postJsonRpc(accessToken, sessionId, {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: { name: 'crear_pedido', arguments: args },
  });

  if (message?.error) {
    throw new McpToolError(message.error.message);
  }

  const result = message?.result as
    | { content?: Array<{ type: string; text: string }>; isError?: boolean }
    | undefined;
  const text = result?.content?.[0]?.text;
  if (!text) {
    throw new McpToolError('El tool MCP no devolvió contenido.');
  }
  if (result?.isError) {
    throw new McpToolError(text);
  }

  return JSON.parse(text) as CrearPedidoResult;
}
