import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { QueryFailedError, type Repository } from 'typeorm';
import { DocumentType, OrderStatus } from '@catering-app/shared-types';
import type { OrderDocument } from '../database/entities/order-document.entity';
import { S3StorageService } from '../storage/s3-storage.service';
import type { StorageService } from '../storage/storage.service';
import { business, paidOrder } from './receipt-fixtures';
import type { ReceiptPdfRenderer } from './receipt-pdf.renderer';
import { RECEIPT_URL_TTL_SECONDS, ReceiptsService } from './receipts.service';

const PDF = Buffer.from('%PDF-1.3 recibo de prueba');

const existingReceipt = (orderId: string) =>
  ({
    id: 'doc-1',
    orderId,
    type: DocumentType.RECEIPT,
    storageKey: `receipts/${orderId}/existente.pdf`,
    contentType: 'application/pdf',
    sizeBytes: 1234,
    createdAt: new Date(),
  }) as OrderDocument;

function uniqueViolation(): QueryFailedError {
  return new QueryFailedError('INSERT ...', [], Object.assign(new Error('duplicate key'), { code: '23505' }));
}

describe('ReceiptsService', () => {
  let documents: { findOne: jest.Mock; create: jest.Mock; save: jest.Mock };
  let storage: { putObject: jest.Mock; deleteObject: jest.Mock; getSignedUrl: jest.Mock };
  let renderer: { render: jest.Mock };
  let env: Record<string, string | undefined>;

  const build = (storageService: Partial<StorageService> = storage) =>
    new ReceiptsService(
      documents as unknown as Repository<OrderDocument>,
      storageService as StorageService,
      renderer as unknown as ReceiptPdfRenderer,
      { get: (name: string) => env[name] } as unknown as ConfigService,
    );

  beforeEach(() => {
    documents = {
      findOne: jest.fn().mockResolvedValue(null),
      create: jest.fn((data) => data),
      save: jest.fn((data) => Promise.resolve({ id: 'doc-new', createdAt: new Date(), ...data })),
    };
    storage = {
      putObject: jest.fn().mockResolvedValue(undefined),
      deleteObject: jest.fn().mockResolvedValue(undefined),
      getSignedUrl: jest.fn((_bucket, key, ttl) =>
        Promise.resolve(`http://storage.test/order-documents/${key}?X-Amz-Expires=${ttl}`),
      ),
    };
    renderer = { render: jest.fn().mockResolvedValue(PDF) };
    env = {
      BUSINESS_NAME: business.name,
      BUSINESS_ADDRESS: business.address ?? undefined,
      BUSINESS_PHONE: business.phone ?? undefined,
    };
  });

  describe('ensureReceipt — generación', () => {
    it('renderiza, sube al bucket privado y registra el recibo', async () => {
      const order = paidOrder();

      const receipt = await build().ensureReceipt(order);

      expect(renderer.render).toHaveBeenCalledWith(
        expect.objectContaining({
          folio: '3F2A9B1C',
          business: expect.objectContaining({ name: 'Santo Sazón', phone: '55 1234 5678' }),
        }),
      );
      expect(storage.putObject).toHaveBeenCalledWith(
        'documents',
        expect.stringMatching(new RegExp(`^receipts/${order.id}/[0-9a-f-]{36}\\.pdf$`)),
        PDF,
        'application/pdf',
      );
      expect(receipt).toEqual(
        expect.objectContaining({
          orderId: order.id,
          type: DocumentType.RECEIPT,
          storageKey: storage.putObject.mock.calls[0][1],
          contentType: 'application/pdf',
          sizeBytes: PDF.length,
        }),
      );
    });

    it('sin BUSINESS_NAME usa "Santo Sazón" y omite los datos opcionales vacíos', async () => {
      env = { BUSINESS_PHONE: '   ' };

      await build().ensureReceipt(paidOrder());

      expect(renderer.render.mock.calls[0][0].business).toEqual({
        name: 'Santo Sazón',
        address: null,
        phone: null,
        email: null,
        rfc: null,
        timeZone: 'America/Mexico_City',
      });
    });

    it('propaga el error si falla la subida (quien llama decide si lo registra)', async () => {
      storage.putObject.mockRejectedValue(new Error('storage caído'));

      await expect(build().ensureReceipt(paidOrder())).rejects.toThrow('storage caído');
      expect(documents.save).not.toHaveBeenCalled();
    });
  });

  describe('ensureReceipt — idempotencia', () => {
    it('si el recibo ya existe lo reutiliza sin volver a generarlo ni subirlo', async () => {
      const order = paidOrder();
      documents.findOne.mockResolvedValue(existingReceipt(order.id));

      const receipt = await build().ensureReceipt(order);

      expect(receipt.id).toBe('doc-1');
      expect(renderer.render).not.toHaveBeenCalled();
      expect(storage.putObject).not.toHaveBeenCalled();
      expect(documents.save).not.toHaveBeenCalled();
    });

    it('dos llamadas simultáneas en el mismo proceso generan un solo recibo', async () => {
      const service = build();
      const order = paidOrder();

      const [first, second] = await Promise.all([
        service.ensureReceipt(order),
        service.ensureReceipt(order),
      ]);

      expect(first).toBe(second);
      expect(renderer.render).toHaveBeenCalledTimes(1);
      expect(storage.putObject).toHaveBeenCalledTimes(1);
      expect(documents.save).toHaveBeenCalledTimes(1);
    });

    it('después de un fallo se puede volver a intentar (no queda una promesa rechazada en caché)', async () => {
      const service = build();
      renderer.render.mockRejectedValueOnce(new Error('falla puntual'));

      await expect(service.ensureReceipt(paidOrder())).rejects.toThrow('falla puntual');
      await expect(service.ensureReceipt(paidOrder())).resolves.toEqual(
        expect.objectContaining({ type: DocumentType.RECEIPT }),
      );
      expect(renderer.render).toHaveBeenCalledTimes(2);
    });

    it('si otra instancia ganó la carrera (índice único), usa su recibo y borra el PDF huérfano', async () => {
      const order = paidOrder();
      const winner = existingReceipt(order.id);
      documents.findOne.mockResolvedValueOnce(null).mockResolvedValueOnce(winner);
      documents.save.mockRejectedValue(uniqueViolation());

      const receipt = await build().ensureReceipt(order);

      expect(receipt).toBe(winner);
      expect(storage.deleteObject).toHaveBeenCalledWith(
        'documents',
        storage.putObject.mock.calls[0][1],
      );
    });

    it('un error de BD que no es de unicidad se propaga y no borra nada', async () => {
      documents.save.mockRejectedValue(new Error('conexión perdida'));

      await expect(build().ensureReceipt(paidOrder())).rejects.toThrow('conexión perdida');
      expect(storage.deleteObject).not.toHaveBeenCalled();
    });
  });

  describe('getReceiptUrl', () => {
    const now = new Date('2026-10-06T19:00:00.000Z');

    it('firma la URL del recibo existente por 15 minutos', async () => {
      const order = paidOrder();
      documents.findOne.mockResolvedValue(existingReceipt(order.id));

      const result = await build().getReceiptUrl(order, now);

      expect(RECEIPT_URL_TTL_SECONDS).toBe(900);
      expect(storage.getSignedUrl).toHaveBeenCalledWith(
        'documents',
        `receipts/${order.id}/existente.pdf`,
        900,
      );
      expect(result).toEqual({
        url: `http://storage.test/order-documents/receipts/${order.id}/existente.pdf?X-Amz-Expires=900`,
        expiresAt: '2026-10-06T19:15:00.000Z',
      });
      expect(renderer.render).not.toHaveBeenCalled();
    });

    it('si el pedido está pagado y no tiene recibo, lo genera al vuelo', async () => {
      const result = await build().getReceiptUrl(paidOrder(), now);

      expect(renderer.render).toHaveBeenCalledTimes(1);
      expect(storage.getSignedUrl).toHaveBeenCalledWith(
        'documents',
        storage.putObject.mock.calls[0][1],
        900,
      );
      expect(result.url).toContain('X-Amz-Expires=900');
    });

    it('genera al vuelo también para un pedido cancelado con pago aprobado (rastro del reembolso)', async () => {
      await build().getReceiptUrl(paidOrder({ status: OrderStatus.CANCELLED }), now);

      expect(renderer.render).toHaveBeenCalledTimes(1);
    });

    it.each([OrderStatus.PENDING, OrderStatus.PAYMENT_FAILED])(
      'un pedido %s sin pago responde 409 y no genera nada',
      async (status) => {
        await expect(
          build().getReceiptUrl(paidOrder({ status, paidAt: null }), now),
        ).rejects.toThrow(ConflictException);
        expect(renderer.render).not.toHaveBeenCalled();
      },
    );

    it('la URL real del adaptador S3 apunta al bucket privado, caduca en 900 s y va firmada', async () => {
      const order = paidOrder();
      documents.findOne.mockResolvedValue(existingReceipt(order.id));
      // Firmar es un cálculo local del SDK: no hace llamadas de red.
      const s3 = new S3StorageService({
        get: (name: string, fallback?: string) =>
          ({
            STORAGE_ENDPOINT: 'http://localhost:8333',
            STORAGE_PUBLIC_URL: 'http://192.168.1.68:8333',
            STORAGE_ACCESS_KEY_ID: 'key',
            STORAGE_SECRET_ACCESS_KEY: 'secret',
          })[name] ?? fallback,
      } as unknown as ConfigService);

      const { url } = await build(s3).getReceiptUrl(order, now);
      const parsed = new URL(url);

      expect(parsed.host).toBe('192.168.1.68:8333');
      expect(parsed.pathname).toBe(`/order-documents/receipts/${order.id}/existente.pdf`);
      expect(parsed.searchParams.get('X-Amz-Expires')).toBe('900');
      expect(parsed.searchParams.get('X-Amz-Signature')).toMatch(/^[0-9a-f]{64}$/);
    });
  });
});
