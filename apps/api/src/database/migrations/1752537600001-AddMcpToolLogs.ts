import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega tabla `mcp_tool_logs` para auditoría de invocaciones MCP (ver ADR-002 y ADR-006).
 *
 * - `id`: PK autoincremental (BIGSERIAL)
 * - `tool_name`: nombre del tool invocado
 * - `invoked_by`: UUID del usuario que invocó el tool
 * - `input_params`: JSONB con parámetros de entrada
 * - `output_result`: JSONB con resultado de la ejecución
 * - `status`: estado de la ejecución (success, error, etc.)
 * - `created_at`: timestamp de la invocación
 */
export class AddMcpToolLogs1752537600001 implements MigrationInterface {
  name = 'AddMcpToolLogs1752537600001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "mcp_tool_logs" (
        "id"            BIGSERIAL PRIMARY KEY,
        "tool_name"     VARCHAR(255) NOT NULL,
        "invoked_by"    UUID NOT NULL,
        "input_params"  JSONB NOT NULL DEFAULT '{}',
        "output_result" JSONB,
        "status"        VARCHAR(50) NOT NULL,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now()
      );
    `);

    // Índice para búsquedas por usuario
    await queryRunner.query(
      `CREATE INDEX "IDX_mcp_tool_logs_invoked_by" ON "mcp_tool_logs" ("invoked_by");`,
    );

    // Índice para búsquedas por tool
    await queryRunner.query(
      `CREATE INDEX "IDX_mcp_tool_logs_tool_name" ON "mcp_tool_logs" ("tool_name");`,
    );

    // Índice para búsquedas por fecha
    await queryRunner.query(
      `CREATE INDEX "IDX_mcp_tool_logs_created_at" ON "mcp_tool_logs" ("created_at");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mcp_tool_logs_created_at";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mcp_tool_logs_tool_name";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_mcp_tool_logs_invoked_by";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "mcp_tool_logs";`);
  }
}
