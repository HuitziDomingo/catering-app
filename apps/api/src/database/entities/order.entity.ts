import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
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

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
