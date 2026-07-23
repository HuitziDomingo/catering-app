import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega tabla `order_items` (ver ADR-006): líneas de un pedido.
 *
 * - `order_id` / `menu_item_id`: FKs a orders/menu_items.
 * - `unit_price`: snapshot del base_price vigente del platillo al momento
 *   del pedido — un cambio de precio posterior nunca altera pedidos
 *   históricos ni los reportes de gasto.
 * - `subtotal`: quantity * unit_price para esa línea.
 */
export class AddOrderItems1752537600004 implements MigrationInterface {
  name = 'AddOrderItems1752537600004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "order_items" (
        "id"             BIGSERIAL PRIMARY KEY,
        "order_id"       UUID NOT NULL,
        "menu_item_id"   UUID NOT NULL,
        "quantity"       INT NOT NULL,
        "unit_price"     NUMERIC(10,2) NOT NULL,
        "subtotal"       NUMERIC(10,2) NOT NULL,
        CONSTRAINT "FK_order_items_order" FOREIGN KEY ("order_id")
          REFERENCES "orders" ("id") ON DELETE CASCADE,
        CONSTRAINT "FK_order_items_menu_item" FOREIGN KEY ("menu_item_id")
          REFERENCES "menu_items" ("id") ON DELETE RESTRICT
      );
    `);

    // Índice para cargar las líneas de un pedido
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_order_id" ON "order_items" ("order_id");`,
    );
    // Índice para reportes por platillo
    await queryRunner.query(
      `CREATE INDEX "IDX_order_items_menu_item_id" ON "order_items" ("menu_item_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_order_items_menu_item_id";`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_items_order_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_items";`);
  }
}
