import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Unique,
} from '@mikro-orm/core';
import { Usuario } from '../../usuarios/entity/Usuario.js';
import { CarritoItem } from './CarritoItem.js';

export type EstadoCarrito = 'ACTIVO' | 'CONCLUIDO';

@Entity()
@Unique({ properties: ['usuarioActivoSlot'] })
export class Carrito {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string', default: 'ACTIVO' })
  estado: EstadoCarrito = 'ACTIVO';

  @ManyToOne(() => Usuario)
  usuario!: Usuario;

  @Property({ type: 'integer', nullable: true })
  usuarioActivoSlot: number | null = null;

  @OneToMany(() => CarritoItem, (item) => item.carrito)
  items = new Collection<CarritoItem>(this);

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ type: 'datetime', onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt!: Date;
}
