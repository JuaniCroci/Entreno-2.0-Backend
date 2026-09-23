import { describe, it, expect, beforeEach, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { AppError } from '../../src/common/errors/AppError.js';
import { AuthService } from '../../src/modules/auth/service/AuthService.js';
import { UsuarioService } from '../../src/modules/usuarios/service/UsuarioService.js';
import { Usuario, Rol } from '../../src/modules/usuarios/entity/Usuario.js';

function makeUsuario(overrides: Partial<Usuario> = {}): Usuario {
  const u = new Usuario();
  u.id = 1;
  u.nombre = 'Test';
  u.email = 'test@example.com';
  u.passwordHash = '$2a$04$abcdefghijklmnopqrstuv';
  u.telefono = null;
  u.direccion = null;
  u.rol = Rol.CLIENTE;
  u.activo = true;
  u.createdAt = new Date();
  u.updatedAt = new Date();
  Object.assign(u, overrides);
  return u;
}

describe('AuthService', () => {
  let auth: AuthService;
  let usuarioService: UsuarioService;
  let refreshTokenService: {
    create: ReturnType<typeof vi.fn>;
    findActiveByHash: ReturnType<typeof vi.fn>;
    revokeById: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    auth = new AuthService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    usuarioService = (auth as any).usuarioService;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    refreshTokenService = (auth as any).refreshTokenService;
    vi.spyOn(jwt, 'verify').mockImplementation((token: string) => {
      if (token === 'valid_refresh_token') {
        return { sub: 1, rol: 'CLIENTE' };
      }
      if (token === 'valid_but_user_deleted_token') {
        return { sub: 999, rol: 'CLIENTE' };
      }
      throw new Error('Invalid token');
    });
  });

  it('register crea usuario con rol CLIENTE y sin passwordHash en la respuesta', async () => {
    const publicUser = {
      id: 1,
      nombre: 'Juan',
      email: 'juan@example.com',
      telefono: null,
      direccion: null,
      rol: Rol.CLIENTE,
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(usuarioService, 'create').mockResolvedValue(makeUsuario());
    vi.spyOn(usuarioService, 'toPublic').mockReturnValue(publicUser);

    const result = await auth.register({
      nombre: 'Juan',
      email: 'juan@example.com',
      password: 'secret123',
    });

    expect(usuarioService.create).toHaveBeenCalledWith(
      expect.objectContaining({ rol: Rol.CLIENTE }),
    );
    expect(result).not.toHaveProperty('passwordHash');
    expect(result.rol).toBe(Rol.CLIENTE);
  });

  it('register lanza 409 si el email ya existe', async () => {
    vi.spyOn(usuarioService, 'create').mockRejectedValue(
      new AppError(409, 'Ya existe un usuario con ese email'),
    );
    await expect(
      auth.register({ nombre: 'X', email: 'x@example.com', password: 'secret123' }),
    ).rejects.toMatchObject({ statusCode: 409 });
  });

  it('login devuelve token y refreshToken', async () => {
    const usuario = makeUsuario();
    const publicUser = {
      id: 1,
      nombre: 'Test',
      email: 'test@example.com',
      telefono: null,
      direccion: null,
      rol: Rol.CLIENTE,
      activo: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    vi.spyOn(usuarioService, 'findByEmail').mockResolvedValue(usuario);
    vi.spyOn(usuarioService, 'validatePassword').mockResolvedValue(true);
    vi.spyOn(usuarioService, 'toPublic').mockReturnValue(publicUser);
    vi.spyOn(refreshTokenService, 'create').mockResolvedValue({
      token: 'new_refresh_token',
      hash: 'hash',
    });

    const result = await auth.login({ email: 'test@example.com', password: 'secret123' });

    expect(typeof result.token).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
    expect(result.usuario).not.toHaveProperty('passwordHash');
  });

  it('login falla con password inválida (401)', async () => {
    const usuario = makeUsuario();
    vi.spyOn(usuarioService, 'findByEmail').mockResolvedValue(usuario);
    vi.spyOn(usuarioService, 'validatePassword').mockResolvedValue(false);

    await expect(
      auth.login({ email: 'test@example.com', password: 'wrong' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('login falla si el usuario no existe (401 genérico)', async () => {
    vi.spyOn(usuarioService, 'findByEmail').mockResolvedValue(null);
    await expect(
      auth.login({ email: 'no@example.com', password: 'secret123' }),
    ).rejects.toMatchObject({ statusCode: 401 });
  });

  it('refresh devuelve nuevo token con refreshToken válido', async () => {
    const usuario = makeUsuario();
    vi.spyOn(usuarioService, 'findById').mockResolvedValue(usuario);
    vi.spyOn(usuarioService, 'toPublic').mockReturnValue({
      id: usuario.id,
      nombre: usuario.nombre,
      email: usuario.email,
      telefono: usuario.telefono,
      direccion: usuario.direccion,
      rol: usuario.rol,
      activo: usuario.activo,
      createdAt: usuario.createdAt,
      updatedAt: usuario.updatedAt,
    });
    vi.spyOn(refreshTokenService, 'findActiveByHash').mockResolvedValue({
      id: 1,
      isActive: () => true,
      usuarioId: 1,
    });
    vi.spyOn(refreshTokenService, 'revokeById').mockResolvedValue(undefined);
    vi.spyOn(refreshTokenService, 'create').mockResolvedValue({
      token: 'new_refresh_token',
      hash: 'hash',
    });

    const result = await auth.refresh('valid_refresh_token');
    expect(typeof result.token).toBe('string');
    expect(typeof result.refreshToken).toBe('string');
    expect(result.usuario).not.toHaveProperty('passwordHash');
  });

  it('refresh lanza 401 con refreshToken inválido', async () => {
    vi.spyOn(refreshTokenService, 'findActiveByHash').mockResolvedValue(null);
    await expect(auth.refresh('invalid_refresh_token')).rejects.toMatchObject({
      statusCode: 401,
    });
  });

  it('refresh lanza 404 si usuario no existe', async () => {
    vi.spyOn(refreshTokenService, 'findActiveByHash').mockResolvedValue({
      id: 1,
      isActive: () => true,
      usuarioId: 1,
    });
    vi.spyOn(usuarioService, 'findById').mockResolvedValue(null);
    await expect(auth.refresh('valid_but_user_deleted_token')).rejects.toMatchObject({
      statusCode: 404,
    });
  });
});
