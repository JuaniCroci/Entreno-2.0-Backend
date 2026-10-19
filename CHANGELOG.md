# Changelog

## Unreleased

### Fixes

- Alinea el esquema de `descuento` en migraciones nuevas y existentes: `porcentaje` se almacena en `DECIMAL(10,2)` y `cantidad_minima` ya no tiene default. La API conserva `porcentaje` como número JSON, permite hasta dos decimales y rechaza mayor precisión.
- Agrega cobertura de integración para crear y actualizar descuentos con porcentajes decimales y de unidad para comparar porcentajes fraccionarios correctamente.

---

## v0.2.15 — `pnpm audit` como gate de triage y deferral documentado de `mysql2` (2026-10-19)

> **Sin cambios de código ni de dependencias.** Documentación y proceso únicamente.

### Proceso

- **S12 — `pnpm audit` entra al DoD** (`AGENTS.md`), pero como **gate de triage, no de "verde"**: exige correr el audit contra el lockfile commiteado, clasificar los hallazgos por reachability y **documentar cada deferral con razón + fecha de revisión**. Un hallazgo alcanzable por input HTTP externo deja de ser deferrable y pasa a bloqueante.
- Queda además explicitado: **nunca** aplicar remediation forzada (`--force`) automáticamente.

### Seguridad

- **S2 — `mysql2` queda DEFERIDO** (no "resuelto") tras analizar el problema de verdad. El fix anterior (1.8) solo subió la dependencia **directa**; la transitiva vía `@mikro-orm/mysql@6.6.16` sigue en `3.20.0` y es la que el ORM carga en runtime.
  - Verificado contra el registry: **toda la línea 6.x de MikroORM (1741 versiones, incluido `6.6.17`) pinnea `mysql2: "3.20.0"`** como dependencia exacta. Actualizar dentro de 6.x no aporta nada. La única versión sana es `@mikro-orm/mysql@7.2.5` (→ `mysql2@3.24.5`), que exige migrar MikroORM **6 → 7**.
  - Decisión: **no forzar `pnpm.overrides`** contra el pin del maintainer. La advisory _high_ exige un servidor MySQL hostil o MITM, y la DB corre en contenedor local — sin ruta de red no confiable.
  - **Condiciones de revisión**: subir MikroORM a v7, exponer la DB fuera de localhost, o **2027-03-01** como fecha máxima.
- **Triage completo de las 10 vulnerabilidades** por reachability en `analisis-proyecto.md`: 6 solo en tests/vitest, 2 solo en CLI de migraciones, 1 en glob patterns de nuestro propio config, 2 (`mysql2`) en runtime pero con threat model acotado. **Ninguna alcanzable por un atacante externo vía HTTP.**

### Backlog

- `analisis-proyecto.md`: S2 pasa a `[~]` (deferido) con el análisis completo; S12 a `[x]`; se agrega sección **Triage de `pnpm audit` — 2026-10-19**; se reemplaza el registro de decisión obsoleto de la Sección 13; trackeo 4.11–4.15.

### Gates: `lint` + `typecheck` + `test` — sin cambios de código (solo `.md`)

---

## v0.2.14 — Hardening de auth (S14, S11) y verificación de headers de seguridad (S7) (2026-10-19)

### Comportamiento

- **S14 — audit trail de logins fallidos**: `AuthService.login` ahora loguea `console.warn` en los dos puntos de fallo (usuario inexistente/inactivo y password inválida) con el **email**, nunca la password. El cliente sigue recibiendo el `401` genérico `Credenciales inválidas` → no se habilita enumeración de usuarios; el detalle queda solo en logs del server.
- **S11 — sin casts en `AuthController`**: se tipó el `Request` en cada handler (`BodyRequest<B>`), quedando `req.body` como `RegisterDto` / `LoginDto` / `{ refreshToken: string }` sin ningún `as`. El middleware `validateDto` ya garantiza la forma antes del handler.
- **S7 — headers de seguridad verificados**: se dejó helmet con defaults (la medición empírica corrigió el hallazgo: `Strict-Transport-Security` **ya estaba**, el CSP usa `default-src 'self'`, y no se expone `x-powered-by`/`server`). Decisión: para una API JSON-only no se sirve HTML, así que endurecer el CSP no aporta y solo agregaba mantenimiento.
- Corrige los hallazgos **S7**, **S11** y **S14** de `analisis-proyecto.md`. **Reabre S2** (`mysql2`): el fix anterior solo subió la dependencia directa; la transitiva vía `@mikro-orm/mysql` sigue en `3.20.0` (vulnerable) y es la que carga el ORM en runtime.

### Tests

- `tests/unit/auth-service.unit.test.ts`: bloque "auditoría de logins fallidos (S14)" +4 (usuario inexistente / password inválida loguean; el warning deja el email pero **jamás** la password; el login exitoso no ensucia el log) → 12 tests en el archivo
- `tests/integration/security-headers.int.test.ts`: nuevo, 3 tests de regresión sobre los headers de seguridad (presencia de CSP/HSTS/referrer-policy, CSP con `default-src 'self'` y sin wildcard, ausencia de `x-powered-by`/`server`)

### Suite total: 425 tests (31 files) — 230 unit + 195 integración

### Gates: `lint` + `typecheck` + `test` — pasa limpio (`format:check` sigue marcando los archivos de `descuentos` del commit del profe y `roadmap.md`; preexistentes, no tocados en este cambio)

---

## v0.2.13 — Unificación de `passwordMinLength` en validación de usuarios (2026-10-19)

### Comportamiento

- `CreateUsuarioDto.password`: mínimo de password **6 hardcodeado → `env.passwordMinLength`** (8 por defecto). Quedó desalineado cuando S9 subió el mínimo a 8 en `RegisterDto` y `CreateClienteDto`, y aceptaba passwords de 6 caracteres por el camino de `usuarios` mientras `auth/register` los rechazaba.
- `RegisterDto.password` y `CreateUsuarioDto.password`: **mensaje de validación dinámico** (`al menos ${env.passwordMinLength} caracteres`) — antes el de `RegisterDto` estaba hardcodeado a "8" y mentiría si cambia `PASSWORD_MIN_LENGTH`; ambos quedan consistentes con `CreateClienteDto`.
- Corrige el hallazgo **S9** de `analisis-proyecto.md` para el caso de `CreateUsuarioDto`.

### Tests

- `tests/unit/validate.unit.test.ts`: bloque "DTOs de usuario (regresión)" +2 (`CreateUsuarioDto` rechaza password bajo el mínimo / acepta en el mínimo) → 14 tests en el archivo

### Suite total: 418 tests (30 files) — 226 unit + 192 integración

### Gates: `lint` + `typecheck` + `test` — pasa limpio (`format:check` solo marca `roadmap.md`, preexistente y no tocado en este cambio)

---

## v0.2.12 — Imágenes de producto, contrato completo, fechaEntrega en detalle y gestión (2026-10-15)

### Feature

- **Imágenes de producto** (`958945a`, CarlosUBruno, 2026-10-11): entidad `FotoProducto` + storage en `PRODUCT_IMAGES_DIR` con nombre UUID; `POST/GET /api/productos/admin/:id/imagenes` (ADMIN, multipart `imagen`/`altText`/`fuente`/`licencia`/`atribucion`, PNG/JPEG/WebP hasta 5 MiB → `413`); `GET /api/productos/imagenes/:uid` público; `imagenPrincipal { id, url, altText }` en listados y detalles de producto (inactivo `ProductoService` + `ProductoController` + `productos.routes.ts` + DTO `UploadFotoProductoDto`); migración `Migration20261011190000`
- **`fechaEntrega` en detalles de pedido** (`61bf7c5`): `PedidoDetallePublic` suma `fechaEntrega: Date | null`; `GET /api/pedidos/:id` y `GET /api/mis-pedidos/:id` la derivan del `HistorialEstado` (`ENTREGADO`) vía `calcularFechaEntrega([id])`; `POST /api/pedidos/:id/entregar` la devuelve con la fecha del registro recién creado; `cancelar` y `POST /api/carrito/confirmar` → `null` (cierra la divergencia D4 del análisis de concordancia con el front)

### Comportamiento

- Los detalles de pedido ahora incluyen `fechaEntrega` — era `null` implícito/ausente antes; el front puede restaurar el bloque "Fecha de entrega" en el panel de detalle
- `cambiarEstado` deriva el valor de la transición (`ENTREGADO` → `now` de la fila creada; si no → `null`) en vez de re-consultar dentro de la transacción con lock
- `api-contract.md`: sección nueva "Pedidos: detalle y fechaEntrega"; completadas las secciones de Imágenes, Descuentos, Carrito y `413` (`d636d58`, 2026-10-14 — sincroniza el contrato con el código desde la divergencia D1)
- Specs alineadas al código: marcas `includeInactive` (003) y descuentos `GET` públicos (008) (`d636d58`)
- **Gestión (enunciado §4)**: nueva carpeta `docs/gestion/` con metodología (Scrum liviano + Kanban, DoD, convenciones de cierre y de issues, regla de resync con el front) y minutas reconstruidas desde `git log`; sección "Gestión del proyecto" en `AGENTS.md`; pendiente "Evidencia ágil" tachado en `roadmap.md`
- Contenedor compose renombrado a `entreno-2-mysql` para distinguirlo del MySQL del backend viejo (`5d4a586`)

### Tests

- `tests/unit/pedido-service.unit.test.ts`: +5 (detalle admin/propio con `fechaEntrega`, entregado vs no entregado, `entregar` vs historial, `confirmar` → `null`) → 40 en el archivo
- `tests/integration/pedido-listado.int.test.ts`: +2 (detalle admin `fechaEntrega` string / `REALIZADO` → `null`, detalle propio entregado/cancelado); `pedido-admin.int.test.ts`: `entregar` compara `fechaEntrega` con la fila del historial (tolerancia < 1 s por precisión de la columna `datetime`) y `cancelar` asegura `fechaEntrega: null`
- `tests/unit/producto-service.unit.test.ts` + `tests/integration/producto.int.test.ts` (de `958945a`): storage y endpoints de imágenes

### Suite total: 413 tests (30 files) — 223 unit + 190 integración

### Gates: `lint` + `typecheck` + `format:check` + `test` — pasa limpio

---

## v0.2.11 — Feature 013: Listado de pedidos (2026-10-04)

### Feature

- `src/modules/pedidos/dto/FilterPedidoAdminDto.ts` (nuevo): contrato de query `desde`, `hasta`, `estado`, `idCliente`, `cliente`, `page`, `size`
- `PedidoService.listAdmin(filters)`: filtros AND combinados (rango de fecha inclusivo, estado, id de cliente, nombre/email parcial case-insensitive) + paginación `{ data, total, page, size }` (default `page=1`/`size=20`, `size` máx 100) + orden `fecha desc, id desc`
- `fechaEntrega` derivada del `HistorialEstado` (`ENTREGADO`, primera fila por pedido vía índice `(idPedido, estado)`); `null` si aún no se entregó; se omite la consulta si la página está vacía
- `PedidoService.getByIdAdmin(id)`: detalle con items (reutiliza `findById`, populate `items/producto/usuario`)
- `PedidoService.getByIdOwn(id, usuarioId)`: `{ id, usuario }` en el where → pedido ajeno responde `404` (no `403`, sin enumeración de IDs)
- `Pedido.ts`: `ESTADOS_PEDIDO`, interfaces `PedidoListPublic` / `ClienteDetallePublic` / `PedidoDetalleAdminPublic`, métodos `toListPublic(fechaEntrega)` y `toDetalleAdmin(items)`
- `PedidoController`: handlers `listAdmin`, `getByIdAdmin`, `getByIdOwn`
- Endpoints: `GET /api/pedidos`, `GET /api/pedidos/:id` (ADMIN) y `GET /api/mis-pedidos/:id` (autenticado)

### Comportamiento

- El item del listado expone `usuario { id, nombre, email }` aunque el pedido esté `CANCELADO`, más `fechaEntrega`
- El detalle admin expone datos completos del cliente (`telefono`, `direccion`) + items con `cantidad`/`precioUnitario`/`subtotal`/`descuentoAplicado`; nunca `passwordHash`
- Query inválida → `400` (paginación, `estado`, `idCliente`, `desde > hasta`); pedido inexistente o ajeno → `404`; sin token → `401`; rol distinto de ADMIN en rutas admin → `403`
- Sin migración nueva: el índice `(idPedido, estado)` ya existía desde 011

### Tests

- `tests/unit/pedido-service.unit.test.ts`: +11 (35 en total; filtros, `$and`, defaults, `fechaEntrega`, página vacía, 404/400 de detalle)
- `tests/integration/pedido-listado.int.test.ts`: 26 tests (nuevo; semilla de 3 pedidos en 3 estados/2 clientes → cada filtro por nombre y por email aisladamente, AND, paginación, orden, `fechaEntrega` vs historial, detalle admin, ownership `mis-pedidos`, 401/403/404/400)

### Suite total: 402 tests (30 files) — 218 unit + 184 integración

### Gates: `format:check` + `lint` + `typecheck` + `build` + `test` — pasa limpio

---

## v0.2.10 — Feature 012: Gestión de pedido (2026-10-02)

### Feature

- `src/modules/pedidos/service/transiciones.ts`: máquina de transiciones de fase 1 (`REALIZADO → ENTREGADO | CANCELADO`); `ABONADO` sin salidas hasta la feature de pago (aprobación)
- `PedidoService`: `findById(id)`, `entregar(id)`, `cancelar(id)` (transaccionales) y `historial(id)`
- `HistorialEstado`: `toPublic()` + interfaz `HistorialEstadoPublic`
- `src/modules/pedidos/routes/pedidos.routes.ts` (nuevo) + mount `/api/pedidos` en `app.ts`
- Endpoints (solo ADMIN): `POST /api/pedidos/:id/entregar`, `POST /api/pedidos/:id/cancelar`, `GET /api/pedidos/:id/historial`
- `PedidoController`: handlers `entregar`, `cancelar`, `historial`

### Comportamiento

- Acción de negocio → `200` con el pedido en su nuevo estado (detalle con items, api-contract.md:98)
- Transición inválida → `409` con el estado actual en el mensaje (doble entregar, cancelar dos veces, entregar un cancelado)
- Id no entero → `400`; pedido inexistente → `404`; sin token → `401`; rol distinto de ADMIN → `403`
- `cancelar` restituye stock (`stock += item.cantidad`, ordenado por `producto.id`) **sin** tocar `importeTotal` ni los items
- Cada acción agrega una fila en `HistorialEstado` (solo append, auditoría); `GET /:id/historial` → `{ data, total }` ordenado `fecha asc`

### Tests

- `tests/unit/transiciones.unit.test.ts`: 5 tests (nuevo, matriz 4 estados × 2 acciones)
- `tests/unit/pedido-service.unit.test.ts`: +13 (21 en total)
- `tests/integration/pedido-admin.int.test.ts`: 13 tests (nuevo; flujo 011 → entregar/cancelar, 409, 401/403/404/400)

### Suite total: 361 tests (29 files) — 204 unit + 157 integración

### Gates: `format:check` + `lint` + `typecheck` + `build` + `test` — pasa limpio

---

## v0.2.9 — Feature 011: Carrito y pedido (2026-10-01)

### Feature

- `src/modules/carritos/`: `Carrito` / `CarritoItem` + DTOs (`AddItemDto`, `UpdateItemDto`) + service/controller/routes
- `src/modules/pedidos/`: entidades `Pedido`, `PedidoItem`, `HistorialEstado` + `PedidoService` / `PedidoController` / `misPedidos.routes.ts`
- `src/migrations/Migration20261001203952.ts`: tablas `carrito`, `carrito_item`, `pedido`, `pedido_item`, `historial_estado`
- `src/app.ts`: `/api/carrito` y `/api/mis-pedidos`
- Endpoints carrito (cliente autenticado): `GET /api/carrito`, `POST /api/carrito`, `POST /api/carrito/items`, `PUT /api/carrito/items/:id`, `DELETE /api/carrito/items/:id`, `POST /api/carrito/confirmar`
- `GET /api/mis-pedidos`: listado propio (`PedidoService.listByUsuario`)

### Decisiones clave

- **Confirmación transaccional**: `confirmarDesdeCarrito` corre en `em.transactional` con `LockMode.PESSIMISTIC_WRITE` sobre el carrito; items ordenados por `producto.id` para evitar deadlocks
- **Stock**: validación previa por item → `409` con stock actual y requerido; descuento de stock dentro de la misma transacción
- **Descuentos**: por línea vía `DescuentoService.mejorElegible(productoId, cantidad, fecha)`; importes calculados con `decimal.js` (`importeTotal` con `toFixed(2)`)
- **Estado inicial**: pedido `REALIZADO` + primera fila en `HistorialEstado`; carrito pasa a `CONCLUIDO` y se libera el slot del usuario
- Carrito vacío → `400`; carrito ya confirmado → `409`; sin carrito → `404`

### Tests

- `tests/unit/carrito-service.unit.test.ts`: 18 tests unitarios (nuevo)
- `tests/unit/pedido-service.unit.test.ts`: 8 tests unitarios (nuevo)
- `tests/integration/carrito.int.test.ts`: 24 tests de integración (nuevo; incluye flujos de pedido)

### Suite total: 330 tests (27 files) — 186 unit + 144 integración

### Lint + typecheck: pasa limpio

---

## v0.2.8 — Feature 010: Listado público de productos (2026-09-30)

### Feature

- `src/modules/productos/dto/FilterProductoPublicDto.ts`: filtros `idTipoProducto`, `idMarca`, `precioMin`, `precioMax`, `orden` (`nombre` | `precio`), `dir` (`asc` | `desc`), `page`, `size` (1–100)
- `ProductoService.findAll(filters)`: solo productos activos, shape `{ data, total, page, size }` (contrato de listados)
- `GET /api/productos`: listado público con filtros combinables + orden + paginación
- `GET /api/productos/:id`: detalle ampliado con `disponible` (stock > 0) y `descuentosVigentes` (via `DescuentoService`)
- `src/modules/productos/entity/Producto.ts`: `ProductoListPublic` para el shape de listado

### Validaciones

- `400` por `precioMin > precioMax`, enteros no enteros, `size` fuera de 1–100, `orden`/`dir` inválidos (defensa en service además del DTO)

### Tests

- `tests/unit/producto-service.unit.test.ts` + `tests/integration/producto.int.test.ts`: 29 tests nuevos (filtros, combinaciones, paginación, detalle ampliado)

### Lint + typecheck: pasa limpio

---

## v0.2.7 — Feature 009: CRUD Ingreso (2026-09-29)

### Feature

- `src/modules/ingresos/`: entities `Ingreso` (número, fecha, importe total, estado, proveedor) + `IngresoItem` (líneas)
- `src/migrations/Migration20260929224545_CreateIngresos.ts`
- `src/app.ts`: `/api/ingresos` (todos ADMIN)
- Endpoints: `GET /api/ingresos` (filtros), `GET /api/ingresos/:id`, `POST /api/ingresos`, `POST /api/ingresos/:id/anular`
- **Sin PUT**: es un asiento de movimiento (decisión de equipo, ver `spec/facts/009-crud-ingreso/consulta-catedra.md`)

### Comportamiento

- `create` transaccional: dos líneas del mismo producto → `400`; `precioUnitario <= 0` → `400`; número de ingreso duplicado → `409`; suma `stock` por línea
- `anular` transaccional: ya anulado → `409`; stock insuficiente para reversar → `409`; resta stock y marca `ANULADO`
- `FilterIngresoDto`: paginación + `estado` (`REGISTRADO` | `ANULADO`)

### Tests

- `tests/unit/ingreso-service.unit.test.ts`: 19 tests unitarios (nuevo)
- `tests/integration/ingreso.int.test.ts`: 15 tests de integración (nuevo)

### Lint + typecheck: pasa limpio

---

## v0.2.6 — Estabilización: tests, DTOs, helpers y typecheck en CI (2026-09-28 / 2026-09-29)

### Test harness

- `tests/setup.ts`: `await setup()` al final del archivo (evita race condition con `createSchema()`), vuelta a `createSchema()` + creación idempotente de `refresh_token`
- Eliminados callbacks auto-timestamp (`onCreate` en `createdAt`/`updatedAt`) de `Producto` y `Descuento` — chocaban con `em.create()` en tests
- Tests de integración: seed de usuario `CLIENTE`, `updateSchema` para evitar `TableNotFoundException`

### Validaciones y CI

- Reparadas validaciones de DTOs que rompían 10 tests de integración
- **248 errores `tsc` en tests corregidos**; script `pnpm typecheck` agregado a `package.json` y como gate en CI (Node 24)
- `AGENTS.md`: patrones de CI (corepack + pnpm, env vars para `test:unit`, `--frozen-lockfile`)

### Código nuevo compartido

- `src/common/utils/date-range.ts`: `parseDateRange` (rango desde/hasta con validación) + `tests/unit/date-range.unit.test.ts` (7 tests)
- `assertExists` en `ProveedorService` y `ProductoService`: valida FK activa antes de asociar → `404` (playbook corregido: antes decía `400`)
- `DescuentoService.mejorElegible(productoId, cantidad, fecha)`: elige el descuento más conveniente vigente (mejora de 008 usada por 011)
- `spec/facts/009-crud-ingreso/consulta-catedra.md`: aviso a la cátedra sobre 009 y Descuento N:M (no bloqueante)

### Commits

`8f43514`, `375ed36`, `e064806`, `77685c8`, `80fc8e3`, `ba35116`, `fddc3d2`, `1a76586`, `fac75ab`

### Lint + typecheck: pasa limpio

---

## v0.2.5 — Feature 008: CRUD Descuento (2026-09-26)

### Feature

- `src/modules/descuentos/`: `Descuento` (`descripcion`, `cantidadMinima`, `porcentaje`, `activo`) + `DescuentoProducto` (N:M aplicaciones a productos) + DTOs (Create/Update/Aplicacion)
- `src/migrations/Migration20260926_CreateDescuentos.ts`
- `src/app.ts`: `/api/descuentos`
- Endpoints: `GET /api/descuentos`, `GET /api/descuentos/:id` (públicos); `POST`, `PUT /:id`, `DELETE /:id`, `POST /:id/aplicaciones`, `DELETE /:id/aplicaciones/:aplicacionId` (ADMIN)
- Soft-delete con `activo=false`

### Tests

- `tests/unit/descuento-service.unit.test.ts`: 15 tests unitarios (nuevo)
- `tests/integration/descuento.int.test.ts`: 14 tests de integración (nuevo)

### Nota

- Commit `ef4f9f2` ("008 + CI fail solved"): la feature cerró junto con la reparación del fallo de CI

### Lint + Build: pasa limpio

---

## v0.2.4 — Feature 007: CRUD Producto (2026-09-26)

### Feature

- `src/modules/productos/`: módulo completo (entity, dto, service, controller, routes, index)
- **Primer CRUD con relaciones MikroORM N:1**: `@ManyToOne(() => TipoProducto)`, `@ManyToOne(() => Marca)`, `@ManyToOne(() => Proveedor)` (nullable)
- `src/migrations/`: migración `AddProductos` con 3 FKs
- `src/app.ts`: integrado `productosRoutes` en `/api/productos`
- Endpoints: `GET /api/productos/admin`, `GET /api/productos/admin/:id`, `POST`, `PUT /api/productos/admin/:id`, `DELETE /api/productos/admin/:id`, `GET /api/productos/:id` (público)
- `precioUnitario` como `string` (no `decimal.js` en entity), serializado como JSON string `"1500.00"`
- `stockInicial` solo en Create DTO; `stock` no editable por PUT
- Validación de FKs en service (activo + existencia) con `AppError(404)`

### Decisiones clave

- **`assertExists`**: NO implementar — se sigue patrón inline `findOne({ id, activo: true })` + `AppError(404)`
- **`precioUnitario`**: `@Property({ type: 'string' })` en entity — evita complejidad con `decimal.js`
- **Rutas**: un solo router con prefijo `/admin` para escrituras; `GET /:id` para público (evita colisión con 010)

### Tests

- `tests/unit/producto-service.unit.test.ts`: tests unitarios de validaciones FK, precio, stock, update sin stock
- `tests/integration/producto.int.test.ts`: tests integración con cadena completa (marca→tipo→proveedor→producto)

### Tests totales: +142 (20+ tests nuevos)

### Lint + Build: pasa limpio

---

## v0.2.3 — Feature 006: CRUD Cliente (2026-09-24)

### Feature

- `src/modules/clientes/`: módulo completo (dto, service, controller, routes, index)
- Reutiliza entidad `Usuario` existente (sin nueva tabla)
- `src/app.ts`: integrado `clientesRoutes` en `/api/clientes`
- Endpoints: todos `ADMIN` (`GET /api/clientes`, `GET /api/clientes/:id`, `POST`, `PUT`, `PATCH /:id/activar`, `PATCH /:id/desactivar`)
- Listado siempre filtra `rol=CLIENTE`, nunca expone `passwordHash`
- `ClienteService.create` fuerza `rol=CLIENTE`, `update` nunca cambia rol ni hashea password si no viene
- `setActivo` toggle `activo` con PATCH

### Tests

- `tests/unit/cliente-service.unit.test.ts`: 5 tests unitarios
- `tests/integration/cliente.int.test.ts`: 11 tests de integración

### Tests totales: 142 pasando (17 files)

### Lint + Build: pasa limpio

---

## v0.2.2 — Feature 005: CRUD Proveedor (2026-09-24)

### Feature

- `src/modules/proveedores/`: módulo completo (entity, dto, service, controller, routes, index)
- `src/migrations/Migration20260924000002.ts`: tabla `proveedor` con `razon_social`, `cuit` unique, `telefono`, `email`, `domicilio`, `activo`, timestamps
- `src/app.ts`: integrado `proveedoresRoutes` en `/api/proveedores`
- Endpoints: todos `ADMIN` (`GET /api/proveedores`, `GET /api/proveedores/:id`, `POST`, `PUT`, `DELETE`)
- CUIT validación: regex `^\d{11}$`, unique global, duplicado → 409
- Soft-delete con `activo=false`

### Tests

- `tests/unit/proveedor-service.unit.test.ts`: 13 tests unitarios
- `tests/integration/proveedor.int.test.ts`: 12 tests de integración

### Tests totales: 125 pasando (15 files)

### Lint + Build: pasa limpio

---

## v0.2.1 — Feature 004: CRUD Tipo de producto (2026-09-24)

### Feature

- `src/modules/tipos-producto/`: módulo completo (entity, dto, service, controller, routes, index)
- `src/migrations/Migration20260924000001.ts`: tabla `tipo_producto` con `id`, `nombre` unique, `descripcion`, `activo`, timestamps
- `src/app.ts`: integrado `tiposProductoRoutes` en `/api/tipos-producto`
- Endpoints: `GET /api/tipos-producto` (público), `GET /api/tipos-producto/:id` (público), `POST`/`PUT`/`DELETE` (admin)
- Soft-delete con `activo=false`
- Validación de duplicado (409) y validación DTO (400)

### Tests

- `tests/unit/tipo-producto-service.unit.test.ts`: 13 tests unitarios
- `tests/integration/tipo-producto.int.test.ts`: 11 tests de integración

### Tests totales: 99 pasando (13 files)

### Lint + Build: pasa limpio

---

## v0.2.0 — Feature 003: CRUD Marca (2026-09-24)

### Feature

- `src/modules/marcas/`: módulo completo (entity, dto, service, controller, routes, index)
- `src/migrations/Migration20260924000000.ts`: tabla `marca` con `id`, `nombre` unique, `activo`, timestamps
- `src/app.ts`: integrado `marcasRoutes` en `/api/marcas`
- Endpoints: `GET /api/marcas` (público), `GET /api/marcas/:id` (público), `POST`/`PUT`/`DELETE` (admin)
- Soft-delete con `activo=false`
- Validación de duplicado (409) y validación DTO (400)

### Tests

- `tests/unit/marca-service.unit.test.ts`: 13 tests unitarios (list, getById, create, update, softDelete, duplicado, 404, 400)
- `tests/integration/marca.int.test.ts`: 11 tests de integración (permisos 401/403, crea 201, duplicado 409, listado, soft-delete, inactiva 404)

### Tests totales: 75 pasando (11 files)

### Lint + Build: pasa limpio

---

## v0.1.6 — Refresh Token (BR-8) y CI (2026-09-23)

### Auth

- `src/modules/auth/entity/RefreshToken.ts` + `src/modules/auth/refresh-token.service.ts`: refresh token persistido en DB con hash, expiración y revocación
- `src/migrations/Migration20260923095424.ts`: tabla `refresh_token`
- `POST /api/auth/refresh` con `RefreshTokenDto`; integrado con `login` / `register` / `logout`
- `src/config/env.ts`: ajuste de configuración para refresh

### CI / DX

- `.github/workflows/ci.yml` v2/v3: lint + build + `test:unit` + `test:integration`
- `AGENTS.md`: patrones de CI para agentes (commit `6858f99`)
- `vitest.config.ts`: `BCRYPT_ROUNDS=4` y admin de test para acelerar la suite

### Tests

- `tests/integration/auth-refresh.int.test.ts`: 5 tests (nuevo)
- `tests/unit/auth-service.unit.test.ts`: ampliado — 12 tests nuevos en total (commit `9a04e5a`)

### Lint + Build: pasa limpio

---

## v0.1.5 — Post-implementación: CI, Barrel, Security (2026-09-22)

### CI/CD

- `.github/workflows/ci.yml`: pipeline con lint + build + test:unit + test:integration

### Estructura (EP-5)

- `src/modules/usuarios/index.ts`: barrel exports para el módulo `usuarios`
- `src/modules/usuarios/entity/index.ts`: barrel para entity
- `src/modules/usuarios/service/index.ts`: barrel para service
- `src/modules/auth/index.ts`: barrel para el módulo `auth`

### Seguridad (S8, S9, S10)

- `AuthService.ts`: `jwt.sign()` con `issuer` y `audience`
- `env.ts`: `passwordMinLength` default a 8; `BCRYPT_ROUNDS` default a 12
- `RegisterDto.ts`: `@MinLength(env.passwordMinLength)`

### Logout (BR-4)

- `AuthService.logout()`: void — JWT expira naturalmente
- `AuthController.logout`: `POST /api/auth/logout` → `res.status(204)`
- `auth.routes.ts`: route con `authenticate` y `authLimiter`

### Refactor (O1)

- `app.ts`: `export default createApp` sin side-effect en module scope
- `server.ts`: `const app = createApp()` explícito

### Items pendientes

- 4.7 BR-8: Refresh token ~~(requiere almacenamiento)~~ ✅ implementado en v0.1.6
- 4.8 BR-7: Patrón de imports ya resuelto con barrel exports
- 4.10 TD-10: Adoptar TDD real para features nuevas

---

## v0.1.4 — Mejoras Pre-007: Seguridad y Tests (2026-09-22)

### Seguridad

- `src/common/middleware/authenticate.ts`: `req.user` ahora asigna `usuario.toPublic()` (`UsuarioPublic`) — `passwordHash` ya no expone el token
- `src/modules/auth/controller/AuthController.ts`: `me()` usa `req.user as UsuarioPublic` — elimina `.toPublic()` redundante

### Tests

- `tests/unit/middleware.unit.test.ts`: nuevo bloque `describe('middleware notFound')` — test para handler 404
- `tests/integration/auth.int.test.ts`: 2 tests nuevos — `GET /me` con token válido (sin `passwordHash`), ruta inexistente → 404
- Tests unitarios: 30 (30→30 sin cambios, integration +2)

### Items pendientes

- Nivel 4: EP-3 CI, EP-5 index.ts, S8 issuer/audience, S9 passwordMinLength 8, S10 BCRYPT_ROUNDS 12, BR-4 logout, BR-8 refresh token, BR-7 imports app.ts, O1 createApp side-effect, TD-10 TDD

---

## v0.1.3 — Mejoras Pre-007: Documentación y Especificaciones (2026-09-22)

### Estructura y CRUD

- `src/modules/usuarios/controller/UsuarioController.ts`: nuevo controller con `list`, `getById`, `create`
- `src/modules/usuarios/routes/usuarios.routes.ts`: nuevas rutas `GET /api/usuarios`, `GET /api/usuarios/:id`, `POST /api/usuarios` con `authenticate` + `authorize('ADMIN')`
- `src/app.ts`: `app.use('/api/usuarios', usuariosRoutes)` integrado
- `src/modules/usuarios/service/UsuarioService.ts`: nuevo `findAll(filters: { q?: string; activo?: boolean }): Promise<{ data: UsuarioPublic[]; total: number }>` con LIKE en nombre/email y filtro por activo

### Seguridad y Config

- `src/app.ts`: `express.json({ limit: '100kb' })` para limitar body size
- `src/config/env.ts`: `loadEnv()` exportada para testing directo

### Testing

- `tests/unit/env.unit.test.ts`: reescrito con 6 tests reales de `loadEnv()`: carga correcta, falta obligatoria, NODE_ENV inválido, JWT_SECRET < 32, ADMIN_PASSWORD en prod, default en dev
- Tests unitarios: 25 → 29

### Documentación

- `spec/features/006-crud-cliente/plan.md`: agregada firma de búsqueda `findAll`
- `src/modules/usuarios/dto/CreateUsuarioDto.ts`: JSDoc aclarando que `rol` siempre se fuerza a `CLIENTE`

### Estadísticas

- Tests unitarios: 25 → 29
- Commits: 13
- Lint: pasa limpio
- Build: pasa

---

## v0.1.1 — Mejoras Pre-003: Seguridad y Clean Code (2026-09-22)

### Seguridad

- `src/config/env.ts`: `adminPassword` ahora requiere `ADMIN_PASSWORD` en producción (sin default débil)
- `src/config/env.ts`: `JWT_SECRET` valida longitud mínima 32 caracteres
- `src/modules/auth/auth.routes.ts`: `express-rate-limit` (`windowMs: 15min, limit: 5`) aplicado a `POST /register` y `POST /login`
- `.env.example`: `ADMIN_PASSWORD` actualizado a nota de requerimiento en producción

### Clean Code

- `src/modules/auth/controller/AuthController.ts`: eliminado `if (!req.user)` en `me()` — `authenticate` middleware garantiza el invariante
- `src/modules/auth/dto/LoginDto.ts`: eliminado re-export muerto (la implementación real está en `usuarios/dto/LoginDto.ts`)
- `src/modules/auth/dto/index.ts`: actualizado para eliminar export de `LoginDto` eliminado
- `src/modules/auth/service/AuthService.ts`: import `LoginDto` actualizado a `usuarios/dto/LoginDto.js`
- `src/modules/auth/controller/AuthController.ts`: import `LoginDto` actualizado a `usuarios/dto/LoginDto.js`

### Testing

- `vitest.config.ts`: `JWT_SECRET` actualizado a `'test_secret_no_produccion_1234567890'` (32 chars para pasar validación)

### Documentación

- `spec/features/006-crud-cliente/spec.md`: documentado que `rol` en `CreateUsuarioDto` se ignora siempre en `AuthService.register()`

### Estadísticas

- Tests unitarios: 25 (sin cambios)
- Commits: 12
- Lint: pasa limpio
- Build: pasa

---

## v0.1.0 — Mejoras de Base y Testing (2026-09-22)

### Agregado

- `src/config/env.ts`: `env.nodeEnv` tipado reemplaza `process.env.NODE_ENV` directo en `errorHandler.ts` (R1)
- `src/common/errors/errorHandler.ts`: eliminada rama muerta `ValidationError` (R2)
- `src/modules/auth/service/AuthService.ts`: eliminado método `me()` pass-through; ahora usa `req.user.toPublic()` en controller (R4)
- `src/modules/auth/controller/AuthController.ts`: eliminada dependencia `UsuarioService`; `me()` usa `req.user.toPublic()` directamente
- `src/modules/usuarios/entity/Usuario.ts`: agregado método `toPublic(): UsuarioPublic` al entity
- `src/modules/usuarios/service/UsuarioService.ts`: `toPublic()` delega a `usuario.toPublic()`; `UsuarioPublic` re-exportado desde entity
- `src/modules/auth/auth.routes.ts`: `express-rate-limit` (`windowMs: 15min, limit: 5`) aplicado a `POST /register` y `POST /login`
- `eslint.config.js`: ignores `.agents/**` y `.claude/**` para que lint pase limpio

### Tests

- `tests/unit/middleware.unit.test.ts`: 2 tests nuevos — JWT válido → `next()` sin args; usuario inexistente → 401
- `tests/unit/errorHandler.unit.test.ts`: nuevo file con 6 tests — AppError, AppError con details, 404, Error en prod, Error en dev, no-Error
- `tests/unit/validate.unit.test.ts`: nuevo file con 4 tests — body válido, body inválido, campos extra, body setteado

### Estadísticas

- Tests unitarios: 13 → 25 (+92%)
- Commits: 11
- Lint: pasa limpio
- Build: pasa

---

## Decisión: Priorización de Mejoras

**Fuente**: `analisis-proyecto.md` — Section 12 (Priorización estratégica)

Las 11 skills aplicadas (code-review, systematic-debugging, brainstorming, writing-plans, executing-plans, verification-before-completion, test-driven-development, code-review-and-quality, api-and-interface-design, security-and-hardening, find-skills) identificaron ~74 hallazgos. Se priorizaron así:

| Nivel   | Categoría                | Rationale                                                   | Estado                   |
| ------- | ------------------------ | ----------------------------------------------------------- | ------------------------ |
| Nivel 0 | Base + Pre-003 + Testing | Fixear la base antes de que features nuevas la multipliquen | ✅ 10/10 items           |
| Nivel 1 | Pre-003                  | Seguridad y clean code de la feature existente (Auth)       | ✅ 8/8 items             |
| Nivel 2 | Pre-006                  | Testing y estructura para features CRUD nuevas              | ✅ 7/7 items             |
| Nivel 3 | Pre-007+                 | Tests de integración y refinamiento                         | ✅ completo              |
| Nivel 4 | Post-implementación      | CI, refresh token, logout (opcional)                        | ⚠️ parcial (falta TD-10) |

### Decisiones clave tomadas

1. **No agregar comentarios al código**: seguir convención del proyecto (AGENTS.md) — nunca agregar `//` a menos que se pida
2. **No implementar features 003–013**: ~~las specs están en `spec/features/` pero el código no está implementado; esto es intencional — primero se consolida la base~~ actualizado (2026-10-01): 003–011 implementadas (v0.2.0 → v0.2.9); quedan **012 · Gestión de pedido** y **013 · Listado de pedidos**
3. **No commitear `.env`**: se mantiene `.env.example` como referencia
4. **No forzar `pnpm test:integration`**: requiere MySQL Docker; se usa `pnpm test:unit` como verificación mínima
5. **rate-limit en auth como seguridad base**: se decidió aplicar `express-rate-limit` a `POST /register` y `POST /login` antes de cualquier feature nueva, protegiendo contra brute-force
6. **`toPublic()` en el entity**: decisión de arquitectura para que la serialización de usuario sea única y centralizada, no duplicada en service ni controller
