import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TipoProductoService } from '../../src/modules/tipos-producto/service/TipoProductoService.js';
import { TipoProducto } from '../../src/modules/tipos-producto/entity/TipoProducto.js';
import * as db from '../../src/config/db.js';

function makeTipo(overrides: Partial<TipoProducto> = {}): TipoProducto {
  const t = new TipoProducto();
  t.id = 1;
  t.nombre = 'Suplemento';
  t.descripcion = null;
  t.activo = true;
  t.createdAt = new Date();
  t.updatedAt = new Date();
  Object.assign(t, overrides);
  return t;
}

describe('TipoProductoService', () => {
  let service: TipoProductoService;
  let em: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new TipoProductoService();
    em = {
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      flush: vi.fn(),
    } as unknown as ReturnType<typeof vi.fn>;
    vi.spyOn(db, 'getEm').mockReturnValue(em);
  });

  it('list devuelve solo tipos activos', async () => {
    const data = [makeTipo()];
    vi.spyOn(em, 'find').mockResolvedValue(data);
    vi.spyOn(em, 'count').mockResolvedValue(1);

    const result = await service.list();
    expect(em.find).toHaveBeenCalledWith(TipoProducto, { activo: true }, expect.any(Object));
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('list con includeInactive devuelve todas', async () => {
    const data = [makeTipo(), makeTipo({ activo: false })];
    vi.spyOn(em, 'find').mockResolvedValue(data);
    vi.spyOn(em, 'count').mockResolvedValue(2);

    const result = await service.list(true);
    expect(em.find).toHaveBeenCalledWith(TipoProducto, {}, expect.any(Object));
    expect(result.data).toHaveLength(2);
  });

  it('getById devuelve tipo publica', async () => {
    const tipo = makeTipo();
    vi.spyOn(em, 'findOne').mockResolvedValue(tipo);
    const result = await service.getById(1);
    expect(result).toEqual(tipo.toPublic());
  });

  it('getById lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.getById(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('getById lanza 404 si inactiva', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(makeTipo({ activo: false }));
    await expect(service.getById(1)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('getById lanza 400 para id inválido', async () => {
    await expect(service.getById(-1)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('crea tipo y devuelve publica', async () => {
    const tipo = makeTipo({ nombre: 'Accesorio', descripcion: 'Una descripcion' });
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    vi.spyOn(em, 'create').mockReturnValue(tipo);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    const result = await service.create({ nombre: 'Accesorio', descripcion: 'Una descripcion' });
    expect(result.nombre).toBe('Accesorio');
    expect(result.descripcion).toBe('Una descripcion');
  });

  it('create lanza 409 si nombre duplicado', async () => {
    const existing = makeTipo({ nombre: 'Suplemento' });
    vi.spyOn(em, 'findOne').mockResolvedValue(existing);
    await expect(service.create({ nombre: 'Suplemento' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('update actualiza tipo', async () => {
    const tipo = makeTipo({ id: 1, nombre: 'Suplemento' });
    vi.spyOn(em, 'findOne')
      .mockResolvedValueOnce(tipo)
      .mockResolvedValueOnce(null);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    const result = await service.update(1, { nombre: 'Accesorio' });
    expect(result.nombre).toBe('Accesorio');
  });

  it('update lanza 409 si nombre duplicado por otro', async () => {
    const tipo = makeTipo({ id: 1, nombre: 'Suplemento' });
    const dup = makeTipo({ id: 2, nombre: 'Accesorio' });
    vi.spyOn(em, 'findOne')
      .mockResolvedValueOnce(tipo)
      .mockResolvedValueOnce(dup);
    await expect(service.update(1, { nombre: 'Accesorio' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('update lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.update(999, { nombre: 'X' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('softDelete pone activo=false', async () => {
    const tipo = makeTipo();
    vi.spyOn(em, 'findOne').mockResolvedValue(tipo);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    await service.softDelete(1);
    expect(tipo.activo).toBe(false);
    expect(em.flush).toHaveBeenCalled();
  });

  it('softDelete lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.softDelete(999)).rejects.toMatchObject({ statusCode: 404 });
  });
});