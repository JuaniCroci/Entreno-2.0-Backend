# 011 · Carrito y pedido (CU)

**Estado:** propuesta

## Qué hace

Caso de uso de usuario: **hacer un pedido**.

1. El cliente autenticado tiene **un carrito activo** (se crea bajo demanda).
2. Agrega/actualiza/cantidades y quita productos (`POST/PUT/DELETE` sobre items del carrito propio).
3. Consulta su carrito con totales **previos** (subtotales por línea; los descuentos finales se confirman al pedir).
4. **Confirma el pedido**: el backend valida stock, calcula descuentos vigentes por cantidad mínima, hace snapshot de precios, descuenta stock, crea `Pedido` + `PedidoItem` + `HistorialEstado(REALIZADO)` y pasa el carrito a `CONCLUIDO`.

Endpoints (CLIENTE dueño del carrito, o ADMIN):

- `POST /api/carrito` — crea (o devuelve) el carrito activo del usuario; idempotente; `201` si se creó, `200` si ya existía
- `GET /api/carrito` — carrito activo del usuario; **`404` si no existe** (sin side-effects: no crea)
- `POST /api/carrito/items` — `{ idProducto, cantidad }` agrega o incrementa (si no hay carrito activo, lo crea implícitamente como efecto del POST)
- `PUT /api/carrito/items/:id` — cambia cantidad
- `DELETE /api/carrito/items/:id` — quita línea (`204`)
- `POST /api/carrito/confirmar` — confirma y devuelve el pedido creado (`200`)
- `GET /api/mis-pedidos` — pedidos propios (lista básica; detalle completo en 013)

> **Post-confirmar:** el carrito queda `CONCLUIDO` y no hay carrito `ACTIVO`. El front vuelve a llamar `POST /api/carrito` (idempotente) para obtener el nuevo vacío; hasta ese `POST`, el `GET /api/carrito` responde `404`. GET nunca crea.

## Por qué

Primer **CUU/Epic** de regularidad con valor para el negocio ("Hacer pedido (carrito)"). Es la columna vertebral comercial del e-commerce y conecta catálogo + stock + descuentos en una sola transacción de negocio.

## Criterios de aceptación

- [ ] Todas las rutas requieren token; un `CLIENTE` solo opera **su** carrito (`403` si intenta operar el de otro — no hay path con id ajeno).
- [ ] `POST /api/carrito` es idempotente: crea el carrito `ACTIVO` si no existe (`201`) o devuelve el existente (`200`).
- [ ] `GET /api/carrito` **no** crea carrito: si no hay activo responde `404` (GET sin side-effects de creación).
- [ ] Agregar un producto **inactivo** o con `stock = 0` responde `400`/`409` con mensaje claro.
- [ ] La cantidad en carrito de un producto nunca puede superar su `stock` actual (`409` con mensaje).
- [ ] Agregar dos veces el mismo producto incrementa la cantidad (no duplica línea; unique carrito+producto).
- [ ] `POST /api/carrito/confirmar` con carrito vacío → `400`.
- [ ] `POST /api/carrito/confirmar` es **transaccional**:
  - valida stock suficiente de **todas** las líneas (si alguna falta → `409` y no se crea nada);
  - aplica el mejor descuento elegible por línea (regla 2 de la constitución);
  - snapshot `precioUnitario` del producto;
  - descuenta stock;
  - crea Pedido (`REALIZADO`, `importeTotal` con descuentos), items e historial;
  - carrito → `CONCLUIDO`.
- [ ] El `importeTotal` del pedido = Σ subtotales ya con `descuentoAplicado` (cálculo con `decimal.js`; serializado como string de 2 decimales).
- [ ] Tras confirmar, el carrito viejo queda `CONCLUIDO`; no hay carrito `ACTIVO` hasta el próximo `POST /api/carrito` (el `GET` intermedio devuelve `404`).
- [ ] Confirmar el mismo carrito dos veces de forma concurrente no duplica pedidos (unique de carrito `ACTIVO` por usuario + transacción + re-check de estado; segundo request → `409` o carrito nuevo vacío según flujo).
- [ ] Tests: unit (descuento elegible, cálculo de totales, validación de stock) + integración (flujo completo: login → agregar → confirmar → verificar stock y pedido).

## Fuera de alcance

- Persistir carrito en localStorage sin login — el carrito del modelo es por usuario autenticado.
- Entregar/cancelar pedido — feature 012.
- Abonar el pedido — backlog de aprobación.
- Cupones manuales — voluntario.
- Límite de cantidad de unidades distintas en carrito — no requerido.
