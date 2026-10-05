import { ConfigService } from '@nestjs/config';
import { S3StorageService } from './s3-storage.service';

const baseEnv: Record<string, string> = {
  STORAGE_ENDPOINT: 'http://localhost:8333',
  STORAGE_PUBLIC_URL: 'http://192.168.1.68:8333/',
  STORAGE_ACCESS_KEY_ID: 'key',
  STORAGE_SECRET_ACCESS_KEY: 'secret',
};

const build = (env: Record<string, string> = baseEnv) =>
  new S3StorageService({
    get: (name: string, fallback?: string) => env[name] ?? fallback,
  } as unknown as ConfigService);

describe('S3StorageService', () => {
  describe('getPublicUrl', () => {
    it('joins STORAGE_PUBLIC_URL, bucket and key (no double slash)', () => {
      expect(build().getPublicUrl('menuImages', 'menu-items/a/b.webp')).toBe(
        'http://192.168.1.68:8333/menu-images/menu-items/a/b.webp',
      );
    });

    it('uses the configured bucket names', () => {
      const storage = build({
        ...baseEnv,
        STORAGE_MENU_IMAGES_BUCKET: 'imagenes-prod',
      });

      expect(storage.getPublicUrl('menuImages', 'x.webp')).toBe(
        'http://192.168.1.68:8333/imagenes-prod/x.webp',
      );
    });

    it('fails with a clear message when STORAGE_PUBLIC_URL is missing', () => {
      const env = { ...baseEnv };
      delete env.STORAGE_PUBLIC_URL;

      expect(() => build(env).getPublicUrl('menuImages', 'x.webp')).toThrow(
        /STORAGE_PUBLIC_URL/,
      );
    });
  });

  describe('getSignedUrl', () => {
    // Firmar es un cálculo local del SDK: no hace llamadas de red.
    it('signs with the public host by default, not the internal endpoint', async () => {
      const url = new URL(
        await build().getSignedUrl('documents', 'receipts/o/r.pdf', 900),
      );

      expect(url.host).toBe('192.168.1.68:8333');
      expect(url.pathname).toBe('/order-documents/receipts/o/r.pdf');
      expect(url.searchParams.get('X-Amz-Expires')).toBe('900');
      expect(url.searchParams.get('X-Amz-Signature')).toBeTruthy();
    });

    it('signs with STORAGE_SIGNED_URL_ENDPOINT when set (Supabase S3 endpoint)', async () => {
      const storage = build({
        ...baseEnv,
        STORAGE_SIGNED_URL_ENDPOINT: 'https://ref.supabase.co/storage/v1/s3',
      });

      const url = new URL(
        await storage.getSignedUrl('documents', 'receipts/o/r.pdf', 60),
      );

      expect(url.origin).toBe('https://ref.supabase.co');
      expect(url.pathname).toBe(
        '/storage/v1/s3/order-documents/receipts/o/r.pdf',
      );
    });
  });
});
