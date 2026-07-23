import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MenuItem } from './menu-item.entity';
import { User } from './user.entity';

/**
 * Auditoría de cambios de precio de platillos (ver ADR-006): quién
 * (`changed_by` → users.id) y cuándo, no solo el precio vigente.
 */
@Entity({ name: 'menu_item_price_history' })
export class MenuItemPriceHistory {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'menu_item_id', type: 'uuid' })
  @Index()
  menuItemId!: string;

  @ManyToOne(() => MenuItem, { nullable: false })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem!: MenuItem;

  @Column({ name: 'old_price', type: 'numeric', precision: 10, scale: 2 })
  oldPrice!: number;

  @Column({ name: 'new_price', type: 'numeric', precision: 10, scale: 2 })
  newPrice!: number;

  @Column({ name: 'changed_by', type: 'uuid' })
  changedBy!: string;

  @ManyToOne(() => User, { nullable: false })
  @JoinColumn({ name: 'changed_by' })
  changedByUser!: User;

  @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
  changedAt!: Date;
}
