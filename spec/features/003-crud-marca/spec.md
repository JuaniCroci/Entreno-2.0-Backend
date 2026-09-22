# 003 · CRUD Marca

**Estado:** propuesta

## Qué hace

Permite al administrador gestionar las marcas de productos (Star Nutrition, ENA, etc.): crear, editar, listar, ver detalle y desactivar. Los clientes solo pueden listar marcas activas (necesario para los filtros del catálogo).

Endpoints:

- `GET /api/marcas` — listado (público; opcional `?q=` por nombre)
- `GET /api/marcas/:id` — detalle (público)
- `POST /api/marcas` — alta (admin)
- `PUT /api/marcas/:id` — edición (admin)
- `DELETE /api/marcas/:id` — baja lógica (admin)

## Por qué

Es uno de los 4 CRUDs simples (1 por integrante) que exige la cátedra para regularidad, y dependencia obligatoria del CRUD de Producto (feature 007): sin marca no se da de alta un producto.

## Criterios de aceptación

- [ ] El listado público devuelve solo marcas con `activo=true` y estátus `200`.
- [ ] `POST /api/marcas` sin token responde `401`; con token de `CLIENTE` responde `403`; con `ADMIN` crea y responde `201`.
- [ ] `POST /api/marcas` con nombre duplicado (activo o no) responde `409`.
- [ ] `POST /api/marcas` con `nombre` vacío o muy largo responde `400` con `details`.
- [ ] `PUT /api/marcas/:id` actualiza campos y responde `200` con la marca actualizada.
- [ ] `GET /api/marcas/:id` de un id inexistente responde `404`.
- [ ] `DELETE /api/marcas/:id` pone `activo=false` (no borra físico) y responde `204` sin body.
- [ ] Una marca con `activo=false` no aparece en listados públicos ni es seleccionable como FK nueva (la validación de 007 la cubre; acá se verifica inactiva en detalle admin).
- [ ] Tests: unit (service create/list/soft-delete + duplicado) + integración (permisos 401/403/201, duplicado 409, listado filtra inactivas).

## Fuera de alcance

- Asociación marca–producto N:M — no existe: la relación es N:1 desde Producto (decisión de modelado).
- Baja física de marcas referenciadas — no se hace en ningún feature (soft-delete permanente).
- Autocomplete / paginación avanzada — no requerida en regularidad.
