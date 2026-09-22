# 008 · CRUD Descuento — Plan

## Enfoque

Dos entidades en el módulo `descuentos`: `Descuento` (master) y `DescuentoProducto` (aplicación con vigencia). El service del master orquesta las aplicaciones e implementa la regla de solapamiento por producto (evitar dos descuentos activos del mismo producto en fechas que se pisen — simplificación que mantiene determinista el cálculo de 011).

## Implementación

1. Entities `Descuento` y `DescuentoProducto` + migración (FKs, índices `(idProducto, fechaDesde, fechaHasta)`).
2. DTOs:
   - `CreateDescuentoDto`, `UpdateDescuentoDto`
   - `CreateAplicacionDto` — `idProducto`, `fechaDesde`, `fechaHasta` (`@IsDate`, `fechaDesde ≤ fechaHasta`)
3. `DescuentoService` — CRUD + `addAplicacion` (valida producto activo + solapamiento → 409) + `removeAplicacion` + `listAplicaciones`.
4. Controller + routes.
5. Export del service/`DescuentoRepository`-style helper para que 011 consulte aplicaciones vigentes de un producto en una fecha (`findVigentes(productoId, hoy)`).
6. Tests unit: validaciones y solapamiento (fechas que pisan / se tocan en un día).
7. Tests integración: flujo admin completo.

## Decisiones

- **Solapamiento prohibido por producto** — si dos descuentos activos cubren el mismo día para el mismo producto, 011 tendría que desempatar siempre; mejor impedirlo en el admin (regla agregada, documentada aquí y en la constitución al implementar).
- **`fechaDesde`/`fechaHasta` inclusivas** — `fechaDesde ≤ hoy ≤ fechaHasta` (ya escrito en invariantes).
- **Baja lógica del master invalida elegibilidad** — no hay que borrar aplicaciones; 011 filtra `descuento.activo = true`.
- **Helper `findVigentes` expuesto desde este módulo** — el cálculo de 011 no hace queries sueltas a la tabla (capas).

## Riesgos

- **Solapamiento entre descuentos distintos en el mismo producto** — cubierto por la regla anterior; test de caso borde (hasta del A = desde del B − 1 día vs mismo día).
- **Timezones en fechas** — mitigación: guardar/compare en UTC a nivel API; documentar en el DTO.
- **Endpoint inverso "descuentos de un producto" (admin)** — no existe aún: `GET /api/productos/:id/descuentos`. El detalle público de 010 ya expone `descuentosVigentes`. _Deuda documentada:_ agregarlo en aprobación o backlog si el front admin lo necesita.

## Interfaces externas que se consumen

> Firmas exactas de métodos de otros módulos. Usarlas tal cual; no leer el código fuente de esas features.

```typescript
// De ProductoService (feature 007)
assertExists(id: number): Promise<Producto>
// Producto: { id: number; nombre: string; activo: boolean }
```
