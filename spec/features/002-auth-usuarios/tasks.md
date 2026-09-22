# 002 · Auth y usuarios — Tareas

- [x] Crear entidad `Usuario` con enum `Rol` y unique en `email`
- [x] Crear migración inicial de `usuarios`
- [x] Implementar `UsuarioService` con `create`, `findByEmail`, `toPublic`
- [x] Implementar DTOs de register/login con validaciones
- [x] Implementar `AuthService.register` (rol forzado CLIENTE, hash bcrypt)
- [x] Implementar `AuthService.login` (verify + firma JWT)
- [x] Crear rutas/controller de `/api/auth/*` (`register`, `login`, `me`)
- [x] Implementar middleware `authenticate`
- [x] Implementar middleware `authorize(...roles)`
- [x] Implementar middleware `validate` (si faltaba en 001)
- [x] Script `seedAdmin` + script `pnpm seed:admin` + variables en `.env.example`
- [x] Test unit: register/login (happy path + email duplicado + password inválida)
- [x] Test unit: authenticate/authorize (401 sin token, 403 rol incorrecto)
- [x] Test integración: register → login → me
- [x] Test integración: ruta `authorize('ADMIN')` con token de CLIENTE = 403
- [x] Verificar que ninguna respuesta incluye `passwordHash`
- [x] Validar contra los criterios de aceptación de `spec.md`
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
