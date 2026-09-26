import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';
import { Marca } from '../../marcas/entity/Marca.js';
import { TipoProducto } from '../../tipos-producto/entity/TipoProducto.js';
import { Proveedor } from '../../proveedores/entity/Proveedor.js';

export interface ProductoPublic {
  id: number;
  nombre: string;
  descripcion: string | null;
  precioUnitario: string;
  stock: number;
  activo: boolean;
  tipoProducto: { id: number; nombre: string };
  marca: { id: number; nombre: string };
  proveedor: { id: number; razonSocial: string; activo: boolean } | null;
  createdAt: Date;
  updatedAt: Date;
}

@Entity()
export class Producto {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string' })
  nombre!: string;

  @Property({ type: 'string', nullable: true })
  descripcion: string | null = null;

    @Property({ type: 'string', columnType: 'decimal(10,2)' })
    precioUnitario!: string;

  @Property({ type: 'integer', default: 0 })
  stock!: number;

  @Property({ type: 'boolean', default: true })
  activo = true;

  @ManyToOne(() => TipoProducto)
  tipoProducto!: TipoProducto;

  @ManyToOne(() => Marca)
  marca!: Marca;

    @ManyToOne(() => Proveedor, { nullable: true })
    proveedor: Proveedor | null = null;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updatedAt!: Date;

  toPublic(): ProductoPublic {
    return {
      id: this.id,
      nombre: this.nombre,
      descripcion: this.descripcion,
      precioUnitario: this.precioUnitario,
      stock: this.stock,
      activo: this.activo,
      tipoProducto: { id: this.tipoProducto.id, nombre: this.tipoProducto.nombre },
      marca: { id: this.marca.id, nombre: this.marca.nombre },
      proveedor: this.proveedor
        ? { id: this.proveedor.id, razonSocial: this.proveedor.razonSocial, activo: this.proveedor.activo }
        : null,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}
