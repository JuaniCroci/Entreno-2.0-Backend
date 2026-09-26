# 007 · CRUD Producto — Decisiones confirmadas

> Este archivo documenta todas las decisiones de diseño para feature 007.
> Al volver a la sesión, estas son las reglas inamovibles para implementar.

---

## 1. `assertExists` — Opción B

**Decisión:** No agregar `assertExists` a services existentes.

**Razón:** Los services actuales (MarcaService, TipoProductoService, ProveedorService) no tienen este método. Seguir el patrón inline (`findOne` + `AppError(404)`) que ya usan.

**Implementación en ProductoService:**
```ts
const tipoProducto = await this.em.findOne(TipoProducto, { id: dto.idTipoProducto, activo: true });
if (!tipoProducto) throw new AppError(404, 'El tipo de producto seleccionado no existe o está inactivo');
```

Repetir para `idMarca` e `idProveedor` (opcional).

---

## 2. `decimal.js` — PrecioUnitario como string en entity

**Decisión:** `@Property({ type: 'string' })` para `precioUnitario` en el entity. No usar `decimal.js` dentro del entity.

**Razón:**
- Simplifica el entity y evita problemas de serialización con MikroORM
- El `api-contract.md` ya exige que dinero se serialice como string en JSON
- `decimal.js` se usa solo en el service para cálculos si es necesario
- El DTO de entrada acepta `string` con `@IsDecimal()` y se almacena tal cual

**Entity:**
```ts
@Property({ type: 'string' })
precioUnitario!: string; // "1500.00"
```

**DTO (Create):** `precioUnitario` con `@IsDecimal()` validation
**DTO (Update):** `precioUnitario` con `@IsDecimal()` validation
**Service:** No se necesita `Decimal` instance — se almacena string directamente
**toPublic():** Devuelve `precioUnitario: this.precioUnitario` (ya es string)

**Validación adicional:** `precioUnitario > 0` se valida en el service (no en DTO con class-validator solo).

---

## 3. `@ManyToOne` — Sintaxis MikroORM v6 confirmada

**Fuente:** `src/modules/auth/entity/RefreshToken.ts` (ya existe en proyecto)

```ts
import { Entity, PrimaryKey, Property, ManyToOne } from '@mikro-orm/core';

@Entity()
export class Producto {
  @PrimaryKey({ type: 'number' })
  id!: number;

  @ManyToOne(() => TipoProducto)
  tipoProducto!: TipoProducto;

  @ManyToOne(() => Marca)
  marca!: Marca;

  @ManyToOne(() => Proveedor)
  proveedor?: Proveedor; // nullable (opcional)
```

Los campos `_id` de cada relation se guardan como FK en la tabla `producto`.

---

## 4. Prefijo de rutas

**Decisión:** `/api/productos/admin/*` para escrituras/admin, `/api/productos/:id` para detalle público.

**Razón:** El listado público (010) usará `GET /api/productos` con filtros sin prefijo `/admin`. Esto evita colisión.

**Estructura en `app.ts`:**
```ts
// Rutas admin (todas requieren ADMIN)
app.use('/api/productos/admin', productosRouterAdmin);

// Rutas públicas
app.use('/api/productos', productosRouterPublic);
```

O alternativa más limpia: un solo router con sub-rutas:
```ts
// En productos.routes.ts
const router = Router();
router.use('/admin', adminRoutes);  // POST, PUT, DELETE, GET listado
router.get('/:id', ctrl.getByIdPublic);  // detalle público
```

**Preferido:** Un solo router, con prefijo `/admin` solo para rutas admin. `app.ts` registra `app.use('/api/productos', productosRouter)`.

---

## 5. Validación de FKs

**Decisión:** Validación inline en `ProductoService`, no en el DTO.

**Razón:** El DTO solo valida formato (`@IsInt()`, `@IsOptional()`). La existencia y actividad de FK se valida en service porque requiere DB.

**Patrón:**
```ts
async create(dto: CreateProductoDto): Promise<ProductoPublic> {
  const tipoProducto = await this.em.findOne(TipoProducto, { id: dto.idTipoProducto, activo: true });
  if (!tipoProducto) throw new AppError(404, 'El tipo de producto seleccionado no existe o está inactivo');

  const marca = await this.em.findOne(Marca, { id: dto.idMarca, activo: true });
  if (!marca) throw new AppError(404, 'La marca seleccionada no existe o está inactiva');

  let proveedor: Proveedor | undefined;
  if (dto.idProveedor) {
    proveedor = await this.em.findOne(Proveedor, { id: dto.idProveedor, activo: true });
    if (!proveedor) throw new AppError(404, 'El proveedor seleccionado no existe o está inactivo');
  }

  // ...persist
}
```

---

## 6. `stockInicial` solo en Create

**Decisión:** `stockInicial` en `CreateProductoDto`, NO en `UpdateProductoDto`. `stock` no es writable por PUT.

**Implementación:**
- `CreateProductoDto`: `stockInicial: number` con `@IsInt()`, `@Min(0)`
- `UpdateProductoDto`: NO tiene `stockInicial` ni `stock`
- `ProductoService.create`: `stock = stockInicial`
- `ProductoService.update`: no toca `stock`
- Test explícito: si el body de PUT tiene `stock`, se ignora (no lanza error, simplemente no se aplica)

---

## 7. `stock` como integer

**Decisión:** `@Property({ type: 'integer' })` para `stock`. No necesita `decimal.js`.

```ts
@Property({ type: 'integer', default: 0 })
stock!: number;
```

---

## 8. Tests de integración — Cadena completa

**Decisión:** El `beforeAll` crea marca + tipoProducto + proveedor, y luego crea producto con sus IDs.

**Patrón:**
```ts
let marcaId: number;
let tipoProductoId: number;
let proveedorId: number;

beforeAll(async () => {
  // Crear marca, tipoProducto, proveedor
  // Obtener sus IDs
});
```

**Tests requeridos:**
- `POST` con FK inválida → 404
- `POST` con precio ≤ 0 → 400
- `POST` con stockInicial < 0 → 400
- `POST` exitoso → 201 con `stock = stockInicial`
- `PUT` con `stock` en body → stock NO cambia (test explícito)
- `GET /api/productos/:id` inactivo → 404
- `GET /api/productos/admin/:id` inactivo → 200 (admin puede ver)
- `DELETE` → 204, `GET /api/productos/:id` → 404 (inactivo no visible público)

---

## 9. Migración

**Decisión:** Crear migración MikroORM con `migration:create`.

**Tabla `producto`:**
- `id` PK int unsigned auto_increment
- `nombre` varchar(255) not null
- `descripcion` varchar(500) null
- `precioUnitario` varchar(20) not null (string para evitar float)
- `stock` int not null default 0
- `activo` tinyint(1) not null default true
- `idTipoProducto` int unsigned not null → FK `tipo_producto.id`
- `idMarca` int unsigned not null → FK `marca.id`
- `idProveedor` int unsigned null → FK `proveedor.id`
- `created_at` datetime
- `updated_at` datetime
- Índices FK en las 3 FKs

---

## 10. Respuesta público vs admin

| Aspecto | Público (`GET /api/productos/:id`) | Admin (`GET /api/productos/admin/:id`) |
|---------|-----------------------------------|---------------------------------------|
| Producto inactivo | 404 | 200 (visible) |
| Campo `proveedor` | Solo `id`, `razonSocial`, `activo` | Todos los campos |
| Stock | Sí | Sí |
| `precioUnitario` | Sí (string) | Sí (string) |
| `descripcion` | Sí | Sí |

**`toPublic()`** del entity devuelve `ProveedorPublic` con `id`, `razonSocial`, `activo` solo.

---

## 11. DTO de filtro admin

**`FilterProductoAdminDto`:**
- `nombre?: string` (`@IsOptional()`)
- `idTipoProducto?: number` (`@IsOptional()`, `@IsInt()`)
- `idMarca?: number` (`@IsOptional()`, `@IsInt()`)
- `idProveedor?: number` (`@IsOptional()`, `@IsInt()`)
- `activo?: boolean` (`@IsOptional()`)
- `page?: number` (`@IsOptional()`, `@IsInt()`, `@Min(1)`)
- `size?: number` (`@IsOptional()`, `@IsInt()`, `@Min(1)`, `@Max(100)`)

**Respuesta:** `{ data: ProductoPublic[], total: number, page: number, size: number }`

---

## 12. `ProveedorPublic` reutilizado

**Decisión:** El `toPublic()` de `Proveedor` ya devuelve `ProveedorPublic` con `id`, `razonSocial`, `activo`. Se reutiliza.

En `Producto.toPublic()`, el campo `proveedor` se convierte a `ProveedorPublic` (sin cuit, telefono, email, domicilio).

---

## 13. Orden de implementación

1. Entity + Migración
2. DTOs (create, update, filter)
3. Service
4. Controller + Routes
5. Index.ts barrel
6. Tests unitarios
7. Tests integración
8. App.ts routes
9. Validación total

---

## Checklist antes de implementar

- [ ] `decimal.js` funciona con string en entity (verificar que no hay conversión automática)
- [ ] `@ManyToOne` con `@mikro-orm/mysql` soporta `nullable: true` para `proveedor`
- [ ] La migración se crea con `pnpm migrate:dev`
- [ ] Los tests de integración crean records dependientes en `beforeAll`
- [ ] `precioUnitario` se valida como `@IsDecimal()` en DTO y > 0 en service
- [ ] `stockInicial` se valida con `@Min(0)` en DTO y se asigna a `stock` en service
- [ ] PUT body con `stock` se ignora silenciosamente (no error, no cambio)
