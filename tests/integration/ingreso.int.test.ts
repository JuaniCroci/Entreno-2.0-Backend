import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { RequestContext } from '@mikro-orm/core';
import { closeDb, getOrm } from '../../src/config/db.js';
import { Usuario, Rol } from '../../src/modules/usuarios/entity/Usuario.js';
import { Producto } from '../../src/modules/productos/entity/Producto.js';
import jwt from 'jsonwebtoken';
import { hash } from 'bcryptjs';

let adminUserId = 1;
let clienteUserId = 1;
let proveedorId = 0;
let productoAId = 0;
let productoBId = 0;
let stockAInicial = 0;
let stockBInicial = 0;
let ingresoId = 0;
const nroBase = `ING-${Date.now()}`;

function makeToken(rol: string = 'ADMIN', userId: number = adminUserId): string {
  return jwt.sign({ sub: userId, rol }, 'test_secret_no_produccion_1234567890', {
    expiresIn: '7d',
  });
}

describe('CRUD Ingreso (integración)', () => {
  let app: Express;
  let adminToken: string;

  async function getStock(id: number): Promise<number> {
    const res = await request(app).get(`/api/productos/${id}`);
    expect(res.status).toBe(200);
    return res.body.stock;
  }

  beforeAll(async () => {
    try {
      await getOrm().getSchemaGenerator().updateSchema({ safe: true });
    } catch {
      // schema ya existe
    }

    await RequestContext.create(getOrm().em, async () => {
      const admin = await getOrm().em.findOne(Usuario, { rol: Rol.ADMIN, activo: true });
      if (admin) adminUserId = admin.id;
      const cliente = await getOrm().em.findOne(Usuario, { email: 'cliente@test.local' });
      if (cliente) {
        clienteUserId = cliente.id;
      } else {
        const passwordHash = await hash('secret123', 10);
        const created = getOrm().em.create(Usuario, {
          nombre: 'Cliente Test',
          email: 'cliente@test.local',
          passwordHash,
          rol: Rol.CLIENTE,
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await getOrm().em.flush();
        clienteUserId = created.id;
      }
    });

    app = createApp();
    adminToken = makeToken('ADMIN', adminUserId);

    const marcaRes = await request(app)
      .post('/api/marcas')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: `Marca Ing ${Date.now()}` });
    expect(marcaRes.status).toBe(201);

    const tipoRes = await request(app)
      .post('/api/tipos-producto')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ nombre: `Tipo Ing ${Date.now()}` });
    expect(tipoRes.status).toBe(201);

    const productoARes = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: `Producto Ing A ${Date.now()}`,
        stockInicial: 7,
        precioUnitario: '100.00',
        idTipoProducto: tipoRes.body.id,
        idMarca: marcaRes.body.id,
      });
    expect(productoARes.status).toBe(201);
    productoAId = productoARes.body.id;
    stockAInicial = productoARes.body.stock;

    const productoBRes = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nombre: `Producto Ing B ${Date.now()}`,
        stockInicial: 11,
        precioUnitario: '50.00',
        idTipoProducto: tipoRes.body.id,
        idMarca: marcaRes.body.id,
      });
    expect(productoBRes.status).toBe(201);
    productoBId = productoBRes.body.id;
    stockBInicial = productoBRes.body.stock;

    const proveedorRes = await request(app)
      .post('/api/proveedores')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        razonSocial: `Distribuidora Ing ${Date.now()}`,
        cuit: `20${String(Date.now()).slice(-9)}`,
      });
    expect(proveedorRes.status).toBe(201);
    proveedorId = proveedorRes.body.id;
  });

  afterAll(async () => {
    await closeDb();
  });

  it('GET /api/ingresos sin token responde 401', async () => {
    const res = await request(app).get('/api/ingresos');
    expect(res.status).toBe(401);
  });

  it('GET /api/ingresos con CLIENTE responde 403', async () => {
    const res = await request(app)
      .get('/api/ingresos')
      .set('Authorization', `Bearer ${makeToken('CLIENTE', clienteUserId)}`);
    expect(res.status).toBe(403);
  });

  it('POST /api/ingresos sin token responde 401', async () => {
    const res = await request(app).post('/api/ingresos').send({ nroIngreso: 'x' });
    expect(res.status).toBe(401);
  });

  it('POST /api/ingresos con CLIENTE responde 403', async () => {
    const res = await request(app)
      .post('/api/ingresos')
      .set('Authorization', `Bearer ${makeToken('CLIENTE', clienteUserId)}`)
      .send({ nroIngreso: 'x' });
    expect(res.status).toBe(403);
  });

  it('alta con 2 productos → 201, importe calculado en server y stock sube', async () => {
    const res = await request(app)
      .post('/api/ingresos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nroIngreso: nroBase,
        idProveedor: proveedorId,
        importeTotal: '9999.00',
        lineas: [
          { idProducto: productoAId, cantidad: 3, precioUnitario: '10.50' },
          { idProducto: productoBId, cantidad: 2, precioUnitario: '2.25' },
        ],
      });

    expect(res.status).toBe(201);
    expect(res.body.importeTotal).toBe('36.00');
    expect(res.body.estado).toBe('REGISTRADO');
    expect(res.body.proveedor.id).toBe(proveedorId);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0]).toMatchObject({
      idProducto: productoAId,
      cantidad: 3,
      precioUnitario: '10.50',
      importeLinea: '31.50',
    });
    expect(res.body.items[1]).toMatchObject({
      idProducto: productoBId,
      cantidad: 2,
      precioUnitario: '2.25',
      importeLinea: '4.50',
    });
    ingresoId = res.body.id;

    expect(await getStock(productoAId)).toBe(stockAInicial + 3);
    expect(await getStock(productoBId)).toBe(stockBInicial + 2);
  });

  it('GET /api/ingresos/:id devuelve detalle con líneas y nombre de producto', async () => {
    const res = await request(app)
      .get(`/api/ingresos/${ingresoId}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.nroIngreso).toBe(nroBase);
    expect(res.body.items).toHaveLength(2);
    expect(res.body.items[0].producto).toMatchObject({ id: productoAId });
    expect(res.body.items[0].producto.nombre).toBeTruthy();
  });

  it('POST /api/ingresos con nroIngreso duplicado responde 409', async () => {
    const res = await request(app)
      .post('/api/ingresos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nroIngreso: nroBase,
        idProveedor: proveedorId,
        lineas: [{ idProducto: productoAId, cantidad: 1, precioUnitario: '10.00' }],
      });
    expect(res.status).toBe(409);
  });

  it('POST /api/ingresos con dos líneas del mismo producto responde 400', async () => {
    const res = await request(app)
      .post('/api/ingresos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nroIngreso: `${nroBase}-dup`,
        idProveedor: proveedorId,
        lineas: [
          { idProducto: productoAId, cantidad: 1, precioUnitario: '10.00' },
          { idProducto: productoAId, cantidad: 2, precioUnitario: '10.00' },
        ],
      });
    expect(res.status).toBe(400);
  });

  it('listado ?estado=REGISTRADO incluye el ingreso y ?estado=ANULADO no', async () => {
    const registrados = await request(app)
      .get('/api/ingresos?estado=REGISTRADO')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(registrados.status).toBe(200);
    expect(registrados.body).toHaveProperty('data');
    expect(registrados.body).toHaveProperty('total');
    expect(
      registrados.body.data.some((i: { nroIngreso: string }) => i.nroIngreso === nroBase),
    ).toBe(true);

    const anulados = await request(app)
      .get('/api/ingresos?estado=ANULADO')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(anulados.status).toBe(200);
    expect(anulados.body.data.some((i: { nroIngreso: string }) => i.nroIngreso === nroBase)).toBe(
      false,
    );
  });

  it('POST /:id/anular → 200, estado ANULADO y el stock vuelve al inicial', async () => {
    const res = await request(app)
      .post(`/api/ingresos/${ingresoId}/anular`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('ANULADO');
    expect(res.body.id).toBe(ingresoId);

    expect(await getStock(productoAId)).toBe(stockAInicial);
    expect(await getStock(productoBId)).toBe(stockBInicial);
  });

  it('listado ?estado=ANULADO incluye el ingreso anulado', async () => {
    const res = await request(app)
      .get('/api/ingresos?estado=ANULADO')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(200);
    expect(res.body.data.some((i: { id: number }) => i.id === ingresoId)).toBe(true);
  });

  it('anular dos veces responde 409', async () => {
    const res = await request(app)
      .post(`/api/ingresos/${ingresoId}/anular`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);
  });

  it('anular con stock insuficiente responde 409 y no cambia el estado', async () => {
    const nro = `${nroBase}-stock`;
    const alta = await request(app)
      .post('/api/ingresos')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        nroIngreso: nro,
        idProveedor: proveedorId,
        lineas: [{ idProducto: productoAId, cantidad: 5, precioUnitario: '10.00' }],
      });
    expect(alta.status).toBe(201);

    await RequestContext.create(getOrm().em, async () => {
      const producto = await getOrm().em.findOne(Producto, { id: productoAId });
      expect(producto).not.toBeNull();
      producto!.stock = 2;
      await getOrm().em.flush();
    });

    const res = await request(app)
      .post(`/api/ingresos/${alta.body.id}/anular`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(409);

    const detalle = await request(app)
      .get(`/api/ingresos/${alta.body.id}`)
      .set('Authorization', `Bearer ${adminToken}`);
    expect(detalle.status).toBe(200);
    expect(detalle.body.estado).toBe('REGISTRADO');
    expect(await getStock(productoAId)).toBe(2);
  });

  it('GET /api/ingresos/:id inexistente responde 404', async () => {
    const res = await request(app)
      .get('/api/ingresos/999999')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(404);
  });

  it('GET /api/ingresos?desde posterior a ?hasta responde 400', async () => {
    const res = await request(app)
      .get('/api/ingresos?desde=2026-12-31&hasta=2026-01-01')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(res.status).toBe(400);
  });
});
