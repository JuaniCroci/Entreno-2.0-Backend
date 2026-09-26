import { describe, it, expect, beforeEach, vi } from 'vitest';
import { DescuentoService } from '../../src/modules/descuentos/service/DescuentoService.js';
import { Descuento } from '../../src/modules/descuentos/entity/Descuento.js';
import { DescuentoProducto } from '../../src/modules/descuentos/entity/DescuentoProducto.js';
import { type CreateAplicacionDto } from '../../src/modules/descuentos/dto/CreateAplicacionDto.js';
import * as db from '../../src/config/db.js';

function makeDescuento(overrides: Record<string, unknown> = {}): Descuento {
  const d = new Descuento();
  d.id = 1;
  d.descripcion = 'Test';
  d.cantidadMinima = 1;
  d.porcentaje = 10;
  d.activo = true;
  d.createdAt = new Date();
  d.updatedAt = new Date();
  Object.assign(d, overrides);
  return d;
}

function makeAplicacion(overrides: Record<string, unknown> = {}): DescuentoProducto {
  const a = new DescuentoProducto();
  a.id = 1;
  a.fechaDesde = new Date('2026-01-01');
  a.fechaHasta = new Date('2026-12-31');
  a.descuento = makeDescuento();
  Object.assign(a, overrides);
  return a;
}

describe('DescuentoService', () => {
  let service: DescuentoService;
  let em: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new DescuentoService();
    em = {
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      flush: vi.fn(),
      remove: vi.fn(),
    } as unknown as ReturnType<typeof vi.fn>;
    vi.spyOn(db, 'getEm').mockReturnValue(em);
  });

  it('findAll devuelve descuentos con aplicaciones', async () => {
    const data = [makeDescuento()];
    vi.spyOn(em, 'find').mockResolvedValue(data);
    vi.spyOn(em, 'count').mockResolvedValue(1);
    const result = await service.findAll();
    expect(result.data).toHaveLength(1);
    expect(result.total).toBe(1);
  });

  it('findById devuelve descuento', async () => {
    const d = makeDescuento();
    vi.spyOn(em, 'findOne').mockResolvedValue(d);
    const result = await service.findById(1);
    expect(result.id).toBe(1);
  });

  it('findById lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.findById(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('create crea descuento', async () => {
    const d = makeDescuento();
    vi.spyOn(em, 'create').mockReturnValue(d);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);
    const result = await service.create({ descripcion: 'Test', cantidadMinima: 1, porcentaje: 10 });
    expect(result.descripcion).toBe('Test');
    expect(em.create).toHaveBeenCalledWith(Descuento, expect.objectContaining({ descripcion: 'Test' }));
  });

  it('softDelete pone activo=false', async () => {
    const d = makeDescuento();
    vi.spyOn(em, 'findOne').mockResolvedValue(d);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);
    await service.softDelete(1);
    expect(d.activo).toBe(false);
  });

  it('softDelete lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.softDelete(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('addAplicacion valida fechaDesde <= fechaHasta', async () => {
    const d = makeDescuento();
    vi.spyOn(em, 'findOne').mockResolvedValue(d);
    await expect(service.addAplicacion(1, { idProducto: 1, fechaDesde: new Date('2026-12-31'), fechaHasta: new Date('2026-01-01') } as CreateAplicacionDto))
      .rejects.toMatchObject({ statusCode: 400 });
  });

  it('addAplicacion lanza 409 si hay solapamiento', async () => {
    const d = makeDescuento();
    const a = makeAplicacion();
    vi.spyOn(em, 'findOne').mockResolvedValue(d);
    vi.spyOn(em, 'find').mockResolvedValue([a]);
    await expect(service.addAplicacion(1, { idProducto: 1, fechaDesde: new Date('2026-06-01'), fechaHasta: new Date('2026-06-30') } as CreateAplicacionDto))
      .rejects.toMatchObject({ statusCode: 409 });
  });

  it('removeAplicacion elimina aplicacion', async () => {
    const a = makeAplicacion();
    vi.spyOn(em, 'findOne').mockResolvedValue(a);
    vi.spyOn(em, 'remove').mockResolvedValue(undefined);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);
    await service.removeAplicacion(1, 1);
    expect(em.remove).toHaveBeenCalledWith(a);
  });

  it('removeAplicacion lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.removeAplicacion(1, 999)).rejects.toMatchObject({ statusCode: 404 });
  });
});
