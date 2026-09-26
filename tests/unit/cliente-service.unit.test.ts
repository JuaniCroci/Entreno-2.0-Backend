import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ClienteService } from '../../src/modules/clientes/service/ClienteService.js';
import { Usuario, Rol } from '../../src/modules/usuarios/entity/Usuario.js';
import * as db from '../../src/config/db.js';

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

describe('ClienteService', () => {
  let service: ClienteService;
  let em: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    service = new ClienteService();
    em = {
      find: vi.fn(),
      findOne: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      flush: vi.fn(),
    } as unknown as ReturnType<typeof vi.fn>;
    vi.spyOn(db, 'getEm').mockReturnValue(em);
  });

  it('list filtra por rol CLIENTE', async () => {
    const data = [makeUsuario()];
    vi.spyOn(em, 'find').mockResolvedValue(data);
    vi.spyOn(em, 'count').mockResolvedValue(1);

    await service.list();
    expect(em.find).toHaveBeenCalledWith(
      Usuario,
      expect.objectContaining({ rol: Rol.CLIENTE }),
      expect.any(Object),
    );
  });

  it('create fuerza rol CLIENTE en la creación', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    const usuario = makeUsuario();
    vi.spyOn(em, 'create').mockReturnValue(usuario);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    await service.create({ nombre: 'Test', email: 'test@test.com', password: 'secret123' });
    expect(em.create).toHaveBeenCalledWith(
      Usuario,
      expect.objectContaining({ rol: Rol.CLIENTE }),
    );
  });

  it('create lanza 409 si email ya existe', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(makeUsuario());
    await expect(service.create({ nombre: 'Test', email: 'test@test.com', password: 'secret123' })).rejects.toMatchObject({ statusCode: 409 });
  });

  it('setActivo pone activo=false', async () => {
    const usuario = makeUsuario();
    vi.spyOn(em, 'findOne').mockResolvedValue(usuario);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    await service.setActivo(1, false);
    expect(usuario.activo).toBe(false);
  });

  it('setActivo pone activo=true', async () => {
    const usuario = makeUsuario({ activo: false });
    vi.spyOn(em, 'findOne').mockResolvedValue(usuario);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined);

    await service.setActivo(1, true);
    expect(usuario.activo).toBe(true);
  });
});