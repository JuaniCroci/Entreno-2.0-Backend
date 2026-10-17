import { describe, it, expect, beforeEach, vi } from 'vitest';
import { IngresoService } from '../../src/modules/ingresos/service/IngresoService.js';
import { Ingreso } from '../../src/modules/ingresos/entity/Ingreso.js';
import { IngresoItem } from '../../src/modules/ingresos/entity/IngresoItem.js';
import { Proveedor } from '../../src/modules/proveedores/entity/Proveedor.js';
import { Producto } from '../../src/modules/productos/entity/Producto.js';
import * as db from '../../src/config/db.js';

function makeProveedor(overrides: Partial<Proveedor> = {}): Proveedor {
  const p = new Proveedor();
  p.id = 1;
  p.razonSocial = 'Distribuidora SA';
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

function makeProducto(overrides: Partial<Producto> = {}): Producto {
  const p = new Producto();
  p.id = 1;
  p.nombre = 'Proteína Whey';
  p.descripcion = null;
  p.precioUnitario = '1500.00';
  p.stock = 10;
  p.activo = true;
  p.createdAt = new Date();
  p.updatedAt = new Date();
  Object.assign(p, overrides);
  return p;
}

function makeIngreso(overrides: Partial<Ingreso> = {}): Ingreso {
  const i = new Ingreso();
  i.id = 1;
  i.nroIngreso = 'ING-001';
  i.fecha = new Date('2026-09-01T10:00:00.000Z');
  i.importeTotal = '36.00';
  i.estado = 'REGISTRADO';
  i.proveedor = makeProveedor();
  i.createdAt = new Date();
  i.updatedAt = new Date();
  Object.assign(i, overrides);
  return i;
}

const dtoBase = {
  nroIngreso: 'ING-001',
  idProveedor: 1,
  lineas: [
    { idProducto: 1, cantidad: 3, precioUnitario: '10.50' },
    { idProducto: 2, cantidad: 2, precioUnitario: '2.25' },
  ],
};

describe('IngresoService', () => {
  let service: IngresoService;
  let em: ReturnType<typeof db.getEm>;

  beforeEach(() => {
    service = new IngresoService();
    em = {
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      flush: vi.fn(),
      transactional: vi.fn(async (cb: (em: unknown) => Promise<unknown>) => cb(em)),
    } as unknown as ReturnType<typeof db.getEm>;
    vi.spyOn(db, 'getEm').mockReturnValue(em);
    vi.spyOn(em, 'create').mockImplementation(((entity: unknown, data: Record<string, unknown>) => {
      const instance = new (entity as new () => object)();
      Object.assign(instance, data);
      return instance;
    }) as typeof em.create);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);
  });

  it('create calcula importeTotal = Σ cantidad × precioUnitario', async () => {
    const proveedor = makeProveedor();
    const producto1 = makeProducto({ id: 1, stock: 0 });
    const producto2 = makeProducto({ id: 2, nombre: 'Creatina', stock: 0 });
    vi.spyOn(em, 'findOne').mockImplementation((async (entity: unknown, cond: { id?: number }) => {
      if (entity === Ingreso) return null;
      if (entity === Proveedor) return proveedor;
      if (entity === Producto) return (cond.id === 1 ? producto1 : producto2) as never;
      return null;
    }) as typeof em.findOne);

    const result = await service.create(dtoBase);

    expect(result.importeTotal).toBe('36.00');
    expect(result.estado).toBe('REGISTRADO');
  });

  it('create incrementa el stock de cada producto involucrado', async () => {
    const proveedor = makeProveedor();
    const producto1 = makeProducto({ id: 1, stock: 0 });
    const producto2 = makeProducto({ id: 2, nombre: 'Creatina', stock: 5 });
    vi.spyOn(em, 'findOne').mockImplementation((async (entity: unknown, cond: { id?: number }) => {
      if (entity === Ingreso) return null;
      if (entity === Proveedor) return proveedor;
      if (entity === Producto) return (cond.id === 1 ? producto1 : producto2) as never;
      return null;
    }) as typeof em.findOne);

    await service.create(dtoBase);

    expect(producto1.stock).toBe(3);
    expect(producto2.stock).toBe(7);
  });

  it('create lanza 400 si hay dos líneas del mismo producto', async () => {
    const result = service.create({
      nroIngreso: 'ING-002',
      idProveedor: 1,
      lineas: [
        { idProducto: 1, cantidad: 1, precioUnitario: '10.00' },
        { idProducto: 1, cantidad: 2, precioUnitario: '10.00' },
      ],
    });
    await expect(result).rejects.toMatchObject({ statusCode: 400 });
    expect(em.transactional).not.toHaveBeenCalled();
  });

  it('create lanza 400 si precioUnitario no es mayor a 0', async () => {
    await expect(
      service.create({
        nroIngreso: 'ING-003',
        idProveedor: 1,
        lineas: [{ idProducto: 1, cantidad: 1, precioUnitario: '0.00' }],
      }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('create lanza 409 si nroIngreso duplicado', async () => {
    const proveedor = makeProveedor();
    vi.spyOn(em, 'findOne').mockImplementation((async (entity: unknown) => {
      if (entity === Ingreso) return makeIngreso();
      if (entity === Proveedor) return proveedor;
      return null;
    }) as typeof em.findOne);

    await expect(service.create(dtoBase)).rejects.toMatchObject({ statusCode: 409 });
  });

  it('create lanza 404 si el proveedor no existe o está inactivo', async () => {
    vi.spyOn(em, 'findOne').mockImplementation((async (entity: unknown) => {
      if (entity === Ingreso) return null;
      if (entity === Proveedor) return null;
      return null;
    }) as typeof em.findOne);

    await expect(service.create(dtoBase)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('create lanza 404 si un producto no existe o está inactivo', async () => {
    const proveedor = makeProveedor();
    vi.spyOn(em, 'findOne').mockImplementation((async (entity: unknown, cond: { id?: number }) => {
      if (entity === Ingreso) return null;
      if (entity === Proveedor) return proveedor;
      if (entity === Producto) return (cond.id === 1 ? makeProducto({ id: 1 }) : null) as never;
      return null;
    }) as typeof em.findOne);

    await expect(service.create(dtoBase)).rejects.toMatchObject({ statusCode: 404 });
  });

  function makeItem(
    ingreso: Ingreso,
    producto: Producto,
    cantidad: number,
    precioUnitario: string,
  ): IngresoItem {
    const item = new IngresoItem();
    item.id = Math.floor(Math.random() * 1000);
    item.ingreso = ingreso;
    item.producto = producto;
    item.cantidad = cantidad;
    item.precioUnitario = precioUnitario;
    return item;
  }

  it('anular pone estado ANULADO y resta el stock de cada línea', async () => {
    const ingreso = makeIngreso();
    const producto1 = makeProducto({ id: 1, stock: 13 });
    const producto2 = makeProducto({ id: 2, nombre: 'Creatina', stock: 7 });
    const items = [
      makeItem(ingreso, producto2, 2, '2.25'),
      makeItem(ingreso, producto1, 3, '10.50'),
    ];
    vi.spyOn(em, 'findOne').mockResolvedValue(ingreso as never);
    vi.spyOn(em, 'find').mockResolvedValue(items as never);

    const result = await service.anular(1);

    expect(result.estado).toBe('ANULADO');
    expect(producto1.stock).toBe(10);
    expect(producto2.stock).toBe(5);
    expect(em.flush).toHaveBeenCalled();
  });

  it('anular lanza 409 si el ingreso ya está anulado', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(makeIngreso({ estado: 'ANULADO' }) as never);

    await expect(service.anular(1)).rejects.toMatchObject({ statusCode: 409 });
    expect(em.flush).not.toHaveBeenCalled();
  });

  it('anular lanza 409 y no modifica nada si el stock no alcanza', async () => {
    const ingreso = makeIngreso();
    const producto = makeProducto({ id: 1, stock: 2 });
    const items = [makeItem(ingreso, producto, 5, '10.50')];
    vi.spyOn(em, 'findOne').mockResolvedValue(ingreso as never);
    vi.spyOn(em, 'find').mockResolvedValue(items as never);

    await expect(service.anular(1)).rejects.toMatchObject({ statusCode: 409 });

    expect(ingreso.estado).toBe('REGISTRADO');
    expect(producto.stock).toBe(2);
    expect(em.flush).not.toHaveBeenCalled();
  });

  it('anular lanza 404 si el ingreso no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.anular(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('anular lanza 400 para id inválido', async () => {
    await expect(service.anular(-1)).rejects.toMatchObject({ statusCode: 400 });
  });

  it('findAll filtra por estado y rango de fechas', async () => {
    vi.spyOn(em, 'find').mockResolvedValue([] as never);
    vi.spyOn(em, 'count').mockResolvedValue(0);

    const result = await service.findAll({
      estado: 'ANULADO',
      desde: '2026-01-01',
      hasta: '2026-01-31',
    });

    expect(result).toEqual({ data: [], total: 0 });
    expect(em.find).toHaveBeenCalledWith(
      Ingreso,
      {
        estado: 'ANULADO',
        fecha: {
          $gte: new Date('2026-01-01T00:00:00.000Z'),
          $lte: new Date('2026-01-31T23:59:59.999Z'),
        },
      },
      expect.objectContaining({ populate: ['proveedor'] }),
    );
  });

  it('findAll sin filtros busca sin condición de fecha', async () => {
    vi.spyOn(em, 'find').mockResolvedValue([] as never);
    vi.spyOn(em, 'count').mockResolvedValue(0);

    await service.findAll({});

    expect(em.find).toHaveBeenCalledWith(Ingreso, {}, expect.any(Object));
  });

  it('findAll lanza 400 si desde es posterior a hasta', async () => {
    await expect(
      service.findAll({ desde: '2026-02-01', hasta: '2026-01-01' }),
    ).rejects.toMatchObject({ statusCode: 400 });
  });

  it('findAll lanza 400 si estado no es válido', async () => {
    await expect(service.findAll({ estado: 'OTRO' as never })).rejects.toMatchObject({
      statusCode: 400,
    });
  });

  it('findById devuelve el detalle con líneas e importe de línea', async () => {
    const ingreso = makeIngreso();
    const producto = makeProducto({ id: 1, stock: 13 });
    const item = makeItem(ingreso, producto, 3, '10.50');
    item.id = 7;
    vi.spyOn(em, 'findOne').mockResolvedValue(ingreso as never);
    vi.spyOn(em, 'find').mockResolvedValue([item] as never);

    const result = await service.findById(1);

    expect(result.nroIngreso).toBe('ING-001');
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({
      id: 7,
      cantidad: 3,
      precioUnitario: '10.50',
      importeLinea: '31.50',
      producto: { id: 1, nombre: 'Proteína Whey' },
    });
  });

  it('findById lanza 404 si no existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.findById(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('findById lanza 400 para id inválido', async () => {
    await expect(service.findById(0)).rejects.toMatchObject({ statusCode: 400 });
  });
});
