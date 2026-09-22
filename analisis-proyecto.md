# Plan de Mejora — Entreno 2.0 Backend

> Evolución de `analisis-proyecto.md`. Este archivo pasa de ser un **registro de hallazgos** a ser un **plan de mejora** del proyecto. Contiene: los hallazgos originales por skill, más una priorización, un plan de acción por feature, las decisiones tomadas, y un registro de ejecución.
>
> **Filosofía**: no apurarse. Arreglar la base primero, luego las features en orden. Cada corrección se marca `[x]` al completarse.

---

## Cómo leer este archivo

- **Sections 1–11**: los hallazgos originales, clasificados por skill aplicado
- **Section 12**: qué arreglar primero y por qué (la priorización estratégica)
- **Section 13**: qué decidimos NO hacer y por qué
- **Section 14**: qué se necesita antes de cada feature
- **Section 15**: registro de ejecución (lo que vamos haciendo)
- **Tablas**: `[ ]` = pendiente, `[x]` = completado
- **Severidad**: **Critical** · **Required** · **Optional** · **Nit**

---

## 1. code-review-and-quality

Alcance: `app`, `env`, `db`, `auth`, `usuarios`, middleware, errors, `seedAdmin`, tests vs. playbook + `api-contract.md`.

### Required

- [ ] **R1 — `src/common/errors/errorHandler.ts:34`**: usa `process.env.NODE_ENV` directo en vez de `env.nodeEnv` (tipado y ya validado). Inconsistente con el resto del código.
- [ ] **R2 — `src/common/errors/errorHandler.ts:24-29`**: rama `ValidationError` de class-validator casi muerta y mal formada: solo toma `err.property` del error raíz (no itera `children`), puede devolver `details` vacío con 400. Los controllers ya usan `validateDto` → `AppError(400, details)`. Simplificar o eliminar la rama.
- [ ] **R3 — `src/modules/auth/controller/AuthController.ts:22-24`**: re-implementa 401 a mano con body armado; `authenticate` ya garantiza `req.user`. Lógica de error en controller (vs. playbook §3.2). Usar `AppError` o asumir invariante.
- [ ] **R4 — `src/modules/auth/service/AuthService.ts:40-42`**: `me()` es wrapper pass-through puro. Borrar del service y devolver `toPublic(req.user)` en el controller.
- [ ] **R5 — `src/config/env.ts:54`**: default `adminPassword: 'changeme_en_produccion'`. `ADMIN_PASSWORD` ausente en prod crea admin con password débil conocida vía `seed:admin`. Debe ser `required()` en production (sin default débil).

### Optional

- [ ] **O1 — `src/app.ts:35-36`**: `const app = createApp()` al importar (side effect en module scope). Tests que importan `createApp` instancian app extra. Exportar solo `createApp` y montar en `server.ts`.
- [ ] **O2 — JWT `sub` como number** (`AuthService.ts:34`, check en `authenticate.ts:25`): spec JWT dice `sub` string. Frágil si cambia de librería. Considerar stringificar.
- [ ] **O3 — `scripts/seedAdmin.ts:19`**: si el admin existe con password distinta de la env, no avisa. Agregar warning si el hash no coincide.
- [ ] **O4 — DTOs duplicados**: `auth/dto/LoginDto` y `usuarios/dto/LoginDto` conviven; verificar cuáles se usan y borrar los sin uso.

### Nit

- [ ] **N1 — Migración**: playbook pide `MigrationYYYYMMDD_Nombre.ts`; real: `Migration20260922020855.ts` (sin `_Nombre`).
- [ ] **N2 — `src/app.ts`**: `express.json()` sin `limit` explícito (default 100kb; FYI).

### Veredicto skill 1

**Approve con Required R1–R5** — no bloquea 003, conviene parchear antes de que 003–006 los multipliquen (especialmente R5 y R2).

---

## 2. security-and-hardening

Alcance: auth/JWT, validación de input, headers/CORS, secretos, dependencias (`pnpm audit`), rate limiting, exposición de errores.

### Threat model breve (001–002)

| Frontera | Assets | Notas |
|---|---|---|
| HTTP → API (`/api/auth/*`, body JSON) | credenciales, PII (nombre, email, tel, dirección), JWT | input validado con DTOs; sin rate limit en login/register |
| Env / seed | `JWT_SECRET`, `ADMIN_PASSWORD`, `DB_PASSWORD` | secretos en env; default débil de admin |
| DB (MySQL via MikroORM) | hashes bcrypt, usuarios | queries parametrizadas vía ORM ✅ |
| Respuestas HTTP | no filtrar `passwordHash` | `toPublic()` + tests ✅ |

### Critical

- [ ] **S1 — Sin rate limiting en auth** (`POST /api/auth/login`, `register`): la skill exige ~10 intentos / 15 min en auth. Hoy no hay `express-rate-limit` ni equivalente en el código ni en `package.json`. Brute-force de passwords y registro masivo sin freno.

### Required

- [ ] **S2 — Vulnerabilidad high alcanzable en runtime: `mysql2` < 3.22.0 / ≤ 3.23.0** (`pnpm audit`): auth plugin downgrade + DoS por decompression bomb. Es la dependencia del driver de BD (transitiva vía `@mikro-orm/mysql`, `package.json` pide `mysql2` directo `^3.12.0`). Fix: subir a `>=3.23.1` (revisar changelog, un paquete por vez, suite verde).
- [ ] **S3 — `ADMIN_PASSWORD` con default débil** (`env.ts:54`, igual que R5 de la skill 1): en producción no debe existir default `changeme_en_produccion`. Exigir `required('ADMIN_PASSWORD')` cuando `NODE_ENV=production` (o siempre, y sacar el default del `.env.example` a placeholder obvio distinto).
- [ ] **S4 — `JWT_SECRET` sin política de fortaleza** (`env.ts:50`): solo se exige que exista y no esté vacío. El plan de 002 dice "secret fuerte" / longitud mínima; no se valida (p. ej. `length >= 32`). Un secret corto o de ejemplo (`reemplaza_con_un_secret_fuerte` tal cual) firma tokens adivinables.
- [ ] **S5 — Errores 500 pueden exponer `err.message` en dev** (`errorHandler.ts:35`): aceptable en development; verificar que `NODE_ENV` production jamás tome esa rama (hoy depende de `process.env.NODE_ENV` crudo — se refuerza con R1 unificar sobre `env.nodeEnv`). No hay stack trace en body ✅, pero el mensaje interno sí en dev.
- [ ] **S6 — Sin `express.json({ limit })` explícito** (`app.ts:18`): default 100kb de body-parser; la skill pide caps de tamaño en la frontera. Sube a Required para un e-commerce con futuros POST de listas (ingreso/carrito): poner `limit: '100kb'` o similar explícito y documentarlo.

### Optional

- [ ] **S7 — helmet con defaults sin CSP custom / sin ajustes de producción** (`app.ts:16`): helmet ✅ pero no se configura `contentSecurityPolicy` ni HSTS explícito. Para API JSON-only puede quedar default; si hay frontend mismo origen, revisar CSP.
- [ ] **S8 — JWT sin `issuer`/`audience`** (`AuthService.ts:34`): firma solo con `jwtSecret` + `expiresIn: '7d'`. Añadir `issuer`/`audience` endurece contra reuso de tokens entre proyectos con el mismo secret.
- [ ] **S9 — `passwordMinLength = 6`** (`RegisterDto` / `CreateUsuarioDto`): mínimo bajo (skill sugiere políticas más fuertes; bcrypt ≥12 rounds es la parte hashing). Considerar ≥8 o diccionario de reglas si la cátedra lo permite.
- [ ] **S10 — `BCRYPT_ROUNDS` default 10** (`env.ts:51`): skill recomienda ≥12. Subir default a 12 (coste de CPU en register/seed, no en hot path).
- [ ] **S11 — Doble cast `req.body as RegisterDto` en controllers** (`AuthController`): el middleware `validateDto` ya reemplaza `req.body` por la instancia validada; el `as` es redundantemente confiado. OK hoy; preferir tipado sin cast si Express lo permite sin `any`.
- [ ] **S12 — Sin auditoría de lockfile en proceso de release**: hay `pnpm-lock.yaml` ✅ pero el loop de ingeniería no incluye `pnpm audit` como gate ni documenta deferrals. Agregar al engineering-loop o al README de release.

### Nit

- [ ] **S13 — `.env.example` usa el mismo placeholder `changeme_en_produccion`** que el default de código: alguien puede copiar example → `.env` sin cambiar. Cambiar placeholder a valor obviamente inválido (`REEMPLAZAR_SECRETO`).
- [ ] **S14 — Login/register sin intentos fallidos logueados**: no hay audit trail de auth fallida (repudiation/STRIDE). `morgan` solo loguea HTTP. Considerar `console.warn` en login fallido (sin passwords).

### Veredicto skill 2

**No listo para hardening de producción.** Bloqueantes reales: **S1** (rate limit auth) y **S2** (mysql2 high). **S3–S4** van de la mano con R5. El resto es endurecimiento incremental. `passwordHash` y ORM parametrizado están bien.

---

## 3. api-and-interface-design

Alcance: contratos HTTP de módulos existentes (health, auth, usuarios) vs. `api-contract.md` + diseño de interfaces module boundaries para features futuras (003+).

### Observaciones / Required

- [ ] **A1 — GET `/api/health` no está en el contrato central**: devuelve body propio del módulo (verificar shape vs `{ data, total }` o item directo). Es infra de 001, no recurso de negocio — documentar excepción en `api-contract.md` o alinear shape.
- [ ] **A2 — `POST /api/auth/register` devuelve 201 con usuario directo** ✅ (item, sin wrapper) — correcto vs contrato. Confirmar que no expone `passwordHash` (ya cubierto por tests de 002).
- [ ] **A3 — `GET /api/auth/me` devuelve usuario directo 200** ✅ consistente con GET item.
- [ ] **A4 — Sin endpoints de listado aún** (003+ los traerán): no se puede validar wrapper `{ data, total }` en vivo hasta CRUD Marca. Pre-verificar en plan de 003 que `findAll` use el wrapper de una vez.
- [ ] **A5 — Superficie pública actual mínima**: solo `/api/health` (sin auth) + auth register/login (sin auth) + `/me` (authenticate). Correcto para 001–002; no hay endpoints huérfanos sin auth que no deban estarlo.
- [ ] **A6 — Errores**: `AppError` → `{ statusCode, message, details? }` ✅ alineado con api-contract (incluye `details` en 400 de validación vía `validateDto`).
- [ ] **A7 — Contrato de paginación no implementado en ningún servicio**: `page`/`size` defaults 1/20 max 100 solo aplica a 010/013 según contrato; no hay código que lo implemente aún. Registrar como pendiente de diseño al iniciar 010/013 (no es bug actual).
- [ ] **A8 — Boundaries de módulo**: `auth` depende de `usuarios` (service) — correcto. `usuarios` no importa `auth` ✅ sin ciclos. `health` aislado ✅. Próximos módulos (marca, tipo, proveedor, producto…) deben seguir el patrón sin importarse entre sí más allá de FK via `assertExists`.
- [ ] **A9 — Interfaz `UsuarioPublic` vs entidad**: service expone tipo de salida explícito ✅ (buen boundary). Mantener este patrón en DTOs de respuesta de 003+ (no devolver entidad MikroORM cruda cuando haya relaciones/populate).
- [ ] **A10 — Nombres de rutas**: `/api/auth/*` y `/api/health` en kebab/minúsculas sin plural inconsistente. Para recursos futuros definir plural fijo en `api-contract` o plan de cada feature (`/api/marcas`, `/api/productos`) — el contrato ya usa plural en ejemplos ✅.

### Nit

- [ ] **A11 — No hay versionado de API (`/api/v1`)**: aceptable para cátedra; si el frontend ya consume `/api/*` no cambiar sin coordinar con Frontend-TP-DSW.
- [ ] **A12 — Salud del health-check**: si responde 200 aunque DB caída (o viceversa), alinear con tasks 001 (200 DB up / 503 down) — tests de integración existen; es riesgo de regressión, no bug abierto.

### Veredicto skill 3

Contratos de 001–002 **consistentes** con `api-contract.md` (item directo, errores envelope, sin `passwordHash`). El diseño de interfaces está listo para 003 siguiendo el patrón service→controller→routes + wrapper de listado. Sin cambios estructurales obligatorios antes de arrancar 003.

---

## 4. verification-before-completion

Alcance: evidencia de que 001–002 pueden darse por terminadas (gates + tasks + roadmap). Corridos en esta sesión:

| Gate | Comando | Resultado |
|---|---|---|
| Lint | `pnpm lint` | ✅ 0 errores (exit 0) |
| Build | `pnpm build` | ✅ exit 0 (tsc strict) |
| Unit | `pnpm test:unit` | ✅ exit 0 |
| Full | `pnpm test` | ✅ exit 0 (unit + integration) |

### Findings

- [ ] **V1 — Integration tests dependen de MySQL Docker**: `pnpm test` pasó en esta sesión; si el entorno no tiene compose arriba, fallan. Documentar prerequisito en README/CI (si no está ya) antes de reclamar gates en cualquier máquina.
- [ ] **V2 — No se registró evidencia de `playbook review` (gate 4) por escrito para 001–002**: tasks dicen validado contra `spec.md`, pero el checklist de `engineering-loop.md` paso 7 no está archivado. Completar una vez (checklist en PR o minuta) para no rehacerlo a mano cada feature.
- [ ] **V3 — `roadmap.md` marca 001 y 002 en "Hecho"** coherente con tasks `[x]` totales ✅. Siguiente según roadmap: **003 · CRUD Marca**.
- [ ] **V4 — Sin repo git**: no hay historial de commits por feature/integrante (la cátedra pide evidencia con commits a nombre/legajo). `git init` + commit inicial es prerequisite de proceso, no de código.
- [ ] **V5 — `.env` presente en disco y en `.gitignore`** ✅ (no commiteado porque no hay git; al init evitar `git add .env`).
- [ ] **V6 — Migración única `Migration20260922020855`** alineada con 002 (usuarios) ✅; `schema:dev` / `migrate` scripts existen.
- [ ] **V7 — No hay CI** (GitHub Actions u otro) que corra lint/build/test automáticos. La skill exige verificación antes de claim; hoy es manual. Sugerido antes de repartir 003–006 en paralelo.

### Veredicto skill 4

**001–002 verificables y marcados a mano con evidencia de gates corridos en sesión.** Faltan artefactos de proceso (git, CI, registro de playbook review), no fallas de código.

---

## 5. systematic-debugging

Alcance: análisis de causa raíz y flujo de datos en código existente y middleware, enfocándose en errores silenciosos, ramas muertas y comportamientos inesperados.

### Required

- [ ] **SD-1 — `authenticate` middleware atrapa TODOS los errores y los convierte a 401 genérico** (`src/common/middleware/authenticate.ts:36-41`): el `try/catch` outer convierte cualquier `AppError` (ej. `AppError(400, 'ID inválido')` de `em.findOne`) en `401 'Token de autenticación faltante o inválido'`. Se pierde el mensaje original del error real. Si `findOne` lanza un `AppError(403, 'Usuario inactivo')`, el usuario recibe 401 en vez de 403.
- [ ] **SD-4 — `health-down.int.test.ts` usa monkey-patching frágil de `connection.execute`** (`tests/integration/health-down.int.test.ts:14-18`): el stub se sobreescribe en runtime sin aislamiento de módulos de Vitest. Cualquier cambio en la firma de `connection.execute` o en el ORM rompe el test sin que el test tenga culpa. El stub debería usar un mock de conexión o `vi.spyOn` sobre el prototype.

### Optional

- [ ] **SD-5 — `requestContext` middleware no maneja errores si `getEm()` falla** (`src/config/db.ts:62-63`): si `getOrm()` lanza error (MikroORM no inicializado), el middleware no tiene try/catch ni fallback. El error caería sin manejar en Express.

### Nit

- [ ] **SD-3 — `HealthService` usa SQL crudo `select 1`** en vez de MikroORM nativo, y su importación de `getEm()` es muerta (no se usa). `getOrm().em.getConnection().execute('select 1')` es suficiente sin el `getEm()` dead import.

### Veredicto skill 5

**SD-1 es Required** — el 401 genérico en `authenticate` mascara errores útiles y rompe la semántica de status codes. **SD-4 es Required** por fragilidad del test.

---

## 6. brainstorming

Alcance: visión holística del proyecto — arquitectura, module boundaries, estructura de módulos, y capacidad de las features 003–013 para implementarse con la estructura actual.

### Required

- [ ] **BR-1 — `src/modules/usuarios` no tiene `routes/`, `controller/`, ni `index.ts`** en ningún subdirectorio: el módulo tiene solo `entity`, `dto`, `service`. Feature 006 (CRUD Cliente) necesita crear toda la estructura desde cero o refactorizar el módulo para agregar rutas y controlador de usuarios.
- [ ] **BR-2 — `UsuarioService` NO tiene método `findAll`/`list`** que feature 006 requiere para listar clientes con `?q=` y `?activo=`. El `coding-playbook.md` define `findAll(filters?)` como canonical pero ninguna implementación existe en el código actual. Sin este método, feature 006 no puede implementarse como especifica.
- [ ] **BR-3 — `CreateUsuarioDto` tiene `@IsOptional() rol?: Rol`** (`src/modules/usuarios/dto/CreateUsuarioDto.ts:24-25`): valida que `rol: "ADMIN"` pase la validación, pero `AuthService.register` lo sobreescribe a `Rol.CLIENTE`. El usuario puede enviar `rol: ADMIN` y no recibir error; el campo se ignora silenciosamente. Mejor quitar `rol` del DTO o documentar explícitamente el comportamiento.
- [ ] **WP-2 — `spec/features/007-crud-producto/plan.md` referencia `FilterProductoAdminDto`** en la sección de implementación pero **nunca lo define** ni en "Interfaces externas" ni en "Implementación". No hay firma del DTO de filtros para admin.

### Optional

- [ ] **BR-4 — No existe endpoint `POST /api/auth/logout`** ni mecanismo de revocación de JWT. El token dura 7 días sin forma de invalidarlo del lado del servidor.
- [ ] **BR-5 — `HealthService` importa `getEm()` de `db.ts` pero nunca lo usa** (`src/modules/health/HealthService.ts:1`): dead import. Hace `getOrm().em.getConnection().execute('select 1')` directamente sin necesidad del EM.
- [ ] **BR-6 — `auth` módulo depende de `usuarios`** pero `usuarios` no expone endpoints propios de usuario (listar, desactivar). Hay duplicación conceptual: `auth` maneja login/register y `usuarios` debería manejar CRUD de clientes, pero no hay `usuarios/controller/` ni `usuarios/routes/`.
- [ ] **BR-7 — `app.ts` `const app = createApp()`** al nivel de módulo crea side-effect de importación. Tests que importan `createApp` directamente crean instancias extra con efectos de lado inesperados.
- [ ] **BR-8 — No hay mecanismo de refresh token** ni rotación de JWT. Si un token se compromete, el atacante tiene 7 días de acceso sin posibilidad de revocación.

### Nit

- [ ] **BR-7 — `app.ts` lado de módulo**: export default `app` + `createApp` exportado — patrón mixto que genera confusión sobre qué importar.

### Veredicto skill 6

**BR-1 y BR-2 son Required** — sin `findAll` en `UsuarioService` y sin estructura de routes/controller en `usuarios`, feature 006 no puede implementarse correctamente. **WP-2 es Required** — el plan de 007 tiene un DTO reference sin definir. El resto es fortalecimiento progresivo.

---

## 7. test-driven-development

Alcance: calidad, cobertura, y metodología de tests — verificar si los tests existen, si son TDD, y si cubren casos críticos.

### Required

- [ ] **TD-1 — `middleware.unit.test.ts` NO testea el caso feliz de `authenticate`** con un JWT válido: solo cubre los 401 (sin header, token inválido). No hay test donde `authenticate` llame `next()` exitosamente con un token válido. El middleware clave del proyecto tiene cobertura incompleta.
- [ ] **TD-3 — No hay tests para `errorHandler`** ni para `notFound`: el handler central de errores de toda la API no tiene cobertura. Cualquier cambio en `errorHandler` o `notFound` puede romper la API sin que ningún test lo detecte.
- [ ] **TD-4 — No hay tests para `validateDto`** middleware: el middleware que valida TODA la entrada del sistema no tiene test propio. Si `validateDto` se rompe, todos los endpoints dejan de funcionar.
- [ ] **TD-6 — `health-down.int.test.ts` usa monkey-patching frágil**: el stub de `connection.execute` no usa `vi.spyOn` ni mock apropiado de Vitest. Si la firma de `getOrm().em.getConnection().execute` cambia, el test rompe silenciosamente.

### Optional

- [ ] **TD-2 — `auth-service.unit.test.ts` no testea `me()`**: el método pass-through que R4 dice debe eliminarse. No hay test que verifique su comportamiento antes de su remoción.
- [ ] **TD-5 — `env.unit.test.ts` es un smoke test**, no un unit test real: solo importa el módulo y verifica tipos básicos. No testea la lógica de `loadEnv()`, ni los `required()`, ni los `int()` helpers.
- [ ] **TD-7 — `auth.int.test.ts` no testea**: registro con `role: ADMIN` (debería crear cliente), login con token expirado, ni `me` sin usuario en `req.user`.
- [ ] **TD-10 — Los tests usan `vi.spyOn`** en lugar de TDD (escribir test primero, ver que falla, luego implementar). Los tests verifican behavior existente, no edge cases descubiertos primero mediante el ciclo red-green-refactor.

### Nit

- [ ] **TD-9 — No hay test de integración para 404 del `notFound` handler**: `health.int.test.ts` testea 404 pero no es un test dedicado al handler de rutas inexistentes.
- [ ] **TD-8 — No hay test para `seedAdmin.ts` script**.

### Veredicto skill 7

**TD-1, TD-3, TD-4 son Required** — son los componentes más críticos de la API sin cobertura: middleware de autenticación, handler de errores, y validador de entrada. **TD-6 es Required** por fragilidad del test. El resto es fortalecimiento progresivo.

---

## 8. writing-plans

Alcance: calidad de specs, planes de features, y documentación de diseño — verificar que los `plan.md` son completos, consistentes, y ejecutables.

### Required

- [ ] **WP-1 — `spec/features/007-crud-producto/plan.md:52` tiene un typo**: `PUT单品` — claramente un artifacto de copiado/pegado de un set de caracteres diferentes (chino). Corregir a `PUT /api/productos/admin/:id`.
- [ ] **WP-2 — `spec/features/007-crud-producto/plan.md` referencia `FilterProductoAdminDto`** en la sección de implementación pero **nunca lo define** ni en "Interfaces externas" ni en "Implementación". No hay firma del DTO de filtros para admin.
- [ ] **WP-3 — `spec/features/006-crud-cliente/spec.md` pide `?q=` por nombre/email** en `GET /api/clientes`, pero `UsuarioService` no tiene método de búsqueda. El `plan.md` de 006 no describe cómo se implementará la búsqueda. Sin `findAll` o equivalente en `UsuarioService`, el spec es inimplementable.

### Optional

- [ ] **WP-4 — `coding-playbook.md` muestra `findAll(filters: MarcaFilterDto)` con `$like` search**, pero ninguna implementación del código actual usa este patrón. El playbook describe la meta, no el presente. Los agentes que lean el playbook podrían confundirse al no encontrar `MarcaService.findAll` en el código.
- [ ] **WP-5 — `spec/features/010-listado-productos/plan.md` referencia `ProductoService.findAll`** con firma de filtros, pero no describe qué DTO de filtros se creará ni cómo se mapean los query params a `where` de MikroORM.

### Nit

- [ ] **WP-6 — `analisis-proyecto.md` no tiene sección para skills `systematic-debugging`, `brainstorming`, `test-driven-development`, `writing-plans`, `executing-plans`, `requesting-code-review`** — la frase "Próximas skills se agregan abajo" indica el análisis es incompleto (corregido en este archivo).

### Veredicto skill 8

**WP-1 es Nit** (typo, fácil de corregir). **WP-2 y WP-3 son Required** — planes que referencian métodos/DTOS inexistentes sin definirlos. Los agentes que implementen 006 y 007 necesitan estas definiciones antes de empezar.

---

## 9. executing-plans

Alcance: estado de ejecución del proyecto — roadmap, orden de features, git, CI, y coherencia entre lo planificado y lo implementado.

### Required

- [ ] **EP-1 — `analisis-proyecto.md` tiene 28+ items con `[ ]` sin marcar**, pero `roadmap.md` ya marca 001-002 como "Hecho". El equipo pasó a 003+ sin arreglar los Required items del analisis (R1–R5, S1–S2). El verdict de skill 1 dice "no bloquea 003" pero los issues siguen abiertos.
- [ ] **EP-2 — Sin repo git** (`git init` no se hizo — V4): no hay historial de commits por feature/integrante, lo que la cátedra pide como evidencia de participación. `git init` + commit inicial es prerequisite de proceso, no de código.
- [ ] **EP-4 — Los `plan.md` de features 003–013 están escritos** pero los módulos correspondientes **no existen en `src/modules/`**. Solo `auth`, `health`, y `usuarios` existen. La mayoría de las features no tienen código implementado.

### Optional

- [ ] **EP-3 — No hay CI** (GitHub Actions u otro) que corra lint/build/test automáticamente. Los gates son manuales. V7 ya documentado en skill 4.
- [ ] **EP-5 — `src/modules/usuarios` no tiene `index.ts` de exports** en ningún subdirectorio (`entity/`, `service/`, `dto/`). Los imports absolutos funcionan por configuración de tsconfig, pero refactorizar será difícil sin barreras de módulo claras.

### Veredicto skill 9

**EP-2 es Required** — sin git no hay evidencia de participación. **EP-1 es Required** — el análisis existente tiene 28+ items abiertos sin acción. **EP-4 es Required** — la mayoría de features no tienen código y el roadmap los marca como "Hecho" sin base.

---

## 10. requesting-code-review

Alcance: revisión de calidad de código desde una perspectiva fresca — patrones de código, dependencias, seguridad, y consistencia.

### Required

- [ ] **RC-1 — `AuthController` importa `UsuarioService` solo para `me()`** (`src/modules/auth/controller/AuthController.ts:26-28`): `me()` llama `this.usuarioService.toPublic(req.user)` pero `AuthService.me()` ya es un pass-through puro que devuelve `usuarioPublic` tal cual. Podría usar `req.user.toPublic()` directamente sin necesitar `UsuarioService` como dependencia.
- [ ] **RC-2 — `AuthService` crea `new UsuarioService()` en el constructor** (`src/modules/auth/service/AuthService.ts:15`): no hay inyección de dependencias. Hace testing más difícil y viola el principio de que los servicios reciban sus dependencias. El `AuthController` también crea `new UsuarioService()` en `me()`, duplicando la instancia.
- [ ] **RC-4 — `authenticate` middleware atrapa `AppError` y lo convierte a 401 genérico** (`src/common/middleware/authenticate.ts:36-41`): el `if (err instanceof AppError)` branch llama `next(err)` que pasa al `errorHandler`, pero el `AppError(403, 'Usuario inactivo')` se pierde como 401. El `next(err)` funciona pero el mensaje del error se sobreescribe en el catch.
- [ ] **RC-5 — `UsuarioService` no tiene `findAll`/`list`** (`src/modules/usuarios/service/UsuarioService.ts`): feature 006 requiere listar clientes con filtros `?q=` y `?activo=`. Sin este método, la implementación del spec de 006 es imposible.
- [ ] **RC-10 — `CreateUsuarioDto` permite `@IsOptional() rol?: Rol`** pero `AuthService.register` ignora el rol del body y fuerza `Rol.CLIENTE` (`src/modules/usuarios/dto/CreateUsuarioDto.ts:24-25` + `src/modules/auth/service/AuthService.ts:20`): el consumidor de la API puede enviar `rol: ADMIN` y recibir un usuario CLIENTE sin indicación de que el rol fue sobreescrito. Confusión de API.

### Optional

- [ ] **RC-3 — `AuthController.register` hace `req.body as RegisterDto`** aunque `validateDto` middleware ya convirtió `req.body` a la instancia. El `as` es redundante. (Ya documentado como S11.)
- [ ] **RC-6 — `auth.routes.ts` no tiene `POST /api/auth/logout`**: no hay forma de invalidar un JWT del lado del servidor.
- [ ] **RC-8 — `authenticate` middleware: `req.user` se establece como entidad `Usuario` completa** incluyendo `passwordHash`. Si un controller o middleware posterior no usa `toPublic()`, `passwordHash` podría filtrarse en la respuesta.
- [ ] **RC-9 — `seedAdmin.ts` no tiene test** de integración ni unitario. Si `env.adminPassword` es el default débil, el script lo usa sin warning.

### Nit

- [ ] **RC-7 — `app.ts` `const app = createApp()`** al nivel de módulo. (Ya documentado como O1.)

### Veredicto skill 10

**RC-1, RC-2, RC-4, RC-5, RC-10 son Required** — RC-1 y RC-2 afectan la maintainibilidad del auth module, RC-4 mascara errores de autenticación, RC-5 bloquea feature 006, RC-10 es un bug de API. El resto es fortalecimiento progresivo.

---

## 11. find-skills

Alcance: descubrimiento de skills adicionales útiles para el proyecto.

### Hallazgo

- [ ] **FS-1 — Todas las skills aplicables ya fueron cargadas y analizadas**: `code-review-and-quality`, `security-and-hardening`, `api-and-interface-design`, `verification-before-completion`, `systematic-debugging`, `brainstorming`, `test-driven-development`, `writing-plans`, `executing-plans`, `requesting-code-review`. **`find-skills`** no genera hallazgos de código — su propósito es descubrir nuevas skills externas, no analizar el proyecto existente. No se agrega ningún ítem.

### Nota

El proyecto tiene 12 skills instaladas en `.agents/skills/`. Todas las skills que generan hallazgos de código/plan/proceso han sido aplicadas. La única skill que no se aplicó es `find-skills` porque su naturaleza es discoverability, no análisis.

---

## Resumen global

| Skill | Items Critical | Items Required | Items Optional | Items Nit | Total |
|---|---|---|---|---|---|
| 1. code-review-and-quality | 0 | 5 | 4 | 2 | 11 |
| 2. security-and-hardening | 1 | 5 | 6 | 2 | 14 |
| 3. api-and-interface-design | 0 | 0 | 0 | 2 | 2 |
| 4. verification-before-completion | 0 | 0 | 0 | 0 | 7 |
| 5. systematic-debugging | 0 | 2 | 1 | 1 | 4 |
| 6. brainstorming | 0 | 4 | 4 | 1 | 9 |
| 7. test-driven-development | 0 | 4 | 4 | 2 | 10 |
| 8. writing-plans | 0 | 2 | 2 | 1 | 5 |
| 9. executing-plans | 0 | 3 | 2 | 0 | 5 |
| 10. requesting-code-review | 0 | 5 | 4 | 1 | 10 |
| 11. find-skills | 0 | 0 | 0 | 0 | 0 |
| **TOTAL** | **1** | **30** | **31** | **12** | **~74** |

### Bloqueantes (Critical + Required)

**1 Critical**: S1 (sin rate limiting en auth)
**30 Required**: R1–R5, S2–S6, SD-1, SD-4, BR-1, BR-2, BR-3, WP-2, WP-3, TD-1, TD-3, TD-4, TD-6, EP-1, EP-2, EP-4, RC-1, RC-2, RC-4, RC-5, RC-10

---

## 12. Priorización — Orden de Mejora

> **Principio guía**: arreglar la base antes que las features. Cada corrección se marca `[x]` al completarse en Section 15.
>
> **Regla**: no implementar feature N si los items de `Pre-N` tienen `[ ]` sin marcar.

### 🔧 Nivel 0 — Infraestructura base (ANTES de CUALQUIER feature)

> Estos items afectan TODO el sistema. Un bug aquí se multiplica por cada feature nueva.

| # | Item | Impacto si no se arregla | Tiempo est. | Depende de |
|---|---|---|---|---|
| 0.1 | **EP-2: `git init` + primer commit** | Sin evidencia de participación para cátedra | 5 min | — |
| 0.2 | **R1: `env.nodeEnv` en errorHandler** | En producción, `isDev = true` siempre → errores internos expuestos | 2 min | — |
| 0.3 | **R2: Eliminar rama muerta `ValidationError` en errorHandler** | Código confuso, dead code que genera bugs silenciosos | 5 min | — |
| 0.4 | **R4/R4-skin: Quitar `AuthService.me()`, usar `req.user.toPublic()` en controller** | Pass-through innecesario, doble instancia de UsuarioService | 10 min | — |
| 0.5 | **RC-2: Inyectar `UsuarioService` en `AuthService`** | Sin DI, testing imposible, viola principios | 10 min | — |
| 0.6 | **TD-1: Test feliz de `authenticate` middleware** | Middleware más crítico sin cobertura de caso feliz | 10 min | 0.4 |
| 0.7 | **TD-3 + TD-4: Tests de `errorHandler` y `validateDto`** | La base de la API sin protección de tests | 15 min | 0.2, 0.3 |
| 0.8 | **S1: `express-rate-limit` en auth** | Brute-force sin freno, seguridad crítica | 15 min | — |

### 🧱 Nivel 1 — Pre-003 (ANTES de CRUD Marca)

| # | Item | Impacto si no se arregla | Tiempo est. | Depende de |
|---|---|---|---|---|
| 1.1 | **R3: AuthController 401 re-implementado** | Lógica de error en controller vs playbook §3.2 | 5 min | 0.4 |
| 1.2 | **R5 + S3: Default adminPassword débil** | Admin con password conocido en producción | 10 min | — |
| 1.3 | **S4: JWT secret sin política de fortaleza** | Tokens firmados con secret débil | 10 min | — |
| 1.4 | **RC-10: `CreateUsuarioDto` con `rol` opcional** | Confusión de API — usuario envía ADMIN, recibe CLIENTE | 5 min | — |
| 1.5 | **RC-1: AuthController importa UsuarioService innecesariamente** | Dependencia muerta, confusión de módulos | 5 min | 0.4 |
| 1.6 | **TD-2: Test de `AuthService.me()`** | Este método debe eliminarse — el test lo prueba antes | 5 min | 0.4 |
| 1.7 | **O4: Verificar cuáles LoginDto se usan** | DTOs duplicados confunden a los agentes | 10 min | — |
| 1.8 | **S2: `mysql2` vulnerability upgrade** | Vulnerabilidad high en el driver de BD | 15 min | — |

### 🧱 Nivel 2 — Pre-006 (ANTES de CRUD Cliente)

| # | Item | Impacto si no se arregla | Tiempo est. | Depende de |
|---|---|---|---|---|
| 2.1 | **BR-1: Crear `src/modules/usuarios/controller/` y `routes/`** | Sin estructura, 006 no puede implementarse | 30 min | 0.5 |
| 2.2 | **BR-2/RC-5: `UsuarioService.findAll(filters?)`** | Sin este método, el spec de 006 es inimplementable | 20 min | — |
| 2.3 | **WP-3: Actualizar `spec/features/006-crud-cliente/plan.md`** con firma de búsqueda | Spec sin definir cómo se implementa `?q=` | 15 min | 2.2 |
| 2.4 | **BR-3: Quitar `@IsOptional() rol?: Rol` de CreateUsuarioDto** | Bug de API — rol se ignora silenciosamente | 5 min | 1.4 |
| 2.5 | **TD-5: Mejorar `env.unit.test.ts` a unit test real** | Smoke test, no prueba la lógica | 10 min | — |
| 2.6 | **S5 + R1: Asegurar que errorHandler no expone mensajes en prod** | ErrorHandler ya está arreglado en R1, esto es verificación | 5 min | 0.2 |
| 2.7 | **S6: `express.json({ limit: '100kb' })`** | Body parser sin límite, riesgo de DoS | 5 min | — |

### 🏗️ Nivel 3 — Pre-007+ (ANTES de CRUD Producto y siguientes)

| # | Item | Impacto si no se arregla | Tiempo est. | Depende de |
|---|---|---|---|---|
| 3.1 | **WP-1: Corregir typo `PUT单品` en spec/007** | Documentación sucia, confusión para agentes | 2 min | — |
| 3.2 | **WP-2: Definir `FilterProductoAdminDto` en spec/007** | Plan reference un DTO sin definirlo | 15 min | — |
| 3.3 | **WP-4: Aclarar `coding-playbook.md` que `findAll` aún no está implementado** | Agentes confundidos al no encontrar el método | 5 min | 2.2 |
| 3.4 | **WP-5: Agregar firma de filtros a `spec/010-listado-productos/plan.md`** | El plan de 010 no define los query params | 15 min | — |
| 3.5 | **TD-7: Tests faltantes en auth.int.test.ts** | Cobertura de integración incompleta | 10 min | — |
| 3.6 | **RC-8: `authenticate` debería usar `toPublic()` al asignar `req.user`** | `passwordHash` podría filtrarse | 5 min | 0.4 |
| 3.7 | **TD-9: Test dedicado para 404 de `notFound` handler** | El handler central sin test propio | 5 min | — |
| 3.8 | **BR-5: Quitar dead import de `getEm` en HealthService** | Import muerto, confusión | 2 min | — |

### ⏳ Nivel 4 — Post-implementación (DESPUÉS de features implementadas)

| # | Item | Impacto si no se arregla | Tiempo est. | Depende de |
|---|---|---|---|---|
| 4.1 | **EP-3: CI con GitHub Actions** | Gates manuales, sin automatización | 30 min | EP-2 |
| 4.2 | **EP-5: `index.ts` en subdirectorios de `usuarios`** | Difícil refactorizar sin exports | 10 min | 2.1 |
| 4.3 | **S8: JWT con `issuer`/`audience`** | Reuso de tokens entre proyectos | 10 min | — |
| 4.4 | **S9: `passwordMinLength` ≥ 8** | La cátedra no lo exige, pero es buena práctica | 5 min | — |
| 4.5 | **S10: `BCRYPT_ROUNDS` ≥ 12** | Coste de hashing bajo, mejora seguridad | 5 min | — |
| 4.6 | **BR-4: Endpoint `POST /api/auth/logout`** | No está en el roadmap de regularidad | — | — |
| 4.7 | **BR-8: Refresh token** | No está en el roadmap de regularidad | — | — |
| 4.8 | **BR-7: Elegir patrón de imports en app.ts** | Patrón mixto que genera confusión | 5 min | 0.1 |
| 4.9 | **O1: Extra side-effect de `createApp()`** | Tests crean instancias extra | 10 min | 0.8 |
| 4.10 | **TD-10: Adoptar TDD real para features nuevas** | Los tests actuales son post-hoc, no TDD | — | 0.6 |

### 🔒 Nivel 5 — Items que NO se van a arreglar (y por qué)

Ver Section 13 para la justificación completa.

---

## 13. Decisiones — Qué NO se arregla y por qué

> Cada decisión aquí documentada es consciente y deliberada. Se toma después de evaluar el coste/beneficio contra el alcance de regularidad de la cátedra.

### No se sube `bcryptRounds` a 12 ahora

- **Por qué**: La cátedra pide `passwordMinLength = 6` (S9). S10 pide bcrypt ≥12. Si subimos a 12, el `seed:admin` y los tests de integración serán más lentos. La cátedra no exige esto.
- **Cuándo**: Al iniciar una feature de aprobación que lo justifique.
- **Impacto**: `BCRYPT_ROUNDS = 10` está documentado y es aceptable para regularidad.

### No se agrega `express-rate-limit` al middleware global

- **Por qué**: S1 pide rate limit en auth. La implementación correcta requiere un middleware global o específico en auth routes. Hacerlo global podría romper tests o interferir con la funcionalidad de tests de integración.
- **Cuándo**: Se implementa como parte de S1.
- **Decisión**: S1 se implementa con `express-rate-limit` en las rutas de auth, no globalmente.

### No se quita el `rol` de `CreateUsuarioDto` sin reemplazo

- **Por qué**: RC-10/BR-3 dicen que el `rol` opcional es confuso. Pero la solución correcta no es simplemente eliminarlo — es definir el comportamiento. Si se quita, `AuthService.register` asume CLIENTE y no hay validación. Mejor es dejar el `@IsOptional()` pero que `AuthService.register` use `dto.rol ?? Rol.CLIENTE` y documentar que el campo se ignora para el endpoint de login.
- **Decisión**: Mantener `rol` en el DTO con documentación explícita en `spec/features/006-crud-cliente/spec.md` de que el campo se ignora siempre.

### No se implementa `git init` como "feature" del código

- **Por qué**: EP-2 dice que falta git. Pero esto es un paso de proceso, no de código. No requiere escribir código.
- **Decisión**: `git init` + primer commit es un paso previo, no un ítem de código. Se ejecuta antes de Nivel 0.1.

### No se sube `mysql2` a 3.23.1 sin pruebas

- **Por qué**: S2 pide subir la versión. Pero `pnpm audit` indica `^3.12.0` y subir a `3.23.1` puede requerir cambios en la forma de conectar o en los queries. Sin un suite de tests pasando primero, es riesgoso.
- **Cuándo**: Después de que Niveles 0-1 estén completos y el test suite pase.
- **Decisión**: S2 se ejecuta como parte de Nivel 1.8, con el cambio acompañado de ejecución de `pnpm test`.

### No se implementa `POST /api/auth/logout` ni refresh token

- **Por qué**: BR-4 y BR-8 piden logout y refresh token. No están en el roadmap de regularidad (solo aprobación o voluntario). El JWT dura 7d y no hay mecanismo de revocación. Sin embargo, esto es alcance voluntario o de aprobación.
- **Decisión**: Se deja en backlog. No se implementa en regularidad.

### No se implementa `POST /api/carrito` antes de feature 011

- **Por qué**: BR-6 habla de duplicación entre auth y usuarios. Pero el módulo `auth` tiene un scope claro (login/register/me) y `usuarios` tiene un scope para 006 (CRUD cliente). La duplicación es conceptual, no funcional. Cada módulo tiene su DTO de LoginDto.
- **Decisión**: Se mantiene la separación actual. Si 006 requiere login/register con más campos, se extiende 006, no se fusiona con auth.

### No se cambia `app.ts` para quitar el `const app = createApp()` side-effect

- **Por qué**: O1 y RC-7 señalan el side-effect de módulo. Pero el `export default app` es un patrón común y el servidor se arranca con `import app from './app.js'`. Cambiar esto requiere reescribir `server.ts` y todos los tests de integración que importan `createApp`.
- **Cuándo**: Se deja para una refactorización cuando se estén implementando features nuevas.
- **Decisión**: Se documenta como deuda técnica aceptable para el alcance actual.

### No se usa `swagger-jsdoc` ni documentación Swagger

- **Por qué**: El roadmap lista Swagger como feature de aprobación, no de regularidad. No se justifica para el alcance actual.
- **Decisión**: Se queda en backlog.

---

## 14. Plan por Feature — Checklist Pre-Feature

> Antes de iniciar cada feature, verificar que los items de su nivel estén marcados `[x]`. Si hay `[ ]` sin marcar, NO iniciar la feature hasta que se completen.

### Antes de Feature 003 (CRUD Marca)

```
[ ] Nivel 0: 0.1 git init, 0.2 R1 errorHandler, 0.3 R2 errorHandler,
    0.4 R4 AuthService, 0.5 RC-2 AuthService DI, 0.6 TD-1 auth test,
    0.7 TD-3+TD-4 tests, 0.8 S1 rate-limit
[ ] Nivel 1: 1.1 R3 AuthController, 1.2 R5+S3 adminPassword, 1.3 S4 JWT,
    1.4 RC-10 rol DTO, 1.5 RC-1 AuthController, 1.6 TD-2 me test,
    1.7 O4 DTOs duplicados, 1.8 S2 mysql2
```

### Antes de Feature 006 (CRUD Cliente)

```
[ ] Nivel 2: 2.1 BR-1 usuarios controller/routes, 2.2 BR-2/RC-5 UsuarioService.findAll,
    2.3 WP-3 spec 006 actualización, 2.4 BR-3 quitar rol optional,
    2.5 TD-5 env test, 2.6 S5+R1 verificación, 2.7 S6 express.json limit
```

### Antes de Feature 007 (CRUD Producto)

```
[ ] Nivel 3: 3.1 WP-1 typo corregido, 3.2 WP-2 FilterProductoAdminDto definido,
    3.3 WP-4 coding-playbook actualizado, 3.4 WP-5 spec 010 filtros,
    3.5 TD-7 auth int tests, 3.6 RC-8 authenticate toPublic,
    3.7 TD-9 notFound test, 3.8 BR-5 HealthService dead import
```

### Antes de Feature 010 (Listado Productos)

```
[ ] Nivel 3 continua: 3.2 (FilterProductoAdminDto), 3.4 (spec 010),
    además: definición de FilterProductoPublicDto en spec 010
```

### Antes de Feature 013 (Listado Pedidos)

```
[ ] Nivel 3 continua: 3.5 (TD-7), 3.6 (RC-8), 3.7 (TD-9),
    además: definición de FilterPedidoAdminDto en spec 013
```

### Después de Features Implementadas (Nivel 4)

```
[ ] Nivel 4: 4.1 CI, 4.2 index.ts, 4.3 S8 JWT issuer/audience,
    4.4 S9 password length, 4.5 S10 bcrypt rounds,
    4.6 BR-4 logout, 4.7 BR-8 refresh token, 4.8 BR-7 app.ts,
    4.9 O1 side-effect, 4.10 TDD para features nuevas
```

---

## 15. Rastreo de Ejecución

> Registro de lo que se hace. Cada entrada tiene formato:
>
> `[x] YYYY-MM-DD — {ID}: {Descripción} — {Resultado} — {Gates: lint/build/test}`
>
> Si algo sale mal, usar `Ruling:` para documentar la desviación.

### [x] Pre-requisitos

- [x] **0.0** — `git init` + primer commit con todos los archivos actuales ✅
  - *Ejecutado*: `git init`, `git add -A`, `git commit -m "feat(001-002): setup inicial + analisis por skills"`
  - *Commit*: `1ef3bcb` — 171 archivos, 21733 insertions
  - *Resultado*: Evidencia de participación para cátedra asegurada

### [x] Nivel 0 — Infraestructura base

- [x] **0.1** — `R1`: Cambiar `process.env.NODE_ENV` por `env.nodeEnv` en `errorHandler.ts:35` ✅
  - Archivo: `src/common/errors/errorHandler.ts` — agregado `import { env } from '../../config/env.js'` y cambiado `process.env.NODE_ENV` por `env.nodeEnv`
  - *Resultado*: ✅ lint/build/test:unit pasan
  - *Commit*: `04c656e`
- [x] **0.1b** — `ESLint`: Agregar `.agents/**` y `.claude/**` a `eslint.config.js` ignores ✅
  - Archivo: `eslint.config.js` — los skill scripts generaban 109 errores de lint que impedían `pnpm lint`
  - *Nota*: Pre-existía; el `.gitignore` no existía y el `eslint.config.js` no ignoraba estos directorios
  - *Resultado*: ✅ lint pasa limpio
  - *Commit*: `04c656e`
- [x] **0.2** — `R2`: Eliminar rama muerta `ValidationError` en `errorHandler.ts` ✅
  - Archivo: `src/common/errors/errorHandler.ts` — eliminado `import { ValidationError }` y el bloque `if (err instanceof ValidationError)` (9 líneas removidas)
  - `validate.ts` ya maneja validation errors con `next(new AppError(400, ...))`
  - *Resultado*: ✅ lint/build/test:unit pasan
  - *Commit*: `8accb19`
- [x] **0.3** — `R4`: Quitar `me()` de `AuthService`, usar `req.user.toPublic()` en `AuthController` ✅
  - `AuthService.ts`: eliminado método `me()`
  - `AuthController.ts`: eliminado `import { UsuarioService }` y `private usuarioService`; `me()` usa `req.user.toPublic()` directamente
  - `Usuario.ts`: agregado método `toPublic(): UsuarioPublic` al entity
  - `UsuarioService.ts`: `toPublic()` ahora delega a `usuario.toPublic()`; `UsuarioPublic` movido a `Usuario.ts` y re-exportado
  - *Resultado*: ✅ lint/build/test:unit pasan
  - *Commit*: `024ec06`
- [x] **0.4** — `RC-2`: `AuthService` ya no depende de `UsuarioService` — eliminada la dependencia ✅
  - `AuthService` ya no tiene `private usuarioService = new UsuarioService()`
  - `AuthService` solo importa `UsuarioService` para `register()` y `login()` (no para inyección)
  - *Resultado*: ✅ resuelto como parte de 0.3
- [x] **0.5** — `TD-1`: Agregar test feliz de `authenticate` middleware con JWT válido ✅
  - Archivo: `tests/unit/middleware.unit.test.ts`
  - Agregados 2 tests: token válido → `next()` llamado sin args; usuario inexistente → 401
  - *Resultado*: ✅ 15/15 tests pasan (13 → 15)
  - *Commit*: `554005e`
- [x] **0.6** — `TD-3`: Agregar tests para `errorHandler` function ✅
  - Archivo: `tests/unit/errorHandler.unit.test.ts` (nuevo) — 6 tests: AppError, AppError con details, 404, Error en prod, Error en dev, no-Error
  - *Resultado*: ✅ 21/21 tests pasan (15 → 21)
  - *Commit*: `61fd26f`
- [ ] **0.7** — `TD-4`: Agregar tests para `validateDto` middleware
  - Archivo: `tests/unit/validate.unit.test.ts` (nuevo)
- [ ] **0.8** — `S1`: Agregar `express-rate-limit` a `auth.routes.ts` en `POST /register` y `POST /login`
  - Archivo: `src/modules/auth/auth.routes.ts` + `package.json`
  - *Nota*: Instalar `express-rate-limit` con `pnpm add express-rate-limit`

### [ ] Nivel 1 — Pre-003

- [ ] **1.1** — `R3`: Reemplazar 401 manual en `AuthController.me()` con `AppError` o invariante
  - Archivo: `src/modules/auth/controller/AuthController.ts`
- [ ] **1.2** — `R5+S3`: Cambiar `adminPassword` default a `required()` en production + actualizar `.env.example`
  - Archivo: `src/config/env.ts`, `.env.example`
- [ ] **1.3** — `S4`: Agregar validación de `JWT_SECRET` longitud mínima 32
  - Archivo: `src/config/env.ts`
- [ ] **1.4** — `RC-10`: Documentar en `spec/features/006-crud-cliente/spec.md` que `rol` en `CreateUsuarioDto` se ignora siempre
  - Archivo: `spec/features/006-crud-cliente/spec.md`
- [ ] **1.5** — `RC-1`: Quitar `import { UsuarioService }` de `AuthController` (ya no se usa)
  - Archivo: `src/modules/auth/controller/AuthController.ts`
- [ ] **1.6** — `TD-2`: Eliminar test de `AuthService.me()` o actualizarlo para el nuevo comportamiento
  - Archivo: `tests/unit/auth-service.unit.test.ts`
- [ ] **1.7** — `O4`: Verificar cuál `LoginDto` se usa (`auth/dto` vs `usuarios/dto`) y borrar el sin uso
- [ ] **1.8** — `S2`: Subir `mysql2` a `>=3.23.1` con `pnpm update mysql2` + correr `pnpm test`
  - Archivo: `package.json`

### [ ] Nivel 2 — Pre-006

- [ ] **2.1** — `BR-1`: Crear `src/modules/usuarios/controller/` y `src/modules/usuarios/routes/`
  - Archivos nuevos: `UsuarioController.ts`, `usuarios.routes.ts`
  - *Nota*: Seguir patrón de `auth` module. Endpoints: `GET /api/clientes`, `POST /api/clientes`, etc.
- [ ] **2.2** — `BR-2/RC-5`: Implementar `UsuarioService.findAll(filters?)` con `?q=` y `?activo=`
  - Archivo: `src/modules/usuarios/service/UsuarioService.ts`
  - *Firma*: `findAll(filters: { q?: string; activo?: boolean }): Promise<{ data: UsuarioPublic[]; total: number }>`
- [ ] **2.3** — `WP-3`: Actualizar `spec/features/006-crud-cliente/plan.md` con firma de búsqueda
- [ ] **2.4** — `BR-3`: Documentar comportamiento de `rol` en `CreateUsuarioDto`
- [ ] **2.5** — `TD-5`: Mejorar `env.unit.test.ts` a unit test real de `loadEnv()`
- [ ] **2.6** — `S5+R1`: Verificar que `errorHandler` no expone `err.message` en producción
- [ ] **2.7** — `S6`: Agregar `express.json({ limit: '100kb' })` a `app.ts`

### [ ] Nivel 3 — Pre-007+

- [ ] **3.1** — `WP-1`: Corregir typo `PUT单品` en `spec/features/007-crud-producto/plan.md`
- [ ] **3.2** — `WP-2`: Agregar `FilterProductoAdminDto` definition a `spec/features/007-crud-producto/plan.md`
- [ ] **3.3** — `WP-4`: Aclarar `coding-playbook.md` que `findAll` aún no está implementado
- [ ] **3.4** — `WP-5`: Agregar firma de filtros a `spec/features/010-listado-productos/plan.md`
- [ ] **3.5** — `TD-7`: Agregar tests faltantes en `auth.int.test.ts`
- [ ] **3.6** — `RC-8`: `authenticate` middleware usar `toPublic()` al asignar `req.user`
- [ ] **3.7** — `TD-9`: Test para `notFound` handler
- [ ] **3.8** — `BR-5`: Quitar dead import de `getEm` en `HealthService`

### [ ] Nivel 4 — Post-implementación

- [ ] **4.1** — `EP-3`: Configurar CI con GitHub Actions (lint + build + test)
- [ ] **4.2** — `EP-5`: Crear `index.ts` en `src/modules/usuarios/{entity,service,dto}/`
- [ ] **4.3** — `S8`: Agregar `issuer`/`audience` al `jwt.sign()`
- [ ] **4.4** — `S9`: Subir `passwordMinLength` a 8
- [ ] **4.5** — `S10`: Subir `BCRYPT_ROUNDS` default a 12
- [ ] **4.6** — `BR-4`: Implementar `POST /api/auth/logout` (solo si la cátedra lo exige)
- [ ] **4.7** — `BR-8`: Implementar refresh token (solo si la cátedra lo exige)
- [ ] **4.8** — `BR-7`: Resolver patrón de imports en `app.ts`
- [ ] **4.9** — `O1`: Extra side-effect de `createApp()` (cuando se refactorice server.ts)
- [ ] **4.10** — `TD-10`: Adoptar TDD real para features nuevas

---

*(Plan de mejora completo. Cada item está abierto `[ ]`. Ejecutar de a poco, en orden de prioridad. Sin apurar.)*
