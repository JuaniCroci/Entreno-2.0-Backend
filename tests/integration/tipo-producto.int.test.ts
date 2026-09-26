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

describe('CRUD Tipo de producto (integración)', () => {
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

  it('GET /api/tipos-producto sin token responde 200 (público)', async () => {
    const res = await request(app).get('/api/tipos-producto');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
  });

  it('POST /api/tipos-producto sin token responde 401', async () => {
    const res = await request(app)
      .post('/api/tipos-producto')
      .send({ nombre: 'Test Tipo' });
    expect(res.status).toBe(401);
  });

  it('POST /api/tipos-producto con CLIENTE responde 403', async () => {
    const token = makeToken('CLIENTE', clienteUserId);
    const res = await request(app)
      .post('/api/tipos-producto')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Test Tipo' });
    expect(res.status).toBe(403);
  });

  it('POST /api/tipos-producto con ADMIN crea tipo 201', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/tipos-producto')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: `Tipo Test ${Date.now()}` });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.nombre).toBeTruthy();
  });

  it('POST /api/tipos-producto con nombre vacío responde 400', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/tipos-producto')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('statusCode', 400);
  });

  it('POST /api/tipos-producto con nombre duplicado responde 409', async () => {
    const token = makeToken('ADMIN');
    const name = `Duplicado ${Date.now()}`;
    await request(app)
      .post('/api/tipos-producto')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: name });
    const res = await request(app)
      .post('/api/tipos-producto')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: name });
    expect(res.status).toBe(409);
  });

  it('GET /api/tipos-producto/:id de id inexistente responde 404', async () => {
    const res = await request(app).get('/api/tipos-producto/99999');
    expect(res.status).toBe(404);
  });

  it('DELETE /api/tipos-producto/:id sin token responde 401', async () => {
    const res = await request(app).delete('/api/tipos-producto/1');
    expect(res.status).toBe(401);
  });

  it('DELETE /api/tipos-producto/:id con ADMIN responde 204', async () => {
    const token = makeToken('ADMIN');
    const createRes = await request(app)
      .post('/api/tipos-producto')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: `ParaBorrar ${Date.now()}` });
    const id = createRes.body.id;
    const delRes = await request(app)
      .delete(`/api/tipos-producto/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(204);
  });

  it('GET /api/tipos-producto/:id con tipo inactivo responde 404', async () => {
    const token = makeToken('ADMIN');
    const createRes = await request(app)
      .post('/api/tipos-producto')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: `Inactivo ${Date.now()}` });
    const id = createRes.body.id;
    await request(app)
      .delete(`/api/tipos-producto/${id}`)
      .set('Authorization', `Bearer ${token}`);
    const res = await request(app).get(`/api/tipos-producto/${id}`);
    expect(res.status).toBe(404);
  });

  it('ruta inexistente devuelve 404 via notFound handler', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('statusCode', 404);
  });
});