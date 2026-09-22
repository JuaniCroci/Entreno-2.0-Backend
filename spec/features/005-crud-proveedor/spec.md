# 005 · CRUD Proveedor

**Estado:** propuesta

## Qué hace

Permite al administrador gestionar los proveedores de mercadería: razón social, CUIT, contacto y domicilio. Alta, edición, listado, detalle y baja lógica. Los clientes no ven proveedores (dato de gestión interna).

Endpoints (todos `ADMIN` salvo indicación):

- `GET /api/proveedores` — listado
- `GET /api/proveedores/:id` — detalle
- `POST /api/proveedores` — alta
- `PUT /api/proveedores/:id` — edición
- `DELETE /api/proveedores/:id` — baja lógica

## Por qué

CRUD simple n.º 3 para regularidad. Es dependencia del CRUD de Producto (007, FK opcional `idProveedor`) y del CRUD de Ingreso (009, FK obligatoria).

## Criterios de aceptación

- [ ] Todas las operaciones requieren rol `ADMIN` (`401` / `403` según corresponda).
- [ ] `cuit` es obligatorio, con formato válido (11 dígitos) y **unique**: duplicado → `409`.
- [ ] `razonSocial` obligatoria; `telefono`, `email`, `domicilio` opcionales (`email` con formato si viene).
- [ ] Listado devuelve solo `activo=true`; detalle de inactivo responde `404` para no-admin-y-para-listado-público no aplica (no hay endpoint público).
- [ ] `DELETE` pone `activo=false`; responde `204` sin body.
- [ ] `GET :id` inexistente → `404`.
- [ ] Tests: unit (service, formato CUIT, duplicado) + integración (permisos y CRUD completo).

## Fuera de alcance

- Historial de precios de compra por proveedor — vive en IngresoItem (009), no acá.
- M:N producto–proveedor (`PROV_PTO`) — eliminado del modelo: FK N:1 en Producto.
- Validación de CUIT contra AFIP — formato local únicamente.
