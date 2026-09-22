# 006 · CRUD Cliente — Tareas

- [ ] DTOs de filtro/create/update para clientes
- [ ] `ClienteService` (list solo rol CLIENTE, get, create, update, setActivo)
- [ ] Controller + routes `/api/clientes` solo ADMIN
- [ ] Garantizar que login/`authenticate` rechazan `activo=false`
- [ ] Asegurar que ninguna respuesta filtra `passwordHash`
- [ ] Test unit: filtra rol, 404 si no es cliente, update sin password no hashea
- [ ] Test integración: 401/403 en todas las rutas
- [ ] Test integración: alta → listado → edición → desactivación → login fallido
- [ ] Test integración: 409 email duplicado (incluye si el email es de un admin)
- [ ] Validar contra los criterios de aceptación de `spec.md`
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
