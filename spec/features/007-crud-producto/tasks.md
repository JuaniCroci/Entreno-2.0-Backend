# 007 · CRUD Producto — Tareas

- [ ] Crear entidad `Producto` con relations N:1 + migración
- [ ] DTOs create/update/filter (**sin** `stock` en update)
- [ ] `ProductoService.create` con validación de FKs activas y `stock = stockInicial`
- [ ] `ProductoService.update` sin tocar `stock`
- [ ] `softDelete`, `listAdmin`, `getByIdAdmin`, `getByIdPublic`
- [ ] Rutas admin + pública de detalle con autorización correspondiente
- [ ] Test unit: FK inactiva/inexistente, precio ≤ 0, stockInicial < 0
- [ ] Test unit: update con `stock` en body no lo modifica
- [ ] Test integración: alta de tipo/marca/proveedor → alta producto → GET admin → edición → soft-delete
- [ ] Test integración: permisos 401/403/201
- [ ] Test integración: detalle público de inactivo = 404
- [ ] Validar contra los criterios de aceptación de `spec.md`
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
