import { Entity, PrimaryKey, Property, ManyToOne, Unique } from '@mikro-orm/core';
import { Pedido } from './Pedido.js';
import { Producto } from '../../productos/entity/Producto.js';

export interface PedidoItemPublic {
  id: number;
  producto: { id: number; nombre: string };
  cantidad: number;
  precioUnitario: string;
  subtotal: string;
  descuentoAplicado: string | null;
}

@Entity()
@Unique({ properties: ['pedido', 'producto'] })
export class PedidoItem {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @ManyToOne(() => Pedido)
  pedido!: Pedido;

  @ManyToOne(() => Producto)
  producto!: Producto;

  @Property({ type: 'integer' })
  cantidad!: number;

  @Property({ type: 'string', columnType: 'decimal(10,2)' })
  precioUnitario!: string;

  @Property({ type: 'string', columnType: 'decimal(10,2)' })
  subtotal!: string;

  @Property({ type: 'string', columnType: 'decimal(10,2)', nullable: true })
  descuentoAplicado: string | null = null;

  toPublic(): PedidoItemPublic {
    return {
      id: this.id,
      producto: { id: this.producto.id, nombre: this.producto.nombre },
      cantidad: this.cantidad,
      precioUnitario: this.precioUnitario,
      subtotal: this.subtotal,
      descuentoAplicado: this.descuentoAplicado,
    };
  }
}
