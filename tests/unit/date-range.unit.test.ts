import { describe, it, expect } from 'vitest';
import { parseDateRange } from '../../src/common/utils/date-range.js';

describe('parseDateRange', () => {
  it('sin parámetros devuelve objeto vacío', () => {
    expect(parseDateRange()).toEqual({});
    expect(parseDateRange(undefined, undefined)).toEqual({});
  });

  it('solo desde devuelve inicio del día en UTC', () => {
    const result = parseDateRange('2026-01-15');
    expect(result.desde).toEqual(new Date('2026-01-15T00:00:00.000Z'));
    expect(result.hasta).toBeUndefined();
  });

  it('solo hasta devuelve fin del día en UTC', () => {
    const result = parseDateRange(undefined, '2026-01-20');
    expect(result.desde).toBeUndefined();
    expect(result.hasta).toEqual(new Date('2026-01-20T23:59:59.999Z'));
  });

  it('ambos devuelven el rango completo', () => {
    const result = parseDateRange('2026-01-15', '2026-01-20');
    expect(result.desde).toEqual(new Date('2026-01-15T00:00:00.000Z'));
    expect(result.hasta).toEqual(new Date('2026-01-20T23:59:59.999Z'));
  });

  it('lanza 400 si desde es posterior a hasta', () => {
    expect(() => parseDateRange('2026-01-20', '2026-01-15')).toThrow(
      '"desde" no puede ser posterior a "hasta"',
    );
    try {
      parseDateRange('2026-01-20', '2026-01-15');
    } catch (e) {
      expect(e).toMatchObject({ statusCode: 400 });
    }
  });

  it('mismo día en ambos extremos es válido', () => {
    const result = parseDateRange('2026-01-15', '2026-01-15');
    expect(result.desde!.getTime()).toBeLessThanOrEqual(result.hasta!.getTime());
  });

  it('lanza 400 si el formato no es YYYY-MM-DD', () => {
    expect(() => parseDateRange('15/01/2026')).toThrowError();
    expect(() => parseDateRange(undefined, 'ayer')).toThrowError();
  });
});
