# 002 · Auth y usuarios — Plan

## Enfoque

Módulo `auth` + módulo `usuarios` (entidad compartida): la entidad `Usuario` nace acá y los módulos siguientes solo la referencian por FK. Auth propio con JWT simétrico (HS256) y bcrypt; sin librerías de sesión. Los middlewares `authenticate` (lee `Authorization: Bearer`, verifica y clava `req.user`) y `authorize(...roles)` (compara `req.user.rol`) quedan en `common/middleware` para reutilización.

## Implementación

1. `src/modules/usuarios/entity/Usuario.ts` — entidad MikroORM con enum `Rol { ADMIN, CLIENTE }`, `passwordHash`, `activo`, timestamps; índice unique en `email`.
2. `src/modules/usuarios/dto/` — `CreateUsuarioDto`, `LoginDto`, `UpdateUsuarioDto` (parcial para 006) con class-validator.
3. `src/modules/usuarios/service/UsuarioService.ts` — `create`, `findByEmail`, `findById`, `validatePassword`; nunca exponer `passwordHash` (método `toPublic()`).
4. `src/modules/auth/dto/RegisterDto.ts`, `LoginDto.ts`.
5. `src/modules/auth/service/AuthService.ts` — `register` (fuerza `rol=CLIENTE`), `login` (verifica y firma JWT con `sub`, `rol`, `exp`), `me`.
6. `src/modules/auth/controller/AuthController.ts` + `routes` — `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` (con authenticate).
7. `src/common/middleware/authenticate.ts` — verifica JWT, carga usuario desde DB (valida `activo`), inyecta `req.user`; `401` si falta/inválido.
8. `src/common/middleware/authorize.ts` — factory `authorize(...roles: Rol[])`; `403` si el rol no está permitido.
9. `src/common/middleware/validate.ts` — generic (si no existió en 001) usando `plainToInstance` + `validate`.
10. `src/modules/auth/scripts/seedAdmin.ts` — lee `ADMIN_EMAIL`/`ADMIN_PASSWORD` del env, crea si falta; script `pnpm seed:admin`.
11. Tests unit: `AuthService.register/login` (mock EM), util bcrypt, authenticate/authorize con req fake.
12. Tests integración: flujo completo contra `entreno_test` (register → login → me → ruta admin con cliente = 403).

## Decisiones

- **JWT de un solo token sin refresh** — suficiente para TP; refresh agrega complejidad sin criterio de la cátedra.
- **Usuario se carga desde DB en authenticate, no se confía solo en el payload** — evita tokens de usuarios borrados/desactivados.
- **Register siempre `CLIENTE`** — el rol `ADMIN` solo por seed o por feature 006 (nunca desde endpoint público).
- **Mensaje de login genérico** — no distinguir "no existe" vs "contraseña mala" (evita enumeración de usuarios).
- **Enum `Rol` en la entidad, no tabla de roles** — dos valores fijos; la constitución disolvió las cajas ADMIN/CLIENTE del DER.

## Riesgos

- **`JWT_SECRET` débil o igual al de otro repo** — mitigación: exigirlo en env con longitud mínima al arrancar.
- **Bcrypt cost alto en CI lento** — mitigación: cost 10 en tests via env `BCRYPT_ROUNDS`.
- **Olvido de proteger rutas nuevas** — mitigación: en cada feature de CRUD, tasks explícitas de `authenticate`/`authorize` + test de 401/403.
