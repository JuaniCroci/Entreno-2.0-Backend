# 012 · Gestión de pedido — Plan

## Enfoque

Extender `PedidoService` (creado en 011) con `entregar(id)` y `cancelar(id)`, ambos `em.transactional`. La máquina de transiciones es una tabla/objeto de pares permitidos por fase (ver constitución), centralizada en el service — ni controllers ni el front deciden qué transición es válida. La cancelación restituye stock con el mismo patrón ordenado por `idProducto` que 009/011.

## Implementación

1. `src/modules/pedidos/service/transiciones.ts` — mapa `{ estadoActual: { accion: estadoSiguiente } }` para fase 1; exportar para tests.
2. `PedidoService.entregar(id)` — transaccional: valida transición, setea estado, inserta `HistorialEstado`.
3. `PedidoService.cancelar(id)` — transaccional: valida transición, resta→suma stock por item (con chequeo stock ≥ 0 post-suma siempre cumple porque es suma), setea estado, inserta historial.
4. `PedidoService.historial(id)` — items ordenados por fecha.
5. `GET /api/pedidos/:id/historial` con `authenticate` + `authorize('ADMIN')`.
6. Tests unit de la máquina de transiciones (todas las parejas estado×acción).
7. Tests integración: flujo 011 → entregar; flujo 011 → cancelar (stock vuelve); 409s.

## Decisiones

- **Transiciones como data, no if esparcidos** — al llegar pago (aprobación) se agrega una fila al mapa (`REALIZADO→ABONADO`) sin tocar el resto del service.
- **Cancelación = suma a stock** — especular exacto de lo que hizo 011 al descontar (mismo precio no importa: se restituyen **unidades**, no importes).
- **Historial siempre append** — nunca update de filas viejas (auditoría).
- **Solo ADMIN** — el cliente no cambia estados en fase 1.

## Riesgos

- **Doble click en entregar** — segundo request ve estado ya `ENTREGADO` → `409` (idempotencia por rechazo, aceptable para TP).
- **Cancelar dos veces restituiría stock dos veces** — imposible: el segundo intento es `409` por estado.

## Interfaces externas que se consumen

> Firmas exactas de métodos de otros módulos. Usarlas tal cual; no leer el código fuente de esas features.

```typescript
// De PedidoService (feature 011 — creado en esa feature)
findById(id: number): Promise<Pedido>
// Pedido incluye: { id, estado, items: PedidoItem[], usuario }
// PedidoItem incluye: { producto: { id }, cantidad }
// Populate: usuario, items, items.producto

// Mutación de stock al cancelar: producto.stock += item.cantidad (directo en entidad)
// La mutación la hace GestionPedidoService / PedidoService en cancelar(), no otro módulo.
```
