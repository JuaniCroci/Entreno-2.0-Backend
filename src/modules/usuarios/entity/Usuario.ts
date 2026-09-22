import { Entity, Enum, PrimaryKey, Property } from '@mikro-orm/core';

export const Rol = {
  ADMIN: 'ADMIN',
  CLIENTE: 'CLIENTE',
} as const;

export type Rol = (typeof Rol)[keyof typeof Rol];

export interface UsuarioPublic {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  direccion: string | null;
  rol: Rol;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Entity()
export class Usuario {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string' })
  nombre!: string;

  @Property({ type: 'string', unique: true })
  email!: string;

  @Property({ type: 'string' })
  passwordHash!: string;

  @Property({ type: 'string', nullable: true })
  telefono: string | null = null;

  @Property({ type: 'string', nullable: true })
  direccion: string | null = null;

  @Enum(() => Object.values(Rol))
  rol: Rol = Rol.CLIENTE;

  @Property({ type: 'boolean', default: true })
  activo = true;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updatedAt!: Date;

  toPublic(): UsuarioPublic {
    return {
      id: this.id,
      nombre: this.nombre,
      email: this.email,
      telefono: this.telefono,
      direccion: this.direccion,
      rol: this.rol,
      activo: this.activo,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
