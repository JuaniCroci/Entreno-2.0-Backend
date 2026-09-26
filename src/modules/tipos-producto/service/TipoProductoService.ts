import type { EntityManager } from '@mikro-orm/mysql';
import { getEm } from '../../../config/db.js';
import { AppError } from '../../../common/errors/AppError.js';
import { TipoProducto, TipoProductoPublic } from '../entity/TipoProducto.js';
import type { CreateTipoProductoDto } from '../dto/CreateTipoProductoDto.js';
import type { UpdateTipoProductoDto } from '../dto/UpdateTipoProductoDto.js';

export interface FindAllResult {
  data: TipoProductoPublic[];
  total: number;
}

export class TipoProductoService {
  private get em(): EntityManager {
    return getEm();
  }

  async list(includeInactive = false): Promise<FindAllResult> {
    const where: Record<string, unknown> = {};
    if (!includeInactive) where.activo = true;
    const [data, total] = await Promise.all([
      this.em.find(TipoProducto, where, { orderBy: { nombre: 'ASC' } }),
      this.em.count(TipoProducto, where),
    ]);
    return { data: data.map((t) => t.toPublic()), total };
  }

  async getById(id: number): Promise<TipoProductoPublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const tipo = await this.em.findOne(TipoProducto, { id });
    if (!tipo) throw new AppError(404, 'Tipo de producto no encontrado');
    if (!tipo.activo) throw new AppError(404, 'Tipo de producto no encontrado');
    return tipo.toPublic();
  }

  async create(dto: CreateTipoProductoDto): Promise<TipoProductoPublic> {
    const existing = await this.em.findOne(TipoProducto, { nombre: dto.nombre });
    if (existing) throw new AppError(409, 'Ya existe un tipo de producto con ese nombre');

    const now = new Date();
    const tipo = this.em.create(TipoProducto, {
      nombre: dto.nombre,
      descripcion: dto.descripcion ?? null,
      activo: true,
      createdAt: now,
      updatedAt: now,
    });
    await this.em.flush();
    return tipo.toPublic();
  }

  async update(id: number, dto: UpdateTipoProductoDto): Promise<TipoProductoPublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const tipo = await this.em.findOne(TipoProducto, { id });
    if (!tipo) throw new AppError(404, 'Tipo de producto no encontrado');

    if (dto.nombre !== undefined) {
      const existing = await this.em.findOne(TipoProducto, { nombre: dto.nombre });
      if (existing && existing.id !== tipo.id) {
        throw new AppError(409, 'Ya existe un tipo de producto con ese nombre');
      }
      tipo.nombre = dto.nombre;
    }
    if (dto.descripcion !== undefined) {
      tipo.descripcion = dto.descripcion;
    }
    tipo.updatedAt = new Date();
    await this.em.flush();
    return tipo.toPublic();
  }

  async softDelete(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const tipo = await this.em.findOne(TipoProducto, { id });
    if (!tipo) throw new AppError(404, 'Tipo de producto no encontrado');
    tipo.activo = false;
    tipo.updatedAt = new Date();
    await this.em.flush();
  }
}