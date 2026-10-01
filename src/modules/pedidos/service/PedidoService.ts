import type { EntityManager } from '@mikro-orm/core';
import { LockMode } from '@mikro-orm/core';
import { Decimal } from 'decimal.js';
import { getEm } from '../../../config/db.js';
import { AppError } from '../../../common/errors/AppError.js';
import { Carrito } from '../../carritos/entity/Carrito.js';
import { DescuentoService } from '../../descuentos/service/DescuentoService.js';
import { Pedido, type PedidoDetallePublic, type PedidoPublic } from '../entity/Pedido.js';
import { PedidoItem } from '../entity/PedidoItem.js';
import { HistorialEstado } from '../entity/HistorialEstado.js';

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
          lockMode: LockMode.PESSIMISTIC_WRITE,
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
}
