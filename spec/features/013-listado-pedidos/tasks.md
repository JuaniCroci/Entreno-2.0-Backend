# 013 · Listado de pedidos — Tareas

- [ ] `FilterPedidoAdminDto` con validaciones de fecha/estado/paginación
- [ ] `PedidoService.listAdmin` con filtros combinados, orden y shape `{ data, total, page, size }`
- [ ] `fechaEntrega` derivada del historial en el item del listado + índice `(idPedido, estado)`
- [ ] `PedidoService.getByIdAdmin` con items + datos del cliente
- [ ] `PedidoService.getByIdOwn` con regla 404 en pedido ajeno
- [ ] Ajustar `GET /api/mis-pedidos` (fecha, estado, importeTotal en items)
- [ ] Rutas admin con authenticate + authorize ADMIN
- [ ] Test unit: cada filtro, combinaciones, desde > hasta, estado inválido
- [ ] Test integración: pedidos sembrados con distintos estados/clientes → filtros
- [ ] Test integración: detalle admin completo (items + cliente)
- [ ] Test integración: `mis-pedidos` solo propios; detalle ajeno → 404
- [ ] Test integración: 401/403 en rutas admin
- [ ] Validar contra los criterios de aceptación de `spec.md`
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
