import type { EntityManager } from '@mikro-orm/core';
import { LockMode } from '@mikro-orm/core';
import { Decimal } from 'decimal.js';
import { getEm } from '../../../config/db.js';
import { AppError } from '../../../common/errors/AppError.js';
import { Carrito } from '../../carritos/entity/Carrito.js';
import { DescuentoService } from '../../descuentos/service/DescuentoService.js';
import { Pedido, type PedidoDetallePublic, type PedidoPublic } from '../entity/Pedido.js';
import { PedidoItem } from '../entity/PedidoItem.js';
import { HistorialEstado, type HistorialEstadoPublic } from '../entity/HistorialEstado.js';
import { transicion, type Accion } from './transiciones.js';

export class PedidoService {
  private descuentos = new DescuentoService();

  private get em(): EntityManager {
    return getEm();
  }

  async confirmarDesdeCarrito(usuarioId: number): Promise<PedidoDetallePublic> {
    return this.em.transactional(async (em) => {
      const carrito = await em.findOne(
        Carrito,
        { usuario: usuarioId },
        {
          populate: ['items', 'items.producto', 'usuario'],
          orderBy: { id: 'desc' },
        },
      );
      if (!carrito) {
        throw new AppError(404, 'No hay carrito activo para el usuario');
      }
      if (carrito.estado !== 'ACTIVO') {
        throw new AppError(409, 'El carrito ya fue confirmado');
      }
      const items = carrito.items.getItems();
      if (items.length === 0) {
        throw new AppError(400, 'El carrito está vacío');
      }

      const ordenados = [...items].sort((a, b) => a.producto.id - b.producto.id);
      for (const item of ordenados) {
        if (item.cantidad > item.producto.stock) {
          throw new AppError(
            409,
            `Stock insuficiente para ${item.producto.nombre} (stock actual ${item.producto.stock}, requiere ${item.cantidad})`,
          );
        }
      }

      const fecha = new Date();
      const lineas: {
        producto: (typeof ordenados)[number]['producto'];
        cantidad: number;
        precioUnitario: string;
        subtotal: string;
        descuentoAplicado: string | null;
      }[] = [];
      let importeTotal = new Decimal(0);
      for (const item of ordenados) {
        const descuento = await this.descuentos.mejorElegible(
          item.producto.id,
          item.cantidad,
          fecha,
        );
        const bruto = new Decimal(item.producto.precioUnitario).mul(item.cantidad);
        const descuentoAplicado = descuento ? new Decimal(descuento.porcentaje).toFixed(2) : null;
        const subtotal = descuento
          ? bruto.mul(new Decimal(100).minus(descuento.porcentaje)).div(100).toFixed(2)
          : bruto.toFixed(2);
        importeTotal = importeTotal.plus(subtotal);
        lineas.push({
          producto: item.producto,
          cantidad: item.cantidad,
          precioUnitario: item.producto.precioUnitario,
          subtotal,
          descuentoAplicado,
        });
      }

      const now = new Date();
      const pedido = em.create(Pedido, {
        usuario: carrito.usuario,
        fecha,
        estado: 'REALIZADO',
        importeTotal: importeTotal.toFixed(2),
        createdAt: now,
        updatedAt: now,
      });

      const detalleItems: PedidoItem[] = [];
      for (const linea of lineas) {
        const pedidoItem = em.create(PedidoItem, {
          pedido,
          producto: linea.producto,
          cantidad: linea.cantidad,
          precioUnitario: linea.precioUnitario,
          subtotal: linea.subtotal,
          descuentoAplicado: linea.descuentoAplicado,
        });
        detalleItems.push(pedidoItem);
        linea.producto.stock -= linea.cantidad;
      }

      em.create(HistorialEstado, { pedido, estado: 'REALIZADO', fecha: now });

      carrito.estado = 'CONCLUIDO';
      carrito.usuarioActivoSlot = null;

      await em.flush();
      return pedido.toDetalle(detalleItems.map((item) => item.toPublic()));
    });
  }

  async listByUsuario(usuarioId: number): Promise<{ data: PedidoPublic[]; total: number }> {
    const pedidos = await this.em.find(Pedido, { usuario: usuarioId }, { orderBy: { id: 'desc' } });
    return { data: pedidos.map((pedido) => pedido.toPublic()), total: pedidos.length };
  }

  async findById(id: number): Promise<Pedido> {
    this.validarId(id);
    const pedido = await this.em.findOne(
      Pedido,
      { id },
      {
        populate: ['items', 'items.producto', 'usuario'],
      },
    );
    if (!pedido) {
      throw new AppError(404, 'Pedido no encontrado');
    }
    return pedido;
  }

  async entregar(id: number): Promise<PedidoDetallePublic> {
    return this.cambiarEstado(id, 'entregar');
  }

  async cancelar(id: number): Promise<PedidoDetallePublic> {
    return this.cambiarEstado(id, 'cancelar');
  }

  async historial(id: number): Promise<{ data: HistorialEstadoPublic[]; total: number }> {
    await this.findById(id);
    const filas = await this.em.find(
      HistorialEstado,
      { pedido: id },
      {
        orderBy: { fecha: 'asc', id: 'asc' },
      },
    );
    return { data: filas.map((fila) => fila.toPublic()), total: filas.length };
  }

  private validarId(id: number): void {
    if (!Number.isInteger(id) || id <= 0) {
      throw new AppError(400, 'ID inválido');
    }
  }

  private async cambiarEstado(id: number, accion: Accion): Promise<PedidoDetallePublic> {
    this.validarId(id);
    return this.em.transactional(async (em) => {
      const pedido = await em.findOne(
        Pedido,
        { id },
        {
          populate: ['items', 'items.producto', 'usuario'],
          lockMode: LockMode.PESSIMISTIC_WRITE,
        },
      );
      if (!pedido) {
        throw new AppError(404, 'Pedido no encontrado');
      }
      const destino = transicion(pedido.estado, accion);
      if (!destino) {
        throw new AppError(
          409,
          `El pedido está en estado ${pedido.estado} y no se puede ${accion}`,
        );
      }
      const items = pedido.items.getItems();
      if (accion === 'cancelar') {
        const ordenados = [...items].sort((a, b) => a.producto.id - b.producto.id);
        for (const item of ordenados) {
          item.producto.stock += item.cantidad;
        }
      }
      const now = new Date();
      pedido.estado = destino;
      em.create(HistorialEstado, { pedido, estado: destino, fecha: now });
      await em.flush();
      return pedido.toDetalle(items.map((item) => item.toPublic()));
    });
  }
}
