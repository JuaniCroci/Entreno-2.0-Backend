import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express, NextFunction, Request, Response } from 'express';
import express from 'express';
import { createApp } from '../../src/app.js';
import { initDb, closeDb, requestContext } from '../../src/config/db.js';
import { getOrm } from '../../src/config/db.js';
import { authenticate } from '../../src/common/middleware/authenticate.js';
import { authorize } from '../../src/common/middleware/authorize.js';

describe('Auth flow (integración)', () => {
  let app: Express;
  let adminApp: Express;

  beforeAll(async () => {
    await initDb();
    try {
      await getOrm().getSchemaGenerator().createSchema();
    } catch {
      // el schema ya existe
    }
    app = createApp();

    adminApp = express();
    adminApp.use(express.json());
    adminApp.use(requestContext);
    adminApp.get('/solo-admin', authenticate, authorize('ADMIN'), (_req, res) => {
      res.json({ ok: true });
    });
    adminApp.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
      const status = (err as { statusCode?: number }).statusCode ?? 500;
      const message = (err as { message?: string }).message ?? 'Error';
      res.status(status).json({ statusCode: status, message });
    });
  });

  afterAll(async () => {
    await closeDb();
  });

  it('register → login → me sin exponer passwordHash', async () => {
    const email = `user-${Date.now()}@test.local`;
    const registerRes = await request(app).post('/api/auth/register').send({
      nombre: 'Cliente Test',
      email,
      password: 'secret123',
    });
    expect(registerRes.status).toBe(201);
    expect(registerRes.body.rol).toBe('CLIENTE');
    expect(registerRes.body).not.toHaveProperty('passwordHash');

    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({ email, password: 'secret123' });
    expect(loginRes.status).toBe(200);
    expect(typeof loginRes.body.token).toBe('string');
    expect(loginRes.body.usuario).not.toHaveProperty('passwordHash');

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.token}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.email).toBe(email);
    expect(meRes.body).not.toHaveProperty('passwordHash');
  });

  it('register con email duplicado devuelve 409', async () => {
    const email = `dup-${Date.now()}@test.local`;
    await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Dup', email, password: 'secret123' });
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'Dup2', email, password: 'secret123' });
    expect(res.status).toBe(409);
  });

  it('register con email inválido devuelve 400', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ nombre: 'X', email: 'no-email', password: 'secret123' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('statusCode', 400);
  });

  it('login con credenciales inválidas devuelve 401 genérico', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'no-existe@test.local', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Credenciales inválidas');
  });

  it('GET /me sin token devuelve 401', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

it('ruta authorize(ADMIN) con token de CLIENTE devuelve 403', async () => {
     const email = `cli-${Date.now()}@test.local`;
     await request(app)
       .post('/api/auth/register')
       .send({ nombre: 'Cliente', email, password: 'secret123' });
     const login = await request(app)
       .post('/api/auth/login')
       .send({ email, password: 'secret123' });
     const res = await request(adminApp)
       .get('/solo-admin')
       .set('Authorization', `Bearer ${login.body.token}`);
     expect(res.status).toBe(403);
   });

   it('GET /me con token válido devuelve 200 sin passwordHash', async () => {
     const email = `me-${Date.now()}@test.local`;
     await request(app).post('/api/auth/register').send({
       nombre: 'Me Test', email, password: 'secret123',
     });
     const login = await request(app)
       .post('/api/auth/login').send({ email, password: 'secret123' });
     const meRes = await request(app)
       .get('/api/auth/me')
       .set('Authorization', `Bearer ${login.body.token}`);
     expect(meRes.status).toBe(200);
     expect(meRes.body).not.toHaveProperty('passwordHash');
     expect(meRes.body.email).toBe(email);
   });

   it('ruta inexistente devuelve 404 via notFound handler', async () => {
     const res = await request(app).get('/api/nonexistent');
     expect(res.status).toBe(404);
     expect(res.body).toHaveProperty('statusCode', 404);
   });
 });
