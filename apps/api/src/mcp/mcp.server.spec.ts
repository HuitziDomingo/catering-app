import { handleConsultarPedidosPorCliente } from './handlers/consultar-pedidos-por-cliente.handler';
import { McpToolLogsService } from './mcp-tool-logs.service';
import { OrdersService } from '../orders/orders.service';
import { JwtPayload } from '../auth/jwt-payload.interface';
import { Order } from '../database/entities/order.entity';
import { McpToolLog } from '../database/entities/mcp-tool-log.entity';
import { OrderStatus } from '@catering-app/shared-types';
import type { AuthInfo } from '@modelcontextprotocol/sdk/server/auth/types.js';

describe('handleConsultarPedidosPorCliente', () => {
  let mcpToolLogsService: McpToolLogsService;
  let ordersService: OrdersService;

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

  const mockOrders: Order[] = [
    {
      id: 'order-123',
      customerId: mockJwtPayload.sub,
      status: 'pending',
      peopleCount: 10,
      scheduledFor: new Date('2026-07-20T12:00:00Z'),
      subtotal: 500,
      total: 550,
      notes: null,
      items: [],
      createdAt: new Date('2026-07-17T10:00:00Z'),
      updatedAt: new Date('2026-07-17T10:00:00Z'),
      customer: {
        id: mockJwtPayload.sub,
        roleId: 1,
        fullName: 'Test Customer',
        email: 'customer@example.com',
        phone: null,
        whatsappNumber: null,
        passwordHash: 'hash',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        deletedAt: null,
        role: {
          id: 1,
          name: 'customer',
          users: [],
        },
      },
    },
  ];

  const mockMcpToolLog: McpToolLog = {
    id: 1,
    toolName: 'consultar_pedidos_por_cliente',
    invokedBy: mockJwtPayload.sub,
    inputParams: { estado: 'pending', limite: 5 },
    outputResult: { success: true },
    status: 'success',
    createdAt: new Date(),
  };

  const mockMcpToolLogsService = {
    logSuccess: jest.fn().mockResolvedValue(mockMcpToolLog),
    logError: jest.fn().mockResolvedValue(mockMcpToolLog),
  } as unknown as McpToolLogsService;

  const mockOrdersService = {
    findByCustomer: jest.fn().mockResolvedValue(mockOrders),
  } as unknown as OrdersService;

  beforeEach(() => {
    jest.clearAllMocks();
    mcpToolLogsService = mockMcpToolLogsService;
    ordersService = mockOrdersService;
  });

  it('should return orders for authenticated customer', async () => {
    const input = { estado: OrderStatus.PENDING, limite: 5 };

    const result = await handleConsultarPedidosPorCliente(
      input,
      { authInfo: mockAuthInfo },
      { mcpToolLogsService, ordersService },
    );

    expect(result).toEqual({
      content: [
        {
          type: 'text',
          text: JSON.stringify(
            {
              success: true,
              data: [
                {
                  id: 'order-123',
                  status: 'pending',
                  peopleCount: 10,
                  scheduledFor: '2026-07-20T12:00:00.000Z',
                  subtotal: 500,
                  total: 550,
                  notes: null,
                  createdAt: '2026-07-17T10:00:00.000Z',
                },
              ],
              count: 1,
            },
            null,
            2,
          ),
        },
      ],
    });

    expect(ordersService.findByCustomer).toHaveBeenCalledWith(mockJwtPayload.sub, {
      status: OrderStatus.PENDING,
      limit: 5,
    });

    expect(mcpToolLogsService.logSuccess).toHaveBeenCalledWith(
      'consultar_pedidos_por_cliente',
      mockJwtPayload.sub,
      input,
      expect.objectContaining({ success: true }),
    );
  });

  it('should throw error for non-customer role', async () => {
    const input = { estado: OrderStatus.PENDING, limite: 5 };

    await expect(
      handleConsultarPedidosPorCliente(input, { authInfo: mockAdminAuthInfo }, {
        mcpToolLogsService,
        ordersService,
      }),
    ).rejects.toThrow('Este tool solo está disponible para clientes');
  });

  it('should throw error for missing authInfo', async () => {
    const input = { estado: OrderStatus.PENDING, limite: 5 };

    await expect(
      handleConsultarPedidosPorCliente(input, {}, {
        mcpToolLogsService,
        ordersService,
      }),
    ).rejects.toThrow('Usuario no autenticado');
  });

  it('should handle service errors and log them', async () => {
    const input = { estado: OrderStatus.PENDING, limite: 5 };

    // Mock the service to throw an error
    jest.spyOn(ordersService, 'findByCustomer').mockRejectedValueOnce(
      new Error('Database connection failed'),
    );

    await expect(
      handleConsultarPedidosPorCliente(input, { authInfo: mockAuthInfo }, {
        mcpToolLogsService,
        ordersService,
      }),
    ).rejects.toThrow('Database connection failed');

    expect(mcpToolLogsService.logError).toHaveBeenCalledWith(
      'consultar_pedidos_por_cliente',
      mockJwtPayload.sub,
      input,
      'Database connection failed',
    );
  });
});
