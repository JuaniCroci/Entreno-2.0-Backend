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
let clienteAId = 1;
let clienteBId = 1;
let marcaId = 0;
let tipoId = 0;
let producto1 = 0;
let producto2 = 0;

let ped1 = 0;
let ped2 = 0;
let ped3 = 0;

const STOCK_INICIAL = 100;
const EMAIL_A = 'listado013-a@test.local';
const EMAIL_B = 'listado013-b@test.local';

function makeToken(rol: string = 'CLIENTE', userId: number = clienteAId): string {
  return jwt.sign({ sub: userId, rol }, 'test_secret_no_produccion_1234567890', {
    expiresIn: '7d',
  });
}

function adminToken(): string {
  return makeToken('ADMIN', adminUserId);
}

describe('Listado y detalle de pedidos (013)', () => {
  let app: Express;

  async function upsertCliente(
    email: string,
    nombre: string,
    telefono: string | null,
    direccion: string | null,
  ): Promise<number> {
    let id = 0;
    await RequestContext.create(getOrm().em, async () => {
      const em = getOrm().em;
      const existing = await em.findOne(Usuario, { email });
      if (existing) {
        existing.telefono = telefono;
        existing.direccion = direccion;
        id = existing.id;
      } else {
        const passwordHash = await hash('secret123', 10);
        const cliente = em.create(Usuario, {
          nombre,
          email,
          passwordHash,
          rol: 'CLIENTE',
          activo: true,
          telefono,
          direccion,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await em.flush();
        id = cliente.id;
      }
      await em.flush();
    });
    return id;
  }

  async function crearProducto(nombre: string): Promise<number> {
    let id = 0;
    await RequestContext.create(getOrm().em, async () => {
      const em = getOrm().em;
      const now = new Date();
      const producto = em.create(Producto, {
        nombre: `${nombre} ${Date.now()}`,
        descripcion: null,
        precioUnitario: '25.50',
        stock: STOCK_INICIAL,
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

  async function crearPedido(token: string, idProducto: number, cantidad: number): Promise<number> {
    await request(app)
      .post('/api/carrito')
      .set('Authorization', `Bearer ${token}`)
      .expect([200, 201]);
    await request(app)
      .post('/api/carrito/items')
      .set('Authorization', `Bearer ${token}`)
      .send({ idProducto, cantidad })
      .expect(201);
    const res = await request(app)
      .post('/api/carrito/confirmar')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    return res.body.id;
  }

  async function setFecha(pedidoId: number, fecha: Date): Promise<void> {
    await RequestContext.create(getOrm().em, async () => {
      const em = getOrm().em;
      const pedido = await em.findOne(Pedido, { id: pedidoId });
      if (pedido) {
        pedido.fecha = fecha;
        await em.flush();
      }
    });
  }

  beforeAll(async () => {
    app = createApp();

    try {
      await getOrm().getSchemaGenerator().updateSchema({ safe: true });
    } catch {
      // schema ya existe
    }

    await RequestContext.create(getOrm().em, async () => {
      const em = getOrm().em;
      const admin = await em.findOne(Usuario, { rol: 'ADMIN' });
      if (admin) adminUserId = admin.id;
    });

    clienteAId = await upsertCliente(
      EMAIL_A,
      'Cliente Listado 013 A',
      '1155554444',
      'Av. Siempreviva 742',
    );
    clienteBId = await upsertCliente(EMAIL_B, 'Cliente Listado 013 B', null, null);

    await RequestContext.create(getOrm().em, async () => {
      const em = getOrm().em;
      const now = new Date();
      const marca = em.create(Marca, {
        nombre: `Marca List013 ${Date.now()}`,
        activo: true,
        createdAt: now,
        updatedAt: now,
      });
      const tipo = em.create(TipoProducto, {
        nombre: `Tipo List013 ${Date.now()}`,
        activo: true,
        createdAt: now,
        updatedAt: now,
      });
      await em.flush();
      marcaId = marca.id;
      tipoId = tipo.id;

      for (const clienteId of [clienteAId, clienteBId]) {
        const carritos = await em.find(Carrito, { usuario: clienteId });
        const carritoIds = carritos.map((c) => c.id);
        if (carritoIds.length > 0) {
          await em.nativeDelete(CarritoItem, { carrito: carritoIds });
        }
        await em.nativeDelete(Carrito, { usuario: clienteId });

        const pedidos = await em.find(Pedido, { usuario: clienteId });
        const pedidoIds = pedidos.map((p) => p.id);
        if (pedidoIds.length > 0) {
          await em.nativeDelete(HistorialEstado, { pedido: pedidoIds });
          await em.nativeDelete(PedidoItem, { pedido: pedidoIds });
        }
        await em.nativeDelete(Pedido, { usuario: clienteId });
      }
    });

    producto1 = await crearProducto('Producto List013-A');
    producto2 = await crearProducto('Producto List013-B');

    const tokenA = makeToken('CLIENTE', clienteAId);
    const tokenB = makeToken('CLIENTE', clienteBId);

    ped1 = await crearPedido(tokenA, producto1, 2);
    await setFecha(ped1, new Date('2026-03-15T12:00:00.000Z'));
    await request(app)
      .post(`/api/pedidos/${ped1}/entregar`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .expect(200);

    ped2 = await crearPedido(tokenA, producto1, 1);
    await setFecha(ped2, new Date('2026-06-20T12:00:00.000Z'));
    await request(app)
      .post(`/api/pedidos/${ped2}/cancelar`)
      .set('Authorization', `Bearer ${adminToken()}`)
      .expect(200);

    ped3 = await crearPedido(tokenB, producto2, 3);
    await setFecha(ped3, new Date('2026-09-10T12:00:00.000Z'));
  });

  afterAll(async () => {
    await closeDb();
  });

  describe('GET /api/pedidos (admin)', () => {
    it('sin token responde 401, con CLIENTE 403 y con ADMIN 200 con defaults', async () => {
      const sinToken = await request(app).get('/api/pedidos');
      expect(sinToken.status).toBe(401);

      const cliente = await request(app)
        .get('/api/pedidos')
        .set('Authorization', `Bearer ${makeToken()}`);
      expect(cliente.status).toBe(403);

      const admin = await request(app)
        .get('/api/pedidos')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(admin.status).toBe(200);
      expect(admin.body).toEqual({
        data: expect.any(Array),
        total: expect.any(Number),
        page: 1,
        size: 20,
      });
    });

    it('estado REALIZADO + idCliente de A responde total 0', async () => {
      const res = await request(app)
        .get(`/api/pedidos?estado=REALIZADO&idCliente=${clienteAId}`)
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(0);
      expect(res.body.data).toEqual([]);
    });

    it('estado CANCELADO + idCliente de A responde solo ped2', async () => {
      const res = await request(app)
        .get(`/api/pedidos?estado=CANCELADO&idCliente=${clienteAId}`)
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data.map((fila: { id: number }) => fila.id)).toEqual([ped2]);
    });

    it('estado inválido responde 400', async () => {
      const res = await request(app)
        .get('/api/pedidos?estado=PEPE')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ statusCode: 400 });
    });

    it('estado ENTREGADO y ABONADO filtran correctamente', async () => {
      const entregado = await request(app)
        .get(`/api/pedidos?estado=ENTREGADO&idCliente=${clienteAId}`)
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(entregado.status).toBe(200);
      expect(entregado.body.total).toBe(1);
      expect(entregado.body.data.map((fila: { id: number }) => fila.id)).toEqual([ped1]);

      const abonado = await request(app)
        .get('/api/pedidos?estado=ABONADO')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(abonado.status).toBe(200);
      expect(abonado.body.total).toBe(0);
      expect(abonado.body.data).toEqual([]);
    });

    it('desde/hasta es inclusivo por fecha de creación', async () => {
      const mismoDia = await request(app)
        .get(`/api/pedidos?idCliente=${clienteAId}&desde=2026-03-15&hasta=2026-03-15`)
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(mismoDia.status).toBe(200);
      expect(mismoDia.body.total).toBe(1);
      expect(mismoDia.body.data.map((fila: { id: number }) => fila.id)).toEqual([ped1]);

      const hastaAnterior = await request(app)
        .get(`/api/pedidos?idCliente=${clienteAId}&hasta=2026-03-14`)
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(hastaAnterior.status).toBe(200);
      expect(hastaAnterior.body.total).toBe(0);
      expect(hastaAnterior.body.data.map((fila: { id: number }) => fila.id)).not.toContain(ped1);

      const soloDesde = await request(app)
        .get(`/api/pedidos?idCliente=${clienteAId}&desde=2026-03-16`)
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(soloDesde.status).toBe(200);
      expect(soloDesde.body.total).toBe(1);
      expect(soloDesde.body.data.map((fila: { id: number }) => fila.id)).toEqual([ped2]);
    });

    it('desde posterior a hasta responde 400', async () => {
      const res = await request(app)
        .get('/api/pedidos?desde=2026-12-31&hasta=2026-01-01')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(400);
      expect(res.body).toMatchObject({ statusCode: 400 });
    });

    it('cliente por nombre es case-insensitive y parcial', async () => {
      const res = await request(app)
        .get(`/api/pedidos?idCliente=${clienteAId}&cliente=LISTADO`)
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.data.map((fila: { id: number }) => fila.id).sort()).toEqual(
        [ped1, ped2].sort((a, b) => a - b),
      );
    });

    it('cliente coincide por nombre aunque el token no aparezca en el email', async () => {
      const res = await request(app)
        .get('/api/pedidos?cliente=013%20A')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.data.map((fila: { id: number }) => fila.id).sort()).toEqual(
        [ped1, ped2].sort((a, b) => a - b),
      );
    });

    it('cliente por email parcial coincide', async () => {
      const res = await request(app)
        .get('/api/pedidos?cliente=listado013-a@')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.data.map((fila: { id: number }) => fila.id).sort()).toEqual(
        [ped1, ped2].sort((a, b) => a - b),
      );
    });

    it('filtros combinados aplican AND', async () => {
      const res = await request(app)
        .get(`/api/pedidos?cliente=listado013-a@&estado=CANCELADO`)
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data.map((fila: { id: number }) => fila.id)).toEqual([ped2]);
    });

    it('pagina en curso con total correcto', async () => {
      const pag1 = await request(app)
        .get(`/api/pedidos?idCliente=${clienteAId}&page=1&size=1`)
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(pag1.status).toBe(200);
      expect(pag1.body.total).toBe(2);
      expect(pag1.body.page).toBe(1);
      expect(pag1.body.size).toBe(1);
      expect(pag1.body.data).toHaveLength(1);
      expect(pag1.body.data[0]?.id).toBe(ped2);

      const pag2 = await request(app)
        .get(`/api/pedidos?idCliente=${clienteAId}&page=2&size=1`)
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(pag2.body.total).toBe(2);
      expect(pag2.body.page).toBe(2);
      expect(pag2.body.data[0]?.id).toBe(ped1);

      const fueraDeRango = await request(app)
        .get(`/api/pedidos?idCliente=${clienteAId}&page=99&size=1`)
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(fueraDeRango.status).toBe(200);
      expect(fueraDeRango.body.data).toEqual([]);
      expect(fueraDeRango.body.total).toBe(2);
    });

    it('page y size inválidos responden 400', async () => {
      const size = await request(app)
        .get('/api/pedidos?size=101')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(size.status).toBe(400);
      expect(size.body).toMatchObject({ statusCode: 400 });

      const page = await request(app)
        .get('/api/pedidos?page=abc')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(page.status).toBe(400);
      expect(page.body).toMatchObject({ statusCode: 400 });
    });

    it('idCliente no numérico o menor a 1 responde 400', async () => {
      const noNumerico = await request(app)
        .get('/api/pedidos?idCliente=x')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(noNumerico.status).toBe(400);
      expect(noNumerico.body).toMatchObject({ statusCode: 400 });

      const cero = await request(app)
        .get('/api/pedidos?idCliente=0')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(cero.status).toBe(400);
      expect(cero.body).toMatchObject({ statusCode: 400 });
    });

    it('item incluye fecha, estado, importeTotal y nombre de cliente aunque esté cancelado', async () => {
      const res = await request(app)
        .get(`/api/pedidos?idCliente=${clienteAId}&estado=CANCELADO`)
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      const item = res.body.data[0];
      expect(item).toEqual(
        expect.objectContaining({
          id: ped2,
          fecha: expect.any(String),
          estado: 'CANCELADO',
          importeTotal: expect.any(String),
          usuario: expect.objectContaining({ id: clienteAId, nombre: 'Cliente Listado 013 A' }),
        }),
      );
    });

    it('fechaEntrega sale del historial y es null si no está entregado', async () => {
      const res = await request(app)
        .get(`/api/pedidos?idCliente=${clienteAId}`)
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      const porId = new Map<number, Record<string, unknown>>(
        res.body.data.map((fila: { id: number }) => [fila.id, fila]),
      );

      const historial = await request(app)
        .get(`/api/pedidos/${ped1}/historial`)
        .set('Authorization', `Bearer ${adminToken()}`);
      const filaEntrega = historial.body.data.find(
        (fila: { estado: string }) => fila.estado === 'ENTREGADO',
      );
      expect(filaEntrega).toBeDefined();

      expect(porId.get(ped1)?.fechaEntrega).toBeTruthy();
      expect(porId.get(ped1)?.fechaEntrega).toBe(filaEntrega.fecha);
      expect(porId.get(ped2)?.fechaEntrega).toBeNull();

      const conB = await request(app)
        .get(`/api/pedidos?idCliente=${clienteBId}`)
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(conB.body.data[0]?.fechaEntrega).toBeNull();
    });

    it('ordena por fecha descendente', async () => {
      const res = await request(app)
        .get(`/api/pedidos?idCliente=${clienteAId}`)
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.map((fila: { id: number }) => fila.id)).toEqual([ped2, ped1]);
    });
  });

  describe('GET /api/pedidos/:id (detalle admin)', () => {
    it('devuelve items con importes y datos completos del cliente sin passwordHash', async () => {
      const res = await request(app)
        .get(`/api/pedidos/${ped1}`)
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          id: ped1,
          estado: 'ENTREGADO',
          usuario: {
            id: clienteAId,
            nombre: 'Cliente Listado 013 A',
            email: EMAIL_A,
            telefono: '1155554444',
            direccion: 'Av. Siempreviva 742',
          },
        }),
      );
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toEqual(
        expect.objectContaining({
          cantidad: 2,
          precioUnitario: '25.50',
          subtotal: '51.00',
          descuentoAplicado: null,
        }),
      );
      expect(res.text).not.toContain('passwordHash');
    });

    it('inexistente responde 404 y no numérico 400', async () => {
      const inexistente = await request(app)
        .get('/api/pedidos/999999')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(inexistente.status).toBe(404);
      expect(inexistente.body).toMatchObject({ statusCode: 404 });

      const noNumerico = await request(app)
        .get('/api/pedidos/abc')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(noNumerico.status).toBe(400);
      expect(noNumerico.body).toMatchObject({ statusCode: 400 });
    });

    it('sin token responde 401 y con CLIENTE 403', async () => {
      const sinToken = await request(app).get(`/api/pedidos/${ped1}`);
      expect(sinToken.status).toBe(401);

      const cliente = await request(app)
        .get(`/api/pedidos/${ped1}`)
        .set('Authorization', `Bearer ${makeToken()}`);
      expect(cliente.status).toBe(403);
    });
  });

  describe('GET /api/mis-pedidos (cliente)', () => {
    it('token A devuelve solo ped1 y ped2 con fecha, estado e importeTotal', async () => {
      const res = await request(app)
        .get('/api/mis-pedidos')
        .set('Authorization', `Bearer ${makeToken('CLIENTE', clienteAId)}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      expect(res.body.data.map((fila: { id: number }) => fila.id).sort()).toEqual(
        [ped1, ped2].sort((a, b) => a - b),
      );
      for (const fila of res.body.data) {
        expect(fila).toEqual(
          expect.objectContaining({
            fecha: expect.any(String),
            estado: expect.any(String),
            importeTotal: expect.any(String),
          }),
        );
      }
    });

    it('token B devuelve solo ped3', async () => {
      const res = await request(app)
        .get('/api/mis-pedidos')
        .set('Authorization', `Bearer ${makeToken('CLIENTE', clienteBId)}`);

      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data.map((fila: { id: number }) => fila.id)).toEqual([ped3]);
    });
  });

  describe('GET /api/mis-pedidos/:id (detalle propio)', () => {
    it('pedido propio responde 200 con items', async () => {
      const res = await request(app)
        .get(`/api/mis-pedidos/${ped2}`)
        .set('Authorization', `Bearer ${makeToken('CLIENTE', clienteAId)}`);

      expect(res.status).toBe(200);
      expect(res.body).toEqual(expect.objectContaining({ id: ped2, estado: 'CANCELADO' }));
      expect(res.body.items).toHaveLength(1);
      expect(res.body.items[0]).toEqual(
        expect.objectContaining({ cantidad: 1, precioUnitario: '25.50' }),
      );
    });

    it('pedido ajeno responde 404 para no filtrar existencia', async () => {
      const res = await request(app)
        .get(`/api/mis-pedidos/${ped2}`)
        .set('Authorization', `Bearer ${makeToken('CLIENTE', clienteBId)}`);

      expect(res.status).toBe(404);
      expect(res.body).toMatchObject({ statusCode: 404 });
    });

    it('inexistente responde 404 y no numérico 400', async () => {
      const inexistente = await request(app)
        .get('/api/mis-pedidos/999999')
        .set('Authorization', `Bearer ${makeToken('CLIENTE', clienteAId)}`);
      expect(inexistente.status).toBe(404);

      const noNumerico = await request(app)
        .get('/api/mis-pedidos/abc')
        .set('Authorization', `Bearer ${makeToken('CLIENTE', clienteAId)}`);
      expect(noNumerico.status).toBe(400);
      expect(noNumerico.body).toMatchObject({ statusCode: 400 });
    });

    it('sin token responde 401', async () => {
      const res = await request(app).get(`/api/mis-pedidos/${ped1}`);
      expect(res.status).toBe(401);
    });
  });
});
