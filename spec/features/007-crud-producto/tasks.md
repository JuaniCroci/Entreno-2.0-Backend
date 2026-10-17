# 007 · CRUD Producto — Tareas

- [x] Crear entidad `Producto` con relations N:1 + migración
- [x] DTOs create/update/filter (**sin** `stock` en update)
- [x] `ProductoService.create` con validación de FKs activas y `stock = stockInicial`
- [x] `ProductoService.update` sin tocar `stock`
- [x] `softDelete`, `listAdmin`, `getByIdAdmin`, `getByIdPublic`
- [x] Rutas admin + pública de detalle con autorización correspondiente
- [x] Test unit: FK inactiva/inexistente, precio ≤ 0, stockInicial < 0
- [x] Test unit: update con `stock` en body no lo modifica
- [x] Test integración: alta de tipo/marca/proveedor → alta producto → GET admin → edición → soft-delete
- [x] Test integración: permisos 401/403/201
- [x] Test integración: detalle público de inactivo = 404
- [x] Validar contra los criterios de aceptación de `spec.md`
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
