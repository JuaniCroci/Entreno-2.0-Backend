import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { LockMode } from '@mikro-orm/core';
import { PedidoService } from '../../src/modules/pedidos/service/PedidoService.js';
import { DescuentoService } from '../../src/modules/descuentos/service/DescuentoService.js';
import { Pedido } from '../../src/modules/pedidos/entity/Pedido.js';
import { PedidoItem } from '../../src/modules/pedidos/entity/PedidoItem.js';
import { HistorialEstado } from '../../src/modules/pedidos/entity/HistorialEstado.js';
import * as db from '../../src/config/db.js';

let seq = 0;

function makeCarrito(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 8,
    estado: 'ACTIVO',
    usuarioActivoSlot: 5,
    usuario: { id: 5, nombre: 'Juan', email: 'juan@example.com' },
    items: { getItems: () => [] },
    ...overrides,
  };
}

function makeLinea(
  productoId: number,
  nombre: string,
  stock: number,
  precioUnitario: string,
  cantidad: number,
): Record<string, unknown> {
  return { cantidad, producto: { id: productoId, nombre, stock, precioUnitario } };
}

describe('PedidoService', () => {
  let service: PedidoService;
  let em: ReturnType<typeof db.getEm>;

  beforeEach(() => {
    seq = 0;
    service = new PedidoService();
    const base = {
      findOne: vi.fn(),
      find: vi.fn(),
      count: vi.fn(),
      flush: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn(),
      create: vi.fn((entity: { prototype: object }, data: Record<string, unknown>) =>
        Object.assign(Object.create(entity.prototype), { id: ++seq }, data),
      ),
      transactional: vi.fn(),
    };
    base.transactional.mockImplementation(async (cb: (em: unknown) => unknown) => cb(base));
    em = base as unknown as ReturnType<typeof db.getEm>;
    vi.spyOn(db, 'getEm').mockReturnValue(em);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('sin carrito responde 404', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);

    await expect(service.confirmarDesdeCarrito(5)).rejects.toMatchObject({ statusCode: 404 });
    expect(em.create).not.toHaveBeenCalled();
    expect(em.flush).not.toHaveBeenCalled();
  });

  it('carrito ya CONCLUIDO responde 409 (doble confirmación)', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(makeCarrito({ estado: 'CONCLUIDO' }) as never);

    await expect(service.confirmarDesdeCarrito(5)).rejects.toMatchObject({ statusCode: 409 });
    expect(em.create).not.toHaveBeenCalled();
  });

  it('carrito vacío responde 400', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(makeCarrito() as never);

    await expect(service.confirmarDesdeCarrito(5)).rejects.toMatchObject({ statusCode: 400 });
    expect(em.create).not.toHaveBeenCalled();
  });

  it('stock insuficiente en alguna línea responde 409 sin crear nada', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(
      makeCarrito({
        items: { getItems: () => [makeLinea(10, 'Barra', 5, '25.50', 10)] },
      }) as never,
    );
    const mejorElegible = vi
      .spyOn(DescuentoService.prototype, 'mejorElegible')
      .mockResolvedValue(null);

    await expect(service.confirmarDesdeCarrito(5)).rejects.toMatchObject({ statusCode: 409 });
    expect(mejorElegible).not.toHaveBeenCalled();
    expect(em.create).not.toHaveBeenCalled();
    expect(em.flush).not.toHaveBeenCalled();
  });

  it('aplica el mejor descuento por línea, descuenta stock y calcula importeTotal', async () => {
    const barra = makeLinea(10, 'Barra', 100, '10.00', 4);
    const guantes = makeLinea(11, 'Guantes', 50, '5.50', 2);
    const carrito = makeCarrito({
      items: { getItems: () => [barra, guantes] },
    });
    vi.spyOn(em, 'findOne').mockResolvedValue(carrito as never);
    vi.spyOn(DescuentoService.prototype, 'mejorElegible')
      .mockResolvedValueOnce({ porcentaje: 10 } as never)
      .mockResolvedValueOnce(null as never);

    const result = await service.confirmarDesdeCarrito(5);

    expect(em.create).toHaveBeenCalledWith(
      Pedido,
      expect.objectContaining({ estado: 'REALIZADO', importeTotal: '47.00' }),
    );
    expect(em.create).toHaveBeenCalledWith(
      PedidoItem,
      expect.objectContaining({
        cantidad: 4,
        precioUnitario: '10.00',
        subtotal: '36.00',
        descuentoAplicado: '10.00',
      }),
    );
    expect(em.create).toHaveBeenCalledWith(
      PedidoItem,
      expect.objectContaining({
        cantidad: 2,
        precioUnitario: '5.50',
        subtotal: '11.00',
        descuentoAplicado: null,
      }),
    );
    expect(em.create).toHaveBeenCalledWith(
      HistorialEstado,
      expect.objectContaining({ estado: 'REALIZADO' }),
    );
    expect(barra.producto).toMatchObject({ stock: 96 });
    expect(guantes.producto).toMatchObject({ stock: 48 });
    expect(carrito.estado).toBe('CONCLUIDO');
    expect(carrito.usuarioActivoSlot).toBeNull();
    expect(em.flush).toHaveBeenCalled();
    expect(result).toEqual(
      expect.objectContaining({
        estado: 'REALIZADO',
        importeTotal: '47.00',
        usuario: { id: 5, nombre: 'Juan', email: 'juan@example.com' },
        items: [
          {
            id: expect.any(Number),
            producto: { id: 10, nombre: 'Barra' },
            cantidad: 4,
            precioUnitario: '10.00',
            subtotal: '36.00',
            descuentoAplicado: '10.00',
          },
          {
            id: expect.any(Number),
            producto: { id: 11, nombre: 'Guantes' },
            cantidad: 2,
            precioUnitario: '5.50',
            subtotal: '11.00',
            descuentoAplicado: null,
          },
        ],
      }),
    );
  });

  it('sin descuento elegible snapshotea precio y deja descuentoAplicado null', async () => {
    const linea = makeLinea(10, 'Barra', 100, '9.99', 3);
    vi.spyOn(em, 'findOne').mockResolvedValue(
      makeCarrito({ items: { getItems: () => [linea] } }) as never,
    );
    vi.spyOn(DescuentoService.prototype, 'mejorElegible').mockResolvedValue(null);

    const result = await service.confirmarDesdeCarrito(5);

    expect(result.importeTotal).toBe('29.97');
    expect(result.items[0]?.descuentoAplicado).toBeNull();
    expect(result.items[0]?.subtotal).toBe('29.97');
  });

  it('listByUsuario devuelve { data, total } con los pedidos propios ordenados', async () => {
    const pedido = Object.assign(Object.create(Pedido.prototype), {
      id: 9,
      fecha: new Date('2026-10-01T10:00:00.000Z'),
      estado: 'REALIZADO',
      importeTotal: '81.00',
      usuario: { id: 5, nombre: 'Juan', email: 'juan@example.com' },
      createdAt: new Date('2026-10-01T10:00:00.000Z'),
      updatedAt: new Date('2026-10-01T10:00:00.000Z'),
    });
    vi.spyOn(em, 'find').mockResolvedValue([pedido] as never);

    const result = await service.listByUsuario(5);

    expect(em.find).toHaveBeenCalledWith(Pedido, { usuario: 5 }, { orderBy: { id: 'desc' } });
    expect(result.total).toBe(1);
    expect(result.data[0]).toEqual(
      expect.objectContaining({ id: 9, estado: 'REALIZADO', importeTotal: '81.00' }),
    );
    expect(result.data[0]).not.toHaveProperty('items');
  });

  it('listByUsuario sin pedidos devuelve data vacío y total 0', async () => {
    vi.spyOn(em, 'find').mockResolvedValue([] as never);

    const result = await service.listByUsuario(5);

    expect(result).toEqual({ data: [], total: 0 });
  });

  describe('gestión de pedido (012)', () => {
    function makePedido(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return Object.assign(Object.create(Pedido.prototype), {
        id: 42,
        fecha: new Date('2026-10-02T10:00:00.000Z'),
        estado: 'REALIZADO',
        importeTotal: '51.00',
        usuario: { id: 5, nombre: 'Juan', email: 'juan@example.com' },
        createdAt: new Date('2026-10-02T10:00:00.000Z'),
        updatedAt: new Date('2026-10-02T10:00:00.000Z'),
        items: { getItems: () => [] },
        ...overrides,
      });
    }

    function makeItem(productoId: number, cantidad: number, stock: number) {
      return {
        cantidad,
        producto: { id: productoId, stock },
        toPublic: () => ({ id: productoId, cantidad, producto: { id: productoId } }),
      };
    }

    it('findById devuelve el pedido popular con items y usuario', async () => {
      const pedido = makePedido();
      vi.spyOn(em, 'findOne').mockResolvedValue(pedido as never);

      const result = await service.findById(42);

      expect(em.findOne).toHaveBeenCalledWith(
        Pedido,
        { id: 42 },
        {
          populate: ['items', 'items.producto', 'usuario'],
        },
      );
      expect(result).toBe(pedido);
    });

    it('findById de pedido inexistente lanza 404', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValue(null);

      await expect(service.findById(404)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('findById con id no entero responde 400', async () => {
      await expect(service.findById(0)).rejects.toMatchObject({ statusCode: 400 });
      await expect(service.findById(2.5)).rejects.toMatchObject({ statusCode: 400 });
      expect(em.findOne).not.toHaveBeenCalled();
    });

    it('entregar con id no entero responde 400 sin abrir transacción', async () => {
      await expect(service.entregar(-1)).rejects.toMatchObject({ statusCode: 400 });
      expect(em.transactional).not.toHaveBeenCalled();
    });

    it('entregar bloquea el pedido con lock pesimista dentro de la transacción', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValue(makePedido() as never);

      await service.entregar(42);

      expect(em.findOne).toHaveBeenCalledWith(
        Pedido,
        { id: 42 },
        expect.objectContaining({ lockMode: LockMode.PESSIMISTIC_WRITE }),
      );
    });

    it('entregar pedido inexistente responde 404', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValue(null);

      await expect(service.entregar(404)).rejects.toMatchObject({ statusCode: 404 });
      expect(em.create).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('entregar pedido CANCELADO responde 409 con el estado actual', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValue(makePedido({ estado: 'CANCELADO' }) as never);

      await expect(service.entregar(42)).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('CANCELADO'),
      });
      expect(em.create).not.toHaveBeenCalled();
    });

    it('ABONADO responde 409 en ambas acciones (fase 1 sin transición de salida)', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValue(makePedido({ estado: 'ABONADO' }) as never);

      await expect(service.entregar(42)).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('ABONADO'),
      });
      await expect(service.cancelar(42)).rejects.toMatchObject({ statusCode: 409 });
      expect(em.create).not.toHaveBeenCalled();
    });

    it('entregar REALIZADO deja ENTREGADO, agrega historial y devuelve el detalle', async () => {
      const item = makeItem(10, 4, 96);
      const pedido = makePedido({ items: { getItems: () => [item] } });
      vi.spyOn(em, 'findOne').mockResolvedValue(pedido as never);

      const result = await service.entregar(42);

      expect(pedido.estado).toBe('ENTREGADO');
      expect(em.create).toHaveBeenCalledWith(
        HistorialEstado,
        expect.objectContaining({ estado: 'ENTREGADO' }),
      );
      expect(em.flush).toHaveBeenCalledTimes(1);
      expect(result).toEqual(
        expect.objectContaining({ id: 42, estado: 'ENTREGADO', importeTotal: '51.00' }),
      );
      expect(result.items).toHaveLength(1);
    });

    it('entregar dos veces responde 409 sin crear un segundo historial', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValue(makePedido({ estado: 'ENTREGADO' }) as never);

      await expect(service.entregar(42)).rejects.toMatchObject({
        statusCode: 409,
        message: expect.stringContaining('ENTREGADO'),
      });
      expect(em.create).not.toHaveBeenCalled();
    });

    it('cancelar REALIZADO suma exactamente el stock descontado y no toca importeTotal ni items', async () => {
      const barra = makeItem(10, 4, 96);
      const guantes = makeItem(11, 2, 48);
      const pedido = makePedido({
        items: { getItems: () => [barra, guantes] },
      });
      vi.spyOn(em, 'findOne').mockResolvedValue(pedido as never);

      const result = await service.cancelar(42);

      expect(barra.producto.stock).toBe(100);
      expect(guantes.producto.stock).toBe(50);
      expect(pedido.estado).toBe('CANCELADO');
      expect(pedido.importeTotal).toBe('51.00');
      expect(result.items).toHaveLength(2);
      expect(em.create).toHaveBeenCalledWith(
        HistorialEstado,
        expect.objectContaining({ estado: 'CANCELADO' }),
      );
      expect(em.flush).toHaveBeenCalledTimes(1);
    });

    it('cancelar pedido ENTREGADO responde 409 sin modificar stock', async () => {
      const item = makeItem(10, 4, 96);
      const pedido = makePedido({ estado: 'ENTREGADO', items: { getItems: () => [item] } });
      vi.spyOn(em, 'findOne').mockResolvedValue(pedido as never);

      await expect(service.cancelar(42)).rejects.toMatchObject({ statusCode: 409 });
      expect(item.producto.stock).toBe(96);
      expect(em.create).not.toHaveBeenCalled();
    });

    it('cancelar pedido inexistente responde 404', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValue(null);

      await expect(service.cancelar(42)).rejects.toMatchObject({ statusCode: 404 });
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('historial devuelve { data, total } ordenado por fecha asc', async () => {
      const pedido = makePedido();
      const filas = [
        Object.assign(Object.create(HistorialEstado.prototype), {
          id: 1,
          estado: 'REALIZADO',
          fecha: new Date('2026-10-02T10:00:00.000Z'),
        }),
        Object.assign(Object.create(HistorialEstado.prototype), {
          id: 2,
          estado: 'ENTREGADO',
          fecha: new Date('2026-10-03T09:00:00.000Z'),
        }),
      ];
      vi.spyOn(em, 'findOne').mockResolvedValue(pedido as never);
      vi.spyOn(em, 'find').mockResolvedValue(filas as never);

      const result = await service.historial(42);

      expect(em.find).toHaveBeenCalledWith(
        HistorialEstado,
        { pedido: 42 },
        {
          orderBy: { fecha: 'asc', id: 'asc' },
        },
      );
      expect(result.total).toBe(2);
      expect(result.data).toEqual([
        { id: 1, estado: 'REALIZADO', fecha: filas[0].fecha },
        { id: 2, estado: 'ENTREGADO', fecha: filas[1].fecha },
      ]);
    });

    it('historial de pedido inexistente responde 404', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValue(null);

      await expect(service.historial(42)).rejects.toMatchObject({ statusCode: 404 });
      expect(em.find).not.toHaveBeenCalled();
    });

    it('historial con id no entero responde 400', async () => {
      await expect(service.historial('abc' as never)).rejects.toMatchObject({
        statusCode: 400,
      });
    });
  });

  describe('listado admin de pedidos (013)', () => {
    function makePedidoLista(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return Object.assign(Object.create(Pedido.prototype), {
        id: 9,
        fecha: new Date('2026-10-01T10:00:00.000Z'),
        estado: 'REALIZADO',
        importeTotal: '81.00',
        usuario: { id: 5, nombre: 'Juan', email: 'juan@x.com' },
        createdAt: new Date('2026-10-01T10:00:00.000Z'),
        updatedAt: new Date('2026-10-01T10:00:00.000Z'),
        ...overrides,
      });
    }

    it('validaciones de listAdmin responden 400 sin consultar la DB', async () => {
      await expect(service.listAdmin({ estado: 'PENDIENTE' as never })).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(
        service.listAdmin({ desde: '2026-12-31', hasta: '2026-01-01' }),
      ).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(service.listAdmin({ desde: '31-12-2026' })).rejects.toMatchObject({
        statusCode: 400,
      });
      await expect(service.listAdmin({ page: 0 })).rejects.toMatchObject({ statusCode: 400 });
      await expect(service.listAdmin({ size: 101 })).rejects.toMatchObject({ statusCode: 400 });
      await expect(service.listAdmin({ idCliente: NaN })).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(em.find).not.toHaveBeenCalled();
      expect(em.count).not.toHaveBeenCalled();
    });

    it('combina filtros, pagina y ordena por fecha desc', async () => {
      const pedido = makePedidoLista();
      vi.spyOn(em, 'find')
        .mockResolvedValueOnce([pedido] as never)
        .mockResolvedValueOnce([] as never);
      vi.spyOn(em, 'count').mockResolvedValue(3 as never);

      const result = await service.listAdmin({
        desde: '2026-10-01',
        hasta: '2026-10-31',
        estado: 'REALIZADO',
        idCliente: 5,
        cliente: 'juan',
        page: 2,
        size: 5,
      });

      expect(em.find).toHaveBeenCalledWith(
        Pedido,
        {
          $and: [
            {
              fecha: {
                $gte: new Date('2026-10-01T00:00:00.000Z'),
                $lte: new Date('2026-10-31T23:59:59.999Z'),
              },
            },
            { estado: 'REALIZADO' },
            { usuario: { id: 5 } },
            {
              $or: [
                { usuario: { nombre: { $like: '%juan%' } } },
                { usuario: { email: { $like: '%juan%' } } },
              ],
            },
          ],
        },
        expect.objectContaining({
          populate: ['usuario'],
          orderBy: { fecha: 'desc', id: 'desc' },
          offset: 5,
          limit: 5,
        }),
      );
      expect(em.count).toHaveBeenCalledWith(
        Pedido,
        expect.objectContaining({ $and: expect.any(Array) }),
      );
      expect(result).toEqual({
        data: [expect.objectContaining({ id: 9, fechaEntrega: null })],
        total: 3,
        page: 2,
        size: 5,
      });
    });

    it('sin filtros el where queda vacio y usa defaults page 1 / size 20', async () => {
      vi.spyOn(em, 'find').mockResolvedValueOnce([] as never);
      vi.spyOn(em, 'count').mockResolvedValue(0 as never);

      const result = await service.listAdmin({});

      expect(em.find).toHaveBeenCalledWith(Pedido, {}, expect.anything());
      expect(result).toEqual({ data: [], total: 0, page: 1, size: 20 });
    });

    it('deriva fechaEntrega del historial ENTREGADO y la deja null sin fila', async () => {
      const entregado = makePedidoLista({ id: 1, estado: 'ENTREGADO' });
      const pendiente = makePedidoLista({ id: 2 });
      const fecha = new Date('2026-10-03T09:00:00.000Z');
      vi.spyOn(em, 'find')
        .mockResolvedValueOnce([entregado, pendiente] as never)
        .mockResolvedValueOnce([
          Object.assign(Object.create(HistorialEstado.prototype), {
            id: 7,
            estado: 'ENTREGADO',
            fecha,
            pedido: { id: 1 },
          }),
        ] as never);
      vi.spyOn(em, 'count').mockResolvedValue(2 as never);

      const result = await service.listAdmin({});

      expect(em.find).toHaveBeenNthCalledWith(
        2,
        HistorialEstado,
        { pedido: { $in: [1, 2] }, estado: 'ENTREGADO' },
        { orderBy: { fecha: 'asc', id: 'asc' } },
      );
      expect(result.data[0]?.fechaEntrega).toEqual(fecha);
      expect(result.data[1]?.fechaEntrega).toBeNull();
    });

    it('pagina vacia no consulta el historial', async () => {
      vi.spyOn(em, 'find').mockResolvedValueOnce([] as never);
      vi.spyOn(em, 'count').mockResolvedValue(0 as never);

      const result = await service.listAdmin({});

      expect(em.find).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ data: [], total: 0, page: 1, size: 20 });
    });
  });

  describe('detalle de pedidos admin y propio (013)', () => {
    function makePedidoDetalle(overrides: Record<string, unknown> = {}): Record<string, unknown> {
      return Object.assign(Object.create(Pedido.prototype), {
        id: 42,
        fecha: new Date('2026-10-02T10:00:00.000Z'),
        estado: 'REALIZADO',
        importeTotal: '20.00',
        usuario: {
          id: 5,
          nombre: 'Juan',
          email: 'juan@x.com',
          telefono: '123',
          direccion: 'Av. Siempreviva 742',
        },
        items: { getItems: () => [] },
        createdAt: new Date('2026-10-02T10:00:00.000Z'),
        updatedAt: new Date('2026-10-02T10:00:00.000Z'),
        ...overrides,
      });
    }

    function makeItemDetalle(cantidad: number) {
      return {
        toPublic: () => ({
          id: 1,
          producto: { id: 10, nombre: 'Barra' },
          cantidad,
          precioUnitario: '10.00',
          subtotal: '20.00',
          descuentoAplicado: null,
        }),
      };
    }

    it('getByIdAdmin devuelve items y datos completos del cliente', async () => {
      const pedido = makePedidoDetalle({ items: { getItems: () => [makeItemDetalle(2)] } });
      vi.spyOn(em, 'findOne').mockResolvedValue(pedido as never);

      const result = await service.getByIdAdmin(42);

      expect(em.findOne).toHaveBeenCalledWith(
        Pedido,
        { id: 42 },
        { populate: ['items', 'items.producto', 'usuario'] },
      );
      expect(result.usuario).toEqual({
        id: 5,
        nombre: 'Juan',
        email: 'juan@x.com',
        telefono: '123',
        direccion: 'Av. Siempreviva 742',
      });
      expect(result.items).toHaveLength(1);
      expect(result.items[0]).toEqual(
        expect.objectContaining({ cantidad: 2, precioUnitario: '10.00', subtotal: '20.00' }),
      );
      expect(result).not.toHaveProperty('passwordHash');
    });

    it('getByIdAdmin inexistente responde 404', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValue(null);

      await expect(service.getByIdAdmin(404)).rejects.toMatchObject({ statusCode: 404 });
    });

    it('getByIdAdmin con id no entero responde 400 sin consultar la DB', async () => {
      await expect(service.getByIdAdmin(2.5)).rejects.toMatchObject({ statusCode: 400 });
      await expect(service.getByIdAdmin(0)).rejects.toMatchObject({ statusCode: 400 });
      expect(em.findOne).not.toHaveBeenCalled();
    });

    it('getByIdOwn de pedido ajeno responde 404 con el usuario en el where', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValue(null);

      await expect(service.getByIdOwn(42, 7)).rejects.toMatchObject({ statusCode: 404 });
      expect(em.findOne).toHaveBeenCalledWith(
        Pedido,
        { id: 42, usuario: 7 },
        { populate: ['items', 'items.producto', 'usuario'] },
      );
    });

    it('getByIdOwn propio devuelve el detalle con items', async () => {
      const pedido = makePedidoDetalle({ items: { getItems: () => [makeItemDetalle(2)] } });
      vi.spyOn(em, 'findOne').mockResolvedValue(pedido as never);

      const result = await service.getByIdOwn(42, 5);

      expect(result).toEqual(
        expect.objectContaining({ id: 42, items: [expect.objectContaining({ cantidad: 2 })] }),
      );
    });

    it('getByIdOwn con id no entero responde 400 sin consultar la DB', async () => {
      await expect(service.getByIdOwn('abc' as never, 5)).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(em.findOne).not.toHaveBeenCalled();
    });
  });
});
