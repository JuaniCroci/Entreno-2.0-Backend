# 003 · CRUD Marca — Tareas

- [ ] Crear entidad `Marca` + migración
- [ ] DTOs `CreateMarcaDto` / `UpdateMarcaDto` con validaciones
- [ ] `MarcaService` (list, getById, create, update, softDelete, check duplicado)
- [ ] `MarcaController` + `routes` con authenticate/authorize en escrituras
- [ ] Test unit: create OK / duplicado 409 / getById 404 / softDelete
- [ ] Test integración: POST sin token 401, CLIENTE 403, ADMIN 201
- [ ] Test integración: listado excluye `activo=false`
- [ ] Test integración: duplicado 409 y validación 400
- [ ] Validar contra los criterios de aceptación de `spec.md`
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
