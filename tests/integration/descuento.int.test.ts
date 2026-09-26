import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { RequestContext } from '@mikro-orm/core';
import { closeDb, getOrm } from '../../src/config/db.js';
import { Usuario } from '../../src/modules/usuarios/entity/Usuario.js';
import jwt from 'jsonwebtoken';

let adminUserId = 1;

function makeToken(rol: string = 'ADMIN', userId: number = adminUserId): string {
  return jwt.sign({ sub: userId, rol }, 'test_secret_no_produccion_1234567890', { expiresIn: '7d' });
}

describe('CRUD Descuento (integración)', () => {
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
    });

    app = createApp();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('GET /api/descuentos sin token responde 200 (público)', async () => {
    const res = await request(app).get('/api/descuentos');
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('data');
    expect(res.body).toHaveProperty('total');
  });

  it('POST /api/descuentos sin token responde 401', async () => {
    const res = await request(app).post('/api/descuentos').send({ descripcion: 'Test', cantidadMinima: 1, porcentaje: 10 });
    expect(res.status).toBe(401);
  });

  it('POST /api/descuentos con CLIENTE responde 403', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app).post('/api/descuentos').set('Authorization', `Bearer ${token}`).send({ descripcion: 'Test', cantidadMinima: 1, porcentaje: 10 });
    expect(res.status).toBe(403);
  });

  it('POST /api/descuentos con ADMIN crea descuento 201', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app).post('/api/descuentos').set('Authorization', `Bearer ${token}`).send({ descripcion: 'Test', cantidadMinima: 1, porcentaje: 10 });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.descripcion).toBe('Test');
  });

  it('POST /api/descuentos con porcentaje inválido responde 400', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app).post('/api/descuentos').set('Authorization', `Bearer ${token}`).send({ descripcion: 'Test', cantidadMinima: 1, porcentaje: 150 });
    expect(res.status).toBe(400);
    expect(res.body).toHaveProperty('statusCode', 400);
  });

  it('POST /api/descuentos con cantidadMinima 0 responde 400', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app).post('/api/descuentos').set('Authorization', `Bearer ${token}`).send({ descripcion: 'Test', cantidadMinima: 0, porcentaje: 10 });
    expect(res.status).toBe(400);
  });

  it('POST /api/descuentos con descripcion vacía responde 400', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app).post('/api/descuentos').set('Authorization', `Bearer ${token}`).send({ descripcion: '', cantidadMinima: 1, porcentaje: 10 });
    expect(res.status).toBe(400);
  });

  it('POST /api/descuentos/:id/aplicaciones sin token responde 401', async () => {
    const res = await request(app).post('/api/descuentos/1/aplicaciones').send({ idProducto: 1, fechaDesde: '2026-01-01', fechaHasta: '2026-12-31' });
    expect(res.status).toBe(401);
  });

  it('POST /api/descuentos/:id/aplicaciones con ADMIN crea aplicación 201', async () => {
    const token = makeToken('ADMIN');
    const createRes = await request(app).post('/api/descuentos').set('Authorization', `Bearer ${token}`).send({ descripcion: 'Con Solapamiento', cantidadMinima: 1, porcentaje: 10 });
    const id = createRes.body.id;
    const res = await request(app).post(`/api/descuentos/${id}/aplicaciones`).set('Authorization', `Bearer ${token}`).send({ idProducto: 1, fechaDesde: '2026-01-01', fechaHasta: '2026-12-31' });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
  });

  it('GET /api/descuentos/:id responde 200 con aplicaciones', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app).get('/api/descuentos').set('Authorization', `Bearer ${token}`);
    const id = res.body.data[0]?.id;
    if (id) {
      const detail = await request(app).get(`/api/descuentos/${id}`).set('Authorization', `Bearer ${token}`);
      expect(detail.status).toBe(200);
      expect(detail.body).toHaveProperty('aplicaciones');
    }
  });

  it('DELETE /api/descuentos/:id/aplicaciones/:aplicacionId sin token responde 401', async () => {
    const res = await request(app).delete('/api/descuentos/1/aplicaciones/1');
    expect(res.status).toBe(401);
  });

  it('DELETE /api/descuentos/:id con ADMIN responde 204', async () => {
    const token = makeToken('ADMIN');
    const createRes = await request(app).post('/api/descuentos').set('Authorization', `Bearer ${token}`).send({ descripcion: `ParaBorrar ${Date.now()}`, cantidadMinima: 1, porcentaje: 10 });
    const id = createRes.body.id;
    const delRes = await request(app).delete(`/api/descuentos/${id}`).set('Authorization', `Bearer ${token}`);
    expect(delRes.status).toBe(204);
  });
});
