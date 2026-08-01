import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega `orders.needs_review` (ver ADR-023): cuando el tool MCP
 * `crear_pedido` recibe un `peopleCount` fuera del rango
 * `serves_min`/`serves_max` de todos los platillos pedidos, el pedido no se
 * rechaza (un catering real puede ajustar cantidades) sino que se crea con
 * esta bandera en `true` para revisión manual del negocio.
 */
export class AddOrderNeedsReview1752537600006 implements MigrationInterface {
  name = 'AddOrderNeedsReview1752537600006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" ADD COLUMN "needs_review" BOOLEAN NOT NULL DEFAULT false;`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "needs_review";`,
    );
  }
}
