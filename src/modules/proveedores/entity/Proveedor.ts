import { Entity, PrimaryKey, Property } from '@mikro-orm/core';

export interface ProveedorPublic {
  id: number;
  razonSocial: string;
  cuit: string;
  telefono: string | null;
  email: string | null;
  domicilio: string | null;
  activo: boolean;
  createdAt: Date;
  updatedAt: Date;
}

@Entity()
export class Proveedor {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @Property({ type: 'string' })
  razonSocial!: string;

  @Property({ type: 'string', unique: true })
  cuit!: string;

  @Property({ type: 'string', nullable: true })
  telefono: string | null = null;

  @Property({ type: 'string', nullable: true })
  email: string | null = null;

  @Property({ type: 'string', nullable: true })
  domicilio: string | null = null;

  @Property({ type: 'boolean', default: true })
  activo = true;

  @Property({ type: 'datetime', onCreate: () => new Date() })
  createdAt!: Date;

  @Property({ type: 'datetime', onUpdate: () => new Date() })
  updatedAt!: Date;

  toPublic(): ProveedorPublic {
    return {
      id: this.id,
      razonSocial: this.razonSocial,
      cuit: this.cuit,
      telefono: this.telefono,
      email: this.email,
      domicilio: this.domicilio,
      activo: this.activo,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}