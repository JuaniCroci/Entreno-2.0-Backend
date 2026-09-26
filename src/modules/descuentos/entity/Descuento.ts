import { Entity, PrimaryKey, Property, OneToMany, Collection } from '@mikro-orm/core';
import { DescuentoProducto } from './DescuentoProducto.js';

export interface DescuentoPublic {
  id: number;
  descripcion: string;
  cantidadMinima: number;
  porcentaje: number;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Entity()
export class Descuento {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string' })
  descripcion!: string;

  @Property({ type: 'integer' })
  cantidadMinima!: number;

  @Property({ type: 'number' })
  porcentaje!: number;

  @Property({ type: 'boolean', default: true })
  activo = true;

  @OneToMany(() => DescuentoProducto, dpto => dpto.descuento)
  aplicaciones = new Collection<DescuentoProducto>(this);

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updatedAt!: Date;

  toPublic(): DescuentoPublic {
    return {
      id: this.id,
      descripcion: this.descripcion,
      cantidadMinima: this.cantidadMinima,
      porcentaje: this.porcentaje,
      activo: this.activo,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
