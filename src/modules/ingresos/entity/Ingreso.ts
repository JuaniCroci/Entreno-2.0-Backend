import {
  Entity,
  PrimaryKey,
  Property,
  ManyToOne,
  OneToMany,
  Collection,
  Unique,
} from '@mikro-orm/core';
import { Proveedor } from '../../proveedores/entity/Proveedor.js';
import { IngresoItem, type IngresoItemPublic } from './IngresoItem.js';

export type EstadoIngreso = 'REGISTRADO' | 'ANULADO';

export interface IngresoPublic {
  id: number;
  nroIngreso: string;
  fecha: Date;
  importeTotal: string;
  estado: EstadoIngreso;
  proveedor: { id: number; razonSocial: string };
  createdAt: Date;
  updatedAt: Date;
}

export interface IngresoDetallePublic extends IngresoPublic {
  items: IngresoItemPublic[];
}

@Entity()
@Unique({ properties: ['nroIngreso'] })
export class Ingreso {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string' })
  nroIngreso!: string;

  @Property({ type: 'datetime' })
  fecha!: Date;

  @Property({ type: 'string', columnType: 'decimal(10,2)' })
  importeTotal!: string;

  @Property({ type: 'string', default: 'REGISTRADO' })
  estado: EstadoIngreso = 'REGISTRADO';

  @ManyToOne(() => Proveedor)
  proveedor!: Proveedor;

  @OneToMany(() => IngresoItem, (item) => item.ingreso)
  items = new Collection<IngresoItem>(this);

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ type: 'datetime', onCreate: () => new Date(), onUpdate: () => new Date() })
  updatedAt!: Date;

  toPublic(): IngresoPublic {
    return {
      id: this.id,
      nroIngreso: this.nroIngreso,
      fecha: this.fecha,
      importeTotal: this.importeTotal,
      estado: this.estado,
      proveedor: { id: this.proveedor.id, razonSocial: this.proveedor.razonSocial },
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }

  toDetalle(items: IngresoItemPublic[]): IngresoDetallePublic {
    return { ...this.toPublic(), items };
  }
}
