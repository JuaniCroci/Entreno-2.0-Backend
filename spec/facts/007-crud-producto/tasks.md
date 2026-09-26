# 007 · CRUD Producto — Tareas

- [ ] Crear entidad `Producto` con relations N:1 (`@ManyToOne`) + migración
- [ ] DTOs create/update/filter (**sin** `stock` en update)
- [ ] `ProductoService.create` con validación de FKs activas y `stock = stockInicial`
- [ ] `ProductoService.update` sin tocar `stock` (body con `stock` se ignora)
- [ ] `softDelete`, `listAdmin`, `getByIdAdmin`, `getByIdPublic`
- [ ] Rutas admin (`/api/productos/admin/*`) + pública (`GET /api/productos/:id`) en mismo router
- [ ] Test unit: FK inactiva/inexistente, precio ≤ 0, stockInicial < 0
- [ ] Test unit: update con `stock` en body no lo modifica
- [ ] Test integración: alta de tipo/marca/proveedor → alta producto → GET admin → edición → soft-delete
- [ ] Test integración: permisos 401/403/201
- [ ] Test integración: detalle público de inactivo = 404
- [ ] Actualizar `src/app.ts` con `app.use('/api/productos', productosRouter)`
- [ ] Actualizar `tests/setup.ts` con `DELETE FROM producto`
- [ ] Validar contra los criterios de aceptación de `spec.md`
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`

## Decisiones aplicadas (leer al volver a la sesión)

- `assertExists`: NO implementar (patrón inline)
- `precioUnitario`: `@Property({ type: 'string' })`, no `decimal.js` en entity
- `@ManyToOne`: import de `@mikro-orm/core`, `@ManyToOne(() => EntityClass)` para cada FK
- Prefijo rutas: `/api/productos/admin/*` para admin, `GET /api/productos/:id` para público
- FK validation: inline `findOne({ id, activo: true })` + `AppError(404)`
- `stockInicial` solo en Create DTO
- `ProveedorPublic` reutilizado; público solo expone `{ id, razonSocial, activo }`
