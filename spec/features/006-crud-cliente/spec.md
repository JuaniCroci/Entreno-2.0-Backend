# 006 · CRUD Cliente

**Estado:** propuesta

## Qué hace

Permite al administrador gestionar los usuarios con rol `CLIENTE`: listar, ver detalle, editar datos, desactivar y dar de alta un cliente desde el panel (sin que se registre solo). No borra usuarios físicamente.

Endpoints (todos `ADMIN`):

- `GET /api/clientes` — listado de usuarios `rol=CLIENTE` (filtro opcional `?q=` por nombre/email, `?activo=`)
- `GET /api/clientes/:id` — detalle (sin `passwordHash`)
- `POST /api/clientes` — alta manual (nombre, email, password, teléfono, dirección)
- `PUT /api/clientes/:id` — edición de datos (email, teléfono, dirección, nombre; password solo si viene)
- `PATCH /api/clientes/:id/activar` y `PATCH /api/clientes/:id/desactivar` — toggle `activo`

## Por qué

Es el **CRUD Cliente** de la proposal: en el modelo unificada no existe la clase `CLIENTE` separada, sino `Usuario` con `rol=CLIENTE` (decisión de la constitución). Cumple el 4.º CRUD simple de regularidad y da al admin control de la base de usuarios sin tocar el módulo auth.

## Criterios de aceptación

- [ ] Todas las rutas exigen rol `ADMIN` (`401` / `403`).
- [ ] El listado **solo** devuelve usuarios con `rol=CLIENTE` (nunca admins, aunque se filtre igual).
- [ ] Ninguna respuesta incluye `passwordHash`.
- [ ] `POST` con email existente → `409`; con password débil → `400`.
- [ ] `POST` crea el usuario **siempre** con `rol=CLIENTE` (ignora/reescribe un eventual `rol` en el body). **Nota**: `CreateUsuarioDto` declara `@IsOptional() rol?: Rol` pero `AuthService.register()` siempre sobreescribe con `Rol.CLIENTE`, por lo que `rol` en el body es siempre ignorado.
- [ ] No se puede editar el `rol` de un usuario desde estas rutas.
- [ ] No existe `DELETE` físico; desactivar un cliente deja su historial de pedidos intacto y le impide loguearse (`401` en login / `401` en requests con token de usuario inactivo).
- [ ] Desactivar/reactivar responde `200` con el usuario actualizado.
- [ ] Tests: unit (service filtra rol, desactivar no borra) + integración (permisos, 409, inactivo no entra al listado, login de inactivo falla).

## Fuera de alcance

- CRUD de administradores (alta/edición de `ADMIN`) — solo seed (002); no es requisito de la cátedra.
- Borrado físico de usuarios — prohibido (integridad con pedidos).
- Gestión de roles interactiva (promover cliente a admin) — fuera de alcance.
