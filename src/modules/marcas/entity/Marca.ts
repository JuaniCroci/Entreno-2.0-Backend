import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

export interface MarcaPublic {
  id: number;
  nombre: string;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Entity()
export class Marca {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string', unique: true })
  nombre!: string;

  @Property({ type: 'boolean', default: true })
  activo = true;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updatedAt!: Date;

  toPublic(): MarcaPublic {
    return {
      id: this.id,
      nombre: this.nombre,
      activo: this.activo,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}