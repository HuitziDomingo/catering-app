import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega tabla `orders` para pedidos de catering (ver ADR-006).
 *
 * - `id`: PK UUID (gen_random_uuid)
 * - `customer_id`: FK a users.id
 * - `status`: estado del pedido (pending, confirmed, preparing, delivered, cancelled)
 * - `people_count`: número de personas para el evento
 * - `scheduled_for`: fecha programada del evento
 * - `subtotal`: subtotal del pedido
 * - `total`: total del pedido
 * - `notes`: notas adicionales (nullable)
 * - timestamps: created_at, updated_at
 */
export class AddOrders1752537600002 implements MigrationInterface {
  name = 'AddOrders1752537600002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "orders" (
        "id"              UUID NOT NULL DEFAULT gen_random_uuid(),
        "customer_id"     UUID NOT NULL,
        "status"          VARCHAR(50) NOT NULL DEFAULT 'pending',
        "people_count"    INT NOT NULL,
        "scheduled_for"   TIMESTAMPTZ NOT NULL,
        "subtotal"        NUMERIC(10,2) NOT NULL,
        "total"           NUMERIC(10,2) NOT NULL,
        "notes"           TEXT,
        "created_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_orders_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_orders_customer" FOREIGN KEY ("customer_id")
          REFERENCES "users" ("id") ON DELETE RESTRICT
      );
    `);

    // Índice para búsquedas por cliente
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_customer_id" ON "orders" ("customer_id");`,
    );

    // Índice para búsquedas por estado
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_status" ON "orders" ("status");`,
    );

    // Índice para búsquedas por fecha programada
    await queryRunner.query(
      `CREATE INDEX "IDX_orders_scheduled_for" ON "orders" ("scheduled_for");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_scheduled_for";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_status";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_customer_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "orders";`);
  }
}
