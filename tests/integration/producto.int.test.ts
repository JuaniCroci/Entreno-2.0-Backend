import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import { createApp } from '../../src/app.js';
import { closeDb, getOrm } from '../../src/config/db.js';
import { RequestContext } from '@mikro-orm/core';
import { Usuario } from '../../src/modules/usuarios/entity/Usuario.js';
import { Marca } from '../../src/modules/marcas/entity/Marca.js';
import { TipoProducto } from '../../src/modules/tipos-producto/entity/TipoProducto.js';
import { Producto } from '../../src/modules/productos/entity/Producto.js';
import { Descuento } from '../../src/modules/descuentos/entity/Descuento.js';
import { DescuentoProducto } from '../../src/modules/descuentos/entity/DescuentoProducto.js';
import { Proveedor } from '../../src/modules/proveedores/entity/Proveedor.js';
import jwt from 'jsonwebtoken';
import { randomInt } from 'node:crypto';
import { hash } from 'bcryptjs';
import { rm } from 'node:fs/promises';
import { resolve } from 'node:path';
import { env } from '../../src/config/env.js';

let adminUserId = 1;
let clienteUserId = 1;
let marcaId = 1;
let tipoProductoId = 1;
let productoId = 1;
const uploadedImageFiles: string[] = [];

function makeToken(rol: string = 'ADMIN', userId: number = adminUserId): string {
  return jwt.sign({ sub: userId, rol }, 'test_secret_no_produccion_1234567890', {
    expiresIn: '7d',
  });
}
function makeCuit(): string {
  return String(randomInt(10_000_000_000, 100_000_000_000));
}

describe('CRUD Producto (integración)', () => {
  let app: Express;

  beforeAll(async () => {
    try {
      await getOrm().getSchemaGenerator().updateSchema({ safe: true });
    } catch {
      // schema ya existe
    }

    await RequestContext.create(getOrm().em, async () => {
      const admin = await getOrm().em.findOne(Usuario, { email: 'admin@entreno.com' });
      if (admin) adminUserId = admin.id;

      const existingCliente = await getOrm().em.findOne(Usuario, { email: 'cliente@test.local' });
      if (existingCliente) {
        clienteUserId = existingCliente.id;
      } else {
        const passwordHash = await hash('secret123', 10);
        const cliente = getOrm().em.create(Usuario, {
          nombre: 'Cliente Test',
          email: 'cliente@test.local',
          passwordHash,
          rol: 'CLIENTE',
          activo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        await getOrm().em.flush();
        clienteUserId = cliente.id;
      }

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
      getOrm().em.create(Proveedor, proveedor);
      await getOrm().em.flush();
    });

    app = createApp();
  });

  afterAll(async () => {
    await Promise.all(uploadedImageFiles.map((file) => rm(file, { force: true })));
    await closeDb();
  });

  it('GET /api/productos/admin sin token responde 401', async () => {
    const res = await request(app).get('/api/productos/admin');
    expect(res.status).toBe(401);
  });

  it('GET /api/productos/admin con CLIENTE responde 403', async () => {
    const token = makeToken('CLIENTE', clienteUserId);
    const res = await request(app)
      .get('/api/productos/admin')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(403);
  });

  it('POST /api/productos sin token responde 401', async () => {
    const res = await request(app).post('/api/productos').send({
      nombre: 'Producto Test X',
      stockInicial: 0,
      precioUnitario: '10.00',
      idTipoProducto: 1,
      idMarca: 1,
    });
    expect(res.status).toBe(401);
  });

  it('POST /api/productos con CLIENTE responde 403', async () => {
    const token = makeToken('CLIENTE', clienteUserId);
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Producto Test X',
        stockInicial: 0,
        precioUnitario: '10.00',
        idTipoProducto: 1,
        idMarca: 1,
      });
    expect(res.status).toBe(403);
  });

  it('POST /api/productos con ADMIN crea producto 201', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: `Producto Test ${Date.now()}`,
        stockInicial: 10,
        precioUnitario: '1500.00',
        idTipoProducto: tipoProductoId,
        idMarca: marcaId,
      });
    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('id');
    expect(res.body.stock).toBe(10);
    expect(res.body.precioUnitario).toBe('1500.00');
    expect(res.body.imagenPrincipal).toBeNull();
    productoId = res.body.id;
  });

  it('POST /api/productos/admin/:id/imagenes exige ADMIN', async () => {
    const image = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
    const anonimo = await request(app)
      .post(`/api/productos/admin/${productoId}/imagenes`)
      .attach('imagen', image, { filename: 'foto.png', contentType: 'image/png' });
    expect(anonimo.status).toBe(401);

    const cliente = await request(app)
      .post(`/api/productos/admin/${productoId}/imagenes`)
      .set('Authorization', `Bearer ${makeToken('CLIENTE', clienteUserId)}`)
      .attach('imagen', image, { filename: 'foto.png', contentType: 'image/png' });
    expect(cliente.status).toBe(403);
  });

  it('registra con UUID, reemplaza la principal y expone imagen e historial', async () => {
    const token = makeToken('ADMIN');
    const firstImage = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 1, 2]);
    const first = await request(app)
      .post(`/api/productos/admin/${productoId}/imagenes`)
      .set('Authorization', `Bearer ${token}`)
      .field('altText', 'Creatina en su envase')
      .field('fuente', 'Fotografía propia')
      .field('licencia', 'Uso académico; permiso de marca pendiente')
      .attach('imagen', firstImage, { filename: 'nombre-original.png', contentType: 'image/png' });

    expect(first.status).toBe(201);
    expect(first.body.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(first.body).toMatchObject({
      url: `/api/productos/imagenes/${first.body.id}`,
      altText: 'Creatina en su envase',
      fuente: 'Fotografía propia',
      esPrincipal: true,
      mimeType: 'image/png',
    });
    uploadedImageFiles.push(resolve(env.productImagesDir, `${first.body.id}.png`));

    const secondImage = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10, 3, 4]);
    const second = await request(app)
      .post(`/api/productos/admin/${productoId}/imagenes`)
      .set('Authorization', `Bearer ${token}`)
      .field('altText', 'Creatina, segunda toma')
      .field('fuente', 'Fotografía propia')
      .field('licencia', 'Uso académico')
      .attach('imagen', secondImage, { filename: 'segunda.png', contentType: 'image/png' });
    expect(second.status).toBe(201);
    uploadedImageFiles.push(resolve(env.productImagesDir, `${second.body.id}.png`));

    const history = await request(app)
      .get(`/api/productos/admin/${productoId}/imagenes`)
      .set('Authorization', `Bearer ${token}`);
    expect(history.status).toBe(200);
    expect(history.body.data).toHaveLength(2);
    expect(
      history.body.data.find((image: { id: string }) => image.id === first.body.id),
    ).toMatchObject({ esPrincipal: false, fuente: 'Fotografía propia' });
    expect(
      history.body.data.find((image: { id: string }) => image.id === second.body.id),
    ).toMatchObject({ esPrincipal: true, licencia: 'Uso académico' });

    const publicList = await request(app).get(`/api/productos?idMarca=${marcaId}&size=100`);
    const listedProduct = publicList.body.data.find(
      (product: { id: number }) => product.id === productoId,
    );
    expect(listedProduct.imagenPrincipal).toEqual({
      id: second.body.id,
      url: second.body.url,
      altText: 'Creatina, segunda toma',
    });

    const fileResponse = await request(app).get(second.body.url);
    expect(fileResponse.status).toBe(200);
    expect(fileResponse.body).toEqual(secondImage);
    expect(fileResponse.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('rechaza formatos no permitidos y metadatos faltantes', async () => {
    const token = makeToken('ADMIN');
    const invalidFormat = await request(app)
      .post(`/api/productos/admin/${productoId}/imagenes`)
      .set('Authorization', `Bearer ${token}`)
      .field('altText', 'Imagen')
      .field('fuente', 'Fotografía propia')
      .field('licencia', 'Uso académico')
      .attach('imagen', Buffer.from('no es png'), {
        filename: 'foto.png',
        contentType: 'image/png',
      });
    expect(invalidFormat.status).toBe(400);

    const missingMetadata = await request(app)
      .post(`/api/productos/admin/${productoId}/imagenes`)
      .set('Authorization', `Bearer ${token}`)
      .attach('imagen', Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), {
        filename: 'foto.png',
        contentType: 'image/png',
      });
    expect(missingMetadata.status).toBe(400);
  });

  it('rechaza imágenes que superan el límite de 5 MiB', async () => {
    const token = makeToken('ADMIN');
    const oversizedImage = Buffer.alloc(5 * 1024 * 1024 + 1);
    const response = await request(app)
      .post(`/api/productos/admin/${productoId}/imagenes`)
      .set('Authorization', `Bearer ${token}`)
      .field('altText', 'Imagen')
      .field('fuente', 'Fotografía propia')
      .field('licencia', 'Uso académico')
      .attach('imagen', oversizedImage, { filename: 'foto.png', contentType: 'image/png' });

    expect(response.status).toBe(413);
    expect(response.body.message).toContain('5 MiB');
  });

  it('POST /api/productos con idTipoProducto inexistente responde 404', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Producto Test X',
        stockInicial: 0,
        precioUnitario: '10.00',
        idTipoProducto: 99999,
        idMarca: marcaId,
      });
    expect(res.status).toBe(404);
  });

  it('POST /api/productos con idMarca inexistente responde 404', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Producto Test X',
        stockInicial: 0,
        precioUnitario: '10.00',
        idTipoProducto: tipoProductoId,
        idMarca: 99999,
      });
    expect(res.status).toBe(404);
  });

  it('POST /api/productos con precio <= 0 responde 400', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Producto Test X',
        stockInicial: 0,
        precioUnitario: '0.00',
        idTipoProducto: tipoProductoId,
        idMarca: marcaId,
      });
    expect(res.status).toBe(400);
  });

  it('POST /api/productos con stockInicial < 0 responde 400', async () => {
    const token = makeToken('ADMIN');
    const res = await request(app)
      .post('/api/productos')
      .set('Authorization', `Bearer ${token}`)
      .send({
        nombre: 'Producto Test X',
        stockInicial: -1,
        precioUnitario: '10.00',
        idTipoProducto: tipoProductoId,
        idMarca: marcaId,
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

  describe('GET /api/productos (listado público, 010)', () => {
    let marcaAId = 0;
    let marcaBId = 0;
    let tipoAId = 0;
    let prod1Id = 0;
    let prod2Id = 0;
    let prod3Id = 0;
    let prod4Id = 0;

    beforeAll(async () => {
      await RequestContext.create(getOrm().em, async () => {
        const em = getOrm().em;
        const now = new Date();

        const marcaA = em.create(Marca, {
          nombre: `MarcaA-${Date.now()}`,
          activo: true,
          createdAt: now,
          updatedAt: now,
        });
        const marcaB = em.create(Marca, {
          nombre: `MarcaB-${Date.now()}`,
          activo: true,
          createdAt: now,
          updatedAt: now,
        });
        const tipoA = em.create(TipoProducto, {
          nombre: `TipoA-${Date.now()}`,
          activo: true,
          createdAt: now,
          updatedAt: now,
        });
        const tipoB = em.create(TipoProducto, {
          nombre: `TipoB-${Date.now()}`,
          activo: true,
          createdAt: now,
          updatedAt: now,
        });
        await em.flush();

        const prod1 = em.create(Producto, {
          nombre: `010 Prod1 ${Date.now()}`,
          precioUnitario: '100.00',
          stock: 5,
          activo: true,
          tipoProducto: tipoA,
          marca: marcaA,
          createdAt: now,
          updatedAt: now,
        });
        const prod2 = em.create(Producto, {
          nombre: `010 Prod2 ${Date.now()}`,
          precioUnitario: '200.00',
          stock: 0,
          activo: true,
          tipoProducto: tipoA,
          marca: marcaB,
          createdAt: now,
          updatedAt: now,
        });
        const prod3 = em.create(Producto, {
          nombre: `010 Prod3 ${Date.now()}`,
          precioUnitario: '300.00',
          stock: 7,
          activo: true,
          tipoProducto: tipoB,
          marca: marcaA,
          createdAt: now,
          updatedAt: now,
        });
        const prod4 = em.create(Producto, {
          nombre: `010 Prod4 ${Date.now()}`,
          precioUnitario: '50.00',
          stock: 2,
          activo: false,
          tipoProducto: tipoB,
          marca: marcaB,
          createdAt: now,
          updatedAt: now,
        });
        await em.flush();

        marcaAId = marcaA.id;
        marcaBId = marcaB.id;
        tipoAId = tipoA.id;
        prod1Id = prod1.id;
        prod2Id = prod2.id;
        prod3Id = prod3.id;
        prod4Id = prod4.id;
      });
    });

    it('responde 200 sin token con wrapper { data, total, page, size } e items públicos', async () => {
      const res = await request(app).get(`/api/productos?idTipoProducto=${tipoAId}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          total: 2,
          page: 1,
          size: 20,
        }),
      );
      expect(res.body.data).toHaveLength(2);
      const item = res.body.data.find((p: { id: number }) => p.id === prod1Id);
      expect(item).toEqual({
        id: prod1Id,
        nombre: expect.any(String),
        marca: { id: marcaAId, nombre: expect.any(String) },
        precioUnitario: '100.00',
        disponible: true,
        imagenPrincipal: null,
      });
      const sinStock = res.body.data.find((p: { id: number }) => p.id === prod2Id);
      expect(sinStock.disponible).toBe(false);
      expect(res.body.data[0]).not.toHaveProperty('activo');
      expect(res.body.data[0]).not.toHaveProperty('stock');
      expect(res.body.data[0]).not.toHaveProperty('createdAt');
    });

    it('filtra por idMarca', async () => {
      const res = await request(app).get(`/api/productos?idMarca=${marcaAId}`);
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(2);
      const ids = res.body.data.map((p: { id: number }) => p.id);
      expect(ids).toContain(prod1Id);
      expect(ids).toContain(prod3Id);
    });

    it('combina idMarca con rango de precio en AND', async () => {
      const res = await request(app).get(
        `/api/productos?idMarca=${marcaAId}&precioMin=150&precioMax=400`,
      );
      expect(res.status).toBe(200);
      expect(res.body.total).toBe(1);
      expect(res.body.data[0].id).toBe(prod3Id);
    });

    it('excluye productos inactivos del listado', async () => {
      const res = await request(app).get(`/api/productos?idMarca=${marcaBId}`);
      expect(res.status).toBe(200);
      const ids = res.body.data.map((p: { id: number }) => p.id);
      expect(ids).toContain(prod2Id);
      expect(ids).not.toContain(prod4Id);
    });

    it('ordena por precio asc con orden=precio&dir=asc', async () => {
      const res = await request(app).get(`/api/productos?idMarca=${marcaAId}&orden=precio&dir=asc`);
      expect(res.status).toBe(200);
      expect(res.body.data.map((p: { precioUnitario: string }) => p.precioUnitario)).toEqual([
        '100.00',
        '300.00',
      ]);
    });

    it('pagina con page/size y devuelve total correcto', async () => {
      const res = await request(app).get(`/api/productos?idMarca=${marcaAId}&page=1&size=1`);
      expect(res.status).toBe(200);
      expect(res.body.data).toHaveLength(1);
      expect(res.body.total).toBe(2);
      expect(res.body.page).toBe(1);
      expect(res.body.size).toBe(1);
    });

    it('page fuera de rango devuelve data vacía con total correcto', async () => {
      const res = await request(app).get(`/api/productos?idMarca=${marcaAId}&page=99`);
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(2);
    });

    it('idTipoProducto inexistente responde 200 con lista vacía', async () => {
      const res = await request(app).get('/api/productos?idTipoProducto=999999');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([]);
      expect(res.body.total).toBe(0);
    });

    it('precioMin > precioMax responde 400', async () => {
      const res = await request(app).get('/api/productos?precioMin=500&precioMax=100');
      expect(res.status).toBe(400);
    });

    it('idMarca no numérico responde 400', async () => {
      const res = await request(app).get('/api/productos?idMarca=abc');
      expect(res.status).toBe(400);
    });

    it('orden inválido responde 400', async () => {
      const res = await request(app).get('/api/productos?orden=stock');
      expect(res.status).toBe(400);
    });

    it('size mayor a 100 responde 400', async () => {
      const res = await request(app).get('/api/productos?size=200');
      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/productos/:id (detalle público, 010)', () => {
    let prodDescId = 0;
    let prodCeroId = 0;
    let descuentoId = 0;

    beforeAll(async () => {
      await RequestContext.create(getOrm().em, async () => {
        const em = getOrm().em;
        const now = new Date();
        const marca = em.create(Marca, {
          nombre: `010 DetMarca-${Date.now()}`,
          activo: true,
          createdAt: now,
          updatedAt: now,
        });
        const tipo = em.create(TipoProducto, {
          nombre: `010 DetTipo-${Date.now()}`,
          activo: true,
          createdAt: now,
          updatedAt: now,
        });
        await em.flush();

        const conDesc = em.create(Producto, {
          nombre: `010 DetProd1 ${Date.now()}`,
          precioUnitario: '999.00',
          stock: 3,
          activo: true,
          tipoProducto: tipo,
          marca: marca,
          createdAt: now,
          updatedAt: now,
        });
        const sinDesc = em.create(Producto, {
          nombre: `010 DetProd2 ${Date.now()}`,
          precioUnitario: '999.00',
          stock: 0,
          activo: true,
          tipoProducto: tipo,
          marca: marca,
          createdAt: now,
          updatedAt: now,
        });
        const descuento = em.create(Descuento, {
          descripcion: `010 Oferta ${Date.now()}`,
          cantidadMinima: 1,
          porcentaje: 15,
          activo: true,
          createdAt: now,
          updatedAt: now,
        });
        await em.flush();

        em.create(DescuentoProducto, {
          descuento: descuento,
          producto: conDesc,
          fechaDesde: now,
          fechaHasta: new Date(now.getTime() + 30 * 86400000),
        });
        await em.flush();

        prodDescId = conDesc.id;
        prodCeroId = sinDesc.id;
        descuentoId = descuento.id;
      });
    });

    it('responde 200 con detalle completo + disponible + descuentosVigentes', async () => {
      const res = await request(app).get(`/api/productos/${prodDescId}`);
      expect(res.status).toBe(200);
      expect(res.body).toEqual(
        expect.objectContaining({
          id: prodDescId,
          nombre: expect.any(String),
          descripcion: null,
          precioUnitario: '999.00',
          stock: 3,
          tipoProducto: { id: expect.any(Number), nombre: expect.any(String) },
          marca: { id: expect.any(Number), nombre: expect.any(String) },
          disponible: true,
        }),
      );
      expect(res.body.descuentosVigentes).toHaveLength(1);
      expect(res.body.descuentosVigentes[0]).toEqual(
        expect.objectContaining({ id: descuentoId, porcentaje: 15 }),
      );
    });

    it('stock 0 → disponible false y descuentosVigentes vacío', async () => {
      const res = await request(app).get(`/api/productos/${prodCeroId}`);
      expect(res.status).toBe(200);
      expect(res.body.disponible).toBe(false);
      expect(res.body.descuentosVigentes).toEqual([]);
    });

    it('id no numérico responde 400', async () => {
      const res = await request(app).get('/api/productos/abc');
      expect(res.status).toBe(400);
    });
  });
});
