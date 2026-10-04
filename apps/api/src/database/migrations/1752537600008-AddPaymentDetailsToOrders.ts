import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Detalle del pago de Mercado Pago y soporte de la vista de gestión de
 * pedidos del dashboard (ver ADR-027).
 *
 * - `payment_id`: id del pago (no de la preferencia) en Mercado Pago, tal
 *   como lo devuelve la re-consulta del webhook (ADR-024). Nullable -- un
 *   pedido sin pago todavía, o pagado por transferencia/efectivo y
 *   confirmado a mano por el staff, no lo tiene.
 * - `payment_method`: `payment_method_id` de Mercado Pago (ej. visa, master,
 *   oxxo, spei).
 * - `paid_at`: `date_approved` del pago; solo se llena con pagos aprobados.
 * - `IDX_orders_created_at`: la lista de staff ordena por fecha de creación y
 *   la campanita filtra por `created_at > lastSeenAt` (ADR-027) -- hasta
 *   ahora solo había índice por `scheduled_for`.
 */
export class AddPaymentDetailsToOrders1752537600008 implements MigrationInterface {
  name = 'AddPaymentDetailsToOrders1752537600008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "orders"
        ADD COLUMN "payment_id" VARCHAR(64),
        ADD COLUMN "payment_method" VARCHAR(50),
        ADD COLUMN "paid_at" TIMESTAMPTZ;
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_orders_created_at" ON "orders" ("created_at");`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_orders_created_at";`);
    await queryRunner.query(`
      ALTER TABLE "orders"
        DROP COLUMN "paid_at",
        DROP COLUMN "payment_method",
        DROP COLUMN "payment_id";
    `);
  }
}
