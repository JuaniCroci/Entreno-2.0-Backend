import type { EntityManager } from '@mikro-orm/core';
import { LockMode } from '@mikro-orm/core';
import { Decimal } from 'decimal.js';
import { getEm } from '../../../config/db.js';
import { AppError } from '../../../common/errors/AppError.js';
import { parseDateRange } from '../../../common/utils/date-range.js';
import { Carrito } from '../../carritos/entity/Carrito.js';
import { DescuentoService } from '../../descuentos/service/DescuentoService.js';
import {
  Pedido,
  ESTADOS_PEDIDO,
  type PedidoDetallePublic,
  type PedidoListPublic,
  type PedidoPublic,
} from '../entity/Pedido.js';
import { PedidoItem } from '../entity/PedidoItem.js';
import { HistorialEstado, type HistorialEstadoPublic } from '../entity/HistorialEstado.js';
import { transicion, type Accion } from './transiciones.js';
import type { FilterPedidoAdminDto } from '../dto/FilterPedidoAdminDto.js';

export interface PedidosPageResult {
  data: PedidoListPublic[];
  total: number;
  page: number;
  size: number;
}

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

  async listAdmin(filters: FilterPedidoAdminDto): Promise<PedidosPageResult> {
    const page = filters.page ?? 1;
    const size = filters.size ?? 20;
    if (!Number.isInteger(page) || page < 1) {
      throw new AppError(400, 'page debe ser un entero mayor o igual a 1');
    }
    if (!Number.isInteger(size) || size < 1 || size > 100) {
      throw new AppError(400, 'size debe ser un entero entre 1 y 100');
    }
    if (filters.estado !== undefined && !ESTADOS_PEDIDO.includes(filters.estado)) {
      throw new AppError(400, 'estado debe ser REALIZADO, ABONADO, ENTREGADO o CANCELADO');
    }
    if (filters.idCliente !== undefined && !Number.isInteger(filters.idCliente)) {
      throw new AppError(400, 'idCliente debe ser un entero');
    }

    const { desde, hasta } = parseDateRange(filters.desde, filters.hasta);

    const condiciones: Record<string, unknown>[] = [];
    if (desde || hasta) {
      const rango: { $gte?: Date; $lte?: Date } = {};
      if (desde) rango.$gte = desde;
      if (hasta) rango.$lte = hasta;
      condiciones.push({ fecha: rango });
    }
    if (filters.estado !== undefined) condiciones.push({ estado: filters.estado });
    if (filters.idCliente !== undefined) condiciones.push({ usuario: { id: filters.idCliente } });
    if (filters.cliente) {
      const patron = `%${filters.cliente}%`;
      condiciones.push({
        $or: [
          { usuario: { nombre: { $like: patron } } },
          { usuario: { email: { $like: patron } } },
        ],
      });
    }
    const where = condiciones.length > 0 ? { $and: condiciones } : {};

    const [pedidos, total] = await Promise.all([
      this.em.find(Pedido, where, {
        populate: ['usuario'],
        orderBy: { fecha: 'desc', id: 'desc' },
        offset: (page - 1) * size,
        limit: size,
      }),
      this.em.count(Pedido, where),
    ]);

    const fechaEntrega = await this.calcularFechaEntrega(pedidos.map((pedido) => pedido.id));
    return {
      data: pedidos.map((pedido) => pedido.toListPublic(fechaEntrega.get(pedido.id) ?? null)),
      total,
      page,
      size,
    };
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

  private async calcularFechaEntrega(ids: number[]): Promise<Map<number, Date>> {
    const mapa = new Map<number, Date>();
    if (ids.length === 0) return mapa;
    const filas = await this.em.find(
      HistorialEstado,
      { pedido: { $in: ids }, estado: 'ENTREGADO' },
      { orderBy: { fecha: 'asc', id: 'asc' } },
    );
    for (const fila of filas) {
      const pedidoId = fila.pedido.id;
      if (!mapa.has(pedidoId)) mapa.set(pedidoId, fila.fecha);
    }
    return mapa;
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
