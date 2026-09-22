# 011 · Carrito y pedido — Plan

## Enfoque

Módulo `carritos` (entidades Carrito/CarritoItem) + creación de Pedido desde un `PedidoService.confirmarDesdeCarrito` (el módulo `pedidos` nace acá y 012 lo extiende). La confirmación corre en **una transacción MikroORM**: stock, pedidos, items e historial se escriben juntos. Los descuentos se resuelven con `DescuentoService.findVigentes` (008).

## Implementación

1. Entities `Carrito`, `CarritoItem`, `Pedido`, `PedidoItem`, `HistorialEstado` + migraciones.
2. DTOs:
   - `AddItemDto` / `UpdateItemDto` — `idProducto`, `cantidad` (`@IsInt @Min(1)`)
   - filtros de respuesta `CarritoViewDto`
3. `CarritoService`:
   - `getOrCreateActivo(usuarioId)`
   - `addItem` / `updateItem` / `removeItem` — valida producto activo, stock y unicidad
   - `totalesPreview(carrito)` — Σ sin aplicar (o aplicando informativo) descuentos
4. `PedidoService.confirmarDesdeCarrito(usuarioId)` — `em.transactional`:
   1. lock/lectura del carrito ACTIVO
   2. por línea: producto activo + stock suficiente (acumulado por producto si se repite imposible por unique)
   3. descuento elegible por línea (mayor %; helper de 008)
   4. persiste Pedido + items con snapshot + HistorialEstado(REALIZADO)
   5. descuenta stock (ordenado por idProducto)
   6. carrito → CONCLUIDO
5. `GET /api/mis-pedidos` — `PedidoService.listByUsuario` (owner).
6. **Endpoints de carrito:** `POST /api/carrito` crea/obtiene activo (201/200); `GET /api/carrito` devuelve 404 si no hay activo (sin side-effect); items operan sobre el activo del usuario. Post-confirmar no hay activo hasta el próximo POST.
7. **Concurrencia:** unique de un carrito ACTIVO por usuario + `em.transactional` + re-check de estado al confirmar.
8. Routes en módulo `carritos` + `pedidos` con `authenticate` (cualquier rol logueado; ownership por `req.user`).
9. Tests unit: elección de descuento, totales con `decimal.js`, rechazo por stock.
10. Tests integración: flujo happy path + stock insuficiente a mitad + doble confirmación + GET sin carrito = 404.

## Decisiones

- **Un solo carrito ACTIVO por usuario** (unique parcial / chequeo en service) — evita carritos zombis; tras confirmar nace vacío el siguiente al pedirlo.
- **Transacción completa en confirmar** — la constitución prohíbe stock inconsistente; nada de "creo pedido y después descuento stock" en requests distintos.
- **Mejor descuento de la línea** — regla ya cerrada (mayor %; empate por `fechaDesde` más reciente).
- **Ownership por `req.user`, nunca por id en la URL del carrito** — ataque IDOR imposible en estos endpoints.
- **Módulo `pedidos` nace acá** — 012 solo agrega transiciones; no duplicar entidades.

## Riesgos

- **Doble click en confirmar** — mitigación: transacción + condición de carrito ACTIVO (row check); test de concurrencia simple.
- **Stock con pedidos simultáneos** — mitigación: chequeo dentro de la transacción; en MySQL InnoDB con filas del producto, el segundo request que lea el mismo stock al confirmar serializa por row lock si se actualiza en orden fijo (misma técnica que 009).
- **Productos desactivados mientras están en carrito** — mitigación: re-validar `activo` al confirmar (no solo al agregar).
- **Doble confirmación concurrente** — mecanismo concreto: unique parcial de un carrito `ACTIVO` por usuario + `em.transactional` + re-check del estado del carrito dentro de la transacción antes de escribir el pedido.

## Interfaces externas que se consumen

> Firmas exactas de métodos de otros módulos. Usarlas tal cual; no leer el código fuente de esas features.

```typescript
// De ProductoService (feature 007)
findById(id: number): Promise<Producto>
// Producto incluye: { id, nombre, precioUnitario, stock, activo, marca, tipoProducto }
// Populate: marca, tipoProducto

// De DescuentoService (feature 008)
findVigentes(productoId: number, fecha: Date): Promise<DescuentoProducto[]>
// DescuentoProducto incluye: { descuento: { porcentaje, activo }, cantidadMinima, fechaDesde, fechaHasta }
// Regla de selección: mayor porcentaje; empate → fechaDesde más reciente.
// Cálculos de importes con decimal.js.
```
