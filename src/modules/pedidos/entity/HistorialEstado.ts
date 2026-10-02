import { Entity, PrimaryKey, Property, ManyToOne, Index } from '@mikro-orm/core';
import { Pedido, type EstadoPedido } from './Pedido.js';

export interface HistorialEstadoPublic {
  id: number;
  estado: EstadoPedido;
  fecha: Date;
}

@Entity()
@Index({ properties: ['pedido', 'estado'] })
export class HistorialEstado {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @ManyToOne(() => Pedido)
  pedido!: Pedido;

  @Property({ type: 'string' })
  estado!: EstadoPedido;

  @Property({ type: 'datetime' })
  fecha!: Date;

  toPublic(): HistorialEstadoPublic {
    return { id: this.id, estado: this.estado, fecha: this.fecha };
  }
}
