import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CarritoService } from '../../src/modules/carritos/service/CarritoService.js';
import { Carrito } from '../../src/modules/carritos/entity/Carrito.js';
import { CarritoItem } from '../../src/modules/carritos/entity/CarritoItem.js';
import * as db from '../../src/config/db.js';

function makeItem(
  id: number,
  productoId: number,
  nombre: string,
  precioUnitario: string,
  cantidad: number,
): Record<string, unknown> {
  const item: Record<string, unknown> = {
    id,
    producto: { id: productoId, nombre, precioUnitario },
    cantidad,
  };
  item.toPublic = () => ({
    id,
    producto: { id: productoId, nombre, precioUnitario },
    cantidad,
  });
  return item;
}

function makeCarrito(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    id: 7,
    estado: 'ACTIVO',
    usuarioActivoSlot: 5,
    items: { isInitialized: () => false, getItems: () => [] },
    ...overrides,
  };
}

describe('CarritoService', () => {
  let service: CarritoService;
  let em: ReturnType<typeof db.getEm>;

  beforeEach(() => {
    service = new CarritoService();
    em = {
      findOne: vi.fn(),
      find: vi.fn(),
      create: vi.fn(),
      flush: vi.fn(),
      remove: vi.fn(),
      getReference: vi.fn((_entity: unknown, id: number) => ({ id })),
    } as unknown as ReturnType<typeof db.getEm>;
    vi.spyOn(db, 'getEm').mockReturnValue(em);
  });

  it('getOrCreateActivo crea carrito ACTIVO con usuarioActivoSlot = usuarioId', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);
    const nuevo = makeCarrito({ creado: true });
    vi.spyOn(em, 'create').mockReturnValue(nuevo as never);
    vi.spyOn(em, 'flush').mockResolvedValue(undefined as never);

    const result = await service.getOrCreateActivo(5);

    expect(em.create).toHaveBeenCalledWith(
      Carrito,
      expect.objectContaining({ estado: 'ACTIVO', usuarioActivoSlot: 5 }),
    );
    expect(result.creado).toBe(true);
    expect(result.carrito).toBe(nuevo);
  });

  it('getOrCreateActivo devuelve el existente sin crear (idempotente) y popular items', async () => {
    const existente = makeCarrito({ id: 9 });
    vi.spyOn(em, 'findOne').mockResolvedValue(existente as never);

    const result = await service.getOrCreateActivo(5);

    expect(em.findOne).toHaveBeenCalledWith(
      Carrito,
      { usuario: 5, estado: 'ACTIVO' },
      expect.objectContaining({ populate: ['items', 'items.producto'] }),
    );
    expect(em.create).not.toHaveBeenCalled();
    expect(result).toEqual({ carrito: existente, creado: false });
  });

  it('getView lanza 404 si no hay carrito activo', async () => {
    vi.spyOn(em, 'findOne').mockResolvedValue(null);

    await expect(service.getView(5)).rejects.toMatchObject({ statusCode: 404 });
    expect(em.create).not.toHaveBeenCalled();
  });

  it('getView devuelve items con subtotales por línea y total', async () => {
    const carrito = makeCarrito({
      id: 7,
      items: {
        isInitialized: () => true,
        getItems: () => [
          makeItem(1, 10, 'Barra', '20.00', 3),
          makeItem(2, 11, 'Guantes', '9.99', 1),
        ],
      },
    });
    vi.spyOn(em, 'findOne').mockResolvedValue(carrito as never);

    const view = await service.getView(5);

    expect(view).toEqual({
      id: 7,
      estado: 'ACTIVO',
      items: [
        {
          id: 1,
          producto: { id: 10, nombre: 'Barra', precioUnitario: '20.00' },
          cantidad: 3,
          subtotal: '60.00',
        },
        {
          id: 2,
          producto: { id: 11, nombre: 'Guantes', precioUnitario: '9.99' },
          cantidad: 1,
          subtotal: '9.99',
        },
      ],
      total: '69.99',
    });
  });

  it('toView de carrito sin items inicializados devuelve lista vacía y total 0.00', async () => {
    const carrito = makeCarrito();

    const view = service.toView(carrito as never);

    expect(view).toEqual({ id: 7, estado: 'ACTIVO', items: [], total: '0.00' });
  });

  describe('addItem', () => {
    const productoOk = {
      id: 10,
      nombre: 'Barra olímpica',
      activo: true,
      stock: 100,
      precioUnitario: '25.50',
    };

    it('crea el carrito implícitamente y agrega línea nueva (creada: true)', async () => {
      vi.spyOn(em, 'findOne')
        .mockResolvedValueOnce(productoOk as never)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeCarrito() as never);
      vi.spyOn(em, 'create').mockReturnValue({} as never);
      vi.spyOn(em, 'flush').mockResolvedValue(undefined as never);

      const result = await service.addItem(5, { idProducto: 10, cantidad: 3 });

      expect(em.create).toHaveBeenNthCalledWith(
        1,
        Carrito,
        expect.objectContaining({ usuarioActivoSlot: 5, estado: 'ACTIVO' }),
      );
      expect(em.create).toHaveBeenNthCalledWith(
        2,
        CarritoItem,
        expect.objectContaining({ cantidad: 3 }),
      );
      expect(em.flush).toHaveBeenCalled();
      expect(result.creada).toBe(true);
      expect(result.view).toEqual(expect.objectContaining({ estado: 'ACTIVO' }));
    });

    it('incrementa la línea existente sin duplicar (creada: false)', async () => {
      const itemExistente = { id: 3, cantidad: 2, producto: productoOk };
      vi.spyOn(em, 'findOne')
        .mockResolvedValueOnce(productoOk as never)
        .mockResolvedValueOnce({ id: 7, estado: 'ACTIVO' } as never)
        .mockResolvedValueOnce(itemExistente as never)
        .mockResolvedValueOnce(makeCarrito() as never);
      vi.spyOn(em, 'flush').mockResolvedValue(undefined as never);

      const result = await service.addItem(5, { idProducto: 10, cantidad: 3 });

      expect(em.create).not.toHaveBeenCalled();
      expect(itemExistente.cantidad).toBe(5);
      expect(result.creada).toBe(false);
    });

    it('producto inexistente responde 404 sin crear nada', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValueOnce(null);

      await expect(service.addItem(5, { idProducto: 999, cantidad: 1 })).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(em.create).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('producto inactivo responde 400', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValueOnce({ ...productoOk, activo: false } as never);

      await expect(service.addItem(5, { idProducto: 10, cantidad: 1 })).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('producto sin stock responde 409', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValueOnce({ ...productoOk, stock: 0 } as never);

      await expect(service.addItem(5, { idProducto: 10, cantidad: 1 })).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('cantidad en carrito que excede el stock responde 409', async () => {
      vi.spyOn(em, 'findOne')
        .mockResolvedValueOnce({ ...productoOk, stock: 6 } as never)
        .mockResolvedValueOnce({ id: 7, estado: 'ACTIVO' } as never)
        .mockResolvedValueOnce({ id: 3, cantidad: 2, producto: productoOk } as never);

      await expect(service.addItem(5, { idProducto: 10, cantidad: 5 })).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(em.create).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
    });
  });

  describe('updateItem', () => {
    it('itemId no numérico responde 400 sin consultar', async () => {
      await expect(service.updateItem(5, NaN, { cantidad: 2 })).rejects.toMatchObject({
        statusCode: 400,
      });
      expect(em.findOne).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('item inexistente o de otro carrito responde 404', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValueOnce(null);

      await expect(service.updateItem(5, 33, { cantidad: 2 })).rejects.toMatchObject({
        statusCode: 404,
      });
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('cambia la cantidad y devuelve la vista actualizada', async () => {
      const item = { id: 3, cantidad: 2, producto: { id: 10, stock: 10, precioUnitario: '25.50' } };
      vi.spyOn(em, 'findOne')
        .mockResolvedValueOnce(item as never)
        .mockResolvedValueOnce(
          makeCarrito({
            items: {
              isInitialized: () => true,
              getItems: () => [makeItem(3, 10, 'Barra', '25.50', 4)],
            },
          }) as never,
        );
      vi.spyOn(em, 'flush').mockResolvedValue(undefined as never);

      const view = await service.updateItem(5, 3, { cantidad: 4 });

      expect(item.cantidad).toBe(4);
      expect(em.flush).toHaveBeenCalled();
      expect(view.total).toBe('102.00');
    });

    it('cantidad mayor que el stock responde 409 sin persistir', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValueOnce({
        id: 3,
        cantidad: 2,
        producto: { id: 10, stock: 10 },
      } as never);

      await expect(service.updateItem(5, 3, { cantidad: 50 })).rejects.toMatchObject({
        statusCode: 409,
      });
      expect(em.flush).not.toHaveBeenCalled();
    });
  });

  describe('removeItem', () => {
    it('itemId no numérico responde 400 sin consultar', async () => {
      await expect(service.removeItem(5, NaN)).rejects.toMatchObject({ statusCode: 400 });
      expect(em.findOne).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('item inexistente o de otro carrito responde 404', async () => {
      vi.spyOn(em, 'findOne').mockResolvedValueOnce(null);

      await expect(service.removeItem(5, 33)).rejects.toMatchObject({ statusCode: 404 });
      expect(em.remove).not.toHaveBeenCalled();
      expect(em.flush).not.toHaveBeenCalled();
    });

    it('elimina la línea con remove + flush', async () => {
      const item = { id: 3, cantidad: 2 };
      vi.spyOn(em, 'findOne').mockResolvedValueOnce(item as never);
      vi.spyOn(em, 'flush').mockResolvedValue(undefined as never);

      await service.removeItem(5, 3);

      expect(em.remove).toHaveBeenCalledWith(item);
      expect(em.flush).toHaveBeenCalled();
    });
  });
});
