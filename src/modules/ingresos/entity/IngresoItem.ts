import { Entity, PrimaryKey, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { Decimal } from 'decimal.js';
import { Ingreso } from './Ingreso.js';
import { Producto } from '../../productos/entity/Producto.js';

export interface IngresoItemPublic {
  id: number;
  idProducto: number;
  producto: { id: number; nombre: string };
  cantidad: number;
  precioUnitario: string;
  importeLinea: string;
}

@Entity()
@Unique({ properties: ['ingreso', 'producto'] })
export class IngresoItem {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @ManyToOne(() => Ingreso)
  ingreso!: Ingreso;

  @ManyToOne(() => Producto)
  producto!: Producto;

  @Property({ type: 'integer' })
  cantidad!: number;

  @Property({ type: 'string', columnType: 'decimal(10,2)' })
  precioUnitario!: string;

  toPublic(): IngresoItemPublic {
    return {
      id: this.id,
      idProducto: this.producto.id,
      producto: { id: this.producto.id, nombre: this.producto.nombre },
      cantidad: this.cantidad,
      precioUnitario: this.precioUnitario,
      importeLinea: new Decimal(this.cantidad).mul(this.precioUnitario).toFixed(2),
    };
  }
}
