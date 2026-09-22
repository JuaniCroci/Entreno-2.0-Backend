# 002 · Auth y usuarios

**Estado:** implementada

## Qué hace

Permite registrarse e iniciar sesión en la API. Crea la entidad `Usuario` con roles `ADMIN` y `CLIENTE`, emite un JWT firmado al login, expone los middlewares `authenticate` y `authorize` para proteger rutas, y crea el usuario administrador inicial mediante un seed script.

Como cliente del sistema:

- Cualquiera puede `POST /api/auth/register` (nace como `CLIENTE`).
- Cualquiera puede `POST /api/auth/login` con email + contraseña y recibe `{ token, usuario }`.
- Un endpoint `GET /api/auth/me` devuelve el usuario del token.
- El equipo puede proteger cualquier ruta con `authenticate` + `authorize('ADMIN')`.

## Por qué

Es el requisito de aprobación "login con autenticación propia y al menos 2 niveles de acceso" y la base para proteger todos los CRUDs siguientes. Sin usuarios no hay ownership de carritos ni pedidos.

## Criterios de aceptación

- [x] `POST /api/auth/register` crea un usuario con `rol=CLIENTE` y `passwordHash` (nunca la contraseña en claro en la respuesta ni en la DB).
- [x] `POST /api/auth/register` con email ya existente responde `409`.
- [x] `POST /api/auth/register` con email/contraseña inválidos responde `400` con detalles de validación.
- [x] `POST /api/auth/login` con credenciales válidas responde `200` con JWT y datos públicos del usuario (sin `passwordHash`).
- [x] `POST /api/auth/login` con credenciales inválidas responde `401` con mensaje genérico (sin revelar si el email existe).
- [x] `GET /api/auth/me` sin token responde `401`; con token devuelve el usuario.
- [x] Una ruta protegida con `authorize('ADMIN')` responde `403` si el token es de `CLIENTE`.
- [x] `pnpm seed:admin` es idempotente: crea el admin si no existe; no duplica ni pisa contraseñas.
- [x] El rol se infiere del enum de la entidad; no existe flag `esAdmin` separado (constitución).
- [x] Tests: unit (hash/verify bcrypt, emisión/verificación JWT, login service) + integración (register → login → me → 403 en ruta admin).

## Fuera de alcance

- CRUD de clientes (gestión admin de usuarios CLIENTE) — feature 006.
- Refresh tokens / expiración configurable más allá del JWT simple — no aplica en fase 1.
- Recuperación de contraseña por email — backlog.
- Frontend de login — repo de frontend.
