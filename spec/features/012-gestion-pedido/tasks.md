# 012 · Gestión de pedido — Tareas

- [ ] Mapa de transiciones de estado (fase 1)
- [ ] `PedidoService.entregar` transaccional + historial
- [ ] `PedidoService.cancelar` transaccional + restitución de stock + historial
- [ ] `PedidoService.historial(id)`
- [ ] Rutas `POST /api/pedidos/:id/entregar|cancelar` y `GET /api/pedidos/:id/historial` solo ADMIN
- [ ] Test unit: matriz de transiciones válidas e inválidas
- [ ] Test unit: cancelar suma exactamente lo descontado
- [ ] Test integración: pedido de 011 → entregar → estado e historial
- [ ] Test integración: pedido de 011 → cancelar → stock restaurado en productos
- [ ] Test integración: entregar pedido cancelado → 409; entregar dos veces → 409
- [ ] Test integración: permisos 401/403; inexistente 404
- [ ] Validar contra los criterios de aceptación de `spec.md`
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
