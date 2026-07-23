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
import { MenuCategory } from './menu-category.entity';

/**
 * Platillos del menú (ver ADR-006). `attributes` es JSONB para alérgenos,
 * extras y atributos futuros sin alterar la tabla.
 */
@Entity({ name: 'menu_items' })
export class MenuItem {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'category_id', type: 'uuid' })
  @Index()
  categoryId!: string;

  @ManyToOne(() => MenuCategory, (category) => category.items, {
    nullable: false,
  })
  @JoinColumn({ name: 'category_id' })
  category!: MenuCategory;

  @Column({ type: 'varchar', length: 150 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description?: string | null;

  @Column({ name: 'base_price', type: 'numeric', precision: 10, scale: 2 })
  basePrice!: number;

  @Column({ name: 'serves_people', type: 'int' })
  servesPeople!: number;

  @Column({ type: 'jsonb', default: {} })
  attributes!: Record<string, unknown>;

  @Column({ name: 'image_url', type: 'varchar', length: 500, nullable: true })
  imageUrl?: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  @Index()
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
  updatedAt!: Date;
}
