import type { EntityManager } from '@mikro-orm/mysql';
import { hash } from 'bcryptjs';
import { getEm } from '../../../config/db.js';
import { env } from '../../../config/env.js';
import { AppError } from '../../../common/errors/AppError.js';
import { Usuario, Rol, type UsuarioPublic } from '../../usuarios/entity/Usuario.js';
import { UsuarioService } from '../../usuarios/service/UsuarioService.js';
import type { CreateClienteDto } from '../dto/CreateClienteDto.js';
import type { UpdateClienteDto } from '../dto/UpdateClienteDto.js';

export interface FindAllResult {
  data: UsuarioPublic[];
  total: number;
}

export class ClienteService {
  private usuarioService = new UsuarioService();

  private get em(): EntityManager {
    return getEm();
  }

  async list(filters: { q?: string; activo?: boolean } = {}): Promise<FindAllResult> {
    const where: Record<string, unknown> = { rol: Rol.CLIENTE };
    if (filters.activo !== undefined) where.activo = filters.activo;
    if (filters.q) {
      where.$or = [{ nombre: { $like: `%${filters.q}%` } }, { email: { $like: `%${filters.q}%` } }];
    }
    const [data, total] = await Promise.all([
      this.em.find(Usuario, where, { orderBy: { nombre: 'ASC' } }),
      this.em.count(Usuario, where),
    ]);
    return { data: data.map((u) => this.usuarioService.toPublic(u)), total };
  }

  async getById(id: number): Promise<UsuarioPublic> {
    const usuario = await this.usuarioService.findById(id);
    if (usuario.rol !== Rol.CLIENTE) throw new AppError(404, 'Cliente no encontrado');
    return this.usuarioService.toPublic(usuario);
  }

  async create(dto: CreateClienteDto): Promise<UsuarioPublic> {
    const existing = await this.usuarioService.findByEmail(dto.email);
    if (existing) throw new AppError(409, 'Ya existe un usuario con ese email');

    const passwordHash = await hash(dto.password, env.bcryptRounds);
    const now = new Date();
    const usuario = this.em.create(Usuario, {
      nombre: dto.nombre,
      email: dto.email,
      passwordHash,
      telefono: dto.telefono ?? null,
      direccion: dto.direccion ?? null,
      rol: Rol.CLIENTE,
      activo: true,
      createdAt: now,
      updatedAt: now,
    });
    await this.em.flush();
    return this.usuarioService.toPublic(usuario);
  }

  async update(id: number, dto: UpdateClienteDto): Promise<UsuarioPublic> {
    const usuario = await this.usuarioService.findById(id);
    if (usuario.rol !== Rol.CLIENTE) throw new AppError(404, 'Cliente no encontrado');

    const existing = await this.em.findOne(Usuario, { email: dto.email });
    if (existing && existing.id !== usuario.id) {
      throw new AppError(409, 'Ya existe un usuario con ese email');
    }

    if (dto.nombre !== undefined) usuario.nombre = dto.nombre;
    if (dto.email !== undefined) usuario.email = dto.email;
    if (dto.telefono !== undefined) usuario.telefono = dto.telefono;
    if (dto.direccion !== undefined) usuario.direccion = dto.direccion;
    if (dto.password !== undefined) {
      usuario.passwordHash = await hash(dto.password, env.bcryptRounds);
    }
    usuario.updatedAt = new Date();
    await this.em.flush();
    return this.usuarioService.toPublic(usuario);
  }

  async setActivo(id: number, activo: boolean): Promise<UsuarioPublic> {
    const usuario = await this.usuarioService.findById(id);
    if (usuario.rol !== Rol.CLIENTE) throw new AppError(404, 'Cliente no encontrado');
    usuario.activo = activo;
    usuario.updatedAt = new Date();
    await this.em.flush();
    return this.usuarioService.toPublic(usuario);
  }
}