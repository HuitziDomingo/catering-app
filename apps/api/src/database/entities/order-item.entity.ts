import {
  Column,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MenuItem } from './menu-item.entity';
import { Order } from './order.entity';

/**
 * Líneas de un pedido (ver ADR-006). `unit_price` es un snapshot del
 * base_price vigente del platillo al momento del pedido — un cambio de
 * precio posterior nunca debe alterar pedidos históricos ni sus reportes.
 */
@Entity({ name: 'order_items' })
export class OrderItem {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: number;

  @Column({ name: 'order_id', type: 'uuid' })
  @Index()
  orderId!: string;

  @ManyToOne(() => Order, (order) => order.items, { nullable: false })
  @JoinColumn({ name: 'order_id' })
  order!: Order;

  @Column({ name: 'menu_item_id', type: 'uuid' })
  @Index()
  menuItemId!: string;

  @ManyToOne(() => MenuItem, { nullable: false })
  @JoinColumn({ name: 'menu_item_id' })
  menuItem!: MenuItem;

  @Column({ type: 'int' })
  quantity!: number;

  @Column({ name: 'unit_price', type: 'numeric', precision: 10, scale: 2 })
  unitPrice!: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  subtotal!: number;
}
