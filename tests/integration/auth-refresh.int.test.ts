import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { initDb, closeDb, getOrm } from '../../src/config/db.js';

describe('Refresh Token flow (integración)', () => {
  let app: Express;

  beforeAll(async () => {
    await initDb();
    try {
      await getOrm().getSchemaGenerator().createSchema();
    } catch {
      // el schema ya existe
    }
    app = createApp();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('login devuelve refreshToken', async () => {
    const email = `refresh-${Date.now()}@test.local`;
    await request(app).post('/api/auth/register').send({
      nombre: 'Refresh Test',
      email,
      password: 'secret123',
    });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'secret123' });
    expect(loginRes.status).toBe(200);
    expect(typeof loginRes.body.refreshToken).toBe('string');
    expect(loginRes.body.refreshToken.length).toBeGreaterThan(0);
  });

  it('refresh con refreshToken válido devuelve nuevo par de tokens', async () => {
    const email = `refresh2-${Date.now()}@test.local`;
    await request(app).post('/api/auth/register').send({
      nombre: 'Refresh Test 2',
      email,
      password: 'secret123',
    });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'secret123' });
    const refreshToken = loginRes.body.refreshToken;

    const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(200);
    expect(typeof refreshRes.body.token).toBe('string');
    expect(typeof refreshRes.body.refreshToken).toBe('string');
  });

  it('refresh con refreshToken ya revocado devuelve 401', async () => {
    const email = `refresh3-${Date.now()}@test.local`;
    await request(app).post('/api/auth/register').send({
      nombre: 'Refresh Test 3',
      email,
      password: 'secret123',
    });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'secret123' });
    const refreshToken = loginRes.body.refreshToken;

    const refreshRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(refreshRes.status).toBe(200);

    const reuseRes = await request(app).post('/api/auth/refresh').send({ refreshToken });
    expect(reuseRes.status).toBe(401);
    expect(reuseRes.body.message).toBe('Refresh token inválido');
  });

  it('logout revoca todos los refresh tokens del usuario', async () => {
    const email = `logout-${Date.now()}@test.local`;
    await request(app).post('/api/auth/register').send({
      nombre: 'Logout Test',
      email,
      password: 'secret123',
    });
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'secret123' });
    const token = loginRes.body.token;

    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);
    expect(logoutRes.status).toBe(204);
  });

  it('POST /refresh sin refreshToken responde 400', async () => {
    const res = await request(app).post('/api/auth/refresh').send({});
    expect(res.status).toBe(400);
  });
});
