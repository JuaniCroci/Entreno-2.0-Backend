# 013 · Listado de pedidos — Plan

## Enfoque

Completar el módulo `pedidos` con `listAdmin(filter)`, `getByIdAdmin` y las vistas de ownership `listByUsuario` / `getByIdOwn` (refactor de lo mínimo que haya quedado en 011). El filtro de cliente resuelve nombre/email con `OR` sobre la relación `usuario`. Mapeo de respuestas con DTOs de vista (no entidades crudas) para no fugar `passwordHash` u otros campos.

## Implementación

1. `dto/FilterPedidoAdminDto` — `desde?`, `hasta?`, `estado?` (enum), `idCliente?`, `cliente?` (string), `page?`, `size?`.
2. `PedidoService.listAdmin` — where combinado + join a usuario para el filtro `cliente` + paginación `{ data, total, page, size }` + orden `fecha desc` + join/derivado de `fechaEntrega` desde `HistorialEstado` (`estado=ENTREGADO`, índice `(idPedido, estado)`).
3. `PedidoService.getByIdAdmin(id)` — detail completo con items y usuario (proyección segura).
4. `PedidoService.getByIdOwn(id, usuarioId)` — si `pedido.usuario.id !== usuarioId` → `404`.
5. Rutas: `GET/GET :id` bajo `/api/pedidos` (admin); refinar `/api/mis-pedidos` y `/api/mis-pedidos/:id`.
6. Tests unit de filtros; tests integración con pedidos de varios clientes y estados distintos (sembrados via flujo 011/012 o inserts directos en test).

## Decisiones

- **404 en pedido ajeno para el cliente** — no 403: evita enumeración de IDs (mejor práctica de seguridad ya alineada con límites de la constitución).
- **`cliente` como texto libre parcial** — la proposal pedía filtrar "por cliente"; nombre+email cubre el caso de uso del admin sin depender solo de id.
- **Orden por defecto `fecha desc`** — lo más reciente primero en el panel.
- **Detalle admin incluye datos personales** — el listado de la proposal los pide explícitamente (nombre, dirección, teléfono, mail); solo ADMIN.

## Riesgos

- **Fuga de datos en listado público** — mitigación: rutas admin tras `authorize('ADMIN')`; test de 401/403.
- **Filtro de fecha con timezone** — mitigación: interpretar `desde`/`hasta` como fechas UTC alineadas con cómo `Pedido.fecha` se persiste (mismo criterio que 008).
- **`fechaEntrega` derivada del historial** — join/subquery a `HistorialEstado` (`estado = ENTREGADO`, MAX fecha); **índice `(idPedido, estado)` obligatorio** (ya en tech-stack).

## Interfaces externas que se consumen

> Firmas exactas de métodos de otros módulos. Usarlas tal cual; no leer el código fuente de esas features.

```typescript
// De PedidoService (feature 011)
findById(id: number): Promise<Pedido>

// El listado admin puede ser método nuevo en PedidoService o un ListadoPedidosService
// (decisión al implementar; documentar en "Desvíos de implementación" si se elige service nuevo).
// Shape de respuesta: { data: PedidoResumen[], total, page, size } (api-contract.md)
```
