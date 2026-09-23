# 007 · CRUD Producto — Plan

## Enfoque

Módulo `productos` con relaciones MikroORM N:1 a `TipoProducto`, `Marca` y `Proveedor` (opcional). El service valida la existencia y actividad de las FKs antes de persistir (errores de dominio amigables en vez de FK constraint cruda). Rutas admin bajo prefijo `/api/productos/admin` para no chocar con el listado/detalle público de 010 (o viceversa: decidir orden de prefijos al implementar 010; aquí se deja registrado el criterio).

## Implementación

1. `src/modules/productos/entity/Producto.ts` — campos de la constitución; relations `tipoProducto`, `marca`, `proveedor?`; `precioUnitario` decimal(10,2); `stock` int default 0.
2. Migración `AddProductos` con FKs.
3. DTOs:
   - `CreateProductoDto` — nombre, descripcion?, precioUnitario, stockInicial, idTipoProducto, idMarca, idProveedor?
   - `UpdateProductoDto` — nombre, descripcion?, precioUnitario, idTipoProducto, idMarca, idProveedor? (**sin stock**)
   - `FilterProductoAdminDto` — `nombre?`, `idTipoProducto?`, `idMarca?`, `idProveedor?`, `activo?`, `page?`, `size?`

- `CreateProductoDto` — nombre, descripcion?, precioUnitario, stockInicial, idTipoProducto, idMarca, idProveedor?

4. `ProductoService`:
   - `create` — valida FKs activas → `AppError`; setea `stock = stockInicial`
   - `update` — mismas validaciones; jamás toca `stock`
   - `softDelete`, `listAdmin`, `getByIdAdmin`, `getByIdPublic`
5. Controller + routes (públicas y admin separadas).
6. Tests: unit de validaciones; integración que da de alta marca/tipo/proveedor y después el producto (cadena completa).

## Decisiones

- **`stockInicial` solo en Create** — modela la regla "stock inicial sin ingreso" del DER sin exponer `stock` writable.
- **Validación de FKs en el service** — mensajes en español (ej. "El tipo de producto seleccionado no existe o está inactivo") en vez de error 500 por FK.
- **Prefijos `/admin` en rutas de producto** — el listado público (010) usará `GET /api/productos` con filtros; el admin con más campos usa `/api/productos/admin`. El orden de implementación es 007 primero: si al llegar a 010 hay que renombrar, se renombra ahí con un solo cambio de routes.
- **`precioUnitario` decimal(10,2)** — dinero: no float; cálculos con `decimal.js`; JSON como string.
- **Prefijos de rutas definidos desde ahora** — `router.use('/admin', adminRoutes)` (GET/POST/PUT/DELETE admin) y rutas públicas (`GET /`, `GET /:id`) en el mismo módulo. Evita el choque con 010: el listado público ocupa `GET /api/productos` y no hace falta renombrar después.

## Interfaces externas que se consumen

> Firmas exactas de métodos de otros módulos. Usarlas tal cual; no leer el código fuente de esas features.

```typescript
// De MarcaService (feature 003)
assertExists(id: number): Promise<Marca>
// Marca: { id: number; nombre: string; activo: boolean }

// De TipoProductoService (feature 004)
assertExists(id: number): Promise<TipoProducto>
// TipoProducto: { id: number; nombre: string; activo: boolean }

// De ProveedorService (feature 005)
assertExists(id: number): Promise<Proveedor>
// Proveedor: { id: number; razonSocial: string; activo: boolean }
```

## Riesgos

- **Choque de rutas 007 vs 010** — mitigación: lo anterior; revisar al cerrar 010.
- **Edición masiva accidental de precios** — mitigación: PUT solo un producto a la vez, sin endpoint bulk.
- **Producto con stock negativo por edición** — imposible: `stock` fuera del DTO (test explícito: body con `stock` ignorado/rechazado).
