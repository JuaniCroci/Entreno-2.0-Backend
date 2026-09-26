import type { EntityManager } from '@mikro-orm/mysql';
import { getEm } from '../../../config/db.js';
import { AppError } from '../../../common/errors/AppError.js';
import { Marca, MarcaPublic } from '../entity/Marca.js';
import type { CreateMarcaDto } from '../dto/CreateMarcaDto.js';
import type { UpdateMarcaDto } from '../dto/UpdateMarcaDto.js';

export interface FindAllResult {
  data: MarcaPublic[];
  total: number;
}

export class MarcaService {
  private get em(): EntityManager {
    return getEm();
  }

  async list(includeInactive = false): Promise<FindAllResult> {
    const where: Record<string, unknown> = {};
    if (!includeInactive) where.activo = true;
    const [data, total] = await Promise.all([
      this.em.find(Marca, where, { orderBy: { nombre: 'ASC' } }),
      this.em.count(Marca, where),
    ]);
    return { data: data.map((m) => m.toPublic()), total };
  }

  async getById(id: number): Promise<MarcaPublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const marca = await this.em.findOne(Marca, { id });
    if (!marca) throw new AppError(404, 'Marca no encontrada');
    if (!marca.activo) throw new AppError(404, 'Marca no encontrada');
    return marca.toPublic();
  }

  async create(dto: CreateMarcaDto): Promise<MarcaPublic> {
    const existing = await this.em.findOne(Marca, { nombre: dto.nombre });
    if (existing) throw new AppError(409, 'Ya existe una marca con ese nombre');

    const now = new Date();
    const marca = this.em.create(Marca, {
      nombre: dto.nombre,
      activo: true,
      createdAt: now,
      updatedAt: now,
    });
    await this.em.flush();
    return marca.toPublic();
  }

  async update(id: number, dto: UpdateMarcaDto): Promise<MarcaPublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const marca = await this.em.findOne(Marca, { id });
    if (!marca) throw new AppError(404, 'Marca no encontrada');

    if (dto.nombre !== undefined) {
      const existing = await this.em.findOne(Marca, { nombre: dto.nombre });
      if (existing && existing.id !== marca.id) {
        throw new AppError(409, 'Ya existe una marca con ese nombre');
      }
      marca.nombre = dto.nombre;
    }
    marca.updatedAt = new Date();
    await this.em.flush();
    return marca.toPublic();
  }

  async softDelete(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const marca = await this.em.findOne(Marca, { id });
    if (!marca) throw new AppError(404, 'Marca no encontrada');
    marca.activo = false;
    marca.updatedAt = new Date();
    await this.em.flush();
  }
}