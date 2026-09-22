import type { EntityManager } from '@mikro-orm/mysql';
import { hash, compare } from 'bcryptjs';
import { getEm } from '../../../config/db.js';
import { env } from '../../../config/env.js';
import { AppError } from '../../../common/errors/AppError.js';
import { Usuario, Rol, type UsuarioPublic } from '../entity/Usuario.js';
import type { CreateUsuarioDto } from '../dto/index.js';

export { UsuarioPublic };

export class UsuarioService {
  private get em(): EntityManager {
    return getEm();
  }

  async create(dto: CreateUsuarioDto): Promise<Usuario> {
    const existing = await this.em.findOne(Usuario, { email: dto.email });
    if (existing) throw new AppError(409, 'Ya existe un usuario con ese email');

    const passwordHash = await hash(dto.password, env.bcryptRounds);
    const now = new Date();
    const usuario = this.em.create(Usuario, {
      nombre: dto.nombre,
      email: dto.email,
      passwordHash,
      telefono: dto.telefono ?? null,
      direccion: dto.direccion ?? null,
      rol: dto.rol ?? Rol.CLIENTE,
      activo: true,
      createdAt: now,
      updatedAt: now,
    });
    await this.em.flush();
    return usuario;
  }

  async findByEmail(email: string): Promise<Usuario | null> {
    return this.em.findOne(Usuario, { email });
  }

  async findById(id: number): Promise<Usuario> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const usuario = await this.em.findOne(Usuario, { id, activo: true });
    if (!usuario) throw new AppError(404, 'Usuario no encontrado');
    return usuario;
  }

  async validatePassword(usuario: Usuario, password: string): Promise<boolean> {
    return compare(password, usuario.passwordHash);
  }

  toPublic(usuario: Usuario): UsuarioPublic {
    return usuario.toPublic();
  }
}
