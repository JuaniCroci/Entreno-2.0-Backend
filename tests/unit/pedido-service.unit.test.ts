import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
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
});
