# 012 · Gestión de pedido — Tareas

- [x] Mapa de transiciones de estado (fase 1)
- [x] `PedidoService.entregar` transaccional + historial
- [x] `PedidoService.cancelar` transaccional + restitución de stock + historial
- [x] `PedidoService.historial(id)`
- [x] Rutas `POST /api/pedidos/:id/entregar|cancelar` y `GET /api/pedidos/:id/historial` solo ADMIN
- [x] Test unit: matriz de transiciones válidas e inválidas
- [x] Test unit: cancelar suma exactamente lo descontado
- [x] Test integración: pedido de 011 → entregar → estado e historial
- [x] Test integración: pedido de 011 → cancelar → stock restaurado en productos
- [x] Test integración: entregar pedido cancelado → 409; entregar dos veces → 409
- [x] Test integración: permisos 401/403; inexistente 404
- [x] Validar contra los criterios de aceptación de `spec.md`
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
