import type { EntityManager } from '@mikro-orm/mysql';
import { getEm } from '../../../config/db.js';
import { AppError } from '../../../common/errors/AppError.js';
import { Producto, ProductoPublic, ProductoListPublic } from '../entity/Producto.js';
import { TipoProducto } from '../../../modules/tipos-producto/entity/TipoProducto.js';
import { Marca } from '../../../modules/marcas/entity/Marca.js';
import { Proveedor } from '../../../modules/proveedores/entity/Proveedor.js';
import { DescuentoService } from '../../../modules/descuentos/service/DescuentoService.js';
import type { DescuentoPublic } from '../../../modules/descuentos/entity/Descuento.js';
import type { CreateProductoDto } from '../dto/CreateProductoDto.js';
import type { UpdateProductoDto } from '../dto/UpdateProductoDto.js';
import type { FilterProductoAdminDto } from '../dto/FilterProductoAdminDto.js';
import type { FilterProductoPublicDto } from '../dto/FilterProductoPublicDto.js';

export interface FindAllResult<T = ProductoPublic> {
  data: T[];
  total: number;
  page: number;
  size: number;
}

export type ProductoDetallePublic = ProductoPublic & {
  disponible: boolean;
  descuentosVigentes: DescuentoPublic[];
};

export class ProductoService {
  private descuentosService = new DescuentoService();

  private get em(): EntityManager {
    return getEm();
  }

  async assertExists(id: number): Promise<Producto> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const producto = await this.em.findOne(Producto, { id, activo: true });
    if (!producto) throw new AppError(404, 'El producto seleccionado no existe o está inactivo');
    return producto;
  }

  async create(dto: CreateProductoDto): Promise<ProductoPublic> {
    if (Number(dto.precioUnitario) <= 0)
      throw new AppError(400, 'precioUnitario debe ser mayor a 0');
    if (dto.stockInicial < 0) throw new AppError(400, 'stockInicial debe ser mayor o igual a 0');

    const tipoProducto = await this.em.findOne(TipoProducto, {
      id: dto.idTipoProducto,
      activo: true,
    });
    if (!tipoProducto)
      throw new AppError(404, 'El tipo de producto seleccionado no existe o está inactivo');

    const marca = await this.em.findOne(Marca, { id: dto.idMarca, activo: true });
    if (!marca) throw new AppError(404, 'La marca seleccionada no existe o está inactiva');

    let proveedor: Proveedor | null = null;
    if (dto.idProveedor) {
      proveedor = await this.em.findOne(Proveedor, { id: dto.idProveedor, activo: true });
      if (!proveedor)
        throw new AppError(404, 'El proveedor seleccionado no existe o está inactivo');
    }

    const now = new Date();
    const producto = this.em.create(Producto, {
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      precioUnitario: dto.precioUnitario,
      stock: dto.stockInicial,
      activo: true,
      tipoProducto,
      marca,
      proveedor,
      createdAt: now,
      updatedAt: now,
    });
    await this.em.flush();
    return producto.toPublic();
  }

  async update(id: number, dto: UpdateProductoDto): Promise<ProductoPublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    if (dto.precioUnitario !== undefined && Number(dto.precioUnitario) <= 0)
      throw new AppError(400, 'precioUnitario debe ser mayor a 0');

    const producto = await this.em.findOne(
      Producto,
      { id },
      { populate: ['marca', 'tipoProducto', 'proveedor'] },
    );
    if (!producto) throw new AppError(404, 'Producto no encontrado');

    if (dto.nombre !== undefined) {
      producto.nombre = dto.nombre;
    }
    if (dto.descripcion !== undefined) {
      producto.descripcion = dto.descripcion;
    }
    if (dto.precioUnitario !== undefined) {
      producto.precioUnitario = dto.precioUnitario;
    }
    if (dto.idTipoProducto !== undefined) {
      const tipoProducto = await this.em.findOne(TipoProducto, {
        id: dto.idTipoProducto,
        activo: true,
      });
      if (!tipoProducto)
        throw new AppError(404, 'El tipo de producto seleccionado no existe o está inactivo');
      producto.tipoProducto = tipoProducto;
    }
    if (dto.idMarca !== undefined) {
      const marca = await this.em.findOne(Marca, { id: dto.idMarca, activo: true });
      if (!marca) throw new AppError(404, 'La marca seleccionada no existe o está inactiva');
      producto.marca = marca;
    }
    if (dto.idProveedor !== undefined) {
      if (dto.idProveedor === null || dto.idProveedor === 0) {
        producto.proveedor = null;
      } else {
        const proveedor = await this.em.findOne(Proveedor, { id: dto.idProveedor, activo: true });
        if (!proveedor)
          throw new AppError(404, 'El proveedor seleccionado no existe o está inactivo');
        producto.proveedor = proveedor;
      }
    }
    producto.updatedAt = new Date();
    await this.em.flush();
    return producto.toPublic();
  }

  async softDelete(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const producto = await this.em.findOne(Producto, { id });
    if (!producto) throw new AppError(404, 'Producto no encontrado');
    producto.activo = false;
    producto.updatedAt = new Date();
    await this.em.flush();
  }

  async listAdmin(filters: FilterProductoAdminDto): Promise<FindAllResult> {
    const { page = 1, size = 20 } = filters;
    const where: Record<string, unknown> = {};
    if (filters.nombre) where.nombre = { $like: `%${filters.nombre}%` };
    if (filters.idTipoProducto) where.tipoProducto = { id: filters.idTipoProducto };
    if (filters.idMarca) where.marca = { id: filters.idMarca };
    if (filters.idProveedor) where.proveedor = { id: filters.idProveedor };
    if (filters.activo !== undefined) where.activo = filters.activo;

    const [data, total] = await Promise.all([
      this.em.find(Producto, where, {
        populate: ['marca', 'tipoProducto', 'proveedor'],
        orderBy: { id: 'DESC' },
        offset: (page - 1) * size,
        limit: size,
      }),
      this.em.count(Producto, where),
    ]);
    return {
      data: data.map((p) => p.toPublic()),
      total,
      page,
      size,
    };
  }

  async findAll(filters: FilterProductoPublicDto): Promise<FindAllResult<ProductoListPublic>> {
    const page = filters.page ?? 1;
    const size = filters.size ?? 20;

    if (filters.idTipoProducto !== undefined && !Number.isInteger(filters.idTipoProducto)) {
      throw new AppError(400, 'idTipoProducto debe ser un entero');
    }
    if (filters.idMarca !== undefined && !Number.isInteger(filters.idMarca)) {
      throw new AppError(400, 'idMarca debe ser un entero');
    }
    if (
      filters.precioMin !== undefined &&
      (!Number.isFinite(filters.precioMin) || filters.precioMin < 0)
    ) {
      throw new AppError(400, 'precioMin debe ser un número mayor o igual a 0');
    }
    if (
      filters.precioMax !== undefined &&
      (!Number.isFinite(filters.precioMax) || filters.precioMax < 0)
    ) {
      throw new AppError(400, 'precioMax debe ser un número mayor o igual a 0');
    }
    if (
      filters.precioMin !== undefined &&
      filters.precioMax !== undefined &&
      filters.precioMin > filters.precioMax
    ) {
      throw new AppError(400, 'precioMin no puede ser mayor a precioMax');
    }
    if (filters.orden !== undefined && filters.orden !== 'nombre' && filters.orden !== 'precio') {
      throw new AppError(400, 'orden debe ser nombre o precio');
    }
    if (filters.dir !== undefined && filters.dir !== 'asc' && filters.dir !== 'desc') {
      throw new AppError(400, 'dir debe ser asc o desc');
    }
    if (!Number.isInteger(page) || page < 1) {
      throw new AppError(400, 'page debe ser un entero mayor o igual a 1');
    }
    if (!Number.isInteger(size) || size < 1 || size > 100) {
      throw new AppError(400, 'size debe ser un entero entre 1 y 100');
    }

    const where: Record<string, unknown> = { activo: true };
    if (filters.idTipoProducto !== undefined) where.tipoProducto = { id: filters.idTipoProducto };
    if (filters.idMarca !== undefined) where.marca = { id: filters.idMarca };
    if (filters.precioMin !== undefined || filters.precioMax !== undefined) {
      const rango: { $gte?: number; $lte?: number } = {};
      if (filters.precioMin !== undefined) rango.$gte = filters.precioMin;
      if (filters.precioMax !== undefined) rango.$lte = filters.precioMax;
      where.precioUnitario = rango;
    }

    let orderBy: Record<string, 'ASC' | 'DESC'>;
    if (filters.orden === 'nombre') {
      orderBy = { nombre: filters.dir === 'desc' ? 'DESC' : 'ASC' };
    } else if (filters.orden === 'precio') {
      orderBy = { precioUnitario: filters.dir === 'desc' ? 'DESC' : 'ASC' };
    } else if (filters.dir !== undefined) {
      orderBy = { id: filters.dir === 'asc' ? 'ASC' : 'DESC' };
    } else {
      orderBy = { id: 'DESC' };
    }

    const [data, total] = await Promise.all([
      this.em.find(Producto, where, {
        populate: ['marca'],
        orderBy,
        offset: (page - 1) * size,
        limit: size,
      }),
      this.em.count(Producto, where),
    ]);
    return { data: data.map((p) => p.toListPublic()), total, page, size };
  }

  async getByIdAdmin(id: number): Promise<ProductoPublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const producto = await this.em.findOne(
      Producto,
      { id },
      { populate: ['marca', 'tipoProducto', 'proveedor'] },
    );
    if (!producto) throw new AppError(404, 'Producto no encontrado');
    return producto.toPublic();
  }

  async getByIdPublic(id: number): Promise<ProductoDetallePublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const producto = await this.em.findOne(
      Producto,
      { id, activo: true },
      { populate: ['marca', 'tipoProducto', 'proveedor'] },
    );
    if (!producto) throw new AppError(404, 'Producto no encontrado');
    const descuentosVigentes = await this.descuentosService.findVigentes(id, new Date());
    return {
      ...producto.toPublic(),
      disponible: producto.stock > 0,
      descuentosVigentes,
    };
  }
}
