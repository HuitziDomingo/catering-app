import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Order } from './order.entity';

/**
 * Documentos generados de un pedido (ver ADR-006, ADR-028): por ahora solo
 * el recibo PDF. Guarda la llave del objeto en el bucket privado
 * `order-documents`, no una URL -- las URLs firmadas caducan, así que se
 * genera una nueva en cada consulta.
 *
 * El índice único parcial (order_id, type) WHERE type = 'receipt' lo crea la
 * migración AddOrderDocuments: TypeORM no lo necesita conocer, pero es lo que
 * garantiza un recibo por pedido aunque dos generaciones corran a la vez.
 */
@Entity({ name: 'order_documents' })
export class OrderDocument {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  // Nullable (ADR-006): los reportes semanales/mensuales no son de un pedido.
  @Column({ name: 'order_id', type: 'uuid', nullable: true })
  @Index()
  orderId!: string | null;

  @ManyToOne(() => Order, { nullable: true })
  @JoinColumn({ name: 'order_id' })
  order?: Order | null;

  @Column({ name: 'type', type: 'varchar', length: 30 })
  type!: string;

  @Column({ name: 'storage_key', type: 'varchar', length: 512 })
  storageKey!: string;

  @Column({ name: 'content_type', type: 'varchar', length: 100 })
  contentType!: string;

  @Column({ name: 'size_bytes', type: 'int' })
  sizeBytes!: number;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;
}
