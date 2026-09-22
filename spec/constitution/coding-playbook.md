# Coding Playbook — Entreno 2.0 Backend

> **Fuente de verdad para la escritura de código.**
> Todo agente que implemente una feature debe leer este archivo junto con `tech-stack.md` y el `plan.md` de la feature.
> Si un caso no está cubierto acá, aplicar el principio más cercano y documentar la desviación en el `plan.md` de la feature.

---

## 1. Nomenclatura de archivos

| Qué               | Patrón                        | Ejemplo                          |
| ----------------- | ----------------------------- | -------------------------------- |
| Entidad MikroORM  | `PascalCase.ts`               | `Marca.ts`, `PedidoItem.ts`      |
| DTO               | `PascalCaseSufijo.ts`         | `CreateMarcaDto.ts`              |
| Service           | `PascalCaseService.ts`        | `MarcaService.ts`                |
| Controller        | `PascalCaseController.ts`     | `MarcaController.ts`             |
| Routes            | `kebab-case.routes.ts`        | `marca.routes.ts`                |
| Middleware        | `camelCase.ts`                | `authenticate.ts`, `validate.ts` |
| Test unitario     | `kebab-case.unit.test.ts`     | `marca-service.unit.test.ts`     |
| Test integración  | `kebab-case.int.test.ts`      | `marca.int.test.ts`              |
| Migración         | `MigrationYYYYMMDD_Nombre.ts` | `Migration20260921_AddMarcas.ts` |
| Script standalone | `camelCase.ts`                | `seedAdmin.ts`                   |

---

## 2. Nomenclatura de métodos de service

Vocabulario **canónico**. Usar siempre estos nombres para que los agentes de features posteriores puedan importar sin necesidad de leer el código fuente de la feature previa.

> **Nota**: `findAll` es el nombre canónico para listar, pero actualmente solo está implementado en `UsuarioService`. Otros services (ProductoService, MarcaService, etc.) aún no tienen `findAll` implementado.

| Operación                    | Nombre del método        | Firma                                   | Lanza si no existe |
| ---------------------------- | ------------------------ | --------------------------------------- | ------------------ |
| Crear                        | `create(dto)`            | `Promise<TEntity>`                      | —                  |
| Traer por ID (activo)        | `findById(id)`           | `Promise<TEntity>`                      | `AppError 404`     |
| Verificar existencia para FK | `assertExists(id)`       | `Promise<TEntity>`                      | `AppError 400`     |
| Listar (solo activos)        | `findAll(filters?)`      | `Promise<{ data: T[]; total: number }>` | —                  |
| Listar admin (con inactivos) | `findAllAdmin(filters?)` | `Promise<{ data: T[]; total: number }>` | —                  |
| Actualizar                   | `update(id, dto)`        | `Promise<TEntity>`                      | `AppError 404`     |
| Baja lógica                  | `softDelete(id)`         | `Promise<void>`                         | `AppError 404`     |

> **findById** vs **assertExists**: `findById` devuelve el objeto para mostrarlo. `assertExists` valida antes de asociar por FK — mensaje de error en dominio (`"La marca con id X no existe o está inactiva"`).

---

## 3. Patrón de Controller

### 3.1 Template estándar (Express 5)

Express 5 propaga rechazos de promesas al `errorHandler` automáticamente. **No usar `try/catch` en controllers.**

```typescript
// MarcaController.ts
import { Request, Response } from 'express';
import { MarcaService } from './MarcaService';

export class MarcaController {
  private service = new MarcaService();

  findAll = async (req: Request, res: Response): Promise<void> => {
    const result = await this.service.findAll(req.query);
    res.json(result);
  };

  findById = async (req: Request, res: Response): Promise<void> => {
    const marca = await this.service.findById(Number(req.params.id));
    res.json(marca);
  };

  create = async (req: Request, res: Response): Promise<void> => {
    const marca = await this.service.create(req.body);
    res.status(201).json(marca);
  };

  update = async (req: Request, res: Response): Promise<void> => {
    const marca = await this.service.update(Number(req.params.id), req.body);
    res.json(marca);
  };

  softDelete = async (req: Request, res: Response): Promise<void> => {
    await this.service.softDelete(Number(req.params.id));
    res.status(204).send();
  };
}
```

```typescript
// marca.routes.ts
import { Router } from 'express';
import { authenticate, authorize } from '../../common/middleware';
import { validate } from '../../common/middleware/validate';
import { CreateMarcaDto, UpdateMarcaDto } from './dto';
import { MarcaController } from './MarcaController';

const router = Router();
const ctrl = new MarcaController();

router.get('/', ctrl.findAll);
router.get('/:id', ctrl.findById);
router.post('/', authenticate, authorize('ADMIN'), validate(CreateMarcaDto), ctrl.create);
router.put('/:id', authenticate, authorize('ADMIN'), validate(UpdateMarcaDto), ctrl.update);
router.delete('/:id', authenticate, authorize('ADMIN'), ctrl.softDelete);

export default router;
```

### 3.2 Reglas del controller

- Métodos como **arrow functions** (`findAll = async (...) =>`) para preservar `this`.
- Sin lógica de negocio. Solo: llamar al service + serializar respuesta.
- Parseo de params: `Number(req.params.id)` — el service valida si es inválido.
- Nunca acceder a `EntityManager` desde el controller.

---

## 4. Patrón de Service

```typescript
// MarcaService.ts
import { EntityManager } from '@mikro-orm/mysql';
import { getEm } from '../../config/db';
import { Marca } from './Marca';
import { CreateMarcaDto, UpdateMarcaDto, MarcaFilterDto } from './dto';
import { AppError } from '../../common/errors/AppError';

export class MarcaService {
  private get em(): EntityManager {
    return getEm(); // siempre desde el RequestContext, nunca en constructor
  }

  async create(dto: CreateMarcaDto): Promise<Marca> {
    const existing = await this.em.findOne(Marca, { nombre: dto.nombre });
    if (existing) throw new AppError(409, 'Ya existe una marca con ese nombre');

    const marca = this.em.create(Marca, { ...dto, activo: true });
    await this.em.flush();
    return marca;
  }

  async findById(id: number): Promise<Marca> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID inválido');
    const marca = await this.em.findOne(Marca, { id, activo: true });
    if (!marca) throw new AppError(404, 'Marca no encontrada');
    return marca;
  }

  async assertExists(id: number): Promise<Marca> {
    if (!Number.isInteger(id) || id <= 0) throw new AppError(400, 'ID de marca inválido');
    const marca = await this.em.findOne(Marca, { id, activo: true });
    if (!marca) throw new AppError(400, `La marca con id ${id} no existe o está inactiva`);
    return marca;
  }

  async findAll(filters: MarcaFilterDto = {}): Promise<{ data: Marca[]; total: number }> {
    const where: Record<string, unknown> = { activo: true };
    if (filters.nombre) where.nombre = { $like: `%${filters.nombre}%` };

    const [data, total] = await this.em.findAndCount(Marca, where, {
      orderBy: { nombre: 'ASC' },
    });
    return { data, total };
  }

  async update(id: number, dto: UpdateMarcaDto): Promise<Marca> {
    const marca = await this.findById(id);
    this.em.assign(marca, dto);
    await this.em.flush();
    return marca;
  }

  async softDelete(id: number): Promise<void> {
    const marca = await this.findById(id);
    marca.activo = false;
    await this.em.flush();
  }
}
```

---

## 5. Populate de relaciones MikroORM ⚠️

MikroORM es **lazy por defecto**. Sin populate explícito, los campos de relaciones llegan `undefined` en la respuesta sin ningún error en TypeScript ni en runtime. Es el bug más silencioso del stack.

### Regla: siempre populate explícito

```typescript
// ✅ Correcto
const producto = await this.em.findOne(
  Producto,
  { id, activo: true },
  { populate: ['marca', 'tipoProducto', 'proveedor'] },
);

const [data, total] = await this.em.findAndCount(
  Producto,
  { activo: true },
  { populate: ['marca', 'tipoProducto'], orderBy: { nombre: 'ASC' } },
);

// ❌ Incorrecto: marca llegará undefined en el JSON
const producto = await this.em.findOne(Producto, { id });
res.json(producto); // { id: 1, nombre: "X", marca: {}, ... }
```

### Tabla de populate por módulo

| Módulo            | Relaciones a popular siempre                     |
| ----------------- | ------------------------------------------------ |
| `Producto`        | `marca`, `tipoProducto`, `proveedor`             |
| `Descuento`       | Detalle: `aplicaciones`, `aplicaciones.producto` |
| `Ingreso`         | `proveedor`, `items`, `items.producto`           |
| `Carrito`         | `items`, `items.producto`                        |
| `Pedido`          | `usuario`, `items`, `items.producto`             |
| `PedidoItem`      | `producto`                                       |
| `HistorialEstado` | — (sin relaciones complejas)                     |

---

## 6. Null vs Undefined

| Contexto         | Tipo correcto                      | Ejemplo                                            |
| ---------------- | ---------------------------------- | -------------------------------------------------- |
| Entidad MikroORM | `string \| null`                   | `telefono: string \| null = null`                  |
| DTO de entrada   | `string \| undefined`              | `@IsOptional() telefono?: string`                  |
| Respuesta JSON   | exponer `null`, omitir `undefined` | `JSON.stringify` omite `undefined` automáticamente |

---

## 7. Fechas en la API

### Entrada

- Fecha pura (filtros): `YYYY-MM-DD` (string en query param)
- Timestamp completo: `YYYY-MM-DDTHH:mm:ssZ` UTC

### Parseo estándar de filtros

```typescript
// Reutilizar este helper en todos los services con filtros de fecha
export function parseDateRange(desde?: string, hasta?: string) {
  if (!desde && !hasta) return {};
  const d = desde ? new Date(`${desde}T00:00:00.000Z`) : undefined;
  const h = hasta ? new Date(`${hasta}T23:59:59.999Z`) : undefined;
  if (d && h && d > h) throw new AppError(400, '"desde" no puede ser posterior a "hasta"');
  return { desde: d, hasta: h };
}
```

### Salida

- Siempre `Date.toISOString()` → UTC ISO 8601.
- MikroORM serializa `Date` como ISO string automáticamente.
- Columnas DB: `DATE` para fechas puras; `DATETIME` para timestamps.

---

## 8. Logging

```typescript
// app.ts — solo fuera de test
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}
```

- `console.error` en el `errorHandler` para loguear stack traces.
- ESLint: `'no-console': ['warn', { allow: ['error', 'warn', 'info'] }]`
- **Prohibido** `console.log` de debug en código comiteado.

---

## 9. Headers de seguridad y CORS

Configurar **solo en feature 001**, no agregar después.

```typescript
// app.ts
import helmet from 'helmet';
import cors from 'cors';

app.use(helmet());
app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
```

Variable de entorno requerida en `.env.example`:

```
CORS_ORIGIN=http://localhost:5173
```

---

## 10. Resumen en una línea por regla

1. **Archivos** → tabla de sección 1; nunca inventar nombres propios.
2. **Métodos de service** → vocabulario canónico de sección 2; nunca `getAll`, `fetchById`, etc.
3. **Controllers** → arrow functions, sin try/catch, sin lógica de negocio, `Number(req.params.id)`.
4. **Services** → `getEm()` en getter privado, errores en español, flush explícito.
5. **Populate** → siempre explícito; tabla de sección 5 como referencia.
6. **Null/Undefined** → `null` en entidades, `undefined` en DTOs, los dos en respuesta según semántica.
7. **Fechas** → ISO 8601 UTC; `parseDateRange` para filtros; `DATETIME` en DB para timestamps.
8. **IDs** → `Number.isInteger && > 0` validado en el service.
9. **Logging** → morgan en app.ts, console.error en errorHandler, sin console.log.
10. **Seguridad** → helmet + CORS en feature 001, una sola vez.
