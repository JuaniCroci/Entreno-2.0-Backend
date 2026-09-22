# 008 · CRUD Descuento — Tareas

- [ ] Entidades `Descuento` y `DescuentoProducto` + migración
- [ ] DTOs de descuento y de aplicación con validaciones de fecha
- [ ] `DescuentoService` CRUD + soft-delete
- [ ] `addAplicacion` con validación de producto activo y solapamiento (409)
- [ ] `removeAplicacion`
- [ ] Helper `findVigentes(productoId, fecha)` para el feature 011
- [ ] Rutas `/api/descuentos` + `/aplicaciones` solo ADMIN
- [ ] Test unit: porcentaje/cantidadMinima inválidos, fechas invertidas, solapamiento
- [ ] Test integración: alta → aplicar a 2 productos → quitar una → detalle → baja lógica
- [ ] Test integración: aplicar descuento inactivo → 400/409
- [ ] Validar contra los criterios de aceptación de `spec.md`
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
