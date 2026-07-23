import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega tablas de catálogo de menú (ver ADR-006):
 *
 * - `menu_categories`: categorías de menú (desayuno/comida/cena como datos,
 *   no enum — editable sin migración).
 * - `menu_items`: platillos del menú. `attributes` es JSONB para alérgenos,
 *   extras y atributos futuros sin alterar la tabla.
 * - `menu_item_price_history`: auditoría de cada cambio de precio — quién
 *   (`changed_by` → users.id) y cuándo, no solo el precio vigente.
 */
export class AddMenu1752537600003 implements MigrationInterface {
  name = 'AddMenu1752537600003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "menu_categories" (
        "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
        "name"           VARCHAR(100) NOT NULL,
        "display_order"  INT NOT NULL,
        "is_active"      BOOLEAN NOT NULL DEFAULT true,
        CONSTRAINT "PK_menu_categories_id" PRIMARY KEY ("id")
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "menu_items" (
        "id"             UUID NOT NULL DEFAULT gen_random_uuid(),
        "category_id"    UUID NOT NULL,
        "name"           VARCHAR(150) NOT NULL,
        "description"    TEXT,
        "base_price"     NUMERIC(10,2) NOT NULL,
        "serves_people"  INT NOT NULL,
        "attributes"     JSONB NOT NULL DEFAULT '{}',
        "image_url"      VARCHAR(500),
        "is_active"      BOOLEAN NOT NULL DEFAULT true,
        "created_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_menu_items_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_menu_items_category" FOREIGN KEY ("category_id")
          REFERENCES "menu_categories" ("id") ON DELETE RESTRICT
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "menu_item_price_history" (
        "id"             BIGSERIAL PRIMARY KEY,
        "menu_item_id"   UUID NOT NULL,
        "old_price"      NUMERIC(10,2) NOT NULL,
        "new_price"      NUMERIC(10,2) NOT NULL,
        "changed_by"     UUID NOT NULL,
        "changed_at"     TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "FK_menu_item_price_history_item" FOREIGN KEY ("menu_item_id")
          REFERENCES "menu_items" ("id") ON DELETE RESTRICT,
        CONSTRAINT "FK_menu_item_price_history_changed_by" FOREIGN KEY ("changed_by")
          REFERENCES "users" ("id") ON DELETE RESTRICT
      );
    `);

    // Índice para listar categorías activas
    await queryRunner.query(
      `CREATE INDEX "IDX_menu_categories_is_active" ON "menu_categories" ("is_active");`,
    );

    // Índices para listar platillos activos y filtrar por categoría
    await queryRunner.query(
      `CREATE INDEX "IDX_menu_items_category_id" ON "menu_items" ("category_id");`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_menu_items_is_active" ON "menu_items" ("is_active");`,
    );

    // Índice para consultar el historial de precios de un platillo
    await queryRunner.query(
      `CREATE INDEX "IDX_menu_item_price_history_menu_item_id" ON "menu_item_price_history" ("menu_item_id");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_menu_item_price_history_menu_item_id";`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_menu_items_is_active";`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_menu_items_category_id";`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_menu_categories_is_active";`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_item_price_history";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_items";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "menu_categories";`);
  }
}
