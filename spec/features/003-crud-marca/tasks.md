# 003 · CRUD Marca — Tareas

- [x] Crear entidad `Marca` + migración
- [x] DTOs `CreateMarcaDto` / `UpdateMarcaDto` con validaciones
- [x] `MarcaService` (list, getById, create, update, softDelete, check duplicado)
- [x] `MarcaController` + `routes` con authenticate/authorize en escrituras
- [x] Test unit: create OK / duplicado 409 / getById 404 / softDelete
- [x] Test integración: POST sin token 401, CLIENTE 403, ADMIN 201
- [x] Test integración: listado excluye `activo=false`
- [x] Test integración: duplicado 409 y validación 400
- [x] Validar contra los criterios de aceptación de `spec.md`
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`