import { Test, TestingModule } from '@nestjs/testing';
import { McpController } from './mcp.controller';
import { McpTransport } from './mcp.transport';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { JwtPayload } from '../auth/jwt-payload.interface';
import type { IncomingMessage, ServerResponse } from 'node:http';

describe('McpController', () => {
  let controller: McpController;
  let mcpTransport: McpTransport;

  const mockJwtPayload: JwtPayload = {
    sub: '123e4567-e89b-12d3-a456-426614174000',
    email: 'customer@example.com',
    role: 'customer',
  };

  const mockMcpTransport = {
    handleRequest: jest.fn().mockResolvedValue(undefined),
  };

  const mockAuthGuard = {
    canActivate: jest.fn((context) => {
      const req = context.switchToHttp().getRequest();
      req.user = mockJwtPayload;
      return true;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [McpController],
      providers: [
        {
          provide: McpTransport,
          useValue: mockMcpTransport,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockAuthGuard)
      .compile();

    controller = module.get<McpController>(McpController);
    mcpTransport = module.get<McpTransport>(McpTransport);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handleMcpRequest', () => {
    it('should attach JWT auth info and delegate to streamable HTTP transport', async () => {
      const mockBody = { jsonrpc: '2.0', method: 'tools/list', id: 1 };
      const mockReq = {
        headers: {
          authorization: 'Bearer mocktoken123',
        },
        user: mockJwtPayload,
        body: mockBody,
      } as unknown as IncomingMessage & { user: JwtPayload };

      const mockRes = {} as unknown as ServerResponse;

      await controller.handleMcpRequest(mockReq, mockRes);

      expect(mcpTransport.handleRequest).toHaveBeenCalledWith(
        expect.objectContaining({
          user: mockJwtPayload,
          auth: expect.objectContaining({
            token: 'mocktoken123',
            clientId: mockJwtPayload.sub,
            scopes: [mockJwtPayload.role],
            extra: { user: mockJwtPayload },
          }),
        }),
        mockRes,
        mockBody,
      );
    });
  });
});
