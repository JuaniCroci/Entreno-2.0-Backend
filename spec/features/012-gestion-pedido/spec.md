# 012 · Gestión de pedido (CU)

**Estado:** propuesta

## Qué hace

Caso de uso del administrador: **entregar o cancelar un pedido**.

- `POST /api/pedidos/:id/entregar` — `REALIZADO → ENTREGADO` (fase 1); cuando exista pago, también `ABONADO → ENTREGADO`.
- `POST /api/pedidos/:id/cancelar` — `REALIZADO → CANCELADO` (fase 1) **restituyendo el stock** de cada línea; `ABONADO → CANCELADO` en fase 2.
- Cada cambio agrega una fila en `HistorialEstado` con `fecha`.
- `GET /api/pedidos/:id/historial` — timeline de estados (admin; el cliente podrá verlo en el voluntario de seguimiento).

Transiciones inválidas (p.ej. entregar un `CANCELADO`, cancelar un `ENTREGADO`) responden `409`.

## Por quê

Segundo **CUU/Epic** de regularidad ("Entregar/cancelar pedido"). Cierra el ciclo de vida del pedido y materializa la regla de restitución de stock del DER (nota 9.C). Junto con 011 son los dos CU relacionados que exige aprobación (la data de uno alimenta al otro: el pedido creado en 011 es el que se gestiona acá).

## Criterios de aceptación

- [ ] Ambas rutas exigen rol `ADMIN` (`401`/`403`).
- [ ] `entregar` sobre pedido `REALIZADO` → `200`, estado `ENTREGADO`, agrega `HistorialEstado`.
- [ ] `cancelar` sobre pedido `REALIZADO` → `200`, estado `CANCELADO`, agrega historial **y** suma al `stock` de cada producto la `cantidad` del item.
- [ ] `entregar`/`cancelar` sobre estado inválido → `409` con mensaje que indique el estado actual.
- [ ] Pedido inexistente → `404`.
- [ ] Cancelar **no** modifica `importeTotal` ni los items (solo estado, historial y stock).
- [ ] `GET /:id/historial` devuelve el listado ordenado por `fecha` asc con cada estado.
- [ ] En fase 1 no existe transición a `ABONADO` (si alguien la intenta → `409`); el enum sí lo contempla para aprobación.
- [ ] Tests: unit (máquina de transiciones, restitución de stock) + integración (entregar OK, cancelar devuelve stock, 409 en estados inválidos, permisos).

## Fuera de alcance

- `ABONADO` y pagos — backlog de aprobación.
- Envío/logística (transportista, tracking externo) — no modelado.
- Reabrir un pedido cancelado — no existe.
