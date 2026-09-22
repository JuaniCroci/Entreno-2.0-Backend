import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { loadEnv } from '../../src/config/env.js';

function setEnv(vars: Record<string, string | undefined>): void {
  for (const [k, v] of Object.entries(vars)) {
    if (v === undefined) delete process.env[k];
    else process.env[k] = v;
  }
}

describe('loadEnv', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.resetModules();
  });

  it('carga variables obligatorias con tipos correctos', () => {
    setEnv({
      NODE_ENV: 'test',
      PORT: '3000',
      DB_HOST: 'localhost',
      DB_PORT: '3306',
      DB_USER: 'entreno',
      DB_PASSWORD: 'entreno',
      DB_NAME: 'entreno',
      JWT_SECRET: 'test_secret_no_produccion_1234567890',
    });
    const env = loadEnv();
    expect(typeof env.port).toBe('number');
    expect(env.nodeEnv).toBe('test');
    expect(env.jwtSecret.length).toBeGreaterThan(0);
    expect(env.dbName).toBe('entreno');
    expect(typeof env.bcryptRounds).toBe('number');
    expect(typeof env.corsOrigin).toBe('string');
  });

  it('falla si falta una variable obligatoria', () => {
    setEnv({
      NODE_ENV: 'test',
      PORT: '3000',
      DB_HOST: 'localhost',
      DB_PORT: '3306',
      DB_USER: 'entreno',
      DB_PASSWORD: 'entreno',
      DB_NAME: 'entreno',
      JWT_SECRET: 'test_secret_no_produccion_1234567890',
    });
    delete (process.env as Record<string, unknown>).DB_NAME;
    expect(() => loadEnv()).toThrow('DB_NAME');
  });

  it('falla si NODE_ENV es inválido', () => {
    setEnv({ NODE_ENV: 'invalid' });
    expect(() => loadEnv()).toThrow('NODE_ENV inválido');
  });

  it('falla si JWT_SECRET tiene menos de 32 caracteres', () => {
    setEnv({
      NODE_ENV: 'test',
      PORT: '3000',
      DB_HOST: 'localhost',
      DB_PORT: '3306',
      DB_USER: 'entreno',
      DB_PASSWORD: 'entreno',
      DB_NAME: 'entreno',
      JWT_SECRET: 'short',
    });
    expect(() => loadEnv()).toThrow('JWT_SECRET debe tener al menos 32 caracteres');
  });

  it('requiere ADMIN_PASSWORD en producción', () => {
    setEnv({
      NODE_ENV: 'production',
      PORT: '3000',
      DB_HOST: 'localhost',
      DB_PORT: '3306',
      DB_USER: 'entreno',
      DB_PASSWORD: 'entreno',
      DB_NAME: 'entreno',
      JWT_SECRET: 'test_secret_no_produccion_1234567890',
    });
    delete (process.env as Record<string, unknown>).ADMIN_PASSWORD;
    expect(() => loadEnv()).toThrow('ADMIN_PASSWORD');
  });

  it('usa default ADMIN_PASSWORD en desarrollo cuando no está seteado', () => {
    setEnv({
      NODE_ENV: 'development',
      PORT: '3000',
      DB_HOST: 'localhost',
      DB_PORT: '3306',
      DB_USER: 'entreno',
      DB_PASSWORD: 'entreno',
      DB_NAME: 'entreno',
      JWT_SECRET: 'test_secret_no_produccion_1234567890',
    });
    delete (process.env as Record<string, unknown>).ADMIN_PASSWORD;
    const env = loadEnv();
    expect(env.adminPassword).toBe('changeme_en_produccion');
  });
});
