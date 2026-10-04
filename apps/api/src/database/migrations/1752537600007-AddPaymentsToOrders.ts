import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Soporte de pagos vía Mercado Pago Checkout Pro (ver ADR-024).
 *
 * - `payment_preference_id`: id de la Preferencia de Pago de Mercado Pago
 *   asociada al pedido (nullable -- un pedido recién creado todavía no tiene
 *   una preferencia generada).
 * - `CHK_orders_status`: hasta ahora `orders.status` era un VARCHAR(50) sin
 *   restricción a nivel de base de datos (ver AddOrders1752537600002). Se
 *   agrega el CHECK ahora, con la lista completa de valores válidos
 *   (los de ADR-006 más `payment_failed` de ADR-024), en vez de solo
 *   documentarlos en comentarios.
 */
export class AddPaymentsToOrders1752537600007 implements MigrationInterface {
  name = 'AddPaymentsToOrders1752537600007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders" ADD COLUMN "payment_preference_id" VARCHAR(255);
    `);

    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD CONSTRAINT "CHK_orders_status" CHECK (
          "status" IN ('pending', 'confirmed', 'preparing', 'delivered', 'cancelled', 'payment_failed')
        );
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "orders" DROP CONSTRAINT IF EXISTS "CHK_orders_status";`,
    );
    await queryRunner.query(
      `ALTER TABLE "orders" DROP COLUMN "payment_preference_id";`,
    );
  }
}
