import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { User } from './user.entity';

/**
 * Catálogo de roles (customer, staff, admin, superadmin).
 * Tabla, no enum en código: agregar un rol nuevo es un INSERT, no una
 * migración (ver ADR-006).
 */
@Entity({ name: 'roles' })
export class Role {
  @PrimaryGeneratedColumn({ type: 'smallint' })
  id!: number;

  @Column({ type: 'varchar', length: 50, unique: true })
  name!: string;

  @OneToMany(() => User, (user) => user.role)
  users!: User[];
}
