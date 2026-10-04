import { Entity, PrimaryKey, Property, ManyToOne, OneToMany, Collection } from '@mikro-orm/core';
import { Usuario } from '../../usuarios/entity/Usuario.js';
import { PedidoItem, type PedidoItemPublic } from './PedidoItem.js';

export type EstadoPedido = 'REALIZADO' | 'ABONADO' | 'ENTREGADO' | 'CANCELADO';

export const ESTADOS_PEDIDO: EstadoPedido[] = ['REALIZADO', 'ABONADO', 'ENTREGADO', 'CANCELADO'];

export interface PedidoPublic {
  id: number;
  fecha: Date;
  estado: EstadoPedido;
  importeTotal: string;
  usuario: { id: number; nombre: string; email: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface PedidoDetallePublic extends PedidoPublic {
  items: PedidoItemPublic[];
}

export interface PedidoListPublic extends PedidoPublic {
  fechaEntrega: Date | null;
}

export interface ClienteDetallePublic {
  id: number;
  nombre: string;
  email: string;
  telefono: string | null;
  direccion: string | null;
}

export interface PedidoDetalleAdminPublic extends PedidoDetallePublic {
  usuario: ClienteDetallePublic;
}

@Entity()
export class Pedido {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'datetime' })
  fecha!: Date;

  @Property({ type: 'string', default: 'REALIZADO' })
  estado: EstadoPedido = 'REALIZADO';

  @Property({ type: 'string', columnType: 'decimal(10,2)' })
  importeTotal!: string;

  @ManyToOne(() => Usuario)
  usuario!: Usuario;

  @OneToMany(() => PedidoItem, (item) => item.pedido)
  items = new Collection<PedidoItem>(this);

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ type: 'datetime', onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt!: Date;

  toPublic(): PedidoPublic {
    return {
      id: this.id,
      fecha: this.fecha,
      estado: this.estado,
      importeTotal: this.importeTotal,
      usuario: { id: this.usuario.id, nombre: this.usuario.nombre, email: this.usuario.email },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toDetalle(items: PedidoItemPublic[]): PedidoDetallePublic {
    return { ...this.toPublic(), items };
  }

  toListPublic(fechaEntrega: Date | null): PedidoListPublic {
    return { ...this.toPublic(), fechaEntrega };
  }

  toDetalleAdmin(items: PedidoItemPublic[]): PedidoDetalleAdminPublic {
    return {
      ...this.toPublic(),
      usuario: {
        id: this.usuario.id,
        nombre: this.usuario.nombre,
        email: this.usuario.email,
        telefono: this.usuario.telefono,
        direccion: this.usuario.direccion,
      },
      items,
    };
  }
}
