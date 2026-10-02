import { describe, it, expect } from 'vitest';
import { transicion, ACCIONES } from '../../src/modules/pedidos/service/transiciones.js';
import type { Accion } from '../../src/modules/pedidos/service/transiciones.js';
import type { EstadoPedido } from '../../src/modules/pedidos/entity/Pedido.js';

const INVALIDAS: Array<[EstadoPedido, Accion]> = [
  ['ABONADO', 'entregar'],
  ['ABONADO', 'cancelar'],
  ['ENTREGADO', 'entregar'],
  ['ENTREGADO', 'cancelar'],
  ['CANCELADO', 'entregar'],
  ['CANCELADO', 'cancelar'],
];

describe('transiciones de pedido (fase 1)', () => {
  it('REALIZADO + entregar -> ENTREGADO', () => {
    expect(transicion('REALIZADO', 'entregar')).toBe('ENTREGADO');
  });

  it('REALIZADO + cancelar -> CANCELADO', () => {
    expect(transicion('REALIZADO', 'cancelar')).toBe('CANCELADO');
  });

  it('toda transicion fuera de fase 1 devuelve null', () => {
    for (const [estado, accion] of INVALIDAS) {
      expect(transicion(estado, accion), `${estado} + ${accion}`).toBeNull();
    }
  });

  it('en fase 1 ninguna accion lleva a ABONADO', () => {
    const estados: EstadoPedido[] = ['REALIZADO', 'ABONADO', 'ENTREGADO', 'CANCELADO'];
    for (const estado of estados) {
      for (const accion of ACCIONES) {
        expect(transicion(estado, accion), `${estado} + ${accion}`).not.toBe('ABONADO');
      }
    }
  });

  it('conoce las dos acciones de fase 1', () => {
    expect(ACCIONES).toEqual(['entregar', 'cancelar']);
  });
});
