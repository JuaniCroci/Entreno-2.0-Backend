# 004 · CRUD Tipo de producto

**Estado:** propuesta

## Qué hace

Permite al administrador gestionar los tipos de producto (Suplemento, Accesorio, Ropa, etc.): crear, editar, listar, ver detalle y desactivar. Los clientes solo ven tipos activos.

Endpoints:

- `GET /api/tipos-producto` — listado (público)
- `GET /api/tipos-producto/:id` — detalle (público)
- `POST /api/tipos-producto` — alta (admin)
- `PUT /api/tipos-producto/:id` — edición (admin)
- `DELETE /api/tipos-producto/:id` — baja lógica (admin)

## Por qué

CRUD simple n.º 2 para regularidad (1 por integrante) y dependencia obligatoria del CRUD de Producto (007). La relación Producto ↔ Tipo es la única que las tres capas del DER marcaban sin ambigüedad (N:1).

## Criterios de aceptación

- [ ] Listado público devuelve solo tipos `activo=true` con `200`.
- [ ] Escrituras requieren token `ADMIN` (`401` sin token, `403` con CLIENTE).
- [ ] `nombre` unique: duplicado responde `409`.
- [ ] `descripcion` es opcional; `nombre` obligatorio con longitud 2–80 (`400` con `details` si falla).
- [ ] `PUT` actualiza `nombre` y `descripcion`; responde `200`.
- [ ] `DELETE` es lógico (`activo=false`) y responde `204` sin body.
- [ ] `GET :id` inexistente → `404`.
- [ ] Tests: unit (service) + integración (permisos, duplicado, filtrado de inactivos).

## Fuera de alcance

- Jerarquía de tipos (subtipos) — el DER no la tiene.
- Cantidad de productos por tipo en la respuesta — no requerida.
