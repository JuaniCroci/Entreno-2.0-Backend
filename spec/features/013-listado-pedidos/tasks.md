# 013 · Listado de pedidos — Tareas

- [x] `FilterPedidoAdminDto` con validaciones de fecha/estado/paginación (validación efectiva en el service, como 009/010; el DTO documenta el contrato)
- [x] `PedidoService.listAdmin` con filtros combinados, orden y shape `{ data, total, page, size }`
- [x] `fechaEntrega` derivada del historial en el item del listado — el índice `(idPedido, estado)` **ya existía desde 011** (`Migration20261001203952.ts`), no hubo migración nueva
- [x] `PedidoService.getByIdAdmin` con items + datos del cliente (reutiliza `findById`, que ya popularía)
- [x] `PedidoService.getByIdOwn` con regla 404 en pedido ajeno (`{ id, usuario }` en el where → 404 indistinguible)
- [x] Ajustar `GET /api/mis-pedidos` (fecha, estado, importeTotal en items) — **ya cumplía desde 011** (`listByUsuario` → `toPublic()`); solo se agregó test de integración
- [x] Rutas admin con authenticate + authorize ADMIN (`GET /api/pedidos` y `GET /api/pedidos/:id`)
- [x] Test unit: cada filtro, combinaciones, desde > hasta, estado inválido (`tests/unit/pedido-service.unit.test.ts`, describe 013 → 35 tests en total)
- [x] Test integración: pedidos sembrados con distintos estados/clientes → filtros
- [x] Test integración: detalle admin completo (items + cliente)
- [x] Test integración: `mis-pedidos` solo propios; detalle ajeno → 404
- [x] Test integración: 401/403 en rutas admin
- [x] Validar contra los criterios de aceptación de `spec.md` (11/11 en `[x]`)
- [x] Mover la feature a "Hecho" en `../../constitution/roadmap.md`
