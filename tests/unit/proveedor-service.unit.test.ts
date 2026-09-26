import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProveedorService } from '../../src/modules/proveedores/service/ProveedorService.js';
import { Proveedor } from '../../src/modules/proveedores/entity/Proveedor.js';
import * as db from '../../src/config/db.js';

function makeProveedor(overrides: Partial<Proveedor> = {}): Proveedor {
  const p = new Proveedor();
  p.id = 1;
  p.razonSocial = 'Test SA';
  p.cuit = '20123456789';
  p.telefono = null;
  p.email = null;
  p.domicilio = null;
  p.activo = true;
  p.createdAt = new Date();
  p.updatedAt = new Date();
  Object.assign(p, overrides);
  return p;
}

describe('ProveedorService', () => {
  let service: ProveedorService;
  let em: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new ProveedorService();
    em = {
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      flush: vi.fn(),
    } as unknown as ReturnType<typeof vi.fn>;
    vi.spyOn(db, 'getEm').mockReturnValue(em);
  });

  it('list devuelve solo proveedores activos', async () => {
    const data = [makeProveedor()];
    vi.spyOn(em, 'find').mockResolvedValue(data);
    vi.spyOn(em, 'count').mockResolvedValue(1);

    const result = await service.list();
    expect(em.find).toHaveBeenCalledWith(Proveedor, { activo: true }, expect.any(Object));
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('list con includeInactive devuelve todas', async () => {
    const data = [makeProveedor(), makeProveedor({ activo: false })];
    vi.spyOn(em, 'find').mockResolvedValue(data);
    vi.spyOn(em, 'count').mockResolvedValue(2);

    const result = await service.list(true);
    expect(em.find).toHaveBeenCalledWith(Proveedor, {}, expect.any(Object));
    expect(result.data).toHaveLength(2);
  });

  it('getById devuelve proveedor publico', async () => {
    const proveedor = makeProveedor();
    vi.spyOn(em, 'findOne').mockResolvedValue(proveedor);
    const result = await service.getById(1);
    expect(result).toEqual(proveedor.toPublic());
  });

  it('getById lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.getById(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('getById lanza 404 si inactivo', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(makeProveedor({ activo: false }));
    await expect(service.getById(1)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('getById lanza 400 para id inválido', async () => {
    await expect(service.getById(-1)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('crea proveedor con CUIT valido', async () => {
    const proveedor = makeProveedor({ cuit: '30987654321', razonSocial: 'Otra SA' });
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    vi.spyOn(em, 'create').mockReturnValue(proveedor);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    const result = await service.create({ razonSocial: 'Otra SA', cuit: '30987654321' });
    expect(result.cuit).toBe('30987654321');
  });

  it('create lanza 409 si CUIT duplicado', async () => {
    const existing = makeProveedor({ cuit: '20123456789' });
    vi.spyOn(em, 'findOne').mockResolvedValue(existing);
    await expect(service.create({ razonSocial: 'X', cuit: '20123456789' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('update actualiza proveedor', async () => {
    const proveedor = makeProveedor({ id: 1, razonSocial: 'Test SA' });
    vi.spyOn(em, 'findOne')
      .mockResolvedValueOnce(proveedor)
      .mockResolvedValueOnce(null);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    const result = await service.update(1, { razonSocial: 'Nueva SA' });
    expect(result.razonSocial).toBe('Nueva SA');
  });

  it('update lanza 409 si CUIT duplicado por otro', async () => {
    const proveedor = makeProveedor({ id: 1, cuit: '20123456789' });
    const dup = makeProveedor({ id: 2, cuit: '30987654321' });
    vi.spyOn(em, 'findOne')
      .mockResolvedValueOnce(proveedor)
      .mockResolvedValueOnce(dup);
    await expect(service.update(1, { cuit: '30987654321' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('update lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.update(999, { razonSocial: 'X' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('softDelete pone activo=false', async () => {
    const proveedor = makeProveedor();
    vi.spyOn(em, 'findOne').mockResolvedValue(proveedor);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    await service.softDelete(1);
    expect(proveedor.activo).toBe(false);
    expect(em.flush).toHaveBeenCalled();
  });

  it('softDelete lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.softDelete(999)).rejects.toMatchObject({ statusCode: 404 });
  });
});