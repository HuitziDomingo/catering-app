import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { OrderItem } from './order-item.entity';
import { User } from './user.entity';

/**
 * Pedidos de catering (ver ADR-006).
 */
@Entity({ name: 'orders' })
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'customer_id', type: 'uuid' })
  @Index()
  customerId!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'customer_id' })
  customer!: User;

  @Column({
    name: 'status',
    type: 'varchar',
    length: 50,
    default: 'pending',
  })
  status!: string;

  @Column({ name: 'people_count', type: 'int' })
  peopleCount!: number;

  @Column({ name: 'scheduled_for', type: 'timestamptz' })
  scheduledFor!: Date;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  subtotal!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  total!: number;

  @Column({ type: 'text', nullable: true })
  notes?: string | null;

  // true cuando peopleCount cayó fuera del rango serves_min/serves_max de
  // todos los platillos pedidos: el pedido se crea igual (ver ADR-023) pero
  // queda marcado para revisión manual del negocio en vez de rechazarse.
  @Column({ name: 'needs_review', type: 'boolean', default: false })
  needsReview!: boolean;

  // id de la Preferencia de Pago de Mercado Pago asociada a este pedido (ver
  // ADR-024) -- null hasta que se llama POST /payments/preferences.
  @Column({ name: 'payment_preference_id', type: 'varchar', length: 255, nullable: true })
  paymentPreferenceId?: string | null;

  // Detalle del pago de Mercado Pago, tomado de la re-consulta del webhook
  // (ADR-024, ADR-027) -- nunca del payload recibido. null mientras no haya
  // pago, o si el staff confirmó a mano un pago por transferencia/efectivo.
  @Column({ name: 'payment_id', type: 'varchar', length: 64, nullable: true })
  paymentId?: string | null;

  @Column({ name: 'payment_method', type: 'varchar', length: 50, nullable: true })
  paymentMethod?: string | null;

  @Column({ name: 'paid_at', type: 'timestamptz', nullable: true })
  paidAt?: Date | null;

  @OneToMany(() => OrderItem, (item) => item.order)
  items!: OrderItem[];

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
