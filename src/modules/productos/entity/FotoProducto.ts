import { Entity, Index, ManyToOne, PrimaryKey, Property } from '@mikro-orm/core';
import { Producto } from './Producto.js';

export interface ImagenPrincipalProducto {
  id: string;
  url: string;
  altText: string;
}

export interface FotoProductoAdmin extends ImagenPrincipalProducto {
  fuente: string;
  licencia: string;
  atribucion: string | null;
  mimeType: string;
  sizeBytes: number;
  esPrincipal: boolean;
  createdAt: Date;
}

@Entity()
@Index({ name: 'foto_producto_producto_principal_idx', properties: ['producto', 'esPrincipal'] })
export class FotoProducto {
  @PrimaryKey({ type: 'string', columnType: 'char(36)' })
  id!: string;

  @ManyToOne(() => Producto, { deleteRule: 'cascade' })
  producto!: Producto;

  @Property({ type: 'string', length: 64 })
  nombreArchivo!: string;

  @Property({ type: 'string', length: 32 })
  mimeType!: string;

  @Property({ type: 'integer' })
  sizeBytes!: number;

  @Property({ type: 'string', length: 255 })
  altText!: string;

  @Property({ type: 'string', length: 255 })
  fuente!: string;

  @Property({ type: 'string', length: 255 })
  licencia!: string;

  @Property({ type: 'string', length: 500, nullable: true })
  atribucion: string | null = null;

  @Property({ type: 'boolean', default: true })
  esPrincipal = true;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt!: Date;

  toPrincipal(): ImagenPrincipalProducto {
    return {
      id: this.id,
      url: `/api/productos/imagenes/${this.id}`,
      altText: this.altText,
    };
  }

  toAdmin(): FotoProductoAdmin {
    return {
      ...this.toPrincipal(),
      fuente: this.fuente,
      licencia: this.licencia,
      atribucion: this.atribucion,
      mimeType: this.mimeType,
      sizeBytes: this.sizeBytes,
      esPrincipal: this.esPrincipal,
      createdAt: this.createdAt,
    };
  }
}
