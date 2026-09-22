import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { initDb, closeDb } from '../../src/config/db.js';

describe('GET /api/health', () => {
  let app: Express;

  beforeAll(async () => {
    await initDb();
    app = createApp();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('responde 200 con status ok cuando la base está disponible', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ status: 'ok', database: 'up' });
  });

  it('responde 404 para rutas inexistentes con el envelope de error', async () => {
    const res = await request(app).get('/api/inexistente');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('statusCode', 404);
    expect(res.body).toHaveProperty('message');
  });
});
