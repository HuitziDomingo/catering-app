import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { McpToolLog } from '../database/entities/mcp-tool-log.entity';

/**
 * Servicio para registrar auditoría de invocaciones MCP en la tabla
 * mcp_tool_logs (ver ADR-002 y ADR-006).
 */
@Injectable()
export class McpToolLogsService {
  constructor(
    @InjectRepository(McpToolLog)
    private readonly mcpToolLogsRepository: Repository<McpToolLog>,
  ) {}

  /**
   * Registra una invocación de tool MCP exitosa.
   */
  async logSuccess(
    toolName: string,
    invokedBy: string,
    inputParams: Record<string, unknown>,
    outputResult: Record<string, unknown>,
  ): Promise<McpToolLog> {
    const log = this.mcpToolLogsRepository.create({
      toolName,
      invokedBy,
      inputParams,
      outputResult,
      status: 'success',
    });
    return this.mcpToolLogsRepository.save(log);
  }

  /**
   * Registra una invocación de tool MCP fallida.
   */
  async logError(
    toolName: string,
    invokedBy: string,
    inputParams: Record<string, unknown>,
    errorMessage: string,
  ): Promise<McpToolLog> {
    const log = this.mcpToolLogsRepository.create({
      toolName,
      invokedBy,
      inputParams,
      outputResult: { error: errorMessage },
      status: 'error',
    });
    return this.mcpToolLogsRepository.save(log);
  }

  /**
   * Obtiene logs de invocaciones por usuario.
   */
  async findByUser(userId: string, limit = 50): Promise<McpToolLog[]> {
    return this.mcpToolLogsRepository.find({
      where: { invokedBy: userId },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }

  /**
   * Obtiene logs de invocaciones por tool.
   */
  async findByTool(toolName: string, limit = 50): Promise<McpToolLog[]> {
    return this.mcpToolLogsRepository.find({
      where: { toolName },
      order: { createdAt: 'DESC' },
      take: limit,
    });
  }
}
