import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Reemplaza `menu_items.serves_people` (int único) por un rango
 * `serves_min`/`serves_max` (ver ADR-021): un platillo de catering sirve a
 * un rango de personas (ej. "de 300 a 500"), no una cantidad exacta.
 *
 * Sin datos de producción reales todavía (proyecto en desarrollo, ver
 * ADR-021), esta es una migración breaking directa: no se intenta derivar
 * serves_min/serves_max a partir del serves_people existente. Las columnas
 * se agregan con un DEFAULT temporal (1/1, que satisface el CHECK) solo
 * para no romper filas ya existentes en dev; el DEFAULT se elimina de
 * inmediato para que los inserts futuros deban proveer ambos valores.
 */
export class AddMenuItemServesRange1752537600005
  implements MigrationInterface
{
  name = 'AddMenuItemServesRange1752537600005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "menu_items" DROP COLUMN "serves_people";`,
    );

    await queryRunner.query(
      `ALTER TABLE "menu_items" ADD COLUMN "serves_min" INT NOT NULL DEFAULT 1;`,
    );
    await queryRunner.query(
      `ALTER TABLE "menu_items" ADD COLUMN "serves_max" INT NOT NULL DEFAULT 1;`,
    );
    await queryRunner.query(
      `ALTER TABLE "menu_items" ALTER COLUMN "serves_min" DROP DEFAULT;`,
    );
    await queryRunner.query(
      `ALTER TABLE "menu_items" ALTER COLUMN "serves_max" DROP DEFAULT;`,
    );

    await queryRunner.query(`
      ALTER TABLE "menu_items"
        ADD CONSTRAINT "CHK_menu_items_serves_range" CHECK ("serves_max" >= "serves_min");
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "menu_items" DROP CONSTRAINT IF EXISTS "CHK_menu_items_serves_range";`,
    );
    await queryRunner.query(
      `ALTER TABLE "menu_items" DROP COLUMN "serves_max";`,
    );
    await queryRunner.query(
      `ALTER TABLE "menu_items" DROP COLUMN "serves_min";`,
    );

    await queryRunner.query(
      `ALTER TABLE "menu_items" ADD COLUMN "serves_people" INT NOT NULL DEFAULT 1;`,
    );
    await queryRunner.query(
      `ALTER TABLE "menu_items" ALTER COLUMN "serves_people" DROP DEFAULT;`,
    );
  }
}
