# 008 · CRUD Descuento — Tareas

- [x] Entidades `Descuento` y `DescuentoProducto` + migración
- [x] DTOs de descuento y de aplicación con validaciones de fecha
- [x] `DescuentoService` CRUD + soft-delete
- [x] `addAplicacion` con validación de producto activo y **coexistencia permitida** (409 solo si el mismo descuento ya está aplicado al producto con fechas solapadas)
- [x] `removeAplicacion`
- [x] Helper `findVigentes(productoId, fecha)` para el feature 010
- [x] Helper `mejorElegible(productoId, cantidad, fecha)` — regla de elección única para 011 (mayor %, empate → `fechaDesde` más reciente)
- [x] Rutas `/api/descuentos` + `/aplicaciones` solo ADMIN
- [x] Test unit: porcentaje/cantidadMinima inválidos, fechas invertidas, duplicado solapado (409), coexistencia OK, elección del mejor descuento
- [x] Test integración: alta → aplicar a 2 productos → quitar una → detalle → baja lógica
- [x] Test integración: aplicar descuento inactivo → 400/409; dos descuentos solapados coexisten (201); duplicado exacto → 409
- [x] Validar contra los criterios de aceptación de `spec.md`
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
