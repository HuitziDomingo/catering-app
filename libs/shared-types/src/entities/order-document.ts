import { DocumentType } from '../enums/document-type.enum';

/**
 * Fila de `order_documents` (ADR-006, ADR-028). Guarda la llave del objeto en
 * el bucket privado `order-documents`, no una URL: las URLs firmadas caducan,
 * así que la API genera una nueva en cada consulta. La llave nunca sale de la
 * API (los clientes reciben `OrderReceiptResponse`).
 */
export interface OrderDocument {
  id: string;
  /** null para reportes no ligados a un pedido (a futuro, ADR-006). */
  orderId: string | null;
  type: DocumentType;
  storageKey: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
}
