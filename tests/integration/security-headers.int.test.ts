import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { initDb, closeDb } from '../../src/config/db.js';

describe('headers de seguridad (S7)', () => {
  let app: Express;

  beforeAll(async () => {
    await initDb();
    app = createApp();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('expone los headers de seguridad en las respuestas', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-frame-options']).toBeDefined();
    expect(res.headers['content-security-policy']).toBeDefined();
    expect(res.headers['referrer-policy']).toBeDefined();
    expect(res.headers['strict-transport-security']).toBeDefined();
  });

  it('el CSP mantiene default-src self como base y no abre fuentes externas', async () => {
    const res = await request(app).get('/api/health');
    const csp = res.headers['content-security-policy'] ?? '';

    // base mínima que exige la skill (helmet defaults)
    expect(csp).toContain("default-src 'self'");
    // la API JSON-only no sirve plugins ni permite scripts escribir en attributes
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("script-src-attr 'none'");
    // nunca wildcard para todo
    expect(csp).not.toMatch(/default-src\s+\*/);
  });

  it('no filtra la versión del servidor ni x-powered-by', async () => {
    const res = await request(app).get('/api/health');

    expect(res.headers['x-powered-by']).toBeUndefined();
    expect(res.headers['server']).toBeUndefined();
  });
});
