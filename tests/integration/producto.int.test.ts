import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { closeDb, getOrm } from '../../src/config/db.js';
import { RequestContext } from '@mikro-orm/core';
import { Usuario } from '../../src/modules/usuarios/entity/Usuario.js';
import { Marca } from '../../src/modules/marcas/entity/Marca.js';
import { TipoProducto } from '../../src/modules/tipos-producto/entity/TipoProducto.js';
import { Proveedor } from '../../src/modules/proveedores/entity/Proveedor.js';
import jwt from 'jsonwebtoken';

let adminUserId = 1;
let cuitCounter = 100000000;
let marcaId = 1;
let tipoProductoId = 1;
let proveedorId = 1;
let productoId = 1;

function makeToken(rol: string = 'ADMIN', userId: number = adminUserId): string {
  return jwt.sign({ sub: userId, rol }, 'test_secret_no_produccion_1234567890', { expiresIn: '7d' });
}
function makeCuit(): string {
  return String(cuitCounter++).padStart(11, '0');
}

describe('CRUD Producto (integración)', () => {
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

      const marca = new Marca();
      marca.nombre = `Marca Test ${Date.now()}`;
      marca.activo = true;
      const createdMarca = getOrm().em.create(Marca, marca);
      await getOrm().em.flush();
      marcaId = createdMarca.id;

      const tipo = new TipoProducto();
      tipo.nombre = `Tipo Test ${Date.now()}`;
      tipo.activo = true;
      const createdTipo = getOrm().em.create(TipoProducto, tipo);
      await getOrm().em.flush();
      tipoProductoId = createdTipo.id;

      const proveedor = new Proveedor();
      proveedor.razonSocial = `Proveedor Test ${Date.now()}`;
      proveedor.cuit = makeCuit();
      proveedor.activo = true;
      const createdProv = getOrm().em.create(Proveedor, proveedor);
      await getOrm().em.flush();
      proveedorId = createdProv.id;
    });

    app = createApp();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('GET /api/productos/admin sin token responde 401', async () => {
    const res = await request(app).get('/api/productos/admin');
    expect(res.status).toBe(401);
  });

  it('GET /api/productos/admin con CLIENTE responde 403', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app)
      .get('/api/productos/admin')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('POST /api/productos sin token responde 401', async () => {
    const res = await request(app)
      .post('/api/productos')
      .send({ nombre: 'X', stockInicial: 0, precioUnitario: '10.00', idTipoProducto: 1, idMarca: 1 });
    expect(res.status).toBe(401);
  });

  it('POST /api/productos con CLIENTE responde 403', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({ nombre: 'X', stockInicial: 0, precioUnitario: '10.00', idTipoProducto: 1, idMarca: 1 });
    expect(res.status).toBe(403);
  });

  it('POST /api/productos con ADMIN crea producto 201', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: `Producto Test ${Date.now()}`, stockInicial: 10, precioUnitario: '1500.00',
        idTipoProducto: tipoProductoId, idMarca: marcaId,
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.stock).toBe(10);
    expect(res.body.precioUnitario).toBe('1500.00');
    productoId = res.body.id;
  });

  it('POST /api/productos con idTipoProducto inexistente responde 404', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'X', stockInicial: 0, precioUnitario: '10.00', idTipoProducto: 99999, idMarca: marcaId,
      });
    expect(res.status).toBe(404);
  });

  it('POST /api/productos con idMarca inexistente responde 404', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'X', stockInicial: 0, precioUnitario: '10.00', idTipoProducto: tipoProductoId, idMarca: 99999,
      });
    expect(res.status).toBe(404);
  });

  it('POST /api/productos con precio <= 0 responde 400', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'X', stockInicial: 0, precioUnitario: '0.00', idTipoProducto: tipoProductoId, idMarca: marcaId,
      });
    expect(res.status).toBe(400);
  });

  it('POST /api/productos con stockInicial < 0 responde 400', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'X', stockInicial: -1, precioUnitario: '10.00', idTipoProducto: tipoProductoId, idMarca: marcaId,
      });
    expect(res.status).toBe(400);
  });

  it('GET /api/productos/:id inactivo responde 404 (público)', async () => {
    const token = makeToken('ADMIN');
    await request(app)
      .delete(`/api/productos/admin/${productoId}`)
      .set('Authorization', `Bearer ${token}`);
    const res = await request(app).get(`/api/productos/${productoId}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/productos/admin/:id inactivo responde 200 (admin)', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .get(`/api/productos/admin/${productoId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.activo).toBe(false);
  });

  it('PUT /api/productos/admin/:id con stock en body no modifica stock', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .put(`/api/productos/admin/${productoId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ stock: 999 });
    expect(res.status).toBe(200);
    expect(res.body.stock).not.toBe(999);
  });

  it('DELETE /api/productos/admin/:id con ADMIN responde 204', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .delete(`/api/productos/admin/${productoId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);
  });
});
