# 013 · Listado de pedidos

**Estado:** propuesta

## Qué hace

El **listado con filtro** de pedidos del e-commerce:

**Admin** (`ADMIN`):

- `GET /api/pedidos` — lista todos los pedidos con:
  - rango de fecha de realizado (`?desde=`, `?hasta=`)
  - estado (`?estado=REALIZADO|ABONADO|ENTREGADO|CANCELADO`)
  - cliente (`?idCliente=` o `?cliente=` por nombre/email parcial)
  - combinables (AND), paginación (`page`/`size`)
- Item: `id`, `fecha`, `estado`, `importeTotal`, nombre de cliente, **`fechaEntrega`** (derivada del historial: fecha del cambio a `ENTREGADO`; `null` si aún no se entregó).
- Paginación: `{ data, total, page, size }`, default `page=1`/`size=20`, máx `size=100` (shape de `api-contract.md`).
- `GET /api/pedidos/:id` — **detalle**: datos completos del cliente (nombre, email, teléfono, dirección) + items (nombre producto, cantidad, precioUnitario, subtotal, descuentoAplicado) + estado e importe total.

**Cliente** (`CLIENTE`):

- `GET /api/mis-pedidos` — solo los suyos (ya creado en 011); con este feature se asegura que el item muestre fecha, estado e importe total, y `GET /api/mis-pedidos/:id` devuelve el detalle **solo si el pedido es propio** (`404` si es de otro, para no filtrar existencia).

## Por qué

Segundo **listado con filtro** de regularidad (junto con 010) y el detalle obligatorio al seleccionar un elemento. El admin lo usa para operar el CU de 012 (entregar/cancelar) partiendo de la lista filtrada.

## Criterios de aceptación

- [ ] `GET /api/pedidos` sin token → `401`; con CLIENTE → `403`; con ADMIN → `200`.
- [ ] Filtro `desde`/`hasta` por fecha de creación del pedido, inclusivos; `desde > hasta` → `400`.
- [ ] Filtro `estado` con valor inválido → `400`.
- [ ] Filtro `cliente` coincide con nombre o email (parcial, case-insensitive).
- [ ] Combinación de filtros aplica AND; paginación `{ data, total, page, size }` con `total` correcto.
- [ ] El item del listado incluye cliente (nombre) aunque el pedido tenga estado `CANCELADO`.
- [ ] El item incluye `fechaEntrega` derivada del `HistorialEstado` (`ENTREGADO`); `null` si no está entregado (índice `(idPedido, estado)`).
- [ ] `GET /api/pedidos/:id` devuelve items con `cantidad`, `precioUnitario`, `subtotal`, `descuentoAplicado` y datos del cliente.
- [ ] `GET /api/mis-pedidos` solo contiene pedidos del usuario del token.
- [ ] `GET /api/mis-pedidos/:id` de pedido ajeno → `404` (no `403`, para no revelar existencia).
- [ ] Tests: unit (filtros del service) + integración (cada filtro, combinados, ownership, 401/403/404).

## Fuera de alcance

- Exportar CSV/PDF — no requerido.
- Filtro por rango de importe total — no pedido por la cátedra (podría sumarse fácil).
- Timeline de estados en el detalle — se agrega en el voluntario de seguimiento (el historial ya existe desde 012).
