import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductoService } from '../../src/modules/productos/service/ProductoService.js';
import { Producto } from '../../src/modules/productos/entity/Producto.js';
import * as db from '../../src/config/db.js';

interface MakeEntity {
  id?: number;
  nombre?: string;
  activo?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  toPublic?: () => Record<string, unknown>;
  [key: string]: unknown;
}

function makeTipoProducto(overrides: Partial<MakeEntity> = {}): Record<string, unknown> {
  const t: Record<string, unknown> = {
    id: 1, nombre: 'Proteína', activo: true, createdAt: new Date(), updatedAt: new Date(),
    toPublic: () => t,
  };
  Object.assign(t, overrides);
  return t;
}
function makeMarca(overrides: Partial<MakeEntity> = {}): Record<string, unknown> {
  const m: Record<string, unknown> = {
    id: 1, nombre: 'Star Nutrition', activo: true, createdAt: new Date(), updatedAt: new Date(),
    toPublic: () => m,
  };
  Object.assign(m, overrides);
  return m;
}
function makeProducto(overrides: Partial<MakeEntity> = {}): Record<string, unknown> {
  const p: Record<string, unknown> = {
    id: 1, nombre: 'Proteína Whey', descripcion: null, precioUnitario: '1500.00',
    stock: 10, activo: true, tipoProducto: makeTipoProducto(), marca: makeMarca(),
    createdAt: new Date(), updatedAt: new Date(),
    toPublic: () => p,
  };
  Object.assign(p, overrides);
  return p;
}

describe('ProductoService', () => {
  let service: ProductoService;
  let em: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new ProductoService();
    em = {
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      flush: vi.fn(),
    } as unknown as ReturnType<typeof vi.fn>;
    vi.spyOn(db, 'getEm').mockReturnValue(em);
  });

  it('crea producto con stock = stockInicial', async () => {
    const tipo = makeTipoProducto();
    const marca = makeMarca();
    vi.spyOn(em, 'findOne')
      .mockResolvedValueOnce(tipo)
      .mockResolvedValueOnce(marca)
      .mockResolvedValueOnce(null);
    const producto = makeProducto({ stock: 50 });
    vi.spyOn(em, 'create').mockReturnValue(producto);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    await service.create({
      nombre: 'Proteína Whey', stockInicial: 50, precioUnitario: '1500.00',
      idTipoProducto: 1, idMarca: 1,
    });
    expect(em.create).toHaveBeenCalledWith(Producto, expect.objectContaining({ stock: 50 }));
  });

  it('create lanza 404 si tipoProducto no existe o inactivo', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.create({
      nombre: 'X', stockInicial: 0, precioUnitario: '10.00', idTipoProducto: 1, idMarca: 1,
    })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('create lanza 404 si marca no existe o inactiva', async () => {
    vi.spyOn(em, 'findOne')
      .mockResolvedValueOnce(makeTipoProducto())
      .mockResolvedValueOnce(null);
    await expect(service.create({
      nombre: 'X', stockInicial: 0, precioUnitario: '10.00', idTipoProducto: 1, idMarca: 1,
    })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('create lanza 404 si proveedor inactivo', async () => {
    vi.spyOn(em, 'findOne')
      .mockResolvedValueOnce(makeTipoProducto())
      .mockResolvedValueOnce(makeMarca())
      .mockResolvedValueOnce(null);
    await expect(service.create({
      nombre: 'X', stockInicial: 0, precioUnitario: '10.00', idTipoProducto: 1, idMarca: 1, idProveedor: 1,
    })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('create con proveedor nulo (opcional) funciona', async () => {
    const tipo = makeTipoProducto();
    const marca = makeMarca();
    vi.spyOn(em, 'findOne')
      .mockResolvedValueOnce(tipo)
      .mockResolvedValueOnce(marca)
      .mockResolvedValueOnce(null);
    const producto = makeProducto();
    vi.spyOn(em, 'create').mockReturnValue(producto);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    await service.create({
      nombre: 'X', stockInicial: 0, precioUnitario: '10.00', idTipoProducto: 1, idMarca: 1,
    });
  });

  it('update no modifica stock aunque se envíe en body', async () => {
    const producto = makeProducto({ id: 1, stock: 10 });
    vi.spyOn(em, 'findOne').mockResolvedValue(producto);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    await service.update(1, { nombre: 'Nuevo', stock: 999 });
    expect(em.flush).toHaveBeenCalled();
  });

  it('update lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.update(999, { nombre: 'X' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('update lanza 400 para id inválido', async () => {
    await expect(service.update(-1, { nombre: 'X' })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('softDelete pone activo=false', async () => {
    const producto = makeProducto();
    vi.spyOn(em, 'findOne').mockResolvedValue(producto);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);
    await service.softDelete(1);
    expect(producto.activo).toBe(false);
  });

  it('softDelete lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.softDelete(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('getByIdPublic lanza 404 si inactivo', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.getByIdPublic(1)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('getByIdAdmin devuelve inactivo', async () => {
    const producto = makeProducto({ activo: false });
    vi.spyOn(em, 'findOne').mockResolvedValue(producto);
    const result = await service.getByIdAdmin(1);
    expect(result.activo).toBe(false);
  });
});
