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
let cuitCounter = 100000000;

function makeToken(rol: string = 'ADMIN', userId: number = adminUserId): string {
  return jwt.sign({ sub: userId, rol }, 'test_secret_no_produccion_1234567890', { expiresIn: '7d' });
}

function makeCuit(): string {
  return String(cuitCounter++).padStart(11, '0');
}

describe('CRUD Proveedor (integración)', () => {
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

  it('GET /api/proveedores sin token responde 401', async () => {
    const res = await request(app).get('/api/proveedores');
    expect(res.status).toBe(401);
  });

  it('GET /api/proveedores con CLIENTE responde 403', async () => {
    const token = makeToken('CLIENTE', clienteUserId);
    const res = await request(app)
      .get('/api/proveedores')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('GET /api/proveedores con ADMIN responde 200', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .get('/api/proveedores')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
  });

  it('POST /api/proveedores sin token responde 401', async () => {
    const res = await request(app)
      .post('/api/proveedores')
      .send({ razonSocial: 'Test SA', cuit: '20123456789' });
    expect(res.status).toBe(401);
  });

  it('POST /api/proveedores con CLIENTE responde 403', async () => {
    const token = makeToken('CLIENTE', clienteUserId);
    const res = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${token}`)
      .send({ razonSocial: 'Test SA', cuit: '20123456789' });
    expect(res.status).toBe(403);
  });

  it('POST /api/proveedores con ADMIN crea proveedor 201', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${token}`)
      .send({ razonSocial: `Proveedor Test ${Date.now()}`, cuit: makeCuit() });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.razonSocial).toBeTruthy();
  });

  it('POST /api/proveedores con CUIT inválido responde 400', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${token}`)
      .send({ razonSocial: 'Test SA', cuit: '123' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('statusCode', 400);
  });

  it('POST /api/proveedores con CUIT duplicado responde 409', async () => {
    const token = makeToken('ADMIN');
    const cuit = makeCuit();
    await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${token}`)
      .send({ razonSocial: 'Dup SA', cuit });
    const res = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${token}`)
      .send({ razonSocial: 'Dup2 SA', cuit });
    expect(res.status).toBe(409);
  });

  it('GET /api/proveedores/:id de id inexistente responde 404', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .get('/api/proveedores/99999')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('PUT /api/proveedores/:id con ADMIN actualiza 200', async () => {
    const token = makeToken('ADMIN');
    const createRes = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${token}`)
      .send({ razonSocial: `ParaEditar ${Date.now()}`, cuit: makeCuit() });
    const id = createRes.body.id;
    const putRes = await request(app)
      .put(`/api/proveedores/${id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ razonSocial: 'Editado SA' });
    expect(putRes.status).toBe(200);
    expect(putRes.body.razonSocial).toBe('Editado SA');
  });

  it('DELETE /api/proveedores/:id con ADMIN responde 204', async () => {
    const token = makeToken('ADMIN');
    const createRes = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${token}`)
      .send({ razonSocial: `ParaBorrar ${Date.now()}`, cuit: makeCuit() });
    const id = createRes.body.id;
    const delRes = await request(app)
      .delete(`/api/proveedores/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(204);
  });

  it('GET /api/proveedores/:id inactivo responde 404', async () => {
    const token = makeToken('ADMIN');
    const createRes = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${token}`)
      .send({ razonSocial: `Inactivo ${Date.now()}`, cuit: makeCuit() });
    const id = createRes.body.id;
    await request(app)
      .delete(`/api/proveedores/${id}`)
      .set('Authorization', `Bearer ${token}`);
    const res = await request(app)
      .get(`/api/proveedores/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('ruta inexistente devuelve 404 via notFound handler', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('statusCode', 404);
  });
});