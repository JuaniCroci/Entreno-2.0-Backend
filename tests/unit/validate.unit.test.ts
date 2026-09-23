import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateDto } from '../../src/common/middleware/validate.js';
import { AppError } from '../../src/common/errors/AppError.js';
import { RegisterDto } from '../../src/modules/auth/dto/RegisterDto.js';

function makeMockReq(body: unknown): Request {
  return { body } as unknown as Request;
}

describe('validateDto middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('llama a next() sin args cuando el body es válido', async () => {
    const next = vi.fn();
    const middleware = validateDto(RegisterDto);
    const req = makeMockReq({
      nombre: 'Juan',
      email: 'juan@example.com',
      password: 'secret123',
    });
    await middleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
  });

  it('llama a next() con AppError(400) cuando el body es inválido', async () => {
    const next = vi.fn();
    const middleware = validateDto(RegisterDto);
    const req = makeMockReq({
      nombre: '',
      email: 'not-an-email',
      password: 'short',
    });
    await middleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
    const err = next.mock.calls[0][0] as AppError;
    expect(err.details).toBeDefined();
    expect(err.details.length).toBeGreaterThan(0);
  });

  it('rechaza campos extra con forbidNonWhitelisted', async () => {
    const next = vi.fn();
    const middleware = validateDto(RegisterDto);
    const req = makeMockReq({
      nombre: 'Juan',
      email: 'juan@example.com',
      password: 'secret123',
      rol: 'ADMIN',
    });
    await middleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });

  it('settea req.body como instancia validada cuando pasa', async () => {
    const next = vi.fn();
    const middleware = validateDto(RegisterDto);
    const req = makeMockReq({
      nombre: 'Juan',
      email: 'juan@example.com',
      password: 'secret123',
      telefono: '+5491112345678',
    });
    await middleware(req, {} as Response, next);
    expect(req.body).toBeDefined();
    expect(next).toHaveBeenCalledWith();
  });
});
