# 008 · CRUD Descuento — Plan

## Enfoque

Dos entidades en el módulo `descuentos`: `Descuento` (master) y `DescuentoProducto` (aplicación con vigencia). El service del master orquesta las aplicaciones: **permite coexistencia** de descuentos distintos sobre el mismo producto en fechas solapadas (el que aplica en un pedido lo resuelve el helper `mejorElegible`), y solo impide repetir el mismo descuento con ventanas solapadas sobre el mismo producto.

## Implementación

1. Entities `Descuento` y `DescuentoProducto` + migración (FKs, índices `(idProducto, fechaDesde, fechaHasta)`).
2. DTOs:
   - `CreateDescuentoDto`, `UpdateDescuentoDto`
   - `CreateAplicacionDto` — `idProducto`, `fechaDesde`, `fechaHasta` (`@IsDate`, `fechaDesde ≤ fechaHasta`)
3. `DescuentoService` — CRUD + `addAplicacion` (valida producto activo + fecha ordenada + **no repetir el mismo descuento con ventanas solapadas** → 409) + `removeAplicacion` + `listAplicaciones`.
4. Controller + routes.
5. Helpers exportados del módulo para que 010/011 consulten descuentos:
   - `findVigentes(productoId, hoy)` — todas las aplicaciones vigentes del producto (010, detalle).
   - `mejorElegible(productoId, cantidad, fecha)` — el único descuento a aplicar en una línea: filtra por `cantidad ≥ cantidadMinima` y `activo`, gana el mayor `porcentaje`, empate → `fechaDesde` más reciente (011).
6. Tests unit: validaciones, duplicado solapado (409) y elección del mejor descuento.
7. Tests integración: flujo admin completo + coexistencia de dos ventanas solapadas.

## Decisiones

- **Coexistencia permitida, gana el mejor** — pueden convivir varios descuentos distintos vigentes para el mismo producto (habilita escalonados tipo "5% desde 2 u. / 15% desde 5 u."); el cálculo de 011 elige **uno solo** con `mejorElegible` (mayor %, empate → `fechaDesde` más reciente; no se acumulan). Solo se rechaza repetir el mismo descuento con ventanas solapadas en el mismo producto (fila sin efecto y fuente de ambigüedad).
- **`fechaDesde`/`fechaHasta` inclusivas** — `fechaDesde ≤ hoy ≤ fechaHasta` (ya escrito en invariantes).
- **Baja lógica del master invalida elegibilidad** — no hay que borrar aplicaciones; 011 filtra `descuento.activo = true`.
- **Helpers `findVigentes` y `mejorElegible` expuestos desde este módulo** — el cálculo de 010/011 no hace queries sueltas a la tabla (capas); la regla de elección vive en un solo lugar.

## Riesgos

- **Empate de porcentajes entre dos descuentos vigentes** — cubierto por la regla (gana `fechaDesde` más reciente); test unitario de caso borde (dos aplicaciones solapadas del mismo producto, mismo %).
- **Solapamiento del mismo descuento en el mismo producto** — rechazado en el admin (409); test unit (ventanas que se pisan vs. consecutivas, que sí se permiten).
- **Timezones en fechas** — mitigación: guardar/compare en UTC a nivel API; documentar en el DTO.
- **Endpoint inverso "descuentos de un producto" (admin)** — no existe aún: `GET /api/productos/:id/descuentos`. El detalle público de 010 ya expone `descuentosVigentes`. _Deuda documentada:_ agregarlo en aprobación o backlog si el front admin lo necesita.

## Desvíos de implementación

- **Cambio de regla post-implementación (2026-09-29)**: se eliminó el 409 por solapamiento entre descuentos distintos y se agregó el helper `mejorElegible`. Motivo: la regla de elección "gana el mayor % (si varios)" de `tech-stack.md` y el consumo desde 011 eran inalcanzables con la exclusividad; además habilita escalones por `cantidadMinima`. Impacto: 008 (spec/plan/tasks + tests) y la regla 2 de la constitución quedaron alineados; 011 usa `mejorElegible` en lugar de `findVigentes`.

## Interfaces externas que se consumen

> Firmas exactas de métodos de otros módulos. Usarlas tal cual; no leer el código fuente de esas features.

```typescript
// De ProductoService (feature 007)
assertExists(id: number): Promise<Producto>
// Producto: { id: number; nombre: string; activo: boolean }
```
