# 007 · CRUD Producto — Plan (fuente de verdad)

## Enfoque

Módulo `productos` con relaciones MikroORM N:1 a `TipoProducto`, `Marca` y `Proveedor` (opcional).

## Todas las decisiones confirmadas

### 1. `assertExists` → NO implementar
- Seguir patrón inline: `findOne({ id, activo: true })` + `AppError(404)` en cada validación FK
- No modificar services existentes

### 2. `decimal.js` → `precioUnitario` como `string` en entity
- Entity: `@Property({ type: 'string' }) precioUnitario!: string;`
- No usar `Decimal` instance en entity ni en `toPublic()`
- DTO: `@IsDecimal()` en `precioUnitario`
- Service: valida `> 0` con parse simple o `Decimal` (opcional)
- Respuesta JSON: `precioUnitario` como string `"1500.00"`

### 3. `@ManyToOne` sintaxis (confirmada de `RefreshToken.ts`)
```ts
import { ManyToOne } from '@mikro-orm/core';
@ManyToOne(() => TipoProducto) tipoProducto!: TipoProducto;
@ManyToOne(() => Marca) marca!: Marca;
@ManyToOne(() => Proveedor) proveedor?: Proveedor; // nullable
```

### 4. Prefijo de rutas: UN SOLO ROUTER
- `src/modules/productos/routes/productos.routes.ts` con `router.use('/admin', adminRoutes)` para admin
- Rutas públicas `GET /:id` en el mismo router
- `app.ts`: `app.use('/api/productos', productosRouter)`
- Evita colisión con 010 que usará `GET /api/productos`

### 5. Validación de FKs inline en service
```ts
const tipo = await this.em.findOne(TipoProducto, { id: dto.idTipoProducto, activo: true });
if (!tipo) throw new AppError(404, 'El tipo de producto seleccionado no existe o está inactivo');
```
Repetir para `idMarca` e `idProveedor` (opcional).

### 6. `stockInicial` solo en Create
- `CreateProductoDto`: `stockInicial: number`, `@IsInt()`, `@Min(0)`
- `UpdateProductoDto`: NO tiene `stock` ni `stockInicial`
- `ProductoService.create`: `stock = stockInicial`
- `ProductoService.update`: no toca `stock` — body con `stock` se ignora silenciosamente

### 7. `stock` como integer
- `@Property({ type: 'integer', default: 0 }) stock!: number;`

### 8. Tests integración — cadena completa
- `beforeAll` crea marca, tipoProducto, proveedor → IDs
- Luego crea producto

### 9. Migración
- Crear con `pnpm migrate:dev`
- Tabla `producto` con 3 FKs
- `precioUnitario` como `varchar(20)`
- `stock` como `int` default 0

### 10. Respuesta público vs admin
- Público (`GET /api/productos/:id`): 404 si inactivo. `proveedor` solo con `id`, `razonSocial`, `activo`
- Admin (`GET /api/productos/admin/:id`): 200 siempre. `proveedor` completo
- `GET /api/productos/admin` (listado): filtros `?nombre=`, `?inactivos=true`

### 11. DTOs
- `CreateProductoDto`: nombre, descripcion?, precioUnitario, stockInicial, idTipoProducto, idMarca, idProveedor?
- `UpdateProductoDto`: nombre, descripcion?, precioUnitario, idTipoProducto, idMarca, idProveedor? (sin stock)
- `FilterProductoAdminDto`: nombre?, idTipoProducto?, idMarca?, idProveedor?, activo?, page?, size?

### 12. `ProveedorPublic` reutilizado
- Ya existe en `src/modules/proveedores/entity/Proveedor.ts`
- `Producto.toPublic()` convierte `proveedor` a `ProveedorPublic`

### 13. Orden de implementación
1. Entity + Migración
2. DTOs
3. Service
4. Controller + Routes
5. Index.ts barrel
6. Tests unitarios
7. Tests integración
8. App.ts routes
9. Validación total

## Implementación

1. `src/modules/productos/entity/Producto.ts` — campos + relations `tipoProducto`, `marca`, `proveedor?`; `precioUnitario` string; `stock` int default 0
2. Migración `AddProductos` con FKs
3. DTOs: `CreateProductoDto`, `UpdateProductoDto`, `FilterProductoAdminDto`
4. `ProductoService`: `create` (valida FKs activas, `stock = stockInicial`), `update` (sin tocar `stock`), `softDelete`, `listAdmin`, `getByIdAdmin`, `getByIdPublic`
5. Controller + routes (públicas y admin en mismo router, prefijo `/admin` para admin)
6. Tests: unit de validaciones; integración con cadena completa marca→tipo→proveedor→producto

## Riesgos

- `@ManyToOne` con `nullable: true` para `proveedor` — verificar sintaxis MikroORM v6
- `varchar(20)` para `precioUnitario` vs `decimal(10,2)` del `api-contract.md` — decisión tomada para simplificar
- Choque de rutas 007 vs 010 — mitigado por prefijo `/admin`
- Producto con stock negativo por edición — imposible (stock fuera del DTO de update)

## Notas

- `tests/setup.ts` ya tiene tabla `producto` y `DELETE FROM producto`
- `src/app.ts` necesita `app.use('/api/productos', productosRouter)`
