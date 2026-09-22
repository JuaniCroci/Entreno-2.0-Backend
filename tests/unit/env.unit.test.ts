import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('env loader (unit smoke)', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('expone las variables obligatorias con tipos correctos', async () => {
    const { env } = await import('../../src/config/env.js');
    expect(typeof env.port).toBe('number');
    expect(env.nodeEnv).toBe('test');
    expect(env.jwtSecret.length).toBeGreaterThan(0);
    expect(env.dbName.length).toBeGreaterThan(0);
    expect(typeof env.bcryptRounds).toBe('number');
    expect(typeof env.corsOrigin).toBe('string');
  });

  it('falla si falta una variable obligatoria', async () => {
    const original = process.env.DB_NAME;
    delete process.env.DB_NAME;
    vi.resetModules();
    await expect(import('../../src/config/env.js')).rejects.toThrow('DB_NAME');
    if (original !== undefined) process.env.DB_NAME = original;
  });
});
