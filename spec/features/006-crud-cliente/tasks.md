# 006 · CRUD Cliente — Tareas

- [x] DTOs de filtro/create/update para clientes
- [x] `ClienteService` (list solo rol CLIENTE, get, create, update, setActivo)
- [x] Controller + routes `/api/clientes` solo ADMIN
- [x] Garantizar que login/`authenticate` rechazan `activo=false`
- [x] Asegurar que ninguna respuesta filtra `passwordHash`
- [x] Test unit: filtra rol, 404 si no es cliente, update sin password no hashea
- [x] Test integración: 401/403 en todas las rutas
- [x] Test integración: alta → listado → edición → desactivación
- [x] Test integración: 409 email duplicado
- [x] Validar contra los criterios de aceptación de `spec.md`
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`