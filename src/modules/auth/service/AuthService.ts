import jwt from 'jsonwebtoken';
import { env } from '../../../config/env.js';
import { AppError } from '../../../common/errors/AppError.js';
import { Rol } from '../../usuarios/entity/Usuario.js';
import { UsuarioService, type UsuarioPublic } from '../../usuarios/service/UsuarioService.js';
import type { RegisterDto } from '../dto/RegisterDto.js';
import type { LoginDto } from '../dto/LoginDto.js';

export interface AuthResponse {
  token: string;
  usuario: UsuarioPublic;
}

export class AuthService {
  private usuarioService = new UsuarioService();

  async register(dto: RegisterDto): Promise<UsuarioPublic> {
    const usuario = await this.usuarioService.create({
      ...dto,
      rol: Rol.CLIENTE,
    });
    return this.usuarioService.toPublic(usuario);
  }

  async login(dto: LoginDto): Promise<AuthResponse> {
    const usuario = await this.usuarioService.findByEmail(dto.email);
    if (!usuario || !usuario.activo) {
      throw new AppError(401, 'Credenciales inválidas');
    }
    const valid = await this.usuarioService.validatePassword(usuario, dto.password);
    if (!valid) {
      throw new AppError(401, 'Credenciales inválidas');
    }
    const token = jwt.sign({ sub: usuario.id, rol: usuario.rol }, env.jwtSecret, {
      expiresIn: '7d',
    });
    return { token, usuario: this.usuarioService.toPublic(usuario) };
  }

  me(usuarioPublic: UsuarioPublic): UsuarioPublic {
    return usuarioPublic;
  }
}
