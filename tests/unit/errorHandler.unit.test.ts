import { describe, it, expect, vi, beforeEach } from 'vitest';
import { errorHandler } from '../../src/common/errors/errorHandler.js';
import { AppError } from '../../src/common/errors/AppError.js';
import { env } from '../../src/config/env.js';

vi.mock('../../src/config/env.js', async () => {
  const actual = await vi.importActual('../../src/config/env.js');
  return { ...actual, env: { ...actual.env, nodeEnv: 'test' } };
});

function makeMockRes(): Response {
  const res: Response = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

describe('errorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('responde 400 con statusCode y message para AppError', () => {
    const res = makeMockRes();
    const err = new AppError(400, 'Error de validación');
    errorHandler(err, {} as Request, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 400, message: 'Error de validación' });
  });

  it('responde con details cuando AppError los tiene', () => {
    const res = makeMockRes();
    const err = new AppError(400, 'Error de validación', [
      { field: 'email', message: 'email inválido' },
    ]);
    errorHandler(err, {} as Request, res, vi.fn());
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        details: [{ field: 'email', message: 'email inválido' }],
      }),
    );
  });

  it('responde 404 con message de AppError', () => {
    const res = makeMockRes();
    const err = new AppError(404, 'Recurso no encontrado');
    errorHandler(err, {} as Request, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 404, message: 'Recurso no encontrado' });
  });

  it('responde 500 con mensaje genérico para Error no-Authorizado en prod', () => {
    const originalEnv = env.nodeEnv;
    (env as Record<string, unknown>).nodeEnv = 'production';
    const res = makeMockRes();
    const err = new Error('internal failure');
    errorHandler(err, {} as Request, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Error interno del servidor',
    });
    (env as Record<string, unknown>).nodeEnv = originalEnv;
  });

  it('responde 500 con message del Error en dev/test', () => {
    const res = makeMockRes();
    const err = new Error('algo rompió');
    errorHandler(err, {} as Request, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ statusCode: 500, message: 'algo rompió' });
  });

  it('responde 500 con mensaje genérico para error que no es Error instance', () => {
    const res = makeMockRes();
    errorHandler('not an error' as unknown as Error, {} as Request, res, vi.fn());
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      statusCode: 500,
      message: 'Error interno del servidor',
    });
  });
});
