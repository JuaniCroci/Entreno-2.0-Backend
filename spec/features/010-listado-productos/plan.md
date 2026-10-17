# 010 · Listado de productos — Plan

## Enfoque

Endpoints públicos dentro del módulo `productos` (ya creado en 007): se agrega `findAll` (público) y se extiende `getByIdPublic`. El service construye el `where` de MikroORM en memoria a partir del query parseado (nada de concatenar strings). Los prefijos de rutas ya están definidos en 007 (`/admin` vs público): el listado ocupa `GET /api/productos` (hoy no existe — solo `/admin` y `/:id`) y el detalle `GET /api/productos/:id` sin renombrar nada.

## Implementación

1. `dto/FilterProductoPublicDto.ts` — `idTipoProducto?`, `idMarca?`, `precioMin?`, `precioMax?`, `orden?`, `dir?`, `page?`, `size?` con decoradores class-validator como `FilterProductoAdminDto` (documentan la forma; **no los ejecuta ningún middleware**: `validateDto` solo valida `req.body`). El parseo de query (`Number()`) ocurre en el controller y la **validación real en el service** (patrón `listAdmin` / `IngresoService.findAll`).
2. `ProductoService.findAll(filters)` — where: `activo=true` + filtros (AND); `orderBy` según `orden/dir` (default `id DESC`, consistente con `listAdmin`); `offset/limit`; devuelve `{ data, total, page, size }` (shape de `api-contract.md`; defaults `page=1`, `size=20`, máx `size=100`). Lanza `400` si `precioMin > precioMax`, `orden`/`dir` inválidos, ids/precios no numéricos o `page`/`size` fuera de rango.
3. `ProductoService.getByIdPublic(id)` (ya existe, solo activo) — se extiende **aditivamente**: `disponible = stock > 0` y bloque `descuentosVigentes` con `DescuentoService.findVigentes(id, hoy)` (008 está implementado → el bloque va). El tipo `ProductoDetallePublic` se define en el service con `import type { DescuentoPublic }` (type-only: sin imports circulares en runtime).
4. `routes`: agregar `router.get('/', ctrl.findAll)` público; `GET /api/productos/:id` ya es público desde 007. Escrituras/admin siguen bajo `/api/productos/admin`.
5. Item del listado: `{ id, nombre, marca: { id, nombre }, precioUnitario, disponible }` (`ProductoListPublic` en `entity/Producto.ts`, sin campos internos sensibles). Detalle: `ProductoPublic` + `disponible` + `descuentosVigentes`.
6. Tests unit: construcción de where con cada filtro y combinaciones; `precioMin > precioMax`; orden inválido; params no numéricos; defaults/paginación.
7. Tests integración: productos de distinta marca/tipo/precio y aserciones de cada filtro + combinados + paginación + detalle 404 + listado público sin token.

## Decisiones

- **`findAll` canónico (playbook §2)** — ruling del usuario (29/09): el método se llama `findAll`, no `listPublic` como decían plan/tasks; la constitución manda y así pasa el playbook review. Cost if wrong: renombrar 2 identificadores.
- **`marca: { id, nombre }` en el item** — ruling del usuario: consistente con `ProductoPublic` y el resto del contrato. Cost if wrong: cambiar el shape afectaría al front.
- **Params inválidos → `400`** (no numéricos, `page<1`, `size>100`) — ruling del usuario: error explícito en la frontera; los ids numéricos inexistentes siguen `200` con lista vacía (spec). Cost if wrong: el front vería 400 donde esperaba lista vacía.
- **Orden default `id DESC`** — consistente con `listAdmin`; el front envía `orden` explícito.
- **CA "`items: []`" leído como "`data: []`"** — la CA 7 usa "items" como sustantivo descriptivo; el contrato constitucional (`api-contract.md`, wrapper `{ data, total, page, size }`) y todos los listados existentes (007–009) usan `data`, que es lo que consume el front. Se mantiene `data`.
- **Listado público con paginación simple** — el criterio pide "al menos un atributo" de filtro; paginar evita payloads gigantes y es buena práctica de API.
- **`disponible` computado, no persistido** — una sola fuente de verdad: `stock`.
- **Orden por enum** — `orden` solo `nombre|precio`, no columnas arbitrary (anti SQLi aunque MikroORM lo mapee).

## Riesgos

- **Choque de rutas 007 vs 010** — resuelto en 007: prefijos `/admin` vs público; acá solo se agrega `GET /api/productos`.
- **Imports circulares** — `DescuentoPublic` se importa con `import type` (se elimina en runtime); `DescuentoService` importa la entidad `Producto`, no `ProductoService`, así que no hay ciclo de services.
- **`findVigentes` no expone la ventana de fechas** (contrato de 008: devuelve `DescuentoPublic[]`) — el detalle muestra descripcion/cantidadMinima/porcentaje; documentado, sin tocar 008.

## Interfaces externas que se consumen

> Firmas exactas verificadas contra el código (preflight 29/09/2026). Usarlas tal cual.

```typescript
// De ProductoService (módulo 007) — ya existentes:
getByIdPublic(id: number): Promise<ProductoPublic>
// Solo activo=true; populate marca, tipoProducto, proveedor.
// 010 lo extiende aditivamente: + disponible + descuentosVigentes.

listAdmin(filters: FilterProductoAdminDto): Promise<FindAllResult>
// Solo como referencia del patrón. FindAllResult = { data, total, page, size }.

// De DescuentoService (feature 008) — solo en el detalle:
findVigentes(productoId: number, fecha: Date): Promise<DescuentoPublic[]>
// (El plan decía DescuentoProducto[]: errata corregida en preflight; la firma real es la de arriba.)

// Creado por esta feature (lo consumen el controller y los tests):
findAll(filters: FilterProductoPublicDto): Promise<FindAllResult>
```
