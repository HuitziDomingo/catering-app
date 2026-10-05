import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { StorageBucket, StorageService } from './storage.service';

const DEFAULT_REGION = 'us-east-1';

const BUCKET_ENV: Record<StorageBucket, { name: string; fallback: string }> = {
  menuImages: { name: 'STORAGE_MENU_IMAGES_BUCKET', fallback: 'menu-images' },
  documents: { name: 'STORAGE_DOCUMENTS_BUCKET', fallback: 'order-documents' },
};

/**
 * Adaptador S3 del puerto de almacenamiento (ver ADR-028). Hay dos clientes
 * porque la API y los clientes no ven la red igual:
 *
 * - `apiClient` apunta a `STORAGE_ENDPOINT` y hace las llamadas reales
 *   (subir, borrar).
 * - `signerClient` apunta a `STORAGE_SIGNED_URL_ENDPOINT` (default
 *   `STORAGE_PUBLIC_URL`). Solo firma URLs, que es un cálculo local: la firma
 *   S3 incluye el header Host, así que debe hacerse con el host que va a
 *   usar el teléfono o el navegador, no con `localhost` de la API.
 *
 * Se configura de forma perezosa (mismo patrón que PaymentsService): si falta
 * una variable, el error surge al primer uso, no al arrancar la API.
 */
@Injectable()
export class S3StorageService extends StorageService {
  private apiClient?: S3Client;
  private signerClient?: S3Client;

  constructor(private readonly config: ConfigService) {
    super();
  }

  async putObject(
    bucket: StorageBucket,
    key: string,
    body: Buffer,
    contentType: string,
  ): Promise<void> {
    await this.getApiClient().send(
      new PutObjectCommand({
        Bucket: this.bucketName(bucket),
        Key: key,
        Body: body,
        ContentType: contentType,
        // La llave cambia en cada subida (ADR-028), así que el objeto nunca
        // cambia de contenido y se puede cachear sin límite.
        CacheControl: 'public, max-age=31536000, immutable',
      }),
    );
  }

  async deleteObject(bucket: StorageBucket, key: string): Promise<void> {
    await this.getApiClient().send(
      new DeleteObjectCommand({ Bucket: this.bucketName(bucket), Key: key }),
    );
  }

  getPublicUrl(bucket: StorageBucket, key: string): string {
    const base = this.requireEnv('STORAGE_PUBLIC_URL').replace(/\/+$/, '');
    const path = key.split('/').map(encodeURIComponent).join('/');
    return `${base}/${this.bucketName(bucket)}/${path}`;
  }

  getSignedUrl(
    bucket: StorageBucket,
    key: string,
    expiresInSeconds: number,
  ): Promise<string> {
    return getSignedUrl(
      this.getSignerClient(),
      new GetObjectCommand({ Bucket: this.bucketName(bucket), Key: key }),
      { expiresIn: expiresInSeconds },
    );
  }

  private getApiClient(): S3Client {
    this.apiClient ??= this.buildClient(this.requireEnv('STORAGE_ENDPOINT'));
    return this.apiClient;
  }

  private getSignerClient(): S3Client {
    this.signerClient ??= this.buildClient(
      this.config.get<string>('STORAGE_SIGNED_URL_ENDPOINT') ||
        this.requireEnv('STORAGE_PUBLIC_URL'),
    );
    return this.signerClient;
  }

  private buildClient(endpoint: string): S3Client {
    return new S3Client({
      endpoint,
      region: this.config.get<string>('STORAGE_REGION') || DEFAULT_REGION,
      forcePathStyle:
        this.config.get<string>('STORAGE_FORCE_PATH_STYLE', 'true') !== 'false',
      credentials: {
        accessKeyId: this.requireEnv('STORAGE_ACCESS_KEY_ID'),
        secretAccessKey: this.requireEnv('STORAGE_SECRET_ACCESS_KEY'),
      },
    });
  }

  private bucketName(bucket: StorageBucket): string {
    const { name, fallback } = BUCKET_ENV[bucket];
    return this.config.get<string>(name) || fallback;
  }

  private requireEnv(name: string): string {
    const value = this.config.get<string>(name);
    if (!value) {
      throw new Error(
        `${name} no está definida. Configura el almacenamiento (ver ADR-028 ` +
          'y apps/api/.env.example).',
      );
    }
    return value;
  }
}
