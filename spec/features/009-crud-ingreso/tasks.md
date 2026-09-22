# 009 · CRUD Ingreso — Tareas

- [ ] Entities `Ingreso` / `IngresoItem` + migración (unique)
- [ ] DTOs con validación de líneas (array min 1, nested, cantidad/precio)
- [ ] `IngresoService.create` transaccional con cálculo de importe y suma de stock
- [ ] `IngresoService.anular` transaccional con chequeo stock ≥ 0
- [ ] `list` con filtros de estado y rango de fechas
- [ ] Controller + routes `/api/ingresos` solo ADMIN
- [ ] Test unit: importe Σ, líneas duplicadas, anulación con stock insuficiente
- [ ] Test integración: alta → stock sube → detalle → anula → stock vuelve
- [ ] Test integración: `nroIngreso` duplicado 409; anular dos veces 409
- [ ] Test integración: permisos 401/403
- [ ] Validar contra los criterios de aceptación de `spec.md`
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
