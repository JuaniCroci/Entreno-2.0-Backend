import { describe, it, expect, beforeEach, vi } from 'vitest';
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

  beforeEach(() => {
    auth = new AuthService();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    usuarioService = (auth as any).usuarioService;
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

  it('login devuelve token y usuario público sin passwordHash', async () => {
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

    const result = await auth.login({ email: 'test@example.com', password: 'secret123' });

    expect(typeof result.token).toBe('string');
    expect(result.token.length).toBeGreaterThan(0);
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
});
