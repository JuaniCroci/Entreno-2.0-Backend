# 001 · Setup

**Estado:** implementada

## Qué hace

Deja el proyecto backend ejecutable de cero con un solo flujo de comandos: base de datos MySQL en Docker, Express 5 respondiendo, MikroORM conectado con migraciones, variables de entorno tipadas, lint/formato configurados y el harness de tests (Vitest) listo. Incluye un endpoint `GET /api/health` que reporta el estado de la API y de la conexión a la base.

## Por qué

Es la base sobre la que se apoyan las 12 features siguientes. Sin este esqueleto no hay dónde montar entidades, middlewares ni tests. También cumple requisitos de regularidad de la cátedra desde el día 1: dependencias registradas en `package.json`, ambientes definidos, DB externa vía servicio y scripts ejecutables.

## Criterios de aceptación

- [ ] `docker compose up -d` levanta MySQL 8 con volumen persistente y el contenedor queda `healthy`.
- [ ] `pnpm install` instala dependencias de runtime, desarrollo y test sin pasos manuales extra.
- [ ] `pnpm dev` arranca la API y `GET /api/health` responde `200` con `{ status: "ok", database: "up" }`.
- [ ] `GET /api/health` responde `503` con mensaje claro si MySQL no está disponible.
- [ ] `pnpm migrate:dev` crea/aplica migraciones iniciales contra la DB del `.env` sin errores.
- [ ] `pnpm build` compila TypeScript estricto sin errores; `pnpm start` sirve el build.
- [ ] `pnpm lint` pasa sin errores; Prettier formatea igual en todo el repo.
- [ ] `pnpm test` ejecuta al menos un test de smoke (health vía supertest) y pasa.
- [ ] `.env.example` documenta **todas** las variables (`NODE_ENV`, `PORT`, `DB_*`, `JWT_SECRET`, `CORS_ORIGIN`, `BCRYPT_ROUNDS`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`); `.env` está en `.gitignore` y no se commitea.
- [ ] `helmet` y `cors` (origin desde `CORS_ORIGIN`) están activos en `app.ts`; `morgan('dev')` no corre en `NODE_ENV=test`.
- [ ] El `RequestContext` de MikroORM queda enganchado como middleware para que todo request tenga su EntityManager.

## Fuera de alcance

- Cualquier entidad de negocio (Usuario, Producto, etc.) — van en features 002+.
- Auth, roles y middlewares de autorización — feature 002.
- Seed de admin — feature 002.
- CI/CD y deploy — backlog de aprobación.
