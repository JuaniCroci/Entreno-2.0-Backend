# 011 · Carrito y pedido — Plan

## Enfoque

Dos módulos nuevos: `carritos` (Carrito/CarritoItem + operaciones sobre el carrito propio) y `pedidos` (Pedido/PedidoItem/HistorialEstado; nace acá y 012/013 lo extienden). `POST /api/carrito/confirmar` corre en `em.transactional` (patrón `IngresoService.ts:50`): lock del carrito `ACTIVO` (`LockMode.PESSIMISTIC_WRITE`), validación de stock de **todas** las líneas, `DescuentoService.mejorElegible` por línea, snapshot de precios con `decimal.js`, descuento de stock en orden de `idProducto`, creación de Pedido + items + HistorialEstado(REALIZADO), carrito → `CONCLUIDO`. Ownership siempre por `req.user` (no existe id de carrito en URL).

## Implementación

1. **Entities + migración** (5 tablas; DER de `tech-stack.md` §Modelo de datos):
   - `Carrito`: `estado` enum `ACTIVO|CONCLUIDO`, `usuario` N:1, timestamps. **Unicidad de carrito ACTIVO por usuario**: MySQL no soporta índices únicos parciales → columna nullable `usuarioActivoSlot` (= `usuarioId` cuando `estado='ACTIVO'`, si no `NULL`) + `@Unique` (MySQL permite múltiples NULL → N carritos `CONCLUIDO` conviven). `fechaActualizacion` del DER se cubre con el `updatedAt` timestamp (no se duplica campo).
   - `CarritoItem`: `carrito` N:1, `producto` N:1, `cantidad ≥ 1`; `@Unique({ properties: ['carrito','producto'] })`.
   - `Pedido`: `fecha`, `estado` enum `REALIZADO|ABONADO|ENTREGADO|CANCELADO` (ABONADO solo se alcanza en fase 2), `importeTotal` `decimal(10,2)`, `usuario` N:1, timestamps. Sin `fechaEntrega` (se deriva del historial en 013).
   - `PedidoItem`: `pedido`, `producto`, `cantidad`, `precioUnitario` (snapshot), `subtotal`, `descuentoAplicado` `decimal(10,2)` nullable; `@Unique({ properties: ['pedido','producto'] })`.
   - `HistorialEstado`: `pedido` N:1, `estado` enum, `fecha`; `@Index(['pedido','estado'])` (lo requiere 013 para `fechaEntrega`).
2. **DTOs**: `AddItemDto` `{ idProducto, cantidad }` / `UpdateItemDto` `{ cantidad }` con `@IsInt @Min(1)`.
3. **`CarritoService`**: `getOrCreateActivo(usuarioId)`, `getActivoView(usuarioId)` (404 si no hay activo; **GET nunca crea**), `addItem`, `updateItem`, `removeItem`, `vistaCarrito` (subtotales sin descuentos).
4. **`PedidoService`**: `confirmarDesdeCarrito(usuarioId)` (transaccional) + `listByUsuario(usuarioId)`.
5. **Rutas** con `authenticate` solamente (cualquier rol; ownership por `req.user.id`): `POST/GET /api/carrito`, `POST /api/carrito/items`, `PUT/DELETE /api/carrito/items/:id`, `POST /api/carrito/confirmar`, `GET /api/mis-pedidos` (router propio `misPedidos.routes.ts` montado en `/api/mis-pedidos` para no chocar con `/api/pedidos` de 012/013). `app.ts` suma los dos mounts.
6. **Tests TDD** por task (unit de services + integración con flujo completo), gates al final.

## Decisiones

### Rulings del usuario (03/10/2026)

- **R1 — errores al agregar item**: inexistente → `404` (contrato), inactivo → `400` (CA literal), stock 0 o cantidad excedida → `409`. Cost if wrong: cambiar 1 status + sus tests si la cátedra interpreta distinto.
- **R2 — PUT/DELETE sobre item ajeno → `404`** (no revelar existencia; alineado con la política de 013 `mis-pedidos/:id` → 404). La CA menciona `403`, pero el equipo prioriza no filtrar. Cost if wrong: cambiar a `403` en 1 handler + tests.
- **R3 — `descuentoAplicado`** = porcentaje `decimal(10,2)` (`"10.00"`; ejemplo del contrato: 1500×2=3000 → subtotal 2700 = −10%), `null` cuando no hubo descuento. Cost if wrong: rompe el shape que consume el front.
- **R4 — `GET /api/carrito`**: `{ id, estado, items: [{ id, producto: { id, nombre, precioUnitario }, cantidad, subtotal }], total }` con subtotales actuales **sin** descuentos (CA 3: los descuentos se confirman al pedir). Cost if wrong: renegotiar shape con el front.

### Rulings del implementador

- Confirmar: **sin carrito activo → `404`**; **activo vacío → `400`**; **doble confirmación concurrente → `409`** (lock + unique + re-check). Cost if wrong: cambiar 1 status.
- Redondeo: `subtotal` por línea `Decimal.toFixed(2)` (HALF_UP) y `importeTotal` = Σ de subtotales ya redondeados. Cost if wrong: diferencia de centavos.
- `authenticate` sin `authorize`: CLIENTE y ADMIN operan **su** carrito (spec: "CLIENTE dueño del carrito, o ADMIN"). Cost if wrong: agregar `authorize('CLIENTE')` a 7 rutas.
- Para R1 el `CarritoService` **no** puede reusar `assertExists` (devuelve 404 también para inactivo): hace `findOne(Producto, { id })` propio → `null` → 404, `!activo` → 400, stock → 409.

## Riesgos

- **Doble click en confirmar** — `PESSIMISTIC_WRITE` sobre el carrito + re-check `estado === 'ACTIVO'` dentro de la transacción + unique `usuarioActivoSlot` como backstop → `409`. `LockMode.PESSIMISTIC_WRITE` está en `@mikro-orm/core` instalado; es el primer uso en `src` → validar en el test de doble confirmación.
- **Stock concurrente entre pedidos** — validación y UPDATE dentro de la transacción ordenando por `idProducto` (técnica de 009; InnoDB row locks al hacer UPDATE).
- **Producto desactivado o con stock bajado mientras estaba en carrito** — re-validar `activo` y stock **al confirmar** (no solo al agregar).
- **Desincronización de migraciones (caso 008)** — si `pnpm migrate:dev` falla, aplicar el protocolo de sync (scripts en temp) antes de continuar.

## Interfaces externas que se consumen (preflight 03/10/2026)

> Verificadas contra el código real. El plan original citaba `ProductoService.findById` — **no existe** (errata corregida acá).

```typescript
// De ProductoService (007) — existe:
assertExists(id: number): Promise<Producto>
// Valida entero > 0 (400) y activo=true (404). Devuelve la entidad sin populate.
// NOTA: por R1 el carrito usa su propio findOne (ver Decisiones).

// De DescuentoService (008) — existe (regla 2 de tech-stack.md:78):
mejorElegible(productoId: number, cantidad: number, fecha: Date): Promise<DescuentoPublic | null>
// null = ningún elegible. Selección: mayor porcentaje; empate → fechaDesde más reciente; no se acumulan.

// Patrón transaccional (009, IngresoService.ts:50,94):
await this.em.transactional(async (em) => { /* checks + creates + stock en orden de id */ await em.flush(); });

// Dinero: import { Decimal } from 'decimal.js' (nombrado, NodeNext);
// @Property({ type: 'string', columnType: 'decimal(10,2)' }); .toFixed(2) → string.

// Populate (playbook §5): Carrito → items, items.producto · Pedido → usuario, items, items.producto.

// Contrato de confirmar (api-contract.md:103-121):
// 200 → { id, fecha, estado, importeTotal, usuario: { id, nombre, email },
//         items: [{ id, producto: { id, nombre }, cantidad, precioUnitario, subtotal, descuentoAplicado }] }
// 409 = stock insuficiente / duplicado único (api-contract.md:165).
```

## Forma de ejecución

Inline (`executing-plans`) + TDD red→green por task; ledger manual en `.superpowers/sdd/011-carrito-pedido/progress.md` (los scripts `task-start`/`task-done` requieren `subagent-driven-development`, no instalada — ruling idéntico al de 010). Rama `main` directa (workflow 001–010, aprobado). Commit/push solo con confirmación del usuario. Verificación mínima de cierre: `pnpm lint` + `pnpm typecheck` + `pnpm test:unit` (+ `pnpm test:integration` completo por tocar DB).
