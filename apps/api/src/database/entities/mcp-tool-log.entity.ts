import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

/**
 * Auditoría de invocaciones al servidor MCP (ver ADR-002 y ADR-006).
 * Cada tool invocado queda registrado con quién lo invocó, parámetros,
 * resultado y timestamp.
 */
@Entity({ name: 'mcp_tool_logs' })
export class McpToolLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'tool_name', type: 'varchar', length: 255 })
  @Index()
  toolName!: string;

  @Column({ name: 'invoked_by', type: 'uuid' })
  @Index()
  invokedBy!: string;

  @Column({
    name: 'input_params',
    type: 'jsonb',
    default: {},
  })
  inputParams!: Record<string, unknown>;

  @Column({ name: 'output_result', type: 'jsonb', nullable: true })
  outputResult?: Record<string, unknown> | null;

  @Column({ name: 'status', type: 'varchar', length: 50 })
  status!: string;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt!: Date;
}
