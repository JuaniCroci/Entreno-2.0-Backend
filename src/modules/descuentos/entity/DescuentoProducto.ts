import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Descuento } from './Descuento.js';
import { Producto } from '../../../modules/productos/entity/Producto.js';

export interface DescuentoProductoPublic {
  id: number;
  idDescuento: number;
  idProducto: number;
  fechaDesde: Date;
  fechaHasta: Date;
  producto: { id: number; nombre: string };
}

@Entity()
export class DescuentoProducto {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @ManyToOne(() => Descuento)
  descuento!: Descuento;

  @ManyToOne(() => Producto)
  producto!: Producto;

  @Property({ type: 'date' })
  fechaDesde!: Date;

  @Property({ type: 'date' })
  fechaHasta!: Date;

  toPublic(): DescuentoProductoPublic {
    return {
      id: this.id,
      idDescuento: this.descuento.id,
      idProducto: this.producto.id,
      fechaDesde: this.fechaDesde,
      fechaHasta: this.fechaHasta,
      producto: { id: this.producto.id, nombre: this.producto.nombre },
    };
  }
}
