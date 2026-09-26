import type { EntityManager } from '@mikro-orm/mysql';
import { getEm } from '../../../config/db.js';
import { AppError } from '../../../common/errors/AppError.js';
import { Proveedor, ProveedorPublic } from '../entity/Proveedor.js';
import type { CreateProveedorDto } from '../dto/CreateProveedorDto.js';
import type { UpdateProveedorDto } from '../dto/UpdateProveedorDto.js';

export interface FindAllResult {
  data: ProveedorPublic[];
  total: number;
}

export class ProveedorService {
  private get em(): EntityManager {
    return getEm();
  }

  async list(includeInactive = false): Promise<FindAllResult> {
    const where: Record<string, unknown> = {};
    if (!includeInactive) where.activo = true;
    const [data, total] = await Promise.all([
      this.em.find(Proveedor, where, { orderBy: { razonSocial: 'ASC' } }),
      this.em.count(Proveedor, where),
    ]);
    return { data: data.map((p) => p.toPublic()), total };
  }

  async getById(id: number): Promise<ProveedorPublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const proveedor = await this.em.findOne(Proveedor, { id });
    if (!proveedor) throw new AppError(404, 'Proveedor no encontrado');
    if (!proveedor.activo) throw new AppError(404, 'Proveedor no encontrado');
    return proveedor.toPublic();
  }

  async create(dto: CreateProveedorDto): Promise<ProveedorPublic> {
    const existing = await this.em.findOne(Proveedor, { cuit: dto.cuit });
    if (existing) throw new AppError(409, 'Ya existe un proveedor con ese CUIT');

    const now = new Date();
    const proveedor = this.em.create(Proveedor, {
      razonSocial: dto.razonSocial,
      cuit: dto.cuit,
      telefono: dto.telefono ?? null,
      email: dto.email ?? null,
      domicilio: dto.domicilio ?? null,
      activo: true,
      createdAt: now,
      updatedAt: now,
    });
    await this.em.flush();
    return proveedor.toPublic();
  }

  async update(id: number, dto: UpdateProveedorDto): Promise<ProveedorPublic> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const proveedor = await this.em.findOne(Proveedor, { id });
    if (!proveedor) throw new AppError(404, 'Proveedor no encontrado');

    if (dto.razonSocial !== undefined) {
      proveedor.razonSocial = dto.razonSocial;
    }
    if (dto.cuit !== undefined) {
      const existing = await this.em.findOne(Proveedor, { cuit: dto.cuit });
      if (existing && existing.id !== proveedor.id) {
        throw new AppError(409, 'Ya existe un proveedor con ese CUIT');
      }
      proveedor.cuit = dto.cuit;
    }
    if (dto.telefono !== undefined) {
      proveedor.telefono = dto.telefono;
    }
    if (dto.email !== undefined) {
      proveedor.email = dto.email;
    }
    if (dto.domicilio !== undefined) {
      proveedor.domicilio = dto.domicilio;
    }
    proveedor.updatedAt = new Date();
    await this.em.flush();
    return proveedor.toPublic();
  }

  async softDelete(id: number): Promise<void> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const proveedor = await this.em.findOne(Proveedor, { id });
    if (!proveedor) throw new AppError(404, 'Proveedor no encontrado');
    proveedor.activo = false;
    proveedor.updatedAt = new Date();
    await this.em.flush();
  }
}