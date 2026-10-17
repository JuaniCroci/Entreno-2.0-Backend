# 007 · CRUD Producto

**Estado:** implementada

## Qué hace

Permite al administrador gestionar el catálogo de productos: alta con stock inicial, edición, listado, detalle y baja lógica. Un producto **depende de** Tipo de producto (obligatorio), Marca (obligatoria) y Proveedor (opcional) — los tres CRUDs anteriores.

Endpoints (todos `ADMIN` salvo el detalle de apoyo):

- `GET /api/productos/admin` — listado admin (incluye inactivos con `?inactivos=true`)
- `GET /api/productos/admin/:id` — detalle completo
- `POST /api/productos` — alta
- `PUT /api/productos/admin/:id` — edición
- `DELETE /api/productos/admin/:id` — baja lógica
- `GET /api/productos/:id` — detalle público (si `activo=true`)

El alta recibe `stockInicial` que se carga en `stock` (regla 1 de negocio: "stock inicial sin ingreso").

## Por qué

CRUD **dependiente** de regularidad: es la pieza central del catálogo y prerequisite de Descuento (008), Ingreso (009), listado público (010) y Carrito/Pedido (011). La cátedra exige CRUDs de todas las clases de negocio para aprobación; este es el más complejo por sus FK y el stock.

## Criterios de aceptación

- [x] Escrituras requieren `ADMIN` (`401`/`403`).
- [x] `POST` valida que `idTipoProducto`, `idMarca` existan y estén `activo=true`; si no → `400`/`404` con mensaje claro.
- [x] `idProveedor` es opcional; si viene, debe existir y estar activo.
- [x] `precioUnitario > 0` y `stockInicial ≥ 0`; errores `400` con `details`.
- [x] El alta persiste `stock = stockInicial` y responde `201` con el producto.
- [x] La edición **no** permite setear `stock` directamente (el campo no está en el DTO de edición); el stock solo cambia por ingreso/pedido (constitución).
- [x] `DELETE` es lógico (`204` sin body); un producto inactivo no aparece en el detalle público ni puede entrar a carritos nuevos (control en 011).
- [x] El detalle público (`GET /api/productos/:id`) expone solo campos seguros (sin datos internos de proveedor salvo razón social si se decide exponer).
- [x] Listado admin respeta filtros básicos `?nombre=` y `?inactivos=true`.
- [x] Tests: unit (FK inválidas, precio inválido, stock inicial) + integración (CRUD completo con IDs reales de marca/tipo/proveedor creados en el test).

## Fuera de alcance

- Filtros de precio/marca/tipo del listado **público** — feature 010.
- Imágenes de producto — no modeladas.
- Actualización de stock vía edición — prohibida por constitución; va por 009/011.
- M:N con marca/proveedor (`MARCA_PTO`, `PROV_PTO`) — eliminadas del modelo.
