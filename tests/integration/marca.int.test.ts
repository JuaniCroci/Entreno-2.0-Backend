import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { RequestContext } from '@mikro-orm/core';
import { closeDb, getOrm } from '../../src/config/db.js';
import { Usuario, Rol } from '../../src/modules/usuarios/entity/Usuario.js';
import jwt from 'jsonwebtoken';

let adminUserId = 1;
let clienteUserId = 1;

function makeToken(rol: string = 'ADMIN', userId: number = adminUserId): string {
  return jwt.sign({ sub: userId, rol }, 'test_secret_no_produccion_1234567890', { expiresIn: '7d' });
}

describe('CRUD Marca (integración)', () => {
  let app: Express;

  beforeAll(async () => {
    try {
      await getOrm().getSchemaGenerator().createSchema();
    } catch {
      // schema ya existe
    }

    await RequestContext.create(getOrm().em, async () => {
      const admin = await getOrm().em.findOne(Usuario, { email: 'admin@entreno.com' });
      if (admin) {
        adminUserId = admin.id;
      }
      const cliente = await getOrm().em.findOne(Usuario, { email: 'cliente@test.local' });
      if (!cliente) {
        const { UsuarioService } = await import('../../src/modules/usuarios/service/UsuarioService.js');
        const service = new UsuarioService();
        const c = await service.create({
          nombre: 'Cliente Test',
          email: 'cliente@test.local',
          password: 'secret123',
          rol: Rol.CLIENTE,
        });
        await getOrm().em.flush();
        clienteUserId = c.id;
      } else {
        clienteUserId = cliente.id;
      }
    });

    app = createApp();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('GET /api/marcas sin token responde 200 (público)', async () => {
    const res = await request(app).get('/api/marcas');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
  });

  it('POST /api/marcas sin token responde 401', async () => {
    const res = await request(app)
      .post('/api/marcas')
      .send({ nombre: 'Test Marca' });
    expect(res.status).toBe(401);
  });

  it('POST /api/marcas con CLIENTE responde 403', async () => {
    const token = makeToken('CLIENTE', clienteUserId);
    const res = await request(app)
      .post('/api/marcas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'Test Marca' });
    expect(res.status).toBe(403);
  });

  it('POST /api/marcas con ADMIN crea marca 201', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/marcas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: `Marca Test ${Date.now()}` });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.nombre).toBeTruthy();
  });

  it('POST /api/marcas con nombre vacío responde 400', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/marcas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: '' });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('statusCode', 400);
  });

  it('POST /api/marcas con nombre duplicado responde 409', async () => {
    const token = makeToken('ADMIN');
    const name = `Duplicado ${Date.now()}`;
    await request(app)
      .post('/api/marcas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: name });
    const res = await request(app)
      .post('/api/marcas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: name });
    expect(res.status).toBe(409);
  });

  it('GET /api/marcas/:id de id inexistente responde 404', async () => {
    const res = await request(app).get('/api/marcas/99999');
    expect(res.status).toBe(404);
  });

  it('DELETE /api/marcas/:id sin token responde 401', async () => {
    const res = await request(app).delete('/api/marcas/1');
    expect(res.status).toBe(401);
  });

  it('DELETE /api/marcas/:id con ADMIN responde 204', async () => {
    const token = makeToken('ADMIN');
    const createRes = await request(app)
      .post('/api/marcas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: `ParaBorrar ${Date.now()}` });
    const id = createRes.body.id;
    const delRes = await request(app)
      .delete(`/api/marcas/${id}`)
      .set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(204);
  });

  it('GET /api/marcas/:id con marca inactiva responde 404', async () => {
    const token = makeToken('ADMIN');
    const createRes = await request(app)
      .post('/api/marcas')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: `Inactiva ${Date.now()}` });
    const id = createRes.body.id;
    await request(app)
      .delete(`/api/marcas/${id}`)
      .set('Authorization', `Bearer ${token}`);
    const res = await request(app).get(`/api/marcas/${id}`);
    expect(res.status).toBe(404);
  });

  it('ruta inexistente devuelve 404 via notFound handler', async () => {
    const res = await request(app).get('/api/nonexistent');
    expect(res.status).toBe(404);
    expect(res.body).toHaveProperty('statusCode', 404);
  });
});