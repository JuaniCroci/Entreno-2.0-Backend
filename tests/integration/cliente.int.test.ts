import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { closeDb, getOrm } from '../../src/config/db.js';
import { RequestContext } from '@mikro-orm/core';
import { Usuario } from '../../src/modules/usuarios/entity/Usuario.js';
import jwt from 'jsonwebtoken';

let adminUserId = 1;
let clienteUserId = 1;

function makeToken(rol: string = 'ADMIN', userId: number = adminUserId): string {
  return jwt.sign({ sub: userId, rol }, 'test_secret_no_produccion_1234567890', { expiresIn: '7d' });
}

describe('CRUD Cliente (integración)', () => {
  let app: Express;

  beforeAll(async () => {
    try {
      await getOrm().getSchemaGenerator().createSchema();
    } catch {
      // schema ya existe
    }

    await RequestContext.create(getOrm().em, async () => {
      const admin = await getOrm().em.findOne(Usuario, { email: 'admin@entreno.com' });
      if (admin) adminUserId = admin.id;
      const cliente = await getOrm().em.findOne(Usuario, { email: 'cliente@test.local' });
      if (cliente) clienteUserId = cliente.id;
    });

    app = createApp();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('GET /api/clientes sin token responde 401', async () => {
    const res = await request(app).get('/api/clientes');
    expect(res.status).toBe(401);
  });

  it('GET /api/clientes con CLIENTE responde 403', async () => {
    const token = makeToken('CLIENTE', clienteUserId);
    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/clientes con ADMIN responde 200', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .get('/api/clientes')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
  });

  it('POST /api/clientes sin token responde 401', async () => {
    const res = await request(app)
      .post('/api/clientes')
      .send({ nombre: 'Test', email: 'new@test.com', password: 'secret123' });
    expect(res.status).toBe(401);
  });

  it('POST /api/clientes con CLIENTE responde 403', async () => {
    const token = makeToken('CLIENTE', clienteUserId);
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Test', email: 'new@test.com', password: 'secret123' });
    expect(res.status).toBe(403);
  });

  it('POST /api/clientes con ADMIN crea cliente 201', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: `Cliente Test ${Date.now()}`, email: `cli${Date.now()}@test.com`, password: 'secret123' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body).not.toHaveProperty('passwordHash');
  });

  it('POST /api/clientes con email duplicado responde 409', async () => {
    const token = makeToken('ADMIN');
    const email = `dup${Date.now()}@test.com`;
    await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Dup', email, password: 'secret123' });
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Dup2', email, password: 'secret123' });
    expect(res.status).toBe(409);
  });

  it('POST /api/clientes con password débil responde 400', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Test', email: `weak${Date.now()}@test.com`, password: '1' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('statusCode', 400);
  });

  it('GET /api/clientes/:id de id inexistente responde 404', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .get('/api/clientes/99999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('PUT /api/clientes/:id con ADMIN actualiza 200', async () => {
    const token = makeToken('ADMIN');
    const createRes = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: `ParaEditar ${Date.now()}`, email: `edit${Date.now()}@test.com`, password: 'secret123' });
    const id = createRes.body.id;
    const putRes = await request(app)
      .put(`/api/clientes/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Editado' });
    expect(putRes.status).toBe(200);
    expect(putRes.body.nombre).toBe('Editado');
  });

  it('PATCH /api/clientes/:id/desactivar responde 200', async () => {
    const token = makeToken('ADMIN');
    const createRes = await request(app)
      .post('/api/clientes')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: `Inactivar ${Date.now()}`, email: `inact${Date.now()}@test.com`, password: 'secret123' });
    const id = createRes.body.id;
    const delRes = await request(app)
      .patch(`/api/clientes/${id}/desactivar`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(200);
    expect(delRes.body.activo).toBe(false);
  });

  it('ruta inexistente devuelve 404 via notFound handler', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('statusCode', 404);
  });
});