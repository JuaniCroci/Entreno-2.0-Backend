# 010 · Listado de productos

**Estado:** implementada

## Qué hace

Expone al frontend (y a los visitantes) el catálogo con filtros y el detalle de cada producto.

Endpoints:

- `GET /api/productos` — listado público de productos **activos** con:
  - filtro por tipo de producto (`?idTipoProducto=`)
  - filtro por marca (`?idMarca=`)
  - rango de precio (`?precioMin=`, `?precioMax=`)
  - combinables (AND)
  - orden por nombre o precio (`?orden=nombre|precio&dir=asc|desc`)
  - paginación simple (`?page=`, `?size=`, default `page=1`/`size=20`, máx `size=100`; respuesta `{ data, total, page, size }` — shape de `api-contract.md`)
- `GET /api/productos/:id` — detalle completo del producto activo: datos, marca, tipo, proveedor (razón social), `stock` (disponibilidad `stock > 0`), descuentos vigentes a hoy (si 008 ya existe, se incluyen; si no, se omite el bloque y se completa al integrar).

Cada item del listado muestra: `id`, `nombre`, `marca`, `precioUnitario`, `disponible` (`stock > 0`).

## Por qué

Es **el listado con filtro** de regularidad (1 cada 2 integrantes; este es el de productos) y la vitrina del e-commerce. El detalle al seleccionar un elemento es obligatorio por la cátedra.

## Criterios de aceptación

- [x] `GET /api/productos` es **público** (no requiere token) y responde `200`.
- [x] Solo devuelve productos `activo=true`.
- [x] Filtro por `idTipoProducto` devuelve únicamente ese tipo; id inexistente → lista vacía `200` (no 404).
- [x] Filtro por `idMarca` análogo.
- [x] `precioMin`/`precioMax` filtran por `precioUnitario` inclusive; `precioMin > precioMax` → `400`.
- [x] Dos o más filtros combinados se aplican en AND.
- [x] Paginación: `page` fuera de rango devuelve `items: []` con `total` correcto.
- [x] Cada item incluye `disponible` calculado desde `stock` (no un campo guardado aparte).
- [x] `GET /api/productos/:id` de inactivo o inexistente → `404`.
- [x] El detalle incluye al menos: nombre, descripción, precio, marca, tipo, stock/disponibilidad.
- [x] `GET /api/productos` **no** devuelve productos inactivos ni campos internos sensibles.
- [x] Tests: unit (construcción de filtros/queries del service) + integración (cada filtro solo y combinado, paginación, detalle 404).

## Fuera de alcance

- Listado de pedidos — feature 013.
- Búsqueda full-text por nombre/descripción — se puede agregar como `?q=` solo si sobra tiempo; no es criterio de la cátedra.
- Filtro por "objetivo" (volumen/definición/rendimiento) — alcance voluntario sin modelar.
- Imágenes y galería — no modeladas.
