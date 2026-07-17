import { DocumentType } from '../enums/document-type.enum';

export interface OrderDocument {
  id: number;
  orderId: string | null;
  type: DocumentType;
  fileUrl: string;
  generatedAt: string;
}

export interface CreateOrderDocumentDto {
  orderId?: string | null;
  type: DocumentType;
  fileUrl: string;
}

export interface UpdateOrderDocumentDto {
  orderId?: string | null;
  type?: DocumentType;
  fileUrl?: string;
}
