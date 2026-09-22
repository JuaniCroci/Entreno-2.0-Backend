# 001 · Setup — Plan

## Enfoque

Scaffolding mínimo pero completo: un solo módulo `health` que atraviesa todas las capas (route → controller → service que consulta el EM) para probar de punta a punta que Express, MikroORM, env y tests funcionan juntos. Todo lo repetible (docker, scripts, lint) queda parametrizado para que las features siguientes solo agreguen módulos.

## Implementación

1. `package.json` — init con pnpm; scripts `dev`, `build`, `start`, `lint`, `test`, `test:unit`, `test:integration`, `migrate`, `migrate:dev`, `seed:admin` (seed queda stub hasta 002).
2. `tsconfig.json` — `strict: true`, `experimentalDecorators`, `emitDecoratorMetadata`, `reflect-metadata` importado al inicio de `server.ts`, `outDir: dist`.
3. `docker-compose.yml` — servicio `mysql` (image `mysql:8`, env de `MYSQL_ROOT_PASSWORD`/`MYSQL_DATABASE` desde `.env`, puerto 3306, volumen nombrado, healthcheck con `mysqladmin ping`).
4. `.env.example` / `.env` local — `NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `JWT_SECRET` (placeholder hasta 002).
5. `src/config/env.ts` — carga dotenv y exporta objeto tipado; falla al arrancar si falta una variable obligatoria.
6. `src/config/db.ts` — `MikroORM.init` con driver mysql, `schemaGenerator` para dev, `RequestContext` middleware; exporta `orm` y helper `getEm()`.
7. `src/common/errors/AppError.ts` + `errorHandler.ts` + `notFound.ts` — manejo centralizado desde el día 1.
8. `src/app.ts` — express(json) → requestContext → rutas → notFound → errorHandler. `src/server.ts` — init ORM, listen, log.
9. `src/modules/health/` — entity dummy no persistida (o solo `orm.em.getConnection().execute('select 1')` en el service), controller, routes en `GET /api/health`.
10. ESLint + Prettier (config flat, extend airbnb-ts o base TS + reglas del equipo).
11. Vitest — `vitest.config.ts`, `tests/integration/health.test.ts` con supertest contra `app`; script `test:setup` que recrea el schema de test.
12. `README.md` raíz (o link) — instrucciones de instalación y ejecución (requisito de entrega de regularidad): compose → install → env → migrate → dev → test.
13. `helmet` + `cors` — instalar y configurar en `app.ts` antes de cualquier otra ruta.
    `CORS_ORIGIN` se lee del env. `morgan('dev')` se registra solo cuando `NODE_ENV !== 'test'`.
14. Variables de entorno adicionales en `.env.example`:

    ```
    CORS_ORIGIN=http://localhost:5173
    BCRYPT_ROUNDS=10
    ADMIN_EMAIL=admin@entreno.com
    ADMIN_PASSWORD=changeme_en_produccion
    ```

## Decisiones

- **`health` atraviesa capas reales** — no un stub: valida el stack completo (incluida conexión a DB) en el primer test.
- **Schema por migraciones MikroORM, no autogenerate en prod** — `createSchema` solo en dev/test vía script para no sorprender en producción.
- **Un solo ORM init en el proceso** — `RequestContext` por request; prohibido `em` global (límite duro de la constitución).
- **JWT_SECRET en env desde ya** — aunque se usa recién en 002, evita refactor del env.

## Riesgos

- **Versiones de Express 5 + middlewares** — mitigación: pinpear versiones en package.json y validar con el test de health.
- **Docker distinto en Windows/mac del equipo** — mitigación: README con comandos probados y healthcheck del contenedor.
- **MikroORM + decorators rompen tsc si falta reflect-metadata** — mitigación: import en el entrypoint y regla de lint para recordarlo.

## Desvíos de implementación

- **Puerto MySQL 3307 (no 3306)**: el host Windows ya corre el servicio `MySQL80` en 3306; el compose publica `${DB_HOST_PORT:-3307}:3306` y `.env` usa `DB_PORT=3307`. Impacto: nada en código; solo credentials locales.
- **Podman en lugar de Docker**: la máquina del dev no tiene Docker instalado; se usó `podman compose` (compatible con el mismo `docker-compose.yml`). El README documenta ambos.
- **Test de 503 con DB caída por mock**: en vez de matar MySQL (frágil en CI/dev), se parchea `connection.execute` para lanzar error y se verifica `{ status: "error", database: "down" }` → 503. Cumple el criterio sin depender del estado del contenedor.
- **`env.ts` no importa `dotenv`**: el load de dotenv vive en `server.ts`, `mikro-orm.config.ts` y `tests/setup.ts`; así el unit test de "falta variable" puede `resetModules` sin que dotenv reponga valores.
- **`mikro-orm.config.ts` autocontenido**: el CLI de MikroORM no resuelve `./src/config/db.js` desde TS (ESM); el config duplica la conexión mínima con `MySqlDriver`.
- **`seed:admin` stub** en `scripts/seedAdmin.ts` hasta feature 002 (requerido por scripts de la constitución).
- **bcryptjs en vez de bcrypt**: sin binario nativo (Windows/team); API compatible para hash/compare. Se usa desde 002.
- **`createApp()` + `app` default en `app.ts`**: tests y server comparten el mismo builder; morgan se registra solo si `NODE_ENV !== 'test'`.
- **`docker/init-test-db.sql`**: crea `entreno_test` y grants para el user `entreno` (tests de integración).
