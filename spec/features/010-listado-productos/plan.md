# 010 · Listado de productos — Plan

## Enfoque

Endpoints públicos dentro del módulo `productos` (ya creado en 007): se agregan `listPublic` y se ajusta `getByIdPublic`. El service construye el `where` de MikroORM en memoria a partir del query DTO validado (nada de concatenar strings). Los prefijos de rutas ya están definidos en 007 (`/admin` vs público): el listado ocupa `GET /api/productos` y el detalle `GET /api/productos/:id` sin renombrar nada.

## Implementación

1. `dto/FilterProductoPublicDto.ts` — `idTipoProducto?`, `idMarca?`, `precioMin?`, `precioMax?`, `orden?`, `dir?`, `page?`, `size?` con `@Type(() => Number)` y validaciones.
2. `ProductoService.findAll` (o `listPublic`) — where: `activo=true` + filtros; `orderBy` según `orden/dir`; `offset/limit`; devuelve `{ data, total, page, size }` (shape de `api-contract.md`; defaults `page=1`, `size=20`, máx `size=100`).
3. `ProductoService.getByIdPublic(id)` — solo `activo=true`; mapea respuesta con `disponible` y joins a marca/tipo/proveedor (razón social).
4. Confirmar `routes`: `GET /api/productos` público, `GET /api/productos/:id` público, escrituras/admin bajo `/api/productos/admin` (ya previsto en 007).
5. Si 008 está implementado: en `getByIdPublic`, incluir `descuentosVigentes` vía `DescuentoService.findVigentes(id, hoy)`; si no, omitir el bloque (contrato preparado).
6. Tests unit: construcción de where con cada filtro y combinaciones; precioMin > precioMax.
7. Tests integración: seed de 3 productos (distinta marca/tipo/precio) y aserciones de cada filtro + paginación + 404.

## Decisiones

- **Listado público con paginación simple** — el criterio pide "al menos un atributo" de filtro; paginar evita payloads gigantes y es buena práctica de API.
- **IDs de filtro inexistentes = lista vacía** — más amigable para el front que un 404; el detalle sí es 404.
- **`disponible` computado, no persistido** — una sola fuente de verdad: `stock`.
- **Orden por enum** — `orden` solo `nombre|precio`, no columnas arbitrary (anti SQLi aunque MikroORM lo mapee).

## Riesgos

- **Choque de rutas 007 vs 010** — resuelto en 007: prefijos `/admin` vs público definidos desde esa feature; acá solo se consume `GET /api/productos` y `GET /api/productos/:id`.
- **Descuentos en detalle si 008 no está** — mitigación: implementación condicional documentada; el roadmap los pone en orden 008 → 010, así que en la práctica 008 ya existe.

## Interfaces externas que se consumen

> Firmas exactas de métodos de otros módulos. Usarlas tal cual; no leer el código fuente de esas features.

```typescript
// Los métodos del listado viven en ProductoService (módulo creado en 007):
findAll(filters: {
  nombre?: string; idMarca?: number; idTipoProducto?: number;
  precioMin?: number; precioMax?: number;
  orden?: 'nombre' | 'precio'; dir?: 'asc' | 'desc';
  page?: number; size?: number;
}): Promise<{ data: Producto[]; total: number; page: number; size: number }>

findById(id: number): Promise<Producto>
// Populate: marca, tipoProducto, proveedor

// De DescuentoService (feature 008) — solo en el detalle:
findVigentes(productoId: number, fecha: Date): Promise<DescuentoProducto[]>
```
