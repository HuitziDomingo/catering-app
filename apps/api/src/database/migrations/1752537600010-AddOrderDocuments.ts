import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Agrega `order_documents` (ver ADR-006, ADR-028): documentos generados de
 * un pedido, por ahora el recibo PDF.
 *
 * - `id`: PK UUID.
 * - `order_id`: FK a orders.id, nullable (ADR-006: los reportes a futuro no
 *   son de un pedido). RESTRICT: los pedidos no se borran.
 * - `type`: receipt / weekly_report / monthly_report (DocumentType).
 * - `storage_key`: llave del objeto en el bucket privado `order-documents`
 *   (en vez del `file_url` de ADR-006: una URL firmada caduca).
 * - `content_type`, `size_bytes`: metadatos del archivo.
 * - `created_at`: cuándo se generó.
 * - `UQ_order_documents_receipt`: índice único parcial, un recibo por pedido.
 *   Si el webhook duplicado y GET /orders/:id/receipt generan a la vez, el
 *   segundo INSERT falla y ese proceso reutiliza la fila del primero.
 */
export class AddOrderDocuments1752537600010 implements MigrationInterface {
  name = 'AddOrderDocuments1752537600010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "order_documents" (
        "id"            UUID NOT NULL DEFAULT gen_random_uuid(),
        "order_id"      UUID,
        "type"          VARCHAR(30) NOT NULL,
        "storage_key"   VARCHAR(512) NOT NULL,
        "content_type"  VARCHAR(100) NOT NULL,
        "size_bytes"    INT NOT NULL,
        "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_order_documents_id" PRIMARY KEY ("id"),
        CONSTRAINT "FK_order_documents_order" FOREIGN KEY ("order_id")
          REFERENCES "orders" ("id") ON DELETE RESTRICT,
        CONSTRAINT "CHK_order_documents_type"
          CHECK ("type" IN ('receipt', 'weekly_report', 'monthly_report'))
      );
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_order_documents_order_id" ON "order_documents" ("order_id");`,
    );

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_order_documents_receipt"
        ON "order_documents" ("order_id", "type")
        WHERE "type" = 'receipt';
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_order_documents_receipt";`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_order_documents_order_id";`);
    await queryRunner.query(`DROP TABLE IF EXISTS "order_documents";`);
  }
}
