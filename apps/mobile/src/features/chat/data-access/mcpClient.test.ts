import { OrderStatus } from '@catering-app/shared-types';

const mockRefreshSession = jest.fn();
const mockLogout = jest.fn();
const mockNotifySessionExpired = jest.fn();

jest.mock('../../auth/state/useSessionStore', () => ({
  useSessionStore: {
    getState: () => ({ refreshSession: mockRefreshSession, logout: mockLogout }),
  },
}));

jest.mock('../../../core/http/sessionExpiry', () => ({
  notifySessionExpired: () => mockNotifySessionExpired(),
}));

import {
  consultarPedidosPorCliente,
  crearPedido,
  listMcpTools,
  McpToolError,
} from './mcpClient';

type FakeHeaders = { get: (name: string) => string | null };

function fakeResponse(options: {
  status: number;
  headers?: Record<string, string>;
  text: string;
}): Response {
  const headerMap = options.headers ?? {};
  const headers: FakeHeaders = {
    get: (name: string) => headerMap[name.toLowerCase()] ?? null,
  };
  return {
    ok: options.status >= 200 && options.status < 300,
    status: options.status,
    headers,
    text: async () => options.text,
  } as unknown as Response;
}

function sseResponse(payload: unknown, headers: Record<string, string> = {}): Response {
  return fakeResponse({
    status: 200,
    headers,
    text: `event: message\ndata: ${JSON.stringify(payload)}\n\n`,
  });
}

function acceptedResponse(headers: Record<string, string> = {}): Response {
  return fakeResponse({ status: 202, headers, text: '' });
}

const mockOrder = {
  id: 'order-1',
  status: OrderStatus.PENDING,
  peopleCount: 10,
  scheduledFor: '2026-08-01T12:00:00.000Z',
  subtotal: 500,
  total: 550,
  notes: null,
  createdAt: '2026-07-20T10:00:00.000Z',
};

beforeEach(() => {
  global.fetch = jest.fn();
  mockRefreshSession.mockReset();
  mockLogout.mockReset();
  mockNotifySessionExpired.mockReset();
});

describe('consultarPedidosPorCliente', () => {
  it('performs the initialize handshake, then tools/call, and returns the parsed result', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        sseResponse(
          { jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-11-25' } },
          { 'mcp-session-id': 'session-abc' },
        ),
      )
      .mockResolvedValueOnce(acceptedResponse())
      .mockResolvedValueOnce(
        sseResponse({
          jsonrpc: '2.0',
          id: 2,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({ success: true, data: [mockOrder], count: 1 }),
              },
            ],
          },
        }),
      );

    const result = await consultarPedidosPorCliente('token-123');

    expect(result).toEqual({ success: true, data: [mockOrder], count: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(3);

    const [initUrl, initOptions] = (global.fetch as jest.Mock).mock.calls[0];
    expect(initUrl).toBe('http://localhost:3000/api/mcp');
    expect(initOptions.headers.Authorization).toBe('Bearer token-123');
    expect(initOptions.headers.Accept).toBe('application/json, text/event-stream');
    expect(initOptions.headers['Mcp-Session-Id']).toBeUndefined();
    expect(JSON.parse(initOptions.body).method).toBe('initialize');

    const [, notifiedOptions] = (global.fetch as jest.Mock).mock.calls[1];
    expect(notifiedOptions.headers['Mcp-Session-Id']).toBe('session-abc');
    expect(JSON.parse(notifiedOptions.body).method).toBe('notifications/initialized');

    const [, callOptions] = (global.fetch as jest.Mock).mock.calls[2];
    expect(callOptions.headers['Mcp-Session-Id']).toBe('session-abc');
    const callBody = JSON.parse(callOptions.body);
    expect(callBody.method).toBe('tools/call');
    expect(callBody.params).toEqual({
      name: 'consultar_pedidos_por_cliente',
      arguments: {},
    });
  });

  it('throws an McpToolError when the tool returns isError (e.g. non-customer role)', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(sseResponse({ jsonrpc: '2.0', id: 1, result: {} }, { 'mcp-session-id': 's-1' }))
      .mockResolvedValueOnce(acceptedResponse())
      .mockResolvedValueOnce(
        sseResponse({
          jsonrpc: '2.0',
          id: 2,
          result: {
            content: [{ type: 'text', text: 'Este tool solo está disponible para clientes' }],
            isError: true,
          },
        }),
      );

    await expect(consultarPedidosPorCliente('token-123')).rejects.toThrow(
      'Este tool solo está disponible para clientes',
    );
  });

  it('throws an McpToolError when initialize does not return a session id', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      sseResponse({ jsonrpc: '2.0', id: 1, result: {} }),
    );

    await expect(consultarPedidosPorCliente('token-123')).rejects.toThrow(McpToolError);
  });

  it('throws when the HTTP response is not ok', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(
      fakeResponse({ status: 500, text: '' }),
    );

    await expect(consultarPedidosPorCliente('token-123')).rejects.toThrow(
      'status 500',
    );
  });
});

describe('401 handling (refresh-and-retry, see withAuthRetry)', () => {
  it('refreshes the token once and retries the full handshake when a request 401s', async () => {
    (global.fetch as jest.Mock)
      // Primer intento (token viejo): initialize responde 401.
      .mockResolvedValueOnce(fakeResponse({ status: 401, text: '' }))
      // Reintento (token nuevo, tras refresh): handshake completo + tools/call.
      .mockResolvedValueOnce(
        sseResponse(
          { jsonrpc: '2.0', id: 1, result: {} },
          { 'mcp-session-id': 'session-retry' },
        ),
      )
      .mockResolvedValueOnce(acceptedResponse())
      .mockResolvedValueOnce(
        sseResponse({
          jsonrpc: '2.0',
          id: 2,
          result: {
            content: [
              { type: 'text', text: JSON.stringify({ success: true, data: [], count: 0 }) },
            ],
          },
        }),
      );
    mockRefreshSession.mockResolvedValue({ accessToken: 'new-token', refreshToken: 'new-refresh' });

    const result = await consultarPedidosPorCliente('old-token');

    expect(result).toEqual({ success: true, data: [], count: 0 });
    expect(mockRefreshSession).toHaveBeenCalledTimes(1);
    expect(mockLogout).not.toHaveBeenCalled();

    // La primera request (que 401ó) usó el token viejo...
    const [, firstOptions] = (global.fetch as jest.Mock).mock.calls[0];
    expect(firstOptions.headers.Authorization).toBe('Bearer old-token');
    // ...el reintento completo usa el token nuevo desde el primer paso (initialize).
    const [, retryInitOptions] = (global.fetch as jest.Mock).mock.calls[1];
    expect(retryInitOptions.headers.Authorization).toBe('Bearer new-token');
  });

  it('clears the session and redirects to /login when the refresh itself fails', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(fakeResponse({ status: 401, text: '' }));
    mockRefreshSession.mockRejectedValue(new Error('No hay refresh token disponible.'));

    await expect(consultarPedidosPorCliente('old-token')).rejects.toThrow(
      'No hay refresh token disponible.',
    );

    expect(mockLogout).toHaveBeenCalledTimes(1);
    expect(mockNotifySessionExpired).toHaveBeenCalledTimes(1);
  });
});

describe('crearPedido', () => {
  const args = {
    items: [{ menuItemId: 'menu-item-1', quantity: 1 }],
    peopleCount: 400,
    scheduledFor: '2026-08-04T09:00:00.000Z',
    notes: undefined,
  };

  it('performs the initialize handshake, then tools/call with crear_pedido, and returns the parsed result', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(
        sseResponse(
          { jsonrpc: '2.0', id: 1, result: { protocolVersion: '2025-11-25' } },
          { 'mcp-session-id': 'session-abc' },
        ),
      )
      .mockResolvedValueOnce(acceptedResponse())
      .mockResolvedValueOnce(
        sseResponse({
          jsonrpc: '2.0',
          id: 2,
          result: {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: true,
                  data: { ...mockOrder, needsReview: false },
                }),
              },
            ],
          },
        }),
      );

    const result = await crearPedido('token-123', args);

    expect(result).toEqual({ success: true, data: { ...mockOrder, needsReview: false } });

    const [, callOptions] = (global.fetch as jest.Mock).mock.calls[2];
    const callBody = JSON.parse(callOptions.body);
    expect(callBody.method).toBe('tools/call');
    expect(callBody.params).toEqual({ name: 'crear_pedido', arguments: args });
  });

  it('throws an McpToolError when the tool returns isError (e.g. non-future scheduledFor)', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(sseResponse({ jsonrpc: '2.0', id: 1, result: {} }, { 'mcp-session-id': 's-1' }))
      .mockResolvedValueOnce(acceptedResponse())
      .mockResolvedValueOnce(
        sseResponse({
          jsonrpc: '2.0',
          id: 2,
          result: {
            content: [{ type: 'text', text: 'scheduledFor debe ser una fecha futura' }],
            isError: true,
          },
        }),
      );

    await expect(crearPedido('token-123', args)).rejects.toThrow(
      'scheduledFor debe ser una fecha futura',
    );
  });
});

describe('listMcpTools', () => {
  it('returns the tools array from tools/list', async () => {
    (global.fetch as jest.Mock)
      .mockResolvedValueOnce(sseResponse({ jsonrpc: '2.0', id: 1, result: {} }, { 'mcp-session-id': 's-2' }))
      .mockResolvedValueOnce(acceptedResponse())
      .mockResolvedValueOnce(
        sseResponse({
          jsonrpc: '2.0',
          id: 2,
          result: { tools: [{ name: 'consultar_pedidos_por_cliente', description: 'desc' }] },
        }),
      );

    const tools = await listMcpTools('token-123');

    expect(tools).toEqual([{ name: 'consultar_pedidos_por_cliente', description: 'desc' }]);
  });
});
