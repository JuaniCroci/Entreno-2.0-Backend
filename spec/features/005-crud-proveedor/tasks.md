# 005 · CRUD Proveedor — Tareas

- [x] Crear entidad `Proveedor` + migración (unique en `cuit`)
- [x] DTOs con regex de CUIT y validaciones
- [x] `ProveedorService` (CRUD, soft-delete, 409 duplicado)
- [x] Controller + routes `/api/proveedores` solo ADMIN
- [x] Test unit: CUIT inválido, duplicado, soft-delete, 404
- [x] Test integración: 401 sin token / 403 CLIENTE / 201 ADMIN
- [x] Test integración: alta → edición → listado → baja
- [x] Validar contra los criterios de aceptación de `spec.md`
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`