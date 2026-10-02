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
let marcaId = 0;
let tipoId = 0;
let seqProducto = 0;

const STOCK_INICIAL = 100;
const CANTIDAD = 4;

function makeToken(rol: string = 'CLIENTE', userId: number = clienteUserId): string {
  return jwt.sign({ sub: userId, rol }, 'test_secret_no_produccion_1234567890', {
    expiresIn: '7d',
  });
}

function adminToken(): string {
  return makeToken('ADMIN', adminUserId);
}

describe('Gestión de pedido admin (012)', () => {
  let app: Express;

  beforeAll(async () => {
    try {
      await getOrm().getSchemaGenerator().updateSchema({ safe: true });
    } catch {
      // schema ya existe
    }

    await RequestContext.create(getOrm().em, async () => {
      const em = getOrm().em;
      const admin = await em.findOne(Usuario, { rol: 'ADMIN' });
      if (admin) adminUserId = admin.id;

      const email = 'cliente-pedido012@test.local';
      const existing = await em.findOne(Usuario, { email });
      if (existing) {
        clienteUserId = existing.id;
      } else {
        const passwordHash = await hash('secret123', 10);
        const cliente = em.create(Usuario, {
          nombre: 'Cliente Pedido 012',
          email,
          passwordHash,
          rol: 'CLIENTE',
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await em.flush();
        clienteUserId = cliente.id;
      }

      const now = new Date();
      const marca = em.create(Marca, {
        nombre: `Marca Ped012 ${Date.now()}`,
        activo: true,
        createdAt: now,
        updatedAt: now,
      });
      const tipo = em.create(TipoProducto, {
        nombre: `Tipo Ped012 ${Date.now()}`,
        activo: true,
        createdAt: now,
        updatedAt: now,
      });
      await em.flush();
      marcaId = marca.id;
      tipoId = tipo.id;

      const carritos = await em.find(Carrito, { usuario: clienteUserId });
      const carritoIds = carritos.map((c) => c.id);
      if (carritoIds.length > 0) {
        await em.nativeDelete(CarritoItem, { carrito: carritoIds });
      }
      await em.nativeDelete(Carrito, { usuario: clienteUserId });

      const pedidos = await em.find(Pedido, { usuario: clienteUserId });
      const pedidoIds = pedidos.map((p) => p.id);
      if (pedidoIds.length > 0) {
        await em.nativeDelete(HistorialEstado, { pedido: pedidoIds });
        await em.nativeDelete(PedidoItem, { pedido: pedidoIds });
      }
      await em.nativeDelete(Pedido, { usuario: clienteUserId });
    });

    app = createApp();
  });

  afterAll(async () => {
    await closeDb();
  });

  async function crearProducto(stock: number = STOCK_INICIAL): Promise<number> {
    let id = 0;
    await RequestContext.create(getOrm().em, async () => {
      const em = getOrm().em;
      const now = new Date();
      const producto = em.create(Producto, {
        nombre: `Producto Ped012 ${++seqProducto}-${Date.now()}`,
        descripcion: null,
        precioUnitario: '25.50',
        stock,
        activo: true,
        tipoProducto: await em.findOneOrFail(TipoProducto, tipoId),
        marca: await em.findOneOrFail(Marca, marcaId),
        proveedor: null,
        createdAt: now,
        updatedAt: now,
      });
      await em.flush();
      id = producto.id;
    });
    return id;
  }

  async function stockDe(productoId: number): Promise<number> {
    let stock = 0;
    await RequestContext.create(getOrm().em, async () => {
      const producto = await getOrm().em.findOneOrFail(Producto, productoId);
      stock = producto.stock;
    });
    return stock;
  }

  async function crearPedido(
    productoId: number,
    cantidad: number,
  ): Promise<{ id: number; importeTotal: string; items: unknown[] }> {
    const token = makeToken();
    await request(app)
      .post('/api/carrito')
      .set('Authorization', `Bearer ${token}`)
      .expect([200, 201]);
    await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ idProducto: productoId, cantidad })
      .expect(201);
    const res = await request(app)
      .post('/api/carrito/confirmar')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body;
  }

  it('entregar sin token responde 401', async () => {
    const res = await request(app).post('/api/pedidos/1/entregar');
    expect(res.status).toBe(401);
  });

  it('entregar con rol CLIENTE responde 403', async () => {
    const res = await request(app)
      .post('/api/pedidos/1/entregar')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(res.status).toBe(403);
  });

  it('historial con rol CLIENTE responde 403 y sin token 401', async () => {
    const sinToken = await request(app).get('/api/pedidos/1/historial');
    expect(sinToken.status).toBe(401);

    const cliente = await request(app)
      .get('/api/pedidos/1/historial')
      .set('Authorization', `Bearer ${makeToken()}`);
    expect(cliente.status).toBe(403);
  });

  it('cancelar sin token responde 401', async () => {
    const res = await request(app).post('/api/pedidos/1/cancelar');
    expect(res.status).toBe(401);
  });

  it('entregar con id no numérico responde 400', async () => {
    const res = await request(app)
      .post('/api/pedidos/abc/entregar')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({ statusCode: 400 });
  });

  it('entregar pedido inexistente responde 404', async () => {
    const res = await request(app)
      .post('/api/pedidos/999999/entregar')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({ statusCode: 404 });
  });

  it('historial de pedido inexistente responde 404', async () => {
    const res = await request(app)
      .get('/api/pedidos/999999/historial')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(res.status).toBe(404);
  });

  it('historial del pedido recién creado tiene solo REALIZADO', async () => {
    const productoId = await crearProducto();
    const pedido = await crearPedido(productoId, CANTIDAD);

    const res = await request(app)
      .get(`/api/pedidos/${pedido.id}/historial`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.total).toBe(1);
    expect(res.body.data).toEqual([
      { id: expect.any(Number), estado: 'REALIZADO', fecha: expect.any(String) },
    ]);
  });

  it('entregar deja ENTREGADO, devuelve el detalle y agrega historial ordenado por fecha', async () => {
    const productoId = await crearProducto();
    const pedido = await crearPedido(productoId, CANTIDAD);

    const res = await request(app)
      .post(`/api/pedidos/${pedido.id}/entregar`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body).toEqual(
      expect.objectContaining({
        id: pedido.id,
        estado: 'ENTREGADO',
        importeTotal: pedido.importeTotal,
        items: expect.any(Array),
      }),
    );
    expect(res.body.items).toHaveLength(1);
    expect(res.body.items[0]).toEqual(
      expect.objectContaining({
        cantidad: CANTIDAD,
        producto: expect.objectContaining({ id: productoId }),
      }),
    );

    const historial = await request(app)
      .get(`/api/pedidos/${pedido.id}/historial`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(historial.status).toBe(200);
    expect(historial.body.total).toBe(2);
    expect(historial.body.data.map((fila: { estado: string }) => fila.estado)).toEqual([
      'REALIZADO',
      'ENTREGADO',
    ]);
  });

  it('entregar dos veces responde 409', async () => {
    const productoId = await crearProducto();
    const pedido = await crearPedido(productoId, CANTIDAD);

    await request(app)
      .post(`/api/pedidos/${pedido.id}/entregar`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .expect(200);

    const segunda = await request(app)
      .post(`/api/pedidos/${pedido.id}/entregar`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(segunda.status).toBe(409);
    expect(segunda.body).toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('ENTREGADO'),
    });

    const historial = await request(app)
      .get(`/api/pedidos/${pedido.id}/historial`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(historial.body.total).toBe(2);
  });

  it('cancelar restaura el stock, conserva importeTotal e items y agrega historial', async () => {
    const productoId = await crearProducto();
    const pedido = await crearPedido(productoId, CANTIDAD);
    expect(await stockDe(productoId)).toBe(STOCK_INICIAL - CANTIDAD);

    const res = await request(app)
      .post(`/api/pedidos/${pedido.id}/cancelar`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(200);
    expect(res.body.estado).toBe('CANCELADO');
    expect(res.body.importeTotal).toBe(pedido.importeTotal);
    expect(res.body.items).toEqual(pedido.items);
    expect(await stockDe(productoId)).toBe(STOCK_INICIAL);

    const historial = await request(app)
      .get(`/api/pedidos/${pedido.id}/historial`)
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(historial.body.total).toBe(2);
    expect(historial.body.data.map((fila: { estado: string }) => fila.estado)).toEqual([
      'REALIZADO',
      'CANCELADO',
    ]);
  });

  it('cancelar dos veces responde 409 sin duplicar stock', async () => {
    const productoId = await crearProducto();
    const pedido = await crearPedido(productoId, CANTIDAD);

    await request(app)
      .post(`/api/pedidos/${pedido.id}/cancelar`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .expect(200);
    expect(await stockDe(productoId)).toBe(STOCK_INICIAL);

    const segunda = await request(app)
      .post(`/api/pedidos/${pedido.id}/cancelar`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(segunda.status).toBe(409);
    expect(await stockDe(productoId)).toBe(STOCK_INICIAL);
  });

  it('entregar un pedido cancelado responde 409', async () => {
    const productoId = await crearProducto();
    const pedido = await crearPedido(productoId, CANTIDAD);

    await request(app)
      .post(`/api/pedidos/${pedido.id}/cancelar`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .expect(200);

    const res = await request(app)
      .post(`/api/pedidos/${pedido.id}/entregar`)
      .set('Authorization', `Bearer ${adminToken()}`);

    expect(res.status).toBe(409);
    expect(res.body).toMatchObject({
      statusCode: 409,
      message: expect.stringContaining('CANCELADO'),
    });
    expect(await stockDe(productoId)).toBe(STOCK_INICIAL);
  });
});
