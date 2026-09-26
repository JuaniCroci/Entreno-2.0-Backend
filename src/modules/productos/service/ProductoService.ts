import type { EntityManager } from '@mikro-orm/mysql';
import { getEm } from '../../../config/db.js';
import { AppError } from '../../../common/errors/AppError.js';
import { Producto, ProductoPublic } from '../entity/Producto.js';
import { TipoProducto } from '../../../modules/tipos-producto/entity/TipoProducto.js';
import { Marca } from '../../../modules/marcas/entity/Marca.js';
import { Proveedor } from '../../../modules/proveedores/entity/Proveedor.js';
import type { CreateProductoDto } from '../dto/CreateProductoDto.js';
import type { UpdateProductoDto } from '../dto/UpdateProductoDto.js';
import type { FilterProductoAdminDto } from '../dto/FilterProductoAdminDto.js';

export interface FindAllResult {
  data: ProductoPublic[];
  total: number;
  page: number;
  size: number;
}

export class ProductoService {
  private get em(): EntityManager {
    return getEm();
  }

  async create(dto: CreateProductoDto): Promise<ProductoPublic> {
    if (Number(dto.precioUnitario) <= 0) throw new AppError(400, 'precioUnitario debe ser mayor a 0');
    if (dto.stockInicial < 0) throw new AppError(400, 'stockInicial debe ser mayor o igual a 0');

    const tipoProducto = await this.em.findOne(TipoProducto, { id: dto.idTipoProducto, activo: true });
    if (!tipoProducto) throw new AppError(404, 'El tipo de producto seleccionado no existe o está inactivo');

    const marca = await this.em.findOne(Marca, { id: dto.idMarca, activo: true });
    if (!marca) throw new AppError(404, 'La marca seleccionada no existe o está inactiva');

    let proveedor: Proveedor | null = null;
    if (dto.idProveedor) {
      proveedor = await this.em.findOne(Proveedor, { id: dto.idProveedor, activo: true });
      if (!proveedor) throw new AppError(404, 'El proveedor seleccionado no existe o está inactivo');
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
    if (dto.precioUnitario !== undefined && Number(dto.precioUnitario) <= 0) throw new AppError(400, 'precioUnitario debe ser mayor a 0');

    const producto = await this.em.findOne(Producto, { id }, { populate: ['marca', 'tipoProducto', 'proveedor'] });
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
      const tipoProducto = await this.em.findOne(TipoProducto, { id: dto.idTipoProducto, activo: true });
      if (!tipoProducto) throw new AppError(404, 'El tipo de producto seleccionado no existe o está inactivo');
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
        if (!proveedor) throw new AppError(404, 'El proveedor seleccionado no existe o está inactivo');
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
      this.em.find(Producto, where, { populate: ['marca', 'tipoProducto', 'proveedor'], orderBy: { id: 'DESC' }, offset: (page - 1) * size, limit: size }),
      this.em.count(Producto, where),
    ]);
    return {
      data: data.map((p) => p.toPublic()),
      total,
      page,
      size,
    };
  }

  async getByIdAdmin(id: number): Promise<ProductoPublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const producto = await this.em.findOne(Producto, { id }, { populate: ['marca', 'tipoProducto', 'proveedor'] });
    if (!producto) throw new AppError(404, 'Producto no encontrado');
    return producto.toPublic();
  }

  async getByIdPublic(id: number): Promise<ProductoPublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const producto = await this.em.findOne(Producto, { id, activo: true }, { populate: ['marca', 'tipoProducto', 'proveedor'] });
    if (!producto) throw new AppError(404, 'Producto no encontrado');
    return producto.toPublic();
  }
}
