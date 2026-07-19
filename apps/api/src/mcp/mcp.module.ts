import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { McpController } from './mcp.controller';
import { McpTransport } from './mcp.transport';
import { McpToolLogsService } from './mcp-tool-logs.service';
import { McpToolLog } from '../database/entities/mcp-tool-log.entity';
import { OrdersService } from '../orders/orders.service';
import { Order } from '../database/entities/order.entity';
import { AuthModule } from '../auth/auth.module';

/**
 * Módulo MCP que expone tools del dominio de catering.
 *
 * Integra:
 * - Transporte MCP oficial con StreamableHTTPServerTransport
 * - Servicio de auditoría de invocaciones
 * - Servicio de pedidos para el tool consultar_pedidos_por_cliente
 * - Autenticación JWT (reusa AuthModule)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([McpToolLog, Order]),
    AuthModule,
  ],
  controllers: [McpController],
  providers: [McpTransport, McpToolLogsService, OrdersService],
  exports: [McpTransport, McpToolLogsService, OrdersService],
})
export class McpModule {}
