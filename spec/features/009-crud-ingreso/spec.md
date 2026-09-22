# 009 · CRUD Ingreso

**Estado:** propuesta

## Qué hace

Permite al administrador registrar ingresos de mercadería de un proveedor con sus líneas de producto (cantidad + precio de compra unitario). Al registrar un ingreso se incrementa el `stock` de cada producto; al anularlo se restan las mismas líneas. El importe total del ingreso se calcula como Σ(cantidad × precioUnitario).

Endpoints (todos `ADMIN`):

- `GET /api/ingresos` — listado (filtro `?estado=REGISTRADO|ANULADO`, `?desde=`, `?hasta=`)
- `GET /api/ingresos/:id` — detalle con líneas
- `POST /api/ingresos` — alta: `{ nroIngreso, idProveedor, fecha?, lineas: [{ idProducto, cantidad, precioUnitario }] }`
- `POST /api/ingresos/:id/anular` — anula un ingreso `REGISTRADO` y restituye stock negativo (resta)

## Por qué

El DER lo trata como regla central del stock (notas 8–9): el stock se actualiza al registrar ingresos. El equipo decidió **incluirla desde el inicio** de la fase 1 (no postergarla al voluntario). También es el lugar donde vive el **precio de compra** que antes tenía `PROV_PTO`.

## Criterios de aceptación

- [ ] Todas las rutas exigen `ADMIN` (`401`/`403`).
- [ ] El alta valida: proveedor existe y activo; al menos 1 línea; cada producto existe y activo; `cantidad ≥ 1`; `precioUnitario > 0`; `nroIngreso` unique (`409` si duplicado).
- [ ] No se permiten dos líneas del mismo producto en el mismo ingreso (`400`).
- [ ] El alta calcula `importeTotal = Σ cantidad × precioUnitario` (el cliente no lo envía; si lo envía, se ignora).
- [ ] Al crear el ingreso, el `stock` de cada producto involucrado **aumenta** en su cantidad.
- [ ] `GET /:id` devuelve líneas con nombre de producto, cantidad, precioUnitario e importe de línea.
- [ ] `POST /:id/anular` solo actúa sobre `REGISTRADO`; sobre `ANULADO` responde `409`.
- [ ] Al anular, el `stock` de cada producto **disminuye** en la cantidad original; si eso dejaría stock negativo, se responde `409` y no se anula (stock ≥ 0 es invariante).
- [ ] Anular es irreversible en fase 1 (no hay "reactivar").
- [ ] Tests: unit (cálculo de importes, anulación con stock insuficiente) + integración (alta → stock sube → anula → stock vuelve al valor inicial).

## Fuera de alcance

- Flujo multi-estado de ingreso (PENDIENTE → CONFIRMADO) — el enum solo tiene `REGISTRADO|ANULADO`.
- Órdenes de compra / recepción parcial — fuera del modelo.
- Notificación al superar umbral de stock — backlog voluntario.
