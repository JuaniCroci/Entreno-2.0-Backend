# Entreno 2.0 — Backend

API REST para un e-commerce de artículos de gimnasio. **TypeScript + Express 5 + MikroORM + MySQL 8**.

> Especificaciones: [`spec/`](./spec/README.md) (constitución + features 001–013).
> Frontend: [Frontend-TP-DSW](https://github.com/JuaniCroci/Frontend-TP-DSW).

## Requisitos

- Node.js ≥ 20 y [pnpm](https://pnpm.io)
- Docker (o Podman con `podman compose`) para MySQL 8

## Instalación y ejecución

```bash
# 1. Base de datos MySQL 8 en Docker
docker compose up -d          # o: podman compose up -d  (MySQL en localhost:3307)

# 2. Dependencias
pnpm install

# 3. Variables de entorno
cp .env.example .env          # ajustar credenciales si hace falta

# 4. Migraciones iniciales
pnpm migrate:dev

# 5. Seed de admin (idempotente)
pnpm seed:admin

# 6. Desarrollo
pnpm dev                      # API en http://localhost:3000

# 7. Health check
curl http://localhost:3000/api/health   # → { "status": "ok", "database": "up" }
```

## Scripts

| Comando                 | Qué hace                                   |
| ----------------------- | ------------------------------------------ |
| `pnpm dev`              | Arranca en desarrollo (tsx watch)          |
| `pnpm build`            | Compila TypeScript estricto a `dist/`      |
| `pnpm start`            | Sirve el build de producción               |
| `pnpm lint`             | ESLint                                     |
| `pnpm format`           | Prettier (formato)                         |
| `pnpm test`             | Suite completa (Vitest)                    |
| `pnpm test:unit`        | Solo tests unitarios                       |
| `pnpm test:integration` | Solo tests de integración (requiere MySQL) |
| `pnpm migrate:dev`      | Crea + aplica migraciones                  |
| `pnpm migrate`          | Aplica migraciones pendientes              |
| `pnpm seed:admin`       | Crea el admin inicial (idempotente)       |

## Tests

```bash
docker compose up -d   # MySQL debe estar levantado para los de integración
pnpm test
```

Los tests unitarios (`tests/unit/`) no requieren base. Los de integración (`tests/integration/`) usan la misma DB que el `.env`.

## Estructura

```
src/
  config/          # env.ts (dotenv tipado), db.ts (MikroORM + RequestContext)
  common/
    errors/        # AppError, errorHandler, notFound
    middleware/    # authenticate, authorize, validate
  modules/
    health/        # GET /api/health
    auth/          # register, login, me (JWT)
    usuarios/      # entidad Usuario + service
  migrations/      # migraciones MikroORM
  app.ts           # express + middlewares globales
  server.ts        # bootstrap
scripts/
  seedAdmin.ts     # pnpm seed:admin
tests/
  unit/            # services
  integration/     # flujos con supertest
spec/              # constitución y features (fuente de verdad)
```

## Contrato HTTP

Ver [`spec/constitution/api-contract.md`](./spec/constitution/api-contract.md): listados `{ data, total }`, `201` en create, `204` en DELETE, dinero como string, errores `{ statusCode, message }`.
