import { describe, it, expect, vi, beforeEach } from 'vitest';
import jwt from 'jsonwebtoken';
import type { Request, Response } from 'express';
import { authenticate } from '../../src/common/middleware/authenticate.js';
import { authorize } from '../../src/common/middleware/authorize.js';
import { notFound } from '../../src/common/errors/notFound.js';
import { AppError } from '../../src/common/errors/AppError.js';
import { Rol } from '../../src/modules/usuarios/entity/Usuario.js';
import { env } from '../../src/config/env.js';
import * as db from '../../src/config/db.js';
import { Usuario } from '../../src/modules/usuarios/entity/Usuario.js';

function fakeReq(headers: Record<string, string> = {}, user?: unknown): Request {
  return { headers, user } as Request;
}
const fakeRes = {} as Response;

function makeValidToken(userId: number = 1, rol: string = 'ADMIN'): string {
  return jwt.sign({ sub: userId, rol }, env.jwtSecret, { expiresIn: '7d' });
}

describe('middleware authenticate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('devuelve 401 si no hay header Authorization', async () => {
    const next = vi.fn();
    await authenticate(fakeReq(), fakeRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('devuelve 401 si el token es inválido', async () => {
    const next = vi.fn();
    await authenticate(fakeReq({ authorization: 'Bearer invalido' }), fakeRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('llama a next() con usuario si el token es válido y el usuario existe', async () => {
    const next = vi.fn();
    const usuario = new Usuario();
    usuario.id = 1;
    usuario.nombre = 'Admin';
    usuario.email = 'admin@example.com';
    usuario.passwordHash = '$2a$04$abcdefghijklmnopqrstuv';
    usuario.rol = Rol.ADMIN;
    usuario.activo = true;
    usuario.telefono = null;
    usuario.direccion = null;
    usuario.createdAt = new Date();
    usuario.updatedAt = new Date();
    vi.spyOn(db, 'getEm').mockReturnValue({
      findOne: vi.fn().mockResolvedValue(usuario),
    } as unknown as Parameters<typeof db.getEm>[0]);

    const token = makeValidToken(1, 'ADMIN');
    await authenticate(fakeReq({ authorization: `Bearer ${token}` }), fakeRes, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('devuelve 401 si el usuario del token no existe o está inactivo', async () => {
    const next = vi.fn();
    vi.spyOn(db, 'getEm').mockReturnValue({
      findOne: vi.fn().mockResolvedValue(null),
    } as unknown as Parameters<typeof db.getEm>[0]);

    const token = makeValidToken(999, 'ADMIN');
    await authenticate(fakeReq({ authorization: `Bearer ${token}` }), fakeRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });
});

describe('middleware authorize', () => {
  it('devuelve 401 si no hay usuario en la request', () => {
    const next = vi.fn();
    const mw = authorize('ADMIN');
    mw(fakeReq(), fakeRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 401 }));
  });

  it('devuelve 403 si el rol no está permitido', () => {
    const next = vi.fn();
    const mw = authorize('ADMIN');
    mw(fakeReq({}, { id: 1, rol: Rol.CLIENTE }), fakeRes, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 403 }));
  });

  it('pasa al next si el rol está permitido', () => {
    const next = vi.fn();
    const mw = authorize('ADMIN');
    mw(fakeReq({}, { id: 1, rol: Rol.ADMIN }), fakeRes, next);
    expect(next).toHaveBeenCalledWith();
  });
});

describe('middleware notFound', () => {
  it('llama a next con AppError 404', () => {
    const next = vi.fn();
    notFound({ method: 'GET', originalUrl: '/api/unknown' } as Request, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 404 }));
  });
});

describe('AppError', () => {
  it('guarda statusCode y message', () => {
    const err = new AppError(401, 'Token inválido');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Token inválido');
  });
});
