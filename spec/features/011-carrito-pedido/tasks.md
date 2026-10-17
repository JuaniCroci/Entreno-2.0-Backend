# 011 · Carrito y pedido — Tareas

- [x] Entities Carrito/CarritoItem/Pedido/PedidoItem/HistorialEstado + migraciones
- [x] DTOs de items con validaciones
- [x] `CarritoService.getOrCreateActivo` + endpoint `POST /api/carrito` (idempotente 201/200)
- [x] `GET /api/carrito` → 404 sin crear (sin side-effects)
- [x] Unique de carrito ACTIVO por usuario (migración)
- [x] `addItem` (producto activo, stock, upsert de cantidad)
- [x] `updateItem` / `removeItem` con ownership
- [x] Vista de carrito con totales preview
- [x] `PedidoService.confirmarDesdeCarrito` transaccional (stock + descuentos con decimal.js + snapshot + historial + re-check de carrito)
- [x] `listByUsuario` para `GET /api/mis-pedidos`
- [x] Rutas `/api/carrito*` y `/api/mis-pedidos` con authenticate + ownership
- [x] Test unit: descuento elegible, totales, stock insuficiente
- [x] Test integración: login → agregar 2 productos → confirmar → stock bajó → pedido con historial
- [x] Test integración: carrito vacío 400; producto inactivo 400; stock excedido 409
- [x] Test integración: doble confirmación no duplica pedido
- [x] Test integración: CLIENTE A no ve carrito de CLIENTE B (no hay endpoint con id ajeno)
- [x] Validar contra los criterios de aceptación de `spec.md`
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
