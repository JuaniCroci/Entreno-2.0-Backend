# Tech stack y convenciones

## Tecnologías

- **Lenguaje:** TypeScript estricto (`strict: true`)
- **Framework / runtime:** Node.js + Express 5 (API REST JSON)
- **Base de datos:** MySQL 8.0 con **MikroORM** (`@mikro-orm/mysql`, `mysql2`), migraciones versionadas, `reflect-metadata`
- **Infra local:** Docker Compose (MySQL con volumen persistente) + **pnpm**
- **Auth:** JWT (`jsonwebtoken`) + bcrypt para hash de contraseñas
- **Validación:** `class-validator` + `class-transformer` (DTOs)
- **Dinero:** `decimal.js` en services de cálculo (totales, descuentos, importes); persistir `decimal(10,2)`; serializar como **string** en JSON (ver `api-contract.md`)
- **Tests:** Vitest + `supertest` (integración contra schema `entreno_test`)
- **Calidad:** ESLint + Prettier (estilo Airbnb TS)
- **Docs API:** Swagger con `swagger-jsdoc` (feature de aprobación, no de regularidad)
- **Despliegue:** pendiente para fase de aprobación (backlog)

## Archivos / módulos clave

- `src/config/` — `env.ts` (dotenv tipado), `db.ts` (MikroORM + `RequestContext`), constantes
- `src/common/middleware/` — `authenticate`, `authorize(roles)`, `validate(DTO)`, `requestContext`
- `src/common/errors/` — `AppError`, `errorHandler` centralizado, `notFound`
- `src/modules/<recurso>/` — por recurso: `entity`, `dto`, `service`, `controller`, `routes`
- `src/app.ts` — express + middlewares globales; `src/server.ts` — bootstrap
- `tests/unit/` — tests de services; `tests/integration/` — flujos con supertest
- `docker-compose.yml` — servicio MySQL 8 + volumen
- `spec/` — esta constitución y las features (fuente de verdad del alcance)

## Comandos

- `pnpm dev` — arranca en desarrollo con `tsc-watch`/`tsx`
- `pnpm build` — compila con `tsc`
- `pnpm start` — arranca el build de producción
- `pnpm lint` — ESLint
- `pnpm test` — suite completa; `pnpm test:unit` / `pnpm test:integration`
- `pnpm migrate` / `pnpm migrate:dev` — migraciones MikroORM
- `pnpm seed:admin` — crea el admin inicial

## Modelo de datos / dominio

> Fuente: DER auditado (`DER-Entreno2.0.drawio.html`). Decisiones cerradas con el equipo; ver roadmap para fases.

### Fase 1 (regularidad)

- **Usuario** — `id`, `nombre`, `email` (unique), `passwordHash`, `telefono?`, `direccion?`, `rol` enum `ADMIN|CLIENTE`, `activo`, timestamps.
  - No existen clases Cliente ni Admin separadas: son `Usuario` con distinto `rol` (la generalización disjunta del DER se disuelve en el enum).
  - "CRUD Cliente" = gestión de usuarios con `rol=CLIENTE`.
- **Proveedor** — `id`, `razonSocial`, `cuit` (unique), `telefono?`, `email?`, `domicilio?`, `activo`, timestamps.
- **Marca** — `id`, `nombre` (unique), `activo`, timestamps. Sin tabla intermedia (`MARCA_PTO` eliminada).
- **TipoProducto** — `id`, `nombre` (unique), `descripcion?`, `activo`, timestamps. PK surrogado (la elipse del DER mezclaba claves naturales).
- **Producto** — `id`, `nombre`, `descripcion?`, `precioUnitario` (> 0), `stock` (≥ 0, mutado solo por services), `activo`, `idTipoProducto` FK N:1, `idMarca` FK N:1, `idProveedor` FK N:1 **opcional**, timestamps.
  - `PROV_PTO` eliminado: el precio de compra vive en `IngresoItem.precioUnitario`.
- **Descuento** — `id`, `descripcion`, `cantidadMinima` (≥ 1), `porcentaje` (0 < p ≤ 100), `activo`, timestamps. Entidad independiente (no depende de un producto).
- **DescuentoProducto** (ex-`DTO_PTO`) — `id`, `idDescuento` N:1, `idProducto` N:1, `fechaDesde`, `fechaHasta`.
  - M:N con vigencia: un descuento aplica a varios productos en ventanas de fechas distintas (decidido: gana el DER sobre la proposal).
- **Carrito** — `id`, `estado` enum `ACTIVO|CONCLUIDO`, `fechaActualizacion`, `idUsuario` unique mientras `ACTIVO` (un solo carrito activo por usuario), timestamps.
- **CarritoItem** — `id`, `idCarrito` N:1, `idProducto` N:1, `cantidad` (≥ 1); unique(`carrito`, `producto`).
- **Pedido** — `id`, `fecha`, `estado` enum `REALIZADO|ABONADO|ENTREGADO|CANCELADO`, `importeTotal` (snapshot calculado), `idUsuario` N:1, timestamps.
  - `ABONADO` queda en el enum desde el inicio pero solo se alcanza en fase de aprobación (pago). En regularidad el camino es `REALIZADO → ENTREGADO` o `REALIZADO → CANCELADO`.
  - No hay campo `fechaEntrega`: se deriva del `HistorialEstado` con `estado = ENTREGADO`.
- **PedidoItem** (ex-`PTO_PED`) — `id`, `idPedido` N:1, `idProducto` N:1, `cantidad`, `precioUnitario` (snapshot), `subtotal`, `descuentoAplicado`; unique(`pedido`, `producto`).
- **HistorialEstado** (ex-`EST_PED`) — `id`, `idPedido` N:1, `estado` enum, `fecha`.
  - Tablas maestras `ESTADO_PED` y `ESTADO_ING` del DER **no existen**: los estados son enum del dominio.
- **Ingreso** — `id`, `nroIngreso` (unique), `fecha`, `importeTotal` (calculado = Σ líneas), `estado` enum `REGISTRADO|ANULADO`, `idProveedor` N:1, timestamps.
  - El rombo `PROV_ING` del DER se disuelve en la FK directa.
- **IngresoItem** (ex-`ING_PTO`) — `id`, `idIngreso` N:1, `idProducto` N:1, `cantidad` (≥ 1), `precioUnitario` (compra, > 0); unique(`ingreso`, `producto`).
  - `importeLinea = cantidad × precioUnitario`; `importeTotal` del ingreso = Σ `importeLinea`.

### Fase 2 (aprobación) — diseñadas, sin implementar

- **Tag** — `id`, `nombre` (unique); **TagProducto** M:N con producto.
- **Favorito** — N:1 Usuario + N:1 Producto, `fecha`; unique(usuario, producto).
- **Reseña** — `id`, `puntuacion` 1–5, `comentario?`, `fecha`; N:1 Usuario + N:1 Producto. _(No existía en el DER.)_
- **Pago** — `id`, `fecha`, `medio`, `importe`, `estado`, `referenciaExterna?`; 1:1 con Pedido. _(En el DER `fecha` era PK — error corregido con `id`.)_

### Reglas de negocio (invariantes)

1. **Stock**: `+= stock inicial` al crear producto; `+= cantidad` al registrar ingreso; `-= cantidad` al confirmar pedido; `+= cantidad` al cancelar pedido (restitución). Al anular un ingreso, se restan sus líneas. El stock nunca queda negativo (validar antes de descontar).
2. **Descuento en pedido**: por línea, si `cantidad ≥ cantidadMinima` de un `DescuentoProducto` vigente (`fechaDesde ≤ hoy ≤ fechaHasta`) y descuento activo, se aplica el mayor `porcentaje` elegible (si varios, el de mayor %; empate → el de `fechaDesde` más reciente). Queda en `descuentoAplicado` y en el cálculo de `subtotal`/`importeTotal`. Cálculos con `decimal.js` (nunca float de JS).
3. **Snapshot**: `PedidoItem.precioUnitario` copia el precio del producto al confirmar; cambios posteriores del producto no alteran pedidos existentes.
4. **Transiciones de estado** (cada cambio genera fila en `HistorialEstado`):
   - Fase 1: `REALIZADO → ENTREGADO` (admin) · `REALIZADO → CANCELADO` (admin, restituye stock)
   - Fase 2: se habilita `REALIZADO → ABONADO` (pago) y `ABONADO → ENTREGADO` / `ABONADO → CANCELADO`
   - Prohibido saltar a `CANCELADO` desde `ENTREGADO` o repetir estados sin cambio real.
5. **Carrito → Pedido**: confirmar valida stock de cada línea, calcula totales con descuentos, crea `Pedido` + `PedidoItem` + `HistorialEstado(REALIZADO)`, descuenta stock y pasa el carrito a `CONCLUIDO`.
6. **Ownership**: un `CLIENTE` solo lee/escribe su carrito, sus pedidos y sus datos; un `ADMIN` accede a todo lo de gestión.

## Convenciones

- Entidades y propiedades en **camelCase** (MikroORM mapea columnas a snake_case).
- Endpoints REST en plural: `POST /api/productos`, `GET /api/tipos-producto`.
- Cada módulo expone solo su `routes`; los controllers no tocan el EntityManager (van por el service).
- Errores: lanzar `AppError(status, message)`; el `errorHandler` responde `{ statusCode, message }` (y `details` en errores de validación).
- Validación: todo body/params/query de entrada pasa por un DTO class-validator en el middleware `validate`.
- Idioma del dominio: **español** (nombres de campos y mensajes de error).
- Tests: unitarios de service en `tests/unit/`; integración en `tests/integration/` con schema `entreno_test`.
- Commits: `feat(productos): agregar CRUD` / `fix(pedidos): ...`.

## Límites duros

- **Nunca** subir `.env` ni secretos al repo (solo `.env.example` sin valores reales).
- **Nunca** guardar contraseñas en texto plano (solo `passwordHash` bcrypt).
- **Nunca** mutar `stock` desde un controller o con queries crudas: solo vía services de Producto/Ingreso/Pedido.
- **Nunca** romper la capa route → controller → service → EM ni agregar lógica de negocio en routes.
- **Nunca** consultar la base fuera del `RequestContext` de la request (no `em` global).
- No agregar dependencias nuevas sin que el plan de la feature lo justifique.
- No implementar features fuera del `roadmap.md` sin crear antes su carpeta en `features/`.

## Reglas de MikroORM

- `getEm()` se llama en un getter privado del service, NUNCA en el constructor.
- Populate SIEMPRE explícito en cada query. Ver tabla completa en `coding-playbook.md §5`.
- Migraciones: generadas con `pnpm migrate:dev`; nunca `createSchema` en producción.
- Campos decimales (dinero): `@Property({ columnType: 'decimal(10,2)' })` en la entidad.
- Campos opcionales en entidad: tipo `string | null`, valor inicial `null`.
- Transacciones: `await em.transactional(async (em) => { ... })` para operaciones multi-entidad.
- `em.flush()` una sola vez por método de service (salvo dentro de transacciones).
- Nunca acceder a `em` fuera del `RequestContext` de la request (límite duro existente).
- Índice en `HistorialEstado(idPedido, estado)` para el derivado de `fechaEntrega` y filtros de 013.

## Variables de entorno (`.env.example`)

| Variable                                                      | Ejemplo                 | Uso                                  |
| ------------------------------------------------------------- | ----------------------- | ------------------------------------ |
| `NODE_ENV`                                                    | `development`           | ambiente                             |
| `PORT`                                                        | `3000`                  | puerto API                           |
| `DB_HOST` / `DB_PORT` / `DB_USER` / `DB_PASSWORD` / `DB_NAME` | compose                 | MySQL                                |
| `JWT_SECRET`                                                  | _(secret fuerte)_       | firma JWT                            |
| `CORS_ORIGIN`                                                 | `http://localhost:5173` | CORS hacia el front                  |
| `BCRYPT_ROUNDS`                                               | `10`                    | cost de hash (tests usan valor bajo) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD`                              | seed                    | `pnpm seed:admin`                    |
