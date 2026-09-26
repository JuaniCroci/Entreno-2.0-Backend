# Changelog

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

- 4.7 BR-8: Refresh token (requiere almacenamiento)
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

| Nivel   | Categoría                | Rationale                                                   | Estado         |
| ------- | ------------------------ | ----------------------------------------------------------- | -------------- |
| Nivel 0 | Base + Pre-003 + Testing | Fixear la base antes de que features nuevas la multipliquen | ✅ 10/10 items |
| Nivel 1 | Pre-003                  | Seguridad y clean code de la feature existente (Auth)       | ✅ 8/8 items   |
| Nivel 2 | Pre-006                  | Testing y estructura para features CRUD nuevas              | 🔜 Pendiente   |
| Nivel 3 | Pre-007+                 | Tests de integración y refinamiento                         | 🔜 Pendiente   |
| Nivel 4 | Post-implementación      | CI, refresh token, logout (opcional)                        | 🔜 Pendiente   |

### Decisiones clave tomadas

1. **No agregar comentarios al código**: seguir convención del proyecto (AGENTS.md) — nunca agregar `//` a menos que se pida
2. **No implementar features 003–013**: las specs están en `spec/features/` pero el código no está implementado; esto es intencional — primero se consolida la base
3. **No commitear `.env`**: se mantiene `.env.example` como referencia
4. **No forzar `pnpm test:integration`**: requiere MySQL Docker; se usa `pnpm test:unit` como verificación mínima
5. **rate-limit en auth como seguridad base**: se decidió aplicar `express-rate-limit` a `POST /register` y `POST /login` antes de cualquier feature nueva, protegiendo contra brute-force
6. **`toPublic()` en el entity**: decisión de arquitectura para que la serialización de usuario sea única y centralizada, no duplicada en service ni controller
