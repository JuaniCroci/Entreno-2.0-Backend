# Changelog

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

| Nivel | Categoría | Rationale | Estado |
|-------|-----------|-----------|--------|
| Nivel 0 | Base + Pre-003 + Testing | Fixear la base antes de que features nuevas la multipliquen | ✅ 10/10 items |
| Nivel 1 | Pre-003 | Seguridad y clean code de la feature existente (Auth) | ✅ 8/8 items |
| Nivel 2 | Pre-006 | Testing y estructura para features CRUD nuevas | 🔜 Pendiente |
| Nivel 3 | Pre-007+ | Tests de integración y refinamiento | 🔜 Pendiente |
| Nivel 4 | Post-implementación | CI, refresh token, logout (opcional) | 🔜 Pendiente |

### Decisiones clave tomadas

1. **No agregar comentarios al código**: seguir convención del proyecto (AGENTS.md) — nunca agregar `//` a menos que se pida
2. **No implementar features 003–013**: las specs están en `spec/features/` pero el código no está implementado; esto es intencional — primero se consolida la base
3. **No commitear `.env`**: se mantiene `.env.example` como referencia
4. **No forzar `pnpm test:integration`**: requiere MySQL Docker; se usa `pnpm test:unit` como verificación mínima
5. **rate-limit en auth como seguridad base**: se decidió aplicar `express-rate-limit` a `POST /register` y `POST /login` antes de cualquier feature nueva, protegiendo contra brute-force
6. **`toPublic()` en el entity**: decisión de arquitectura para que la serialización de usuario sea única y centralizada, no duplicada en service ni controller
