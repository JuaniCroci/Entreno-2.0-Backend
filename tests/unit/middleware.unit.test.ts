import { describe, it, expect, vi } from 'vitest';
import type { Request, Response } from 'express';
import { authenticate } from '../../src/common/middleware/authenticate.js';
import { authorize } from '../../src/common/middleware/authorize.js';
import { AppError } from '../../src/common/errors/AppError.js';
import { Rol } from '../../src/modules/usuarios/entity/Usuario.js';

function fakeReq(headers: Record<string, string> = {}, user?: unknown): Request {
  return { headers, user } as Request;
}
const fakeRes = {} as Response;

describe('middleware authenticate', () => {
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

describe('AppError', () => {
  it('guarda statusCode y message', () => {
    const err = new AppError(401, 'Token inválido');
    expect(err.statusCode).toBe(401);
    expect(err.message).toBe('Token inválido');
  });
});
