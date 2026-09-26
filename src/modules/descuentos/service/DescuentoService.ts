import type { EntityManager } from '@mikro-orm/mysql';
import { getEm } from '../../../config/db.js';
import { AppError } from '../../../common/errors/AppError.js';
import { Descuento, DescuentoPublic } from '../entity/Descuento.js';
import { DescuentoProducto, DescuentoProductoPublic } from '../entity/DescuentoProducto.js';
import { Producto } from '../../../modules/productos/entity/Producto.js';
import type { CreateDescuentoDto } from '../dto/CreateDescuentoDto.js';
import type { UpdateDescuentoDto } from '../dto/UpdateDescuentoDto.js';
import type { CreateAplicacionDto } from '../dto/CreateAplicacionDto.js';

export interface FindAllResult {
  data: DescuentoPublic[];
  total: number;
}

export class DescuentoService {
  private get em(): EntityManager {
    return getEm();
  }

  async findAll(): Promise<FindAllResult> {
    const [data, total] = await Promise.all([
      this.em.find(Descuento, {}, { populate: ['aplicaciones', 'aplicaciones.producto'], orderBy: { id: 'DESC' } }),
      this.em.count(Descuento),
    ]);
    return { data: data.map((d) => d.toPublic()), total };
  }

  async findById(id: number): Promise<DescuentoPublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const descuento = await this.em.findOne(Descuento, { id }, { populate: ['aplicaciones', 'aplicaciones.producto'] });
    if (!descuento) throw new AppError(404, 'Descuento no encontrado');
    return descuento.toPublic();
  }

  async create(dto: CreateDescuentoDto): Promise<DescuentoPublic> {
    const now = new Date();
    const descuento = this.em.create(Descuento, {
      descripcion: dto.descripcion,
      cantidadMinima: dto.cantidadMinima,
      porcentaje: dto.porcentaje,
      activo: dto.activo ?? true,
      createdAt: now,
      updatedAt: now,
    });
    await this.em.flush();
    return descuento.toPublic();
  }

  async update(id: number, dto: UpdateDescuentoDto): Promise<DescuentoPublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const descuento = await this.em.findOne(Descuento, { id });
    if (!descuento) throw new AppError(404, 'Descuento no encontrado');
    this.em.assign(descuento, dto);
    await this.em.flush();
    return descuento.toPublic();
  }

  async softDelete(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const descuento = await this.em.findOne(Descuento, { id });
    if (!descuento) throw new AppError(404, 'Descuento no encontrado');
    descuento.activo = false;
    await this.em.flush();
  }

  async addAplicacion(id: number, dto: CreateAplicacionDto): Promise<DescuentoProductoPublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const descuento = await this.em.findOne(Descuento, { id, activo: true });
    if (!descuento) throw new AppError(404, 'Descuento no encontrado o inactivo');

    const producto = await this.em.findOne(Producto, { id: dto.idProducto, activo: true });
    if (!producto) throw new AppError(404, 'Producto no encontrado o inactivo');

    if (dto.fechaDesde > dto.fechaHasta) {
      throw new AppError(400, 'fechaDesde debe ser menor o igual a fechaHasta');
    }

    const solapamiento = await this.em.findOne(DescuentoProducto, {
      producto: { id: dto.idProducto },
      fechaDesde: { $lte: dto.fechaHasta },
      fechaHasta: { $gte: dto.fechaDesde },
      descuento: { id: { $ne: id }, activo: true },
    }, { populate: ['descuento'] });

    if (solapamiento) {
      throw new AppError(409, 'Ya existe una aplicación de descuento vigente con solapamiento para este producto');
    }

    const aplicacion = this.em.create(DescuentoProducto, {
      descuento,
      producto,
      fechaDesde: dto.fechaDesde,
      fechaHasta: dto.fechaHasta,
    });
    await this.em.flush();
    const aplicacionFull = await this.em.findOne(DescuentoProducto, { id: aplicacion.id }, { populate: ['producto', 'descuento'] });
    return aplicacionFull!.toPublic();
  }

  async removeAplicacion(idDescuento: number, aplicacionId: number): Promise<void> {
    if (!Number.isInteger(idDescuento) || idDescuento <= 0) throw new AppError(400, 'ID de descuento inválido');
    if (!Number.isInteger(aplicacionId) || aplicacionId <= 0) throw new AppError(400, 'ID de aplicación inválido');
    const aplicacion = await this.em.findOne(DescuentoProducto, { id: aplicacionId });
    if (!aplicacion || aplicacion.descuento.id !== idDescuento) throw new AppError(404, 'Aplicación no encontrada');
    await this.em.remove(aplicacion);
    await this.em.flush();
  }

  async findVigentes(productoId: number, fecha: Date): Promise<DescuentoPublic[]> {
    const aplicaciones = await this.em.find(DescuentoProducto, {
      producto: { id: productoId },
      fechaDesde: { $lte: fecha },
      fechaHasta: { $gte: fecha },
    }, { populate: ['descuento'] });
    const vigentes = aplicaciones.filter((a) => a.descuento.activo).map((a) => a.descuento.toPublic());
    return vigentes;
  }
}
