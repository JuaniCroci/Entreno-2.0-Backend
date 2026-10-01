import { Entity, PrimaryKey, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { Carrito } from './Carrito.js';
import { Producto } from '../../productos/entity/Producto.js';

export interface CarritoItemPublic {
  id: number;
  producto: { id: number; nombre: string; precioUnitario: string };
  cantidad: number;
}

@Entity()
@Unique({ properties: ['carrito', 'producto'] })
export class CarritoItem {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @ManyToOne(() => Carrito)
  carrito!: Carrito;

  @ManyToOne(() => Producto)
  producto!: Producto;

  @Property({ type: 'integer' })
  cantidad!: number;

  toPublic(): CarritoItemPublic {
    return {
      id: this.id,
      producto: {
        id: this.producto.id,
        nombre: this.producto.nombre,
        precioUnitario: this.producto.precioUnitario,
      },
      cantidad: this.cantidad,
    };
  }
}
