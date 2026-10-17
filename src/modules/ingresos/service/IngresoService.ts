import type { EntityManager } from '@mikro-orm/mysql';
import { Decimal } from 'decimal.js';
import { getEm } from '../../../config/db.js';
import { AppError } from '../../../common/errors/AppError.js';
import {
  Ingreso,
  type IngresoPublic,
  type IngresoDetallePublic,
  type EstadoIngreso,
} from '../entity/Ingreso.js';
import { IngresoItem } from '../entity/IngresoItem.js';
import { Producto } from '../../productos/entity/Producto.js';
import { ProveedorService } from '../../proveedores/service/ProveedorService.js';
import { ProductoService } from '../../productos/service/ProductoService.js';
import type { CreateIngresoDto } from '../dto/CreateIngresoDto.js';
import type { FilterIngresoDto } from '../dto/FilterIngresoDto.js';
import { parseDateRange } from '../../../common/utils/date-range.js';

export interface FindAllResult {
  data: IngresoPublic[];
  total: number;
}

const ESTADOS: EstadoIngreso[] = ['REGISTRADO', 'ANULADO'];

export class IngresoService {
  private get em(): EntityManager {
    return getEm();
  }

  private proveedorService = new ProveedorService();
  private productoService = new ProductoService();

  async create(dto: CreateIngresoDto): Promise<IngresoDetallePublic> {
    const vistos = new Set<number>();
    for (const linea of dto.lineas) {
      if (vistos.has(linea.idProducto)) {
        throw new AppError(400, 'No se permiten dos líneas del mismo producto en el mismo ingreso');
      }
      vistos.add(linea.idProducto);
      if (Number(linea.precioUnitario) <= 0) {
        throw new AppError(400, 'precioUnitario debe ser mayor a 0');
      }
    }

    const importeTotal = dto.lineas
      .reduce((acc, l) => acc.plus(new Decimal(l.cantidad).mul(l.precioUnitario)), new Decimal(0))
      .toFixed(2);

    return this.em.transactional(async (em) => {
      const proveedor = await this.proveedorService.assertExists(dto.idProveedor);

      const duplicado = await em.findOne(Ingreso, { nroIngreso: dto.nroIngreso });
      if (duplicado) throw new AppError(409, 'Ya existe un ingreso con ese número de ingreso');

      const orden = [...vistos].sort((a, b) => a - b);
      const productos = new Map<number, Producto>();
      for (const idProducto of orden) {
        productos.set(idProducto, await this.productoService.assertExists(idProducto));
      }

      const now = new Date();
      const ingreso = em.create(Ingreso, {
        nroIngreso: dto.nroIngreso,
        fecha: dto.fecha ? new Date(dto.fecha) : now,
        importeTotal,
        estado: 'REGISTRADO',
        proveedor,
        createdAt: now,
        updatedAt: now,
      });

      const items: IngresoItem[] = [];
      for (const linea of dto.lineas) {
        const producto = productos.get(linea.idProducto)!;
        const item = em.create(IngresoItem, {
          ingreso,
          producto,
          cantidad: linea.cantidad,
          precioUnitario: linea.precioUnitario,
        });
        producto.stock += linea.cantidad;
        items.push(item);
      }

      await em.flush();
      return ingreso.toDetalle(items.map((item) => item.toPublic()));
    });
  }

  async anular(id: number): Promise<IngresoDetallePublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');

    return this.em.transactional(async (em) => {
      const ingreso = await em.findOne(Ingreso, { id });
      if (!ingreso) throw new AppError(404, 'Ingreso no encontrado');
      if (ingreso.estado === 'ANULADO') throw new AppError(409, 'El ingreso ya está anulado');

      const items = await em.find(IngresoItem, { ingreso: id }, { populate: ['producto'] });
      const ordenados = [...items].sort((a, b) => a.producto.id - b.producto.id);

      for (const item of ordenados) {
        if (item.producto.stock < item.cantidad) {
          throw new AppError(
            409,
            `Stock insuficiente para anular: ${item.producto.nombre} (stock actual ${item.producto.stock}, requiere ${item.cantidad})`,
          );
        }
      }
      for (const item of ordenados) {
        item.producto.stock -= item.cantidad;
      }

      ingreso.estado = 'ANULADO';
      await em.flush();
      return ingreso.toDetalle(items.map((item) => item.toPublic()));
    });
  }

  async findAll(filters: FilterIngresoDto): Promise<FindAllResult> {
    const where: Record<string, unknown> = {};
    if (filters.estado !== undefined) {
      if (!ESTADOS.includes(filters.estado)) {
        throw new AppError(400, 'estado debe ser REGISTRADO o ANULADO');
      }
      where.estado = filters.estado;
    }

    const { desde, hasta } = parseDateRange(filters.desde, filters.hasta);
    if (desde || hasta) {
      const rango: { $gte?: Date; $lte?: Date } = {};
      if (desde) rango.$gte = desde;
      if (hasta) rango.$lte = hasta;
      where.fecha = rango;
    }

    const [data, total] = await Promise.all([
      this.em.find(Ingreso, where, {
        populate: ['proveedor'],
        orderBy: { fecha: 'DESC', id: 'DESC' },
      }),
      this.em.count(Ingreso, where),
    ]);
    return { data: data.map((ingreso) => ingreso.toPublic()), total };
  }

  async findById(id: number): Promise<IngresoDetallePublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const ingreso = await this.em.findOne(Ingreso, { id }, { populate: ['proveedor'] });
    if (!ingreso) throw new AppError(404, 'Ingreso no encontrado');
    const items = await this.em.find(
      IngresoItem,
      { ingreso: id },
      { populate: ['producto'], orderBy: { id: 'ASC' } },
    );
    return ingreso.toDetalle(items.map((item) => item.toPublic()));
  }
}
