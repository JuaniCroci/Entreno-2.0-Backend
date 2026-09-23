# AGENTS.md — Entreno 2.0 Backend

Guía principal para agentes que trabajan en este proyecto.

## Proyecto

API REST para e-commerce de artículos de gimnasio. **TypeScript + Express 5 + MikroORM + MySQL 8**.

- Fuente de verdad: [`spec/`](./spec/README.md) (constitución + features 001–013).
- Contrato HTTP: [`spec/constitution/api-contract.md`](./spec/constitution/api-contract.md).
- Frontend separado: [Frontend-TP-DSW](https://github.com/JuaniCroci/Frontend-TP-DSW).
- Package manager: **pnpm** (Node ≥ 20).

## Comandos

| Comando                             | Qué hace                                        |
| ----------------------------------- | ----------------------------------------------- |
| `pnpm dev`                          | Desarrollo (tsx watch) en http://localhost:3000 |
| `pnpm build`                        | Compila TS a `dist/`                            |
| `pnpm lint` / `pnpm lint:fix`       | ESLint                                          |
| `pnpm format` / `pnpm format:check` | Prettier                                        |
| `pnpm test`                         | Suite completa (Vitest)                         |
| `pnpm test:unit`                    | Solo unitarios (sin DB)                         |
| `pnpm test:integration`             | Integración (requiere MySQL en Docker)          |
| `pnpm migrate:dev`                  | Crea + aplica migraciones MikroORM              |
| `pnpm migrate`                      | Aplica migraciones pendientes                   |
| `pnpm seed:admin`                   | Seed de admin idempotente                       |

Verificación mínima tras cambios: `pnpm lint` y `pnpm test:unit`. Correr `pnpm test` completo solo si hay cambios que afectan integración/DB.

## Estructura

```
src/
  config/          # env.ts (dotenv tipado), db.ts (MikroORM + RequestContext)
  common/
    errors/        # AppError, errorHandler, notFound
    middleware/    # authenticate, authorize, validate
  modules/<recurso>/  # por módulo: router + service (+ entity)
  migrations/      # migraciones MikroORM
  app.ts           # express + middlewares globales
  server.ts        # bootstrap
scripts/seedAdmin.ts
tests/unit/        # services (sin DB)
tests/integration/ # flujos con supertest (con DB)
spec/              # constitución y features (fuente de verdad)
```

## CI/CD Patterns

- **pnpm setup**: Use `corepack` instead of `pnpm/action-setup@v4` to avoid "Multiple versions of pnpm specified" errors when `package.json` declares `"packageManager": "pnpm@<version>"`. In `.github/workflows/ci.yml`:
  ```yaml
  - run: |
      corepack enable
      corepack prepare pnpm@10 --activate
  - uses: actions/setup-node@v4
    with:
      node-version: '20'
      cache: 'pnpm'
      cache-dependency-path: pnpm-lock.yaml
  ```
- **Unit test env vars**: `src/config/env.ts` calls `loadEnv()` at module load time, so `pnpm test:unit` requires all env vars (`DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET`, `NODE_ENV`) even without a database connection.
- **Install**: Always use `pnpm install --frozen-lockfile` in CI for reproducible installs.

## Convenciones

- Seguir el contrato HTTP de `spec/constitution/api-contract.md`:
  - Listados: `{ data, total }`.
  - `201` en create, `204` en DELETE.
  - Dinero como string (usar `decimal.js` donde corresponda).
  - Errores: `{ statusCode, message }` vía `AppError` + `errorHandler`.
- Validación de entrada con `class-validator` + middleware `validate`.
- Auth con JWT (`authenticate` / `authorize` en `src/common/middleware/`).
- Nuevos recursos: seguir el patrón de `src/modules/health/` y `src/modules/auth/`.
- Nunca commitear `.env` ni secretos.
- Las specs en `spec/` mandan ante dudas de comportamiento.

## Skills (Agent Skills)

- Skills de este proyecto: `.agents/skills/<nombre>/SKILL.md` (carpeta multi-agente; OpenCode la descubre y `npx skills add` instala ahí).
- **Precedencia**: las skills complementan pero **nunca modifican las reglas de la cátedra** (`spec/`, `spec/constitution/api-contract.md`, `AGENTS.md`). Ante cualquier conflicto, **manda la cátedra**.
- **Regla de revisión de skills**: antes de actuar, revisar las skills disponibles y evaluar si alguna es útil. **Obligatorio en tres momentos**: (1) cuando aparece un **error**, (2) al tomar una **decisión** de diseño/implementación, (3) al **implementar algo nuevo**. El objetivo: no dejar nada en el aire y seguir siempre las buenas prácticas ya documentadas.
- Si una skill aplica: cargarla con la tool `skill` **antes** de continuar y tratar su contenido como instrucción obligatoria (no omitir pasos ni buenas prácticas que indique, salvo que choquen con la cátedra). Procedimiento detallado: [.agents/skills/README.md](./.agents/skills/README.md).
- Mapeo proceso → skill instalada:
  - **Flujo de trabajo incorporado** (se aplican solas, en su momento, sin que nadie las pida):
    - Aparece un error o bug → `systematic-debugging`: seguir su método de diagnóstico antes de proponer cualquier fix.
    - Hay que decidir entre enfoques de diseño/implementación (caso no trivial) → `brainstorming`: descomponer el problema y evaluar opciones antes de elegir. En decisiones triviales no hace falta.
    - Implementar algo nuevo no trivial (feature, módulo, refactor multi-archivo) → `writing-plans` para armar el plan por fases (con verificación por fase) y `executing-plans` para ejecutarlo paso a paso sin desviarse. Cambios pequeños/obvios (1–2 archivos) no requieren el ciclo.
    - Antes de dar cualquier tarea por terminada → `verification-before-completion`: correr la verificación mínima (`pnpm lint` + `pnpm test:unit`; `pnpm test` completo si el cambio toca integración/DB) y solo entonces marcar done.
    - Escribir tests o arreglar bugs → `test-driven-development` (red-green-refactor).
    - Evaluar un cambio antes de darlo por bueno → `code-review-and-quality` (5 ejes: correctness, readability, architecture, security, performance).
    - Diseñar nuevos endpoints o contratos de módulo → `api-and-interface-design` (el shape final lo define `api-contract.md`).
    - Auth, input de usuario, secretos, pagos, integraciones externas → `security-and-hardening`.
    - Búsqueda de skills nuevas → `find-skills`.
  - **Casos específicos** (se cargan solo cuando se piden o aplica el caso; no entran en el flujo automático):
    - `requesting-code-review` → solo cuando se pida pedir una review explícita del cambio (o antes de considerarlo mergeable): despacha un subagente revisor con el diff entre SHAs. **Requiere repo git** (hoy no lo hay: se habilita tras `git init`). El rol de _revisar_ lo cubre `code-review-and-quality`.
    - `ucp` (si se instala) → trabajo en checkout / pagos / órdenes / carrito; su workflow es `init → consult → plan → scaffold → profile → test → validate`; templates Next.js → **adaptar a Express** (`src/modules/`, route handlers), conservando los conceptos UCP.
    - `supabase-postgres-best-practices` (si se instala) → consultas y rendimiento de esquemas Postgres.
- Para instalar una skill nueva en el proyecto: ver [.agents/skills/README.md](./.agents/skills/README.md). Tras instalar, reiniciar la sesión de OpenCode para que la descubra.
