import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Usuario } from '../../../modules/usuarios/entity/Usuario.js';

@Entity()
export class RefreshToken {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @ManyToOne(() => Usuario)
  usuario!: Usuario;

  @Property({ type: 'string' })
  tokenHash!: string;

  @Property({ type: 'datetime' })
  expiresAt!: Date;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ type: 'datetime', nullable: true })
  revokedAt!: Date | null;

  isActive(): boolean {
    return this.expiresAt > new Date() && this.revokedAt === null;
  }
}
