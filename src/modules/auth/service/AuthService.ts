import jwt from 'jsonwebtoken';
import { createHash } from 'crypto';
import { env } from '../../../config/env.js';
import { AppError } from '../../../common/errors/AppError.js';
import { Rol } from '../../usuarios/entity/Usuario.js';
import { UsuarioService, type UsuarioPublic } from '../../usuarios/service/UsuarioService.js';
import { RefreshTokenService } from '../refresh-token.service.js';
import type { RegisterDto } from '../dto/RegisterDto.js';
import type { LoginDto } from '../../usuarios/dto/LoginDto.js';

export interface AuthResponse {
  token: string;
  refreshToken: string;
  usuario: UsuarioPublic;
}

export interface RefreshResponse {
  token: string;
  refreshToken: string;
  usuario: UsuarioPublic;
}

export class AuthService {
  private usuarioService = new UsuarioService();
  private refreshTokenService = new RefreshTokenService();

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
      issuer: 'entreno-api',
      audience: 'entreno-client',
    });
    const { token: refreshToken } = await this.refreshTokenService.create(usuario.id);
    return { token, refreshToken, usuario: this.usuarioService.toPublic(usuario) };
  }

  async logout(userId: number): Promise<void> {
    await this.refreshTokenService.revokeAllByUserId(userId);
  }

  async refresh(refreshToken: string): Promise<RefreshResponse> {
    const hash = createHash('sha256').update(refreshToken).digest('hex');
    const storedToken = await this.refreshTokenService.findActiveByHash(hash);
    if (!storedToken) {
      throw new AppError(401, 'Refresh token inválido');
    }
    const usuario = await this.usuarioService.findById(storedToken.usuarioId);
    if (!usuario || !usuario.activo) {
      throw new AppError(404, 'Usuario no encontrado');
    }
    await this.refreshTokenService.revokeById(storedToken.id);
    const token = jwt.sign({ sub: usuario.id, rol: usuario.rol }, env.jwtSecret, {
      expiresIn: '7d',
      issuer: 'entreno-api',
      audience: 'entreno-client',
    });
    const { token: newRefreshToken } = await this.refreshTokenService.create(usuario.id);
    return { token, refreshToken: newRefreshToken, usuario: this.usuarioService.toPublic(usuario) };
  }
}
