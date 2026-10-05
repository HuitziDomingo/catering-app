/** Bucket lógico: el nombre real de cada uno sale de configuración. */
export type StorageBucket = 'menuImages' | 'documents';

/**
 * Puerto de almacenamiento de archivos (ver ADR-028). El resto de la API
 * solo conoce esta clase abstracta; la implementación vigente es
 * `S3StorageService` (SeaweedFS en local, Supabase Storage en producción).
 * Si las URLs prefirmadas no funcionan en Supabase, el plan B del ADR cambia
 * solo `getSignedUrl` sin tocar a quienes usan el puerto.
 */
export abstract class StorageService {
  abstract putObject(
    bucket: StorageBucket,
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void>;

  abstract deleteObject(bucket: StorageBucket, key: string): Promise<void>;

  /** URL pública (solo tiene sentido en el bucket de lectura pública). */
  abstract getPublicUrl(bucket: StorageBucket, key: string): string;

  /** URL firmada de lectura que caduca en `expiresInSeconds`. */
  abstract getSignedUrl(
    bucket: StorageBucket,
    key: string,
    expiresInSeconds: number,
  ): Promise<string>;
}
