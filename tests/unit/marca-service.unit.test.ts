import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MarcaService } from '../../src/modules/marcas/service/MarcaService.js';
import { Marca } from '../../src/modules/marcas/entity/Marca.js';
import * as db from '../../src/config/db.js';

function makeMarca(overrides: Partial<Marca> = {}): Marca {
  const m = new Marca();
  m.id = 1;
  m.nombre = 'Star Nutrition';
  m.activo = true;
  m.createdAt = new Date();
  m.updatedAt = new Date();
  Object.assign(m, overrides);
  return m;
}

describe('MarcaService', () => {
  let service: MarcaService;
  let em: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new MarcaService();
    em = {
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      flush: vi.fn(),
    } as unknown as ReturnType<typeof vi.fn>;
    vi.spyOn(db, 'getEm').mockReturnValue(em);
  });

  it('list devuelve solo marcas activas', async () => {
    const data = [makeMarca()];
    vi.spyOn(em, 'find').mockResolvedValue(data);
    vi.spyOn(em, 'count').mockResolvedValue(1);

    const result = await service.list();
    expect(em.find).toHaveBeenCalledWith(Marca, { activo: true }, expect.any(Object));
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('list con includeInactive devuelve todas', async () => {
    const data = [makeMarca(), makeMarca({ activo: false })];
    vi.spyOn(em, 'find').mockResolvedValue(data);
    vi.spyOn(em, 'count').mockResolvedValue([2]);

    const result = await service.list(true);
    expect(em.find).toHaveBeenCalledWith(Marca, {}, expect.any(Object));
    expect(result.data).toHaveLength(2);
  });

  it('getById devuelve marca publica', async () => {
    const marca = makeMarca();
    vi.spyOn(em, 'findOne').mockResolvedValue(marca);

    const result = await service.getById(1);
    expect(result).toEqual(marca.toPublic());
  });

  it('getById lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.getById(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('getById lanza 404 si inactiva', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(makeMarca({ activo: false }));
    await expect(service.getById(1)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('getById lanza 400 para id inválido', async () => {
    await expect(service.getById(-1)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('crea marca y devuelve publica', async () => {
    const marca = makeMarca({ nombre: 'ENA' });
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    vi.spyOn(em, 'create').mockReturnValue(marca);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    const result = await service.create({ nombre: 'ENA' });
    expect(result.nombre).toBe('ENA');
    expect(em.create).toHaveBeenCalledWith(Marca, expect.objectContaining({ nombre: 'ENA' }));
  });

  it('create lanza 409 si nombre duplicado', async () => {
    const existing = makeMarca({ nombre: 'ENA' });
    vi.spyOn(em, 'findOne').mockResolvedValue(existing);
    await expect(service.create({ nombre: 'ENA' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('update actualiza marca', async () => {
    const marca = makeMarca({ id: 1, nombre: 'Star Nutrition' });
    vi.spyOn(em, 'findOne')
      .mockResolvedValueOnce(marca)
      .mockResolvedValueOnce(null);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    const result = await service.update(1, { nombre: 'ENA' });
    expect(result.nombre).toBe('ENA');
  });

  it('update lanza 409 si nombre duplicado por otro', async () => {
    const marca = makeMarca({ id: 1, nombre: 'Star Nutrition' });
    const dup = makeMarca({ id: 2, nombre: 'ENA' });
    vi.spyOn(em, 'findOne')
      .mockResolvedValueOnce(marca)
      .mockResolvedValueOnce(dup);
    await expect(service.update(1, { nombre: 'ENA' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('update lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.update(999, { nombre: 'X' })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('softDelete pone activo=false', async () => {
    const marca = makeMarca();
    vi.spyOn(em, 'findOne').mockResolvedValue(marca);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    await service.softDelete(1);
    expect(marca.activo).toBe(false);
    expect(em.flush).toHaveBeenCalled();
  });

  it('softDelete lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.softDelete(999)).rejects.toMatchObject({ statusCode: 404 });
  });
});