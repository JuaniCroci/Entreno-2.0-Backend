import type { EntityManager } from '@mikro-orm/core';
import { Decimal } from 'decimal.js';
import { getEm } from '../../../config/db.js';
import { AppError } from '../../../common/errors/AppError.js';
import { Usuario } from '../../usuarios/entity/Usuario.js';
import { Carrito, type EstadoCarrito } from '../entity/Carrito.js';
import { CarritoItem, type CarritoItemPublic } from '../entity/CarritoItem.js';
import { Producto } from '../../productos/entity/Producto.js';
import type { AddItemDto } from '../dto/AddItemDto.js';
import type { UpdateItemDto } from '../dto/UpdateItemDto.js';

export interface CarritoItemView extends CarritoItemPublic {
  subtotal: string;
}

export interface CarritoView {
  id: number;
  estado: EstadoCarrito;
  items: CarritoItemView[];
  total: string;
}

export class CarritoService {
  private get em(): EntityManager {
    return getEm();
  }

  async getOrCreateActivo(usuarioId: number): Promise<{ carrito: Carrito; creado: boolean }> {
    const existente = await this.em.findOne(
      Carrito,
      { usuario: usuarioId, estado: 'ACTIVO' },
      { populate: ['items', 'items.producto'] },
    );
    if (existente) {
      return { carrito: existente, creado: false };
    }
    const now = new Date();
    const carrito = this.em.create(Carrito, {
      usuario: this.em.getReference(Usuario, usuarioId),
      estado: 'ACTIVO',
      usuarioActivoSlot: usuarioId,
      createdAt: now,
      updatedAt: now,
    });
    await this.em.flush();
    return { carrito, creado: true };
  }

  async getView(usuarioId: number): Promise<CarritoView> {
    const carrito = await this.em.findOne(
      Carrito,
      { usuario: usuarioId, estado: 'ACTIVO' },
      { populate: ['items', 'items.producto'] },
    );
    if (!carrito) {
      throw new AppError(404, 'No hay carrito activo para el usuario');
    }
    return this.toView(carrito);
  }

  async addItem(
    usuarioId: number,
    dto: AddItemDto,
  ): Promise<{ view: CarritoView; creada: boolean }> {
    const producto = await this.em.findOne(Producto, { id: dto.idProducto });
    if (!producto) {
      throw new AppError(404, 'Producto no encontrado');
    }
    if (!producto.activo) {
      throw new AppError(400, 'El producto está inactivo');
    }
    if (producto.stock <= 0) {
      throw new AppError(409, 'Sin stock disponible para el producto');
    }

    const carritoActivo = await this.em.findOne(Carrito, {
      usuario: usuarioId,
      estado: 'ACTIVO',
    });
    const item = carritoActivo
      ? await this.em.findOne(CarritoItem, {
          carrito: carritoActivo.id,
          producto: dto.idProducto,
        })
      : null;
    const cantidadActual = item?.cantidad ?? 0;
    if (cantidadActual + dto.cantidad > producto.stock) {
      throw new AppError(409, 'La cantidad en carrito supera el stock disponible');
    }

    let carrito = carritoActivo;
    if (!carrito) {
      const now = new Date();
      carrito = this.em.create(Carrito, {
        usuario: this.em.getReference(Usuario, usuarioId),
        estado: 'ACTIVO',
        usuarioActivoSlot: usuarioId,
        createdAt: now,
        updatedAt: now,
      });
    }

    let creada = false;
    if (item) {
      item.cantidad = cantidadActual + dto.cantidad;
    } else {
      this.em.create(CarritoItem, { carrito, producto, cantidad: dto.cantidad });
      creada = true;
    }
    await this.em.flush();
    const view = await this.getView(usuarioId);
    return { view, creada };
  }

  async updateItem(usuarioId: number, itemId: number, dto: UpdateItemDto): Promise<CarritoView> {
    if (!Number.isInteger(itemId) || itemId <= 0) throw new AppError(400, 'ID inválido');
    const item = await this.em.findOne(
      CarritoItem,
      { id: itemId, carrito: { usuario: usuarioId, estado: 'ACTIVO' } },
      { populate: ['producto'] },
    );
    if (!item) {
      throw new AppError(404, 'Item de carrito no encontrado');
    }
    if (dto.cantidad > item.producto.stock) {
      throw new AppError(409, 'La cantidad en carrito supera el stock disponible');
    }
    item.cantidad = dto.cantidad;
    await this.em.flush();
    return this.getView(usuarioId);
  }

  async removeItem(usuarioId: number, itemId: number): Promise<void> {
    if (!Number.isInteger(itemId) || itemId <= 0) throw new AppError(400, 'ID inválido');
    const item = await this.em.findOne(CarritoItem, {
      id: itemId,
      carrito: { usuario: usuarioId, estado: 'ACTIVO' },
    });
    if (!item) {
      throw new AppError(404, 'Item de carrito no encontrado');
    }
    this.em.remove(item);
    await this.em.flush();
  }

  toView(carrito: Carrito): CarritoView {
    const raw = carrito.items.isInitialized() ? carrito.items.getItems() : [];
    const items: CarritoItemView[] = raw.map((item) => ({
      ...item.toPublic(),
      subtotal: new Decimal(item.producto.precioUnitario).mul(item.cantidad).toFixed(2),
    }));
    const total = items.reduce((acc, item) => acc.plus(item.subtotal), new Decimal(0));
    return {
      id: carrito.id,
      estado: carrito.estado,
      items,
      total: total.toFixed(2),
    };
  }
}
