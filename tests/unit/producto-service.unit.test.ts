import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ProductoService } from '../../src/modules/productos/service/ProductoService.js';
import { DescuentoService } from '../../src/modules/descuentos/service/DescuentoService.js';
import type { DescuentoPublic } from '../../src/modules/descuentos/entity/Descuento.js';
import { Producto } from '../../src/modules/productos/entity/Producto.js';
import { Marca } from '../../src/modules/marcas/entity/Marca.js';
import type { UpdateProductoDto } from '../../src/modules/productos/dto/UpdateProductoDto.js';
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
    id: 1,
    nombre: 'Proteína',
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    toPublic: () => t,
  };
  Object.assign(t, overrides);
  return t;
}
function makeMarca(overrides: Partial<MakeEntity> = {}): Record<string, unknown> {
  const m: Record<string, unknown> = {
    id: 1,
    nombre: 'Star Nutrition',
    activo: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    toPublic: () => m,
  };
  Object.assign(m, overrides);
  return m;
}
function makeProducto(overrides: Partial<MakeEntity> = {}): Record<string, unknown> {
  const p: Record<string, unknown> = {
    id: 1,
    nombre: 'Proteína Whey',
    descripcion: null,
    precioUnitario: '1500.00',
    stock: 10,
    activo: true,
    tipoProducto: makeTipoProducto(),
    marca: makeMarca(),
    createdAt: new Date(),
    updatedAt: new Date(),
    toPublic: () => p,
  };
  Object.assign(p, overrides);
  return p;
}

describe('ProductoService', () => {
  let service: ProductoService;
  let em: ReturnType<typeof db.getEm>;

  beforeEach(() => {
    service = new ProductoService();
    em = {
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      flush: vi.fn(),
    } as unknown as ReturnType<typeof db.getEm>;
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
      nombre: 'Proteína Whey',
      stockInicial: 50,
      precioUnitario: '1500.00',
      idTipoProducto: 1,
      idMarca: 1,
    });
    expect(em.create).toHaveBeenCalledWith(Producto, expect.objectContaining({ stock: 50 }));
  });

  it('create lanza 404 si tipoProducto no existe o inactivo', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(
      service.create({
        nombre: 'X',
        stockInicial: 0,
        precioUnitario: '10.00',
        idTipoProducto: 1,
        idMarca: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('create lanza 404 si marca no existe o inactiva', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValueOnce(makeTipoProducto()).mockResolvedValueOnce(null);
    await expect(
      service.create({
        nombre: 'X',
        stockInicial: 0,
        precioUnitario: '10.00',
        idTipoProducto: 1,
        idMarca: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
  });

  it('create lanza 404 si proveedor inactivo', async () => {
    vi.spyOn(em, 'findOne')
      .mockResolvedValueOnce(makeTipoProducto())
      .mockResolvedValueOnce(makeMarca())
      .mockResolvedValueOnce(null);
    await expect(
      service.create({
        nombre: 'X',
        stockInicial: 0,
        precioUnitario: '10.00',
        idTipoProducto: 1,
        idMarca: 1,
        idProveedor: 1,
      }),
    ).rejects.toMatchObject({ statusCode: 404 });
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
      nombre: 'X',
      stockInicial: 0,
      precioUnitario: '10.00',
      idTipoProducto: 1,
      idMarca: 1,
    });
  });

  it('update no modifica stock aunque se envíe en body', async () => {
    const producto = makeProducto({ id: 1, stock: 10 });
    vi.spyOn(em, 'findOne').mockResolvedValue(producto);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    await service.update(1, { nombre: 'Nuevo', stock: 999 } as UpdateProductoDto);
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

  it('assertExists devuelve el producto activo', async () => {
    const producto = makeProducto();
    vi.spyOn(em, 'findOne').mockResolvedValue(producto);

    const result = await service.assertExists(1);
    expect(em.findOne).toHaveBeenCalledWith(Producto, { id: 1, activo: true });
    expect(result).toBe(producto);
  });

  it('assertExists lanza 404 si no existe o está inactivo', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    await expect(service.assertExists(999)).rejects.toMatchObject({ statusCode: 404 });
  });

  it('assertExists lanza 400 para id inválido', async () => {
    await expect(service.assertExists(-1)).rejects.toMatchObject({ statusCode: 400 });
  });

  describe('findAll (listado público)', () => {
    function realProducto(
      id: number,
      nombre: string,
      precio: string,
      stock: number,
      marca: Marca,
    ): Producto {
      const p = new Producto();
      p.id = id;
      p.nombre = nombre;
      p.precioUnitario = precio;
      p.stock = stock;
      p.marca = marca;
      return p;
    }

    it('siempre filtra activo=true, pagina con defaults page=1/size=20 y ordena por id DESC', async () => {
      vi.spyOn(em, 'find').mockResolvedValue([] as never);
      vi.spyOn(em, 'count').mockResolvedValue(0);

      const result = await service.findAll({});

      expect(em.find).toHaveBeenCalledWith(
        Producto,
        { activo: true },
        expect.objectContaining({
          populate: ['marca'],
          offset: 0,
          limit: 20,
          orderBy: { id: 'DESC' },
        }),
      );
      expect(result).toEqual({ data: [], total: 0, page: 1, size: 20 });
    });

    it('combina filtros de tipo, marca y rango de precio en AND', async () => {
      vi.spyOn(em, 'find').mockResolvedValue([] as never);
      vi.spyOn(em, 'count').mockResolvedValue(0);

      await service.findAll({ idTipoProducto: 3, idMarca: 5, precioMin: 100, precioMax: 2000 });

      expect(em.find).toHaveBeenCalledWith(
        Producto,
        {
          activo: true,
          tipoProducto: { id: 3 },
          marca: { id: 5 },
          precioUnitario: { $gte: 100, $lte: 2000 },
        },
        expect.anything(),
      );
    });

    it('lanza 400 si precioMin es mayor a precioMax', async () => {
      await expect(service.findAll({ precioMin: 500, precioMax: 100 })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('lanza 400 si orden o dir no son valores permitidos', async () => {
      await expect(service.findAll({ orden: 'stock' as never })).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(service.findAll({ dir: 'random' as never })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('lanza 400 si un id de filtro no es numérico', async () => {
      await expect(service.findAll({ idMarca: NaN })).rejects.toMatchObject({ statusCode: 400 });
      await expect(service.findAll({ idTipoProducto: NaN })).rejects.toMatchObject({
        statusCode: 400,
      });
    });

    it('lanza 400 si page o size están fuera de rango', async () => {
      await expect(service.findAll({ page: 0 })).rejects.toMatchObject({ statusCode: 400 });
      await expect(service.findAll({ page: 1.5 })).rejects.toMatchObject({ statusCode: 400 });
      await expect(service.findAll({ size: 500 })).rejects.toMatchObject({ statusCode: 400 });
    });

    it('lanza 400 si precioMin o precioMax no son numéricos o son negativos', async () => {
      await expect(service.findAll({ precioMin: NaN })).rejects.toMatchObject({ statusCode: 400 });
      await expect(service.findAll({ precioMax: -1 })).rejects.toMatchObject({ statusCode: 400 });
    });

    it('ordena por precioUnitario cuando orden=precio&dir=desc', async () => {
      vi.spyOn(em, 'find').mockResolvedValue([] as never);
      vi.spyOn(em, 'count').mockResolvedValue(0);

      await service.findAll({ orden: 'precio', dir: 'desc' });

      expect(em.find).toHaveBeenCalledWith(
        Producto,
        expect.anything(),
        expect.objectContaining({ orderBy: { precioUnitario: 'DESC' } }),
      );
    });

    it('pagina con page/size explícitos y devuelve total real', async () => {
      vi.spyOn(em, 'find').mockResolvedValue([] as never);
      vi.spyOn(em, 'count').mockResolvedValue(7);

      const result = await service.findAll({ page: 3, size: 5 });

      expect(em.find).toHaveBeenCalledWith(
        Producto,
        expect.anything(),
        expect.objectContaining({ offset: 10, limit: 5 }),
      );
      expect(result.page).toBe(3);
      expect(result.size).toBe(5);
      expect(result.total).toBe(7);
    });

    it('mapea items a ProductoListPublic con disponible computado y sin campos internos', async () => {
      const marca = new Marca();
      marca.id = 7;
      marca.nombre = 'Nike';
      const conStock = realProducto(1, 'Proteína', '1500.00', 5, marca);
      const sinStock = realProducto(2, 'Barra', '20.00', 0, marca);
      vi.spyOn(em, 'find').mockResolvedValue([conStock, sinStock] as never);
      vi.spyOn(em, 'count').mockResolvedValue(2);

      const result = await service.findAll({});

      expect(result.data).toEqual([
        {
          id: 1,
          nombre: 'Proteína',
          marca: { id: 7, nombre: 'Nike' },
          precioUnitario: '1500.00',
          disponible: true,
        },
        {
          id: 2,
          nombre: 'Barra',
          marca: { id: 7, nombre: 'Nike' },
          precioUnitario: '20.00',
          disponible: false,
        },
      ]);
      expect(result.data[0]).not.toHaveProperty('activo');
      expect(result.data[0]).not.toHaveProperty('stock');
      expect(result.data[0]).not.toHaveProperty('createdAt');
    });
  });

  describe('getByIdPublic (detalle público, 010)', () => {
    it('agrega disponible=true y descuentosVigentes=[] al detalle', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValue(makeProducto({ stock: 5 }));
      vi.spyOn(DescuentoService.prototype, 'findVigentes').mockResolvedValue([]);

      const result = await service.getByIdPublic(1);

      expect(result).toEqual(
        expect.objectContaining({ id: 1, stock: 5, disponible: true, descuentosVigentes: [] }),
      );
      expect(DescuentoService.prototype.findVigentes).toHaveBeenCalledWith(1, expect.any(Date));
    });

    it('disponible=false cuando stock=0', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValue(makeProducto({ stock: 0 }));
      vi.spyOn(DescuentoService.prototype, 'findVigentes').mockResolvedValue([]);

      const result = await service.getByIdPublic(1);

      expect(result.disponible).toBe(false);
    });

    it('incluye los descuentos vigentes devueltos por DescuentoService', async () => {
      const vigente: DescuentoPublic = {
        id: 9,
        descripcion: 'Oferta 010',
        cantidadMinima: 1,
        porcentaje: 15,
        activo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      vi.spyOn(em, 'findOne').mockResolvedValue(makeProducto());
      vi.spyOn(DescuentoService.prototype, 'findVigentes').mockResolvedValue([vigente]);

      const result = await service.getByIdPublic(1);

      expect(result.descuentosVigentes).toEqual([vigente]);
    });

    it('no llama a findVigentes si el producto no existe', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValue(null);
      const spy = vi.spyOn(DescuentoService.prototype, 'findVigentes');

      await expect(service.getByIdPublic(1)).rejects.toMatchObject({ statusCode: 404 });
      expect(spy).not.toHaveBeenCalled();
    });
  });
});
