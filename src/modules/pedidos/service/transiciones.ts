import type { EstadoPedido } from '../entity/Pedido.js';

export type Accion = 'entregar' | 'cancelar';

export const ACCIONES: Accion[] = ['entregar', 'cancelar'];

export const TRANSICIONES: Record<EstadoPedido, Partial<Record<Accion, EstadoPedido>>> = {
  REALIZADO: { entregar: 'ENTREGADO', cancelar: 'CANCELADO' },
  ABONADO: {},
  ENTREGADO: {},
  CANCELADO: {},
};

export function transicion(actual: EstadoPedido, accion: Accion): EstadoPedido | null {
  return TRANSICIONES[actual]?.[accion] ?? null;
}
