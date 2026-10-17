import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { closeDb, getOrm } from '../../src/config/db.js';
import { RequestContext } from '@mikro-orm/core';
import { Usuario } from '../../src/modules/usuarios/entity/Usuario.js';
import { Carrito } from '../../src/modules/carritos/entity/Carrito.js';
import { CarritoItem } from '../../src/modules/carritos/entity/CarritoItem.js';
import { Producto } from '../../src/modules/productos/entity/Producto.js';
import { Pedido } from '../../src/modules/pedidos/entity/Pedido.js';
import { PedidoItem } from '../../src/modules/pedidos/entity/PedidoItem.js';
import { HistorialEstado } from '../../src/modules/pedidos/entity/HistorialEstado.js';
import { Marca } from '../../src/modules/marcas/entity/Marca.js';
import { TipoProducto } from '../../src/modules/tipos-producto/entity/TipoProducto.js';
import jwt from 'jsonwebtoken';
import { hash } from 'bcryptjs';

let adminUserId = 1;
let clienteUserId = 1;
let clienteBUserId = 1;
let clienteCUserId = 1;
let productoOkId = 0;
let productoOk2Id = 0;
let productoInactivoId = 0;
let itemId = 0;
let pedidoId = 0;

function makeToken(rol: string = 'CLIENTE', userId: number = clienteUserId): string {
  return jwt.sign({ sub: userId, rol }, 'test_secret_no_produccion_1234567890', {
    expiresIn: '7d',
  });
}

describe('Carrito (011)', () => {
  let app: Express;
  let carritoIdCreado = 0;

  beforeAll(async () => {
    try {
      await getOrm().getSchemaGenerator().updateSchema({ safe: true });
    } catch {
      // schema ya existe
    }

    await RequestContext.create(getOrm().em, async () => {
      const em = getOrm().em;
      const admin = await em.findOne(Usuario, { email: 'admin@entreno.com' });
      if (admin) adminUserId = admin.id;

      const existingCliente = await em.findOne(Usuario, { email: 'cliente@test.local' });
      if (existingCliente) {
        clienteUserId = existingCliente.id;
      } else {
        const passwordHash = await hash('secret123', 10);
        const cliente = em.create(Usuario, {
          nombre: 'Cliente Test',
          email: 'cliente@test.local',
          passwordHash,
          rol: 'CLIENTE',
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await em.flush();
        clienteUserId = cliente.id;
      }

      const existingClienteB = await em.findOne(Usuario, { email: 'cliente-b@test.local' });
      if (existingClienteB) {
        clienteBUserId = existingClienteB.id;
      } else {
        const passwordHash = await hash('secret123', 10);
        const clienteB = em.create(Usuario, {
          nombre: 'Cliente B Test',
          email: 'cliente-b@test.local',
          passwordHash,
          rol: 'CLIENTE',
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await em.flush();
        clienteBUserId = clienteB.id;
      }

      const existingClienteC = await em.findOne(Usuario, { email: 'cliente-c@test.local' });
      if (existingClienteC) {
        clienteCUserId = existingClienteC.id;
      } else {
        const passwordHash = await hash('secret123', 10);
        const clienteC = em.create(Usuario, {
          nombre: 'Cliente C Test',
          email: 'cliente-c@test.local',
          passwordHash,
          rol: 'CLIENTE',
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await em.flush();
        clienteCUserId = clienteC.id;
      }

      const now = new Date();
      const marca = em.create(Marca, {
        nombre: `Marca Carrito ${Date.now()}`,
        activo: true,
        createdAt: now,
        updatedAt: now,
      });
      const tipo = em.create(TipoProducto, {
        nombre: `Tipo Carrito ${Date.now()}`,
        activo: true,
        createdAt: now,
        updatedAt: now,
      });
      await em.flush();

      const productoOk = em.create(Producto, {
        nombre: `Producto Carrito Ok ${Date.now()}`,
        descripcion: null,
        precioUnitario: '25.50',
        stock: 100,
        activo: true,
        tipoProducto: tipo,
        marca,
        proveedor: null,
        createdAt: now,
        updatedAt: now,
      });
      const productoInactivo = em.create(Producto, {
        nombre: `Producto Carrito Inactivo ${Date.now()}`,
        descripcion: null,
        precioUnitario: '10.00',
        stock: 10,
        activo: false,
        tipoProducto: tipo,
        marca,
        proveedor: null,
        createdAt: now,
        updatedAt: now,
      });
      const productoOk2 = em.create(Producto, {
        nombre: `Producto Carrito Ok2 ${Date.now()}`,
        descripcion: null,
        precioUnitario: '10.00',
        stock: 50,
        activo: true,
        tipoProducto: tipo,
        marca,
        proveedor: null,
        createdAt: now,
        updatedAt: now,
      });
      await em.flush();
      productoOkId = productoOk.id;
      productoInactivoId = productoInactivo.id;
      productoOk2Id = productoOk2.id;

      for (const usuarioId of [clienteUserId, clienteBUserId, clienteCUserId, adminUserId]) {
        const carritos = await em.find(Carrito, { usuario: usuarioId });
        const ids = carritos.map((c) => c.id);
        if (ids.length > 0) {
          await em.nativeDelete(CarritoItem, { carrito: ids });
        }
        await em.nativeDelete(Carrito, { usuario: usuarioId });

        const pedidos = await em.find(Pedido, { usuario: usuarioId });
        const pedidoIds = pedidos.map((p) => p.id);
        if (pedidoIds.length > 0) {
          await em.nativeDelete(HistorialEstado, { pedido: pedidoIds });
          await em.nativeDelete(PedidoItem, { pedido: pedidoIds });
        }
        await em.nativeDelete(Pedido, { usuario: usuarioId });
      }
    });

    app = createApp();
  });

  afterAll(async () => {
    await closeDb();
  });

  it('GET /api/carrito sin token responde 401', async () => {
    const res = await request(app).get('/api/carrito');
    expect(res.status).toBe(401);
  });

  it('POST /api/carrito sin token responde 401', async () => {
    const res = await request(app).post('/api/carrito');
    expect(res.status).toBe(401);
  });

  it('GET /api/carrito sin carrito activo responde 404 y no crea', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app).get('/api/carrito').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);

    const segunda = await request(app).get('/api/carrito').set('Authorization', `Bearer ${token}`);
    expect(segunda.status).toBe(404);
  });

  it('POST /api/carrito crea el carrito activo con 201 y vista vacía', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app).post('/api/carrito').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body).toEqual({
      id: expect.any(Number),
      estado: 'ACTIVO',
      items: [],
      total: '0.00',
    });
    carritoIdCreado = res.body.id;
  });

  it('POST /api/carrito es idempotente: devuelve el mismo con 200', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app).post('/api/carrito').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(carritoIdCreado);
    expect(res.body.estado).toBe('ACTIVO');
  });

  it('GET /api/carrito devuelve el carrito activo con 200', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app).get('/api/carrito').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(carritoIdCreado);
    expect(res.body).toEqual(
      expect.objectContaining({ estado: 'ACTIVO', items: [], total: '0.00' }),
    );
  });

  it('ADMIN también puede crear su propio carrito (201)', async () => {
    const token = makeToken('ADMIN', adminUserId);
    const res = await request(app).post('/api/carrito').set('Authorization', `Bearer ${token}`);
    expect([200, 201]).toContain(res.status);
    expect(res.body.estado).toBe('ACTIVO');
  });

  it('POST /api/carrito/items agrega línea con 201, subtotales y total', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ idProducto: productoOkId, cantidad: 2 });
    expect(res.status).toBe(201);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toEqual({
      id: expect.any(Number),
      producto: { id: productoOkId, nombre: expect.any(String), precioUnitario: '25.50' },
      cantidad: 2,
      subtotal: '51.00',
    });
    expect(res.body.total).toBe('51.00');
    itemId = res.body.items[0].id;
  });

  it('POST /api/carrito/items de nuevo incrementa la línea (200, no duplica)', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ idProducto: productoOkId, cantidad: 3 });
    expect(res.status).toBe(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0].cantidad).toBe(5);
    expect(res.body.total).toBe('127.50');
  });

  it('POST /api/carrito/items con producto inexistente responde 404', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ idProducto: 999999, cantidad: 1 });
    expect(res.status).toBe(404);
  });

  it('POST /api/carrito/items con producto inactivo responde 400', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ idProducto: productoInactivoId, cantidad: 1 });
    expect(res.status).toBe(400);
  });

  it('POST /api/carrito/items con cantidad que excede el stock responde 409', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ idProducto: productoOkId, cantidad: 500 });
    expect(res.status).toBe(409);
  });

  it('PUT /api/carrito/items/:id cambia la cantidad con 200', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app)
      .put(`/api/carrito/items/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cantidad: 4 });
    expect(res.status).toBe(200);
    expect(res.body.items[0].cantidad).toBe(4);
    expect(res.body.total).toBe('102.00');
  });

  it('PUT /api/carrito/items/:id con cantidad que excede el stock responde 409', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app)
      .put(`/api/carrito/items/${itemId}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ cantidad: 999 });
    expect(res.status).toBe(409);
  });

  it('DELETE /api/carrito/items/:id responde 204 y quita la línea', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app)
      .delete(`/api/carrito/items/${itemId}`)
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(204);

    const get = await request(app).get('/api/carrito').set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(200);
    expect(get.body.items).toHaveLength(0);
    expect(get.body.total).toBe('0.00');
  });

  it('CLIENTE A no puede operar los items de CLIENTE B (404)', async () => {
    const tokenB = makeToken('CLIENTE', clienteBUserId);
    const crear = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${tokenB}`)
      .send({ idProducto: productoOkId, cantidad: 1 });
    expect(crear.status).toBe(201);
    const itemBId = crear.body.items[0].id;

    const tokenA = makeToken('CLIENTE', clienteUserId);
    const put = await request(app)
      .put(`/api/carrito/items/${itemBId}`)
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ cantidad: 9 });
    expect(put.status).toBe(404);

    const del = await request(app)
      .delete(`/api/carrito/items/${itemBId}`)
      .set('Authorization', `Bearer ${tokenA}`);
    expect(del.status).toBe(404);

    const getB = await request(app).get('/api/carrito').set('Authorization', `Bearer ${tokenB}`);
    expect(getB.status).toBe(200);
    expect(getB.body.items).toHaveLength(1);
    expect(getB.body.items[0].cantidad).toBe(1);
  });

  it('POST /api/carrito/confirmar sin carrito responde 404', async () => {
    const token = makeToken('CLIENTE', clienteCUserId);
    const res = await request(app)
      .post('/api/carrito/confirmar')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(404);
  });

  it('POST /api/carrito/confirmar con carrito vacío responde 400', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app)
      .post('/api/carrito/confirmar')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(400);
  });

  it('flujo completo: agrega 2 productos → confirma → 200 con pedido, stock y historial', async () => {
    const token = makeToken('CLIENTE');
    const agregar1 = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ idProducto: productoOkId, cantidad: 2 });
    expect(agregar1.status).toBe(201);
    const agregar2 = await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ idProducto: productoOk2Id, cantidad: 3 });
    expect(agregar2.status).toBe(201);

    const res = await request(app)
      .post('/api/carrito/confirmar')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        id: expect.any(Number),
        fecha: expect.any(String),
        estado: 'REALIZADO',
        importeTotal: '81.00',
        usuario: { id: clienteUserId, nombre: 'Cliente Test', email: 'cliente@test.local' },
        items: [
          {
            id: expect.any(Number),
            producto: { id: productoOkId, nombre: expect.any(String) },
            cantidad: 2,
            precioUnitario: '25.50',
            subtotal: '51.00',
            descuentoAplicado: null,
          },
          {
            id: expect.any(Number),
            producto: { id: productoOk2Id, nombre: expect.any(String) },
            cantidad: 3,
            precioUnitario: '10.00',
            subtotal: '30.00',
            descuentoAplicado: null,
          },
        ],
      }),
    );
    pedidoId = res.body.id;

    await RequestContext.create(getOrm().em, async () => {
      const em = getOrm().em;
      const prod1 = await em.findOne(Producto, productoOkId);
      const prod2 = await em.findOne(Producto, productoOk2Id);
      expect(prod1?.stock).toBe(98);
      expect(prod2?.stock).toBe(47);

      const pedidos = await em.find(Pedido, { usuario: clienteUserId });
      expect(pedidos).toHaveLength(1);

      const historial = await em.find(HistorialEstado, { pedido: pedidos[0]?.id ?? -1 });
      expect(historial).toHaveLength(1);
      expect(historial[0]?.estado).toBe('REALIZADO');
    });
  });

  it('tras confirmar: GET responde 404 y otro confirmar responde 409 sin duplicar pedidos', async () => {
    const token = makeToken('CLIENTE');
    const get = await request(app).get('/api/carrito').set('Authorization', `Bearer ${token}`);
    expect(get.status).toBe(404);

    const denuevo = await request(app)
      .post('/api/carrito/confirmar')
      .set('Authorization', `Bearer ${token}`);
    expect(denuevo.status).toBe(409);

    await RequestContext.create(getOrm().em, async () => {
      const total = await getOrm().em.count(Pedido, { usuario: clienteUserId });
      expect(total).toBe(1);
    });
  });

  it('POST /api/carrito crea un nuevo carrito activo vacío (201)', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app).post('/api/carrito').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(201);
    expect(res.body).toEqual(
      expect.objectContaining({ estado: 'ACTIVO', items: [], total: '0.00' }),
    );
    expect(res.body.id).not.toBe(0);
    expect(pedidoId).toBeGreaterThan(0);
  });

  it('GET /api/mis-pedidos sin token responde 401', async () => {
    const res = await request(app).get('/api/mis-pedidos');
    expect(res.status).toBe(401);
  });

  it('GET /api/mis-pedidos devuelve { data, total } con los pedidos propios', async () => {
    const token = makeToken('CLIENTE');
    const res = await request(app).get('/api/mis-pedidos').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data).toHaveLength(1);
    expect(res.body.data[0]).toEqual(
      expect.objectContaining({
        id: pedidoId,
        estado: 'REALIZADO',
        importeTotal: '81.00',
        usuario: { id: clienteUserId, nombre: 'Cliente Test', email: 'cliente@test.local' },
      }),
    );
    expect(res.body.data[0].items).toBeUndefined();
  });

  it('GET /api/mis-pedidos de CLIENTE B devuelve lista vacía', async () => {
    const token = makeToken('CLIENTE', clienteBUserId);
    const res = await request(app).get('/api/mis-pedidos').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ data: [], total: 0 });
  });
});
