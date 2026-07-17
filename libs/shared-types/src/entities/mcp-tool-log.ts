export interface McpToolLog {
  id: number;
  toolName: string;
  invokedBy: string;
  inputParams: Record<string, unknown>;
  outputResult: Record<string, unknown>;
  status: string;
  createdAt: string;
}

export interface CreateMcpToolLogDto {
  toolName: string;
  invokedBy: string;
  inputParams: Record<string, unknown>;
  outputResult: Record<string, unknown>;
  status: string;
}

export interface UpdateMcpToolLogDto {
  toolName?: string;
  invokedBy?: string;
  inputParams?: Record<string, unknown>;
  outputResult?: Record<string, unknown>;
  status?: string;
}
