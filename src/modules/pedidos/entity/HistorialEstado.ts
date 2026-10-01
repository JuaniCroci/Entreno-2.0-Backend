import { Entity, PrimaryKey, Property, ManyToOne, Index } from '@mikro-orm/core';
import { Pedido, type EstadoPedido } from './Pedido.js';

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
}
