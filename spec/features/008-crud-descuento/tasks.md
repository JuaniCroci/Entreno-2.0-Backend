# 008 · CRUD Descuento — Tareas

- [x] Entidades `Descuento` y `DescuentoProducto` + migración
- [x] DTOs de descuento y de aplicación con validaciones de fecha
- [x] `DescuentoService` CRUD + soft-delete
- [x] `addAplicacion` con validación de producto activo y solapamiento (409)
- [x] `removeAplicacion`
- [x] Helper `findVigentes(productoId, fecha)` para el feature 011
- [x] Rutas `/api/descuentos` + `/aplicaciones` solo ADMIN
- [x] Test unit: porcentaje/cantidadMinima inválidos, fechas invertidas, solapamiento
- [x] Test integración: alta → aplicar a 2 productos → quitar una → detalle → baja lógica
- [x] Test integración: aplicar descuento inactivo → 400/409
- [x] Validar contra los criterios de aceptación de `spec.md`
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
