# 011 · Carrito y pedido — Tareas

- [ ] Entities Carrito/CarritoItem/Pedido/PedidoItem/HistorialEstado + migraciones
- [ ] DTOs de items con validaciones
- [ ] `CarritoService.getOrCreateActivo` + endpoint `POST /api/carrito` (idempotente 201/200)
- [ ] `GET /api/carrito` → 404 sin crear (sin side-effects)
- [ ] Unique de carrito ACTIVO por usuario (migración)
- [ ] `addItem` (producto activo, stock, upsert de cantidad)
- [ ] `updateItem` / `removeItem` con ownership
- [ ] Vista de carrito con totales preview
- [ ] `PedidoService.confirmarDesdeCarrito` transaccional (stock + descuentos con decimal.js + snapshot + historial + re-check de carrito)
- [ ] `listByUsuario` para `GET /api/mis-pedidos`
- [ ] Rutas `/api/carrito*` y `/api/mis-pedidos` con authenticate + ownership
- [ ] Test unit: descuento elegible, totales, stock insuficiente
- [ ] Test integración: login → agregar 2 productos → confirmar → stock bajó → pedido con historial
- [ ] Test integración: carrito vacío 400; producto inactivo 400; stock excedido 409
- [ ] Test integración: doble confirmación no duplica pedido
- [ ] Test integración: CLIENTE A no ve carrito de CLIENTE B (no hay endpoint con id ajeno)
- [ ] Validar contra los criterios de aceptación de `spec.md`
- [ ] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
