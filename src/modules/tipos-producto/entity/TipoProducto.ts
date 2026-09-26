import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

export interface TipoProductoPublic {
  id: number;
  nombre: string;
  descripcion: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Entity()
export class TipoProducto {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string', unique: true })
  nombre!: string;

  @Property({ type: 'string', nullable: true })
  descripcion: string | null = null;

  @Property({ type: 'boolean', default: true })
  activo = true;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updatedAt!: Date;

  toPublic(): TipoProductoPublic {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      activo: this.activo,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}