# 006 · CRUD Cliente — Plan

## Enfoque

Módulo `clientes` que **reutiliza la entidad `Usuario`** de 002 (no hay entidad `Cliente`). Es una fachada admin con queries forzadas a `rol = CLIENTE`. Evita exponer el módulo `usuarios` completo al frontend admin y deja explícito el dominio ("clientes" = usuarios con ese rol).

## Firma de búsqueda

`UsuarioService.findAll(filters: { q?: string; activo?: boolean }): Promise<{ data: UsuarioPublic[]; total: number }>`
- `q` busca en `nombre` y `email` con LIKE `%q%`
- `activo` filtra por booleano
- Devuelve data (sin `passwordHash`) y total para paginación

## Implementación

1. `src/modules/clientes/dto/` — `CreateClienteDto` (requiere password), `UpdateClienteDto` (password opcional), `FilterClienteDto` (`q?`, `activo?`).
2. `ClienteService` — `list` (where rol=CLIENTE + filtros), `getById` (chequea rol; si no es cliente → 404), `create` (hash password, rol forzado), `update` (nunca toca rol ni hashea si no viene password), `setActivo`.
3. `ClienteController` + `routes` `/api/clientes` con `authenticate` + `authorize('ADMIN')`.
4. Ajuste en `AuthService.login` / `authenticate` (si no estaba): rechazar usuarios con `activo=false`.
5. Tests unit + integración.

## Decisiones

- **Módulo separado `clientes` sobre la misma tabla `usuarios`** — el CRUD de la proposal es de "Cliente"; en código queda claro sin duplicar entidades.
- **Baja lógica coherente con auth** — desactivar = no puede iniciar sesión ni usar tokens vigentes (authenticate re-valida `activo`).
- **Password en PUT solo si viene en el body** — evita resetear la contraseña sin querer al editar teléfono.
- **No exponer listado de admins** — listado filtrado siempre; un admin no se "edita" por esta API.

## Riesgos

- **Confusión entre módulos `usuarios`/`auth`/`clientes`** — mitigación: `usuarios` queda como entidad+service interno; solo `auth` y `clientes` lo usan desde afuera.
- **Tokens vigentes de un cliente desactivado** — mitigación: `authenticate` consulta la DB en cada request (ya decidido en 002).
