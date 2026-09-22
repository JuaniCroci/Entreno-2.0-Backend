# 005 · CRUD Proveedor — Tareas

- [ ] Crear entidad `Proveedor` + migración (unique en `cuit`)
- [ ] DTOs con regex de CUIT y validaciones
- [ ] `ProveedorService` (CRUD, soft-delete, 409 duplicado)
- [ ] Controller + routes `/api/proveedores` solo ADMIN
- [ ] Test unit: CUIT inválido, duplicado, soft-delete, 404
- [ ] Test integración: 401 sin token / 403 CLIENTE / 201 ADMIN
- [ ] Test integración: alta → edición → listado → baja
- [ ] Validar contra los criterios de aceptación de `spec.md`
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
