# 008 · CRUD Descuento

**Estado:** propuesta

## Qué hace

Permite al administrador gestionar descuentos por cantidad mínima (ej. "10% off desde 3 unidades") y **aplicarlos a productos** con una ventana de vigencia. El descuento es una entidad independiente; la aplicación a productos es la asociación `DescuentoProducto` (ex-`DTO_PTO`).

Endpoints (ADMIN):

- `GET /api/descuentos` — listado
- `GET /api/descuentos/:id` — detalle con sus aplicaciones (producto + rango de fechas)
- `POST /api/descuentos` — alta (`descripcion`, `cantidadMinima`, `porcentaje`, `activo`)
- `PUT /api/descuentos/:id` — edición
- `DELETE /api/descuentos/:id` — baja lógica del descuento
- `POST /api/descuentos/:id/aplicaciones` — aplica el descuento a un producto: `{ idProducto, fechaDesde, fechaHasta }`
- `DELETE /api/descuentos/:id/aplicaciones/:aplicacionId` — quita una aplicación

## Por qué

Segundo CRUD dependiente de regularidad (la proposal lo ligaba a Producto; el modelo decidido lo hace N:M con vigencia, siguiendo el DER). Es prerequisite para que 011 (pedido) pueda calcular `descuentoAplicado` y para los CUU de aprobación que lo usen.

## Criterios de aceptación

- [ ] Todas las rutas exigen `ADMIN` (`401`/`403`).
- [ ] `cantidadMinima ≥ 1`; `porcentaje` en `(0, 100]`; `descripcion` obligatoria (`400` con `details`).
- [ ] `POST /:id/aplicaciones` valida: producto existe y activo; `fechaDesde ≤ fechaHasta`; producto aún no tenga aplicación vigente con solapamiento → `409` si se solapa.
- [ ] El detalle lista aplicaciones con nombre del producto y fechas.
- [ ] `DELETE` de descuento es lógico (`204` sin body): sus aplicaciones dejan de ser elegibles en pedidos (011 chequea `descuento.activo`).
- [ ] `DELETE /:id/aplicaciones/:aplicacionId` responde `204` sin body.
- [ ] No se puede aplicar un descuento inactivo a un producto nuevo.
- [ ] Tests: unit (rangos, solapamiento, porcentaje inválido) + integración (alta → aplicar a 2 productos → quitar una → baja lógica).

## Fuera de alcance

- Cálculo del descuento al confirmar pedido — feature 011 (acá solo se modela y administra).
- Cupones con código (voluntario) — backlog.
- Descuento sobre precio de línea sin cantidad mínima — fuera del modelo actual (`cantidadMinima` es parte de la regla del DER).
