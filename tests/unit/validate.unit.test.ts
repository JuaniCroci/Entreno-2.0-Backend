import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Request, Response } from 'express';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { validateDto } from '../../src/common/middleware/validate.js';
import { AppError } from '../../src/common/errors/AppError.js';
import { RegisterDto } from '../../src/modules/auth/dto/RegisterDto.js';
import { CreateProductoDto } from '../../src/modules/productos/dto/CreateProductoDto.js';
import { UpdateProductoDto } from '../../src/modules/productos/dto/UpdateProductoDto.js';
import { CreateDescuentoDto } from '../../src/modules/descuentos/dto/CreateDescuentoDto.js';
import { CreateAplicacionDto } from '../../src/modules/descuentos/dto/CreateAplicacionDto.js';

const validateOpts = { whitelist: true, forbidNonWhitelisted: true } as const;

async function validateDtoInstance<T extends object>(
  dtoClass: new () => T,
  body: unknown,
): Promise<string[]> {
  const instance = plainToInstance(dtoClass, body);
  const errors = await validate(instance, validateOpts);
  return errors.flatMap((err) => Object.keys(err.constraints ?? {}));
}

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
    const err = next.mock.calls[0]?.[0] as AppError;
    expect(err.details).toBeDefined();
    expect(err.details?.length ?? 0).toBeGreaterThan(0);
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

  it('strippea campos desconocidos cuando forbidNonWhitelisted está en false', async () => {
    const next = vi.fn();
    const middleware = validateDto(UpdateProductoDto, { forbidNonWhitelisted: false });
    const req = makeMockReq({ stock: 999 });
    await middleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith();
    expect(req.body).not.toHaveProperty('stock');
  });

  it('rechaza stock desconocido en UpdateProductoDto por defecto', async () => {
    const next = vi.fn();
    const middleware = validateDto(UpdateProductoDto);
    const req = makeMockReq({ stock: 999 });
    await middleware(req, {} as Response, next);
    expect(next).toHaveBeenCalledWith(expect.objectContaining({ statusCode: 400 }));
  });
});

describe('DTOs de producto (regresión)', () => {
  it('acepta precioUnitario con decimales', async () => {
    const violations = await validateDtoInstance(CreateProductoDto, {
      nombre: 'Proteína',
      stockInicial: 10,
      precioUnitario: '1500.00',
      idTipoProducto: 1,
      idMarca: 1,
    });
    expect(violations).toEqual([]);
  });

  it('rechaza precioUnitario con más de 2 decimales', async () => {
    const violations = await validateDtoInstance(CreateProductoDto, {
      nombre: 'Proteína',
      stockInicial: 10,
      precioUnitario: '1500.123',
      idTipoProducto: 1,
      idMarca: 1,
    });
    expect(violations).toContain('isDecimal');
  });

  it('acepta precioUnitario con decimales en el update', async () => {
    const violations = await validateDtoInstance(UpdateProductoDto, {
      precioUnitario: '999.99',
    });
    expect(violations).toEqual([]);
  });
});

describe('DTOs de descuento (regresión)', () => {
  it('acepta create sin activo (campo opcional)', async () => {
    const violations = await validateDtoInstance(CreateDescuentoDto, {
      descripcion: 'Pack 3+1',
      cantidadMinima: 3,
      porcentaje: 10,
    });
    expect(violations).toEqual([]);
  });

  it('acepta activo booleano', async () => {
    const violations = await validateDtoInstance(CreateDescuentoDto, {
      descripcion: 'Pack 3+1',
      cantidadMinima: 3,
      porcentaje: 10,
      activo: false,
    });
    expect(violations).toEqual([]);
  });

  it('convierte fechas ISO string a Date en CreateAplicacionDto', async () => {
    const instance = plainToInstance(CreateAplicacionDto, {
      idProducto: 1,
      fechaDesde: '2026-01-01',
      fechaHasta: '2026-12-31',
    });
    const errors = await validate(instance, validateOpts);
    expect(errors).toEqual([]);
    expect(instance.fechaDesde).toBeInstanceOf(Date);
    expect(instance.fechaHasta).toBeInstanceOf(Date);
  });
});
