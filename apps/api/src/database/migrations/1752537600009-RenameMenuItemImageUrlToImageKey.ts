import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * `menu_items.image_url` -> `image_key` (ver ADR-028). La base guarda la
 * llave del objeto en el bucket de imágenes, no la URL: la API arma la URL
 * pública en cada respuesta con `STORAGE_PUBLIC_URL`, así que cambiar el host
 * (otra IP en desarrollo, un CDN en producción) no obliga a reescribir filas.
 *
 * Al crear esta migración ningún platillo tenía imagen (no había endpoint de
 * subida), así que no hay URLs que convertir. Por si acaso, se vacían: una
 * URL externa no es una llave válida del bucket.
 */
export class RenameMenuItemImageUrlToImageKey1752537600009 implements MigrationInterface {
  name = 'RenameMenuItemImageUrlToImageKey1752537600009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`UPDATE "menu_items" SET "image_url" = NULL;`);
    await queryRunner.query(
      `ALTER TABLE "menu_items" RENAME COLUMN "image_url" TO "image_key";`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Una llave no es una URL: al revertir, los platillos quedan sin imagen.
    await queryRunner.query(`UPDATE "menu_items" SET "image_key" = NULL;`);
    await queryRunner.query(
      `ALTER TABLE "menu_items" RENAME COLUMN "image_key" TO "image_url";`,
    );
  }
}
