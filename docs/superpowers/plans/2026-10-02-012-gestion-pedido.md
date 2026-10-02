# 012 · Gestión de pedido — Implementation Plan

> **For agentic workers:** execute inline with superpowers:executing-plans (ledger: `.superpowers/sdd/012-gestion-pedido/progress.md`). Steps use checkbox (`- [ ]`) syntax.

**Goal:** el admin entrega o cancela un pedido (`REALIZADO → ENTREGADO | CANCELADO`), cada cambio queda en `HistorialEstado` y cancelar restituye stock.

**Architecture:** la máquina de transiciones es data (`transiciones.ts`), la lógica vive en `PedidoService` (transaccional, como 009/011) y el router nuevo `/api/pedidos` queda preparado para que 013 le sume `GET /` y `GET /:id`.

**Tech Stack:** TypeScript, Express 5, MikroORM (`em.transactional`), class-validator, Vitest + supertest.

**Spec:** `spec/features/012-gestion-pedido/spec.md` (autoridad) · **Contrato:** `spec/constitution/api-contract.md`

## Global Constraints

- Acción de negocio → `200` con el recurso (api-contract.md:98); error envelope `{ statusCode, message }`.
- `400` id no entero · `404` recurso inexistente · `409` transición de estado inválida · `401/403` auth/rol (tabla api-contract.md:156).
- Dinero como string `decimal(10,2)` con `toFixed(2)`; cancelar **no** toca `importeTotal` ni items.
- Auth: `authenticate` + `authorize('ADMIN')` en las 3 rutas nuevas.
- Sin comentarios en el código; mensajes de error en español con `AppError`.
- Validación de id: `Number.isInteger(id) && id > 0` → `AppError(400)` (convención de todos los services del repo).
- Verificación mínima por tarea: `pnpm lint` + `pnpm typecheck` + tests de la tarea; suite completa en el cierre (DB: `podman compose up -d mysql`).

## Review Focus

1. **Cancelar dos veces restituye stock dos veces** → debe ser imposible por `409`; test: cancelar → cancelar de nuevo → 409 y stock sin duplicar.
2. **`entregar`/`cancelar` con id no numérico (`/api/pedidos/abc/entregar`)** → `400`, nunca `500`; test unit de validación de id.
3. **Pedido ajeno / inexistente para un ADMIN** → `404` (admin ve cualquier pedido; el id no existe) — test 404 + test que un CLIENTE no llega (`403`).
4. **Historial auditivo** → solo append, ordenado `fecha asc`; nunca update de filas viejas; test de orden y de que entregar tras crear agrega la 2ª fila.
5. **`ABONADO` en fase 1** → no hay transición que salga de él; test: `ABONADO → entregar` = `409` (la especie de pago llega con la feature de abonar).

---

### Task 1: Máquina de transiciones

**Files:** Create `src/modules/pedidos/service/transiciones.ts` · Test `tests/unit/transiciones.unit.test.ts`

**Produces:** `transicion(actual: EstadoPedido, accion: Accion): EstadoPedido | null`, `type Accion = 'entregar' | 'cancelar'`.

- [ ] Test RED: matriz completa (4 estados × 2 acciones): válidas `REALIZADO+entregar→ENTREGADO`, `REALIZADO+cancelar→CANCELADO`; el resto `null`.
- [ ] GREEN: `TRANSICIONES` como `Record<EstadoPedido, Partial<Record<Accion, EstadoPedido>>>` con `ABONADO/ENTREGADO/CANCELADO` sin salidas.
- [ ] `pnpm exec vitest run tests/unit/transiciones.unit.test.ts` → PASS · commit.

### Task 2: PedidoService (findById, entregar, cancelar, historial)

**Files:** Modify `src/modules/pedidos/service/PedidoService.ts` · Test `tests/unit/pedido-service.unit.test.ts`

**Consumes:** `transicion()` del Task 1. **Produces:** `findById(id): Promise<Pedido | null>`, `entregar(id): Promise<PedidoDetallePublic>`, `cancelar(id): Promise<PedidoDetallePublic>`, `historial(id): Promise<{ data: HistorialEstadoPublic[]; total: number }>` (los 3 acciones son las que consume el Task 3).

- [ ] Test RED: `entregar` sin pedido → 404; id no entero → 400; transición inválida → 409 con el estado actual en el mensaje; OK → estado `ENTREGADO` + `HistorialEstado` creado.
- [ ] Test RED: `cancelar` OK → suma exacta `stock += item.cantidad` (espejo del descuento de 011), `importeTotal` e items intactos; doble cancelar → 409 sin re-sumar.
- [ ] Test RED: `historial` → `{ data, total }` ordenado `fecha asc`; pedido inexistente → 404.
- [ ] GREEN: implementación transaccional (find → validar → mutar → `em.create(HistorialEstado)` → `flush` → `toDetalle`). Para el detalle popular `['items','items.producto','usuario']`.
- [ ] `pnpm exec vitest run tests/unit/pedido-service.unit.test.ts tests/unit/transiciones.unit.test.ts` → PASS · commit.

### Task 3: HTTP (controller + router + mount)

**Files:** Modify `src/modules/pedidos/controller/PedidoController.ts`, Create `src/modules/pedidos/routes/pedidos.routes.ts`, Modify `src/app.ts`

**Consumes:** los 3 métodos del Task 2.

- [ ] Controller: `entregar`/`cancelar` → `res.json(detalle)`; `historial` → `res.json({ data, total })`.
- [ ] Router: `POST /:id/entregar`, `POST /:id/cancelar`, `GET /:id/historial` con `authenticate, authorize('ADMIN')`.
- [ ] `app.ts`: `app.use('/api/pedidos', pedidosRoutes)`.
- [ ] RED→GREEN con test de integración mínimo del Task 4 (rutas 401/403 antes de existir → 404); `pnpm lint` + `pnpm typecheck` · commit.

### Task 4: Integración

**Files:** Create `tests/integration/pedido-admin.int.test.ts`

- [ ] Setup estilo `carrito.int.test.ts`: seeds (marca/tipo/producto/cliente), `makeToken()`, y helper que arma carrito + `POST /api/carrito/confirmar` para obtener un `pedidoId` con stock conocido.
- [ ] Casos: entregar → 200 `ENTREGADO` + historial con 2 filas ordenadas `fecha asc`; cancelar → 200 `CANCELADO`, stock restaurado al original, `importeTotal`/items sin cambios; entregar cancelado → 409; doble entregar → 409; 401 sin token; 403 con CLIENTE; 404 id inexistente; 400 id no numérico.
- [ ] `pnpm test:integration` → PASS (limpieza idempotente en `beforeAll`, precedente 011) · commit.

### Task 5: Cierre (gates + docs)

- [ ] Gates: `pnpm format:check` · `pnpm lint` · `pnpm typecheck` · `pnpm build` · `pnpm test` (unit + integración con Podman).
- [ ] `spec/features/012-gestion-pedido/tasks.md` → todos `[x]`.
- [ ] `spec.md`: `Estado: implementada` + criterios de aceptación en `[x]`.
- [ ] `constitution/roadmap.md`: 012 a "Hecho", tachado en "En orden", 013 queda como próxima.
- [ ] `CHANGELOG.md` → `v0.2.10 — Feature 012` + `package.json` versión `0.2.10`.
- [ ] `plan.md`: desvíos (`findById` no existía en 011 → creado acá; router nuevo `/api/pedidos`).
- [ ] Ledger: líneas de cierre · commit final.
