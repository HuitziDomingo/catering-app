import { randomUUID } from 'node:crypto';
import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import {
  DocumentType,
  isOrderPaid,
  OrderStatus,
  type OrderReceiptResponse,
} from '@catering-app/shared-types';
import { OrderDocument } from '../database/entities/order-document.entity';
import type { Order } from '../database/entities/order.entity';
import { StorageService } from '../storage/storage.service';
import { BusinessInfo, buildReceiptContent } from './receipt-content';
import { ReceiptPdfRenderer } from './receipt-pdf.renderer';

/** Vigencia de la URL firmada del recibo (ADR-028). */
export const RECEIPT_URL_TTL_SECONDS = 15 * 60;

const PDF_CONTENT_TYPE = 'application/pdf';
const DEFAULT_BUSINESS_NAME = 'Santo Sazón';
const DEFAULT_TIME_ZONE = 'America/Mexico_City';
/** unique_violation de Postgres: otra generación ganó la carrera (UQ_order_documents_receipt). */
const UNIQUE_VIOLATION = '23505';

/**
 * Recibo PDF del pedido (ADR-028): lo genera, lo sube al bucket privado
 * `order-documents`, lo registra en `order_documents` y entrega URLs firmadas.
 *
 * Idempotente: un pedido tiene a lo más un recibo. Si ya existe se reutiliza;
 * dos generaciones simultáneas en el mismo proceso comparten la misma
 * promesa, y entre procesos (varias instancias de Cloud Run) el índice único
 * parcial hace que el segundo INSERT falle y se reutilice la fila del primero.
 */
@Injectable()
export class ReceiptsService {
  private readonly logger = new Logger(ReceiptsService.name);
  private readonly inFlight = new Map<string, Promise<OrderDocument>>();

  constructor(
    @InjectRepository(OrderDocument)
    private readonly documents: Repository<OrderDocument>,
    private readonly storage: StorageService,
    private readonly renderer: ReceiptPdfRenderer,
    private readonly config: ConfigService,
  ) {}

  /**
   * Devuelve el recibo del pedido, generándolo si todavía no existe. `order`
   * debe venir con `items.menuItem` y `customer` cargados
   * (OrdersService.findDetailById). No valida si el pedido está pagado: eso
   * lo deciden quienes lo llaman (cambio a confirmed, getReceiptUrl).
   */
  async ensureReceipt(order: Order): Promise<OrderDocument> {
    const existing = await this.findReceipt(order.id);
    if (existing) {
      return existing;
    }

    let pending = this.inFlight.get(order.id);
    if (!pending) {
      pending = this.generate(order).finally(() => this.inFlight.delete(order.id));
      this.inFlight.set(order.id, pending);
    }
    return pending;
  }

  /**
   * URL firmada de 15 minutos del recibo (GET /orders/:id/receipt). Si el
   * pedido está pagado y no tiene recibo (falló la generación al confirmar, o
   * se confirmó antes de que existiera), lo genera al vuelo. Un pedido sin
   * pago responde 409. El control de acceso ya lo hizo quien llama
   * (OrdersService.findByIdForRequester).
   */
  async getReceiptUrl(order: Order, now: Date = new Date()): Promise<OrderReceiptResponse> {
    let receipt = await this.findReceipt(order.id);
    if (!receipt) {
      if (!isOrderPaid({ status: order.status as OrderStatus, paidAt: order.paidAt })) {
        throw new ConflictException(
          'El pedido todavía no está pagado, así que no tiene recibo.',
        );
      }
      receipt = await this.ensureReceipt(order);
    }

    const url = await this.storage.getSignedUrl(
      'documents',
      receipt.storageKey,
      RECEIPT_URL_TTL_SECONDS,
    );
    return {
      url,
      expiresAt: new Date(now.getTime() + RECEIPT_URL_TTL_SECONDS * 1000).toISOString(),
    };
  }

  private findReceipt(orderId: string): Promise<OrderDocument | null> {
    return this.documents.findOne({
      where: { orderId, type: DocumentType.RECEIPT },
    });
  }

  private async generate(order: Order): Promise<OrderDocument> {
    const pdf = await this.renderer.render(buildReceiptContent(order, this.businessInfo()));
    const storageKey = `receipts/${order.id}/${randomUUID()}.pdf`;
    await this.storage.putObject('documents', storageKey, pdf, PDF_CONTENT_TYPE);

    try {
      const saved = await this.documents.save(
        this.documents.create({
          orderId: order.id,
          type: DocumentType.RECEIPT,
          storageKey,
          contentType: PDF_CONTENT_TYPE,
          sizeBytes: pdf.length,
        }),
      );
      this.logger.log(`Recibo generado para el pedido ${order.id} (${pdf.length} bytes).`);
      return saved;
    } catch (error) {
      if (!isUniqueViolation(error)) {
        throw error;
      }
      // Otra instancia generó el recibo al mismo tiempo: se usa el suyo y se
      // borra el PDF que acabamos de subir, que quedó sin fila.
      await this.storage.deleteObject('documents', storageKey).catch((deleteError) =>
        this.logger.warn(`No se pudo borrar el recibo duplicado ${storageKey}: ${deleteError}`),
      );
      const winner = await this.findReceipt(order.id);
      if (!winner) {
        throw error;
      }
      return winner;
    }
  }

  /** Datos del negocio por variables de entorno (ADR-028): cambiarlos no requiere recompilar. */
  private businessInfo(): BusinessInfo {
    const optional = (name: string) => this.config.get<string>(name)?.trim() || null;
    return {
      name: optional('BUSINESS_NAME') ?? DEFAULT_BUSINESS_NAME,
      address: optional('BUSINESS_ADDRESS'),
      phone: optional('BUSINESS_PHONE'),
      email: optional('BUSINESS_EMAIL'),
      rfc: optional('BUSINESS_RFC'),
      timeZone: optional('BUSINESS_TIMEZONE') ?? DEFAULT_TIME_ZONE,
    };
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof QueryFailedError &&
    (error.driverError as { code?: string } | undefined)?.code === UNIQUE_VIOLATION
  );
}
