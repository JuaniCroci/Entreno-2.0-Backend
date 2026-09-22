# 009 · CRUD Ingreso — Plan

## Enfoque

Módulo `ingresos` con `Ingreso` + `IngresoItem` (ex-`ING_PTO`). Alta y anulación son **transacciones** (una sola transacción de MikroORM): o se persiste todo el ingreso y el movimiento de stock, o no se persiste nada. El service de Ingreso es el único autorizado (junto con Pedido en 011/012) a mutar `Producto.stock`.

## Implementación

1. Entities `Ingreso` (`nroIngreso` unique, `fecha`, `importeTotal`, `estado` enum `REGISTRADO|ANULADO`, `proveedor` N:1) e `IngresoItem` (unique `(ingreso, producto)`).
2. Migración `AddIngresos`.
3. DTOs:
   - `CreateIngresoDto` — `nroIngreso`, `idProveedor`, `fecha?`, `lineas: CreateIngresoItemDto[]` (`@ArrayMinSize(1)`, `@ValidateNested({ each: true })`)
   - `FilterIngresoDto`
4. `IngresoService`:
   - `create` — `em.transactional`: valida proveedor/productos, calcula importe, persiste items, suma stock por producto
   - `anular` — `em.transactional`: valida estado, resta stock (chequeando stock ≥ 0 tras la resta **por cada producto**), pone `ANULADO`
   - `list`, `getById`
5. Controller + routes `/api/ingresos`.
6. Tests unit: cálculo de importe, validación de líneas duplicadas, chequeo de stock al anular.
7. Tests integración: alta con 2 productos → leer stock vía API de productos → anular → stock original.

## Decisiones

- **`importeTotal` calculado en el server** — nunca confiar en el body (anti-tampering).
- **Anulación solo si el stock alcanza** — si entre medio se vendió mercadería del ingreso, anularlo dejaría stock negativo; se rechaza y el admin debe cancelar pedidos o no anular (regla de la constitución).
- **`fecha` opcional con default `now()`** — el admin puede backdatear ingresos; útil para reportes simples.
- **Un solo módulo dueño del stock de entrada** — mismo patrón que 011/012 para salida; evita lógica repartida.
- **Enum corto `REGISTRADO|ANULADO`** — sin maestra `ESTADO_ING` (decidido).

## Interfaces externas que se consumen

> Firmas exactas de métodos de otros módulos. Usarlas tal cual; no leer el código fuente de esas features.

```typescript
// De ProveedorService (feature 005)
assertExists(id: number): Promise<Proveedor>

// De ProductoService (feature 007)
assertExists(id: number): Promise<Producto>
// Incremento de stock: mutar producto.stock += cantidad; NO llamar a otro método del service.
// La mutación de stock la hace el IngresoService directamente sobre la entidad.
```

## Riesgos

- **Deadlock al actualizar el mismo producto desde dos ingresos concurrentes** — mitigación: ordenar updates de stock por `idProducto` ascendente dentro de la transacción.
- **Anulación parcial fallida** — mitigación: `transactional` + chequeo previo de todos los productos antes de mutar (o actualizar de menor a mayor y abortar completo ante el primero que quedaría negativo, dejando la transacción sin commitear).
