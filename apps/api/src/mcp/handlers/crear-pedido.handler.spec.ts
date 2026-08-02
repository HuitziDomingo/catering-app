import { handleCrearPedido } from './crear-pedido.handler';
import { McpToolLogsService } from '../mcp-tool-logs.service';
import { OrdersService } from '../../orders/orders.service';
import { JwtPayload } from '../../auth/jwt-payload.interface';
import { Order } from '../../database/entities/order.entity';
import { McpToolLog } from '../../database/entities/mcp-tool-log.entity';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

describe('handleCrearPedido', () => {
  let mcpToolLogsService: McpToolLogsService;
  let ordersService: OrdersService;

  const menuItemId = '22222222-2222-2222-2222-222222222222';

  const futureIso = () =>
    new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString();

  const validInput = () => ({
    items: [{ menuItemId, quantity: 2 }],
    peopleCount: 400,
    scheduledFor: futureIso(),
    notes: 'Sin cebolla',
  });

  const mockJwtPayload: JwtPayload = {
    sub: '123e4567-e89b-12d3-a456-426614174000',
    email: 'customer@example.com',
    role: 'customer',
  };

  const mockAdminPayload: JwtPayload = {
    sub: '987e6543-e89b-12d3-a456-426614174999',
    email: 'admin@example.com',
    role: 'admin',
  };

  const mockAuthInfo: AuthInfo = {
    token: 'mocktoken123',
    clientId: mockJwtPayload.sub,
    scopes: ['customer'],
    extra: { user: mockJwtPayload },
  };

  const mockAdminAuthInfo: AuthInfo = {
    token: 'mocktoken123',
    clientId: mockAdminPayload.sub,
    scopes: ['admin'],
    extra: { user: mockAdminPayload },
  };

  const mockOrder: Order = {
    id: 'order-123',
    customerId: mockJwtPayload.sub,
    status: 'pending',
    peopleCount: 400,
    scheduledFor: new Date('2026-08-15T12:00:00Z'),
    subtotal: 500,
    total: 500,
    notes: 'Sin cebolla',
    needsReview: false,
    items: [],
    createdAt: new Date('2026-07-31T10:00:00Z'),
    updatedAt: new Date('2026-07-31T10:00:00Z'),
  } as Order;

  const mockMcpToolLog: McpToolLog = {
    id: 1,
    toolName: 'crear_pedido',
    invokedBy: mockJwtPayload.sub,
    inputParams: {},
    outputResult: { success: true },
    status: 'success',
    createdAt: new Date(),
  };

  const mockMcpToolLogsService = {
    logSuccess: jest.fn().mockResolvedValue(mockMcpToolLog),
    logError: jest.fn().mockResolvedValue(mockMcpToolLog),
  } as unknown as McpToolLogsService;

  const mockOrdersService = {
    createOrder: jest.fn().mockResolvedValue(mockOrder),
  } as unknown as OrdersService;

  beforeEach(() => {
    jest.clearAllMocks();
    mcpToolLogsService = mockMcpToolLogsService;
    ordersService = mockOrdersService;
  });

  it('creates an order for an authenticated customer, using sub as customerId (never from input)', async () => {
    const input = validInput();

    const result = await handleCrearPedido(
      input,
      { authInfo: mockAuthInfo },
      { mcpToolLogsService, ordersService },
    );

    expect(ordersService.createOrder).toHaveBeenCalledWith(mockJwtPayload.sub, {
      items: input.items,
      peopleCount: input.peopleCount,
      scheduledFor: input.scheduledFor,
      notes: input.notes,
    });

    expect(result.content[0].type).toBe('text');
    const parsed = JSON.parse(result.content[0].text);
    expect(parsed).toEqual({
      success: true,
      data: {
        id: 'order-123',
        status: 'pending',
        peopleCount: 400,
        scheduledFor: '2026-08-15T12:00:00.000Z',
        subtotal: 500,
        total: 500,
        notes: 'Sin cebolla',
        needsReview: false,
        createdAt: '2026-07-31T10:00:00.000Z',
      },
    });

    expect(mcpToolLogsService.logSuccess).toHaveBeenCalledWith(
      'crear_pedido',
      mockJwtPayload.sub,
      input,
      expect.objectContaining({ success: true }),
    );
  });

  it('surfaces needsReview: true in the result when the order was flagged for manual review', async () => {
    jest.spyOn(ordersService, 'createOrder').mockResolvedValueOnce({
      ...mockOrder,
      needsReview: true,
    });

    const result = await handleCrearPedido(
      validInput(),
      { authInfo: mockAuthInfo },
      { mcpToolLogsService, ordersService },
    );

    const parsed = JSON.parse(result.content[0].text);
    expect(parsed.data.needsReview).toBe(true);
  });

  it('rejects input that fails Zod validation before calling the service', async () => {
    const invalidInput = { ...validInput(), items: [] };

    await expect(
      handleCrearPedido(invalidInput, { authInfo: mockAuthInfo }, {
        mcpToolLogsService,
        ordersService,
      }),
    ).rejects.toThrow();

    expect(ordersService.createOrder).not.toHaveBeenCalled();
  });

  it('throws error for non-customer role', async () => {
    await expect(
      handleCrearPedido(validInput(), { authInfo: mockAdminAuthInfo }, {
        mcpToolLogsService,
        ordersService,
      }),
    ).rejects.toThrow('Este tool solo está disponible para clientes');

    expect(ordersService.createOrder).not.toHaveBeenCalled();
  });

  it('throws error for missing authInfo', async () => {
    await expect(
      handleCrearPedido(validInput(), {}, { mcpToolLogsService, ordersService }),
    ).rejects.toThrow('Usuario no autenticado');
  });

  it('handles service errors and logs them', async () => {
    jest
      .spyOn(ordersService, 'createOrder')
      .mockRejectedValueOnce(new Error('El platillo no existe.'));

    const input = validInput();

    await expect(
      handleCrearPedido(input, { authInfo: mockAuthInfo }, {
        mcpToolLogsService,
        ordersService,
      }),
    ).rejects.toThrow('El platillo no existe.');

    expect(mcpToolLogsService.logError).toHaveBeenCalledWith(
      'crear_pedido',
      mockJwtPayload.sub,
      input,
      'El platillo no existe.',
    );
  });
});
