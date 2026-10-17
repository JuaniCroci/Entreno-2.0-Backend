# 009 · CRUD Ingreso — Tareas

- [x] Entities `Ingreso` / `IngresoItem` + migración (unique)
- [x] DTOs con validación de líneas (array min 1, nested, cantidad/precio)
- [x] `IngresoService.create` transaccional con cálculo de importe y suma de stock
- [x] `IngresoService.anular` transaccional con chequeo stock ≥ 0
- [x] `list` con filtros de estado y rango de fechas
- [x] Controller + routes `/api/ingresos` solo ADMIN
- [x] Test unit: importe Σ, líneas duplicadas, anulación con stock insuficiente
- [x] Test integración: alta → stock sube → detalle → anula → stock vuelve
- [x] Test integración: `nroIngreso` duplicado 409; anular dos veces 409
- [x] Test integración: permisos 401/403
- [x] Validar contra los criterios de aceptación de `spec.md`
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
