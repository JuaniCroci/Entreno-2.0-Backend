# 013 · Listado de pedidos — Implementation Plan

> **For agentic workers:** execute inline con `executing-plans` (ledger: `.superpowers/sdd/013-listado-pedidos/progress.md`). Steps usan checkbox (`- [ ]`).

**Goal:** listado admin de pedidos con filtros + paginación, detalle admin completo y detalle propio del cliente (404 si es ajeno).

**Architecture:** métodos nuevos en `PedidoService` (`listAdmin` con where `$and` + paginación + `fechaEntrega` derivada de `HistorialEstado`; `getByIdAdmin` reutiliza `findById`; `getByIdOwn` filtra `usuario` en el where). Rutas admin nuevas bajo `/api/pedidos` tras `authorize('ADMIN')`; `/api/mis-pedidos/:id` solo con `authenticate`.

**Tech Stack:** TypeScript, Express 5, MikroORM 6 (`find`/`count`, `$and`/`$or`/`$like`), class-validator (DTO documentado, validación efectiva en service — precedente 009/010), Vitest + supertest.

**Spec:** `spec/features/013-listado-pedidos/spec.md` (autoridad) · `plan.md` · `spec/constitution/api-contract.md`

## Global Constraints

- Listado paginado → `{ data, total, page, size }`; default `page=1`/`size=20`; `size` máx `100` (api-contract.md:42-55).
- Item único → `200` sin wrapper; errores `{ statusCode, message }` vía `AppError`.
- `400`: id no entero, `page`/`size` fuera de rango, `estado` inválido, `desde > hasta`, fecha mal formateada. `401/403` rutas admin. `404`: inexistente **y** pedido ajeno en `/api/mis-pedidos/:id` (nunca `403` — no filtrar existencia).
- Dinero string `decimal(10,2)`; filtros de fecha `YYYY-MM-DD` → `parseDateRange` (UTC, inclusivos).
- `passwordHash` jamás en respuestas (mapeo con `toPublic`/`toDetalle*`, DTOs de vista).
- Sin comentarios en el código; mensajes de error en español; validación de id `Number.isInteger(id) && id > 0` → `AppError(400)`.
- Auth: `authenticate` + `authorize('ADMIN')` en `GET /api/pedidos` y `GET /api/pedidos/:id`; solo `authenticate` en `/api/mis-pedidos/:id`.
- Índice `(idPedido, estado)` **ya existe** (`HistorialEstado` `@Index` + `Migration20261001203952.ts:37`) → verificar, **sin migración nueva**.
- Verificación mínima por tarea: `pnpm lint` + `pnpm typecheck` + tests de la tarea; gates completos en el cierre (DB: Podman arriba).

## Review Focus

1. **Pedido ajeno en `GET /api/mis-pedidos/:id`** → `404` con el mismo body que "inexistente" (no `403`/`401`); test: cliente B pide pedido de A → `404`.
2. **Filtro `cliente` parcial case-insensitive sobre nombre O email** (`$or`) → test: `?cliente=LISTADO` (mayúsculas) encuentra a 'Cliente Listado…'; `?cliente=@test.local` encuentra por email; combinado con `idCliente` aplica AND.
3. **`fechaEntrega`** → `null` si no está `ENTREGADO`; igual a la fila del historial si sí (orden `fecha asc, id asc` como tiebreaker); test unit del map + integration con entregado/realizado/cancelado.
4. **NaN en query** (`page=abc`, `idCliente=x`, `size=101`) → `400` nunca `500`; test unit de validación sin llamar a `em.find`.
5. **`total` bajo filtros combinados** → `count` con el mismo `where` que `find`; test: `page=99` → `data: []` con `total` correcto, y totales aislados por `idCliente` (otros archivos de test dejan pedidos en la DB).

---

### Task 1: `FilterPedidoAdminDto` + `PedidoService.listAdmin`

**Files:** Create `src/modules/pedidos/dto/FilterPedidoAdminDto.ts` · Modify `src/modules/pedidos/entity/Pedido.ts`, `src/modules/pedidos/service/PedidoService.ts` · Test `tests/unit/pedido-service.unit.test.ts`

**Consumes:** `parseDateRange` (`src/common/utils/date-range.ts`), `EstadoPedido`, `HistorialEstado`.
**Produces:** `listAdmin(filters: FilterPedidoAdminDto): Promise<{ data: PedidoListPublic[]; total: number; page: number; size: number }>` (lo consume Task 3); `ESTADOS_PEDIDO: EstadoPedido[]`; `PedidoListPublic = PedidoPublic & { fechaEntrega: Date | null }`; `toListPublic(fechaEntrega)`.

- [ ] **Step 1 — Test RED (validación):** agregar `count: vi.fn()` al objeto base del `beforeEach` existente. Nuevo `describe('listado admin de pedidos (013)')`:

```ts
it('validaciones de listAdmin responden 400 sin consultar la DB', async () => {
  await expect(service.listAdmin({ estado: 'PENDIENTE' as never })).rejects.toMatchObject({
    statusCode: 400,
  });
  await expect(
    service.listAdmin({ desde: '2026-12-31', hasta: '2026-01-01' }),
  ).rejects.toMatchObject({ statusCode: 400 });
  await expect(service.listAdmin({ desde: '31-12-2026' })).rejects.toMatchObject({
    statusCode: 400,
  });
  await expect(service.listAdmin({ page: 0 })).rejects.toMatchObject({ statusCode: 400 });
  await expect(service.listAdmin({ size: 101 })).rejects.toMatchObject({ statusCode: 400 });
  await expect(service.listAdmin({ idCliente: NaN })).rejects.toMatchObject({ statusCode: 400 });
  expect(em.find).not.toHaveBeenCalled();
  expect(em.count).not.toHaveBeenCalled();
});
```

- [ ] **Step 2 — Run:** `pnpm exec vitest run tests/unit/pedido-service.unit.test.ts` → FAIL (método no existe).
- [ ] **Step 3 — Test RED (where + paginación):**

```ts
it('combina filtros, pagina y ordena por fecha desc', async () => {
  const pedido = Object.assign(Object.create(Pedido.prototype), {
    id: 9,
    fecha: new Date('2026-10-01T10:00:00.000Z'),
    estado: 'REALIZADO',
    importeTotal: '81.00',
    usuario: { id: 5, nombre: 'Juan', email: 'juan@x.com' },
    createdAt: new Date(),
    updatedAt: new Date(),
  });
  vi.spyOn(em, 'find')
    .mockResolvedValueOnce([pedido] as never)
    .mockResolvedValueOnce([] as never);
  vi.spyOn(em, 'count').mockResolvedValue(3 as never);

  const result = await service.listAdmin({
    desde: '2026-10-01',
    hasta: '2026-10-31',
    estado: 'REALIZADO',
    idCliente: 5,
    cliente: 'juan',
    page: 2,
    size: 5,
  });

  expect(em.find).toHaveBeenCalledWith(
    Pedido,
    {
      $and: [
        {
          fecha: {
            $gte: new Date('2026-10-01T00:00:00.000Z'),
            $lte: new Date('2026-10-31T23:59:59.999Z'),
          },
        },
        { estado: 'REALIZADO' },
        { usuario: { id: 5 } },
        {
          $or: [
            { usuario: { nombre: { $like: '%juan%' } } },
            { usuario: { email: { $like: '%juan%' } } },
          ],
        },
      ],
    },
    expect.objectContaining({
      populate: ['usuario'],
      orderBy: { fecha: 'desc', id: 'desc' },
      offset: 5,
      limit: 5,
    }),
  );
  expect(em.count).toHaveBeenCalledWith(
    Pedido,
    expect.objectContaining({ $and: expect.any(Array) }),
  );
  expect(result).toEqual({
    data: [expect.objectContaining({ id: 9, fechaEntrega: null })],
    total: 3,
    page: 2,
    size: 5,
  });
});
```

- [ ] **Step 4 — Test RED (`fechaEntrega`):**

```ts
it('deriva fechaEntrega del historial ENTREGADO y la deja null sin fila', async () => {
  const entregado = Object.assign(Object.create(Pedido.prototype), {
    id: 1 /* campos de toPublic */,
  });
  const pendiente = Object.assign(Object.create(Pedido.prototype), {
    id: 2 /* campos de toPublic */,
  });
  const fecha = new Date('2026-10-03T09:00:00.000Z');
  vi.spyOn(em, 'find')
    .mockResolvedValueOnce([entregado, pendiente] as never)
    .mockResolvedValueOnce([
      Object.assign(Object.create(HistorialEstado.prototype), {
        id: 7,
        estado: 'ENTREGADO',
        fecha,
        pedido: { id: 1 },
      }),
    ] as never);
  vi.spyOn(em, 'count').mockResolvedValue(2 as never);

  const result = await service.listAdmin({});

  expect(em.find).toHaveBeenNthCalledWith(
    2,
    HistorialEstado,
    { pedido: { $in: [1, 2] }, estado: 'ENTREGADO' },
    { orderBy: { fecha: 'asc', id: 'asc' } },
  );
  expect(result.data[0].fechaEntrega).toEqual(fecha);
  expect(result.data[1].fechaEntrega).toBeNull();
});

it('pagina vacía no consulta el historial', async () => {
  vi.spyOn(em, 'find').mockResolvedValueOnce([] as never);
  vi.spyOn(em, 'count').mockResolvedValue(0 as never);
  const result = await service.listAdmin({});
  expect(em.find).toHaveBeenCalledTimes(1);
  expect(result).toEqual({ data: [], total: 0, page: 1, size: 20 });
});
```

- [ ] **Step 5 — GREEN (DTO):** `src/modules/pedidos/dto/FilterPedidoAdminDto.ts` con decoradores `@IsIn(ESTADOS_PEDIDO)`, `@Matches(/^\d{4}-\d{2}-\d{2}$/)` en `desde`/`hasta`, `@IsInt @Min(1)` en `page`, `@IsInt @Min(1) @Max(100)` en `size` — documentan la forma; la validación que lanza `400` vive en el service (precedente `FilterIngresoDto`/`FilterProductoAdminDto`).
- [ ] **Step 6 — GREEN (entity):** en `Pedido.ts` exportar `ESTADOS_PEDIDO = ['REALIZADO','ABONADO','ENTREGADO','CANCELADO']`, `interface PedidoListPublic extends PedidoPublic { fechaEntrega: Date | null }`, métodos `toListPublic(fechaEntrega)` (`{ ...this.toPublic(), fechaEntrega }`) y — adelantando al Task 2 — `ClienteDetallePublic` + `PedidoDetalleAdminPublic` + `toDetalleAdmin(items)` (`{ ...this.toPublic(), usuario: { id, nombre, email, telefono, direccion }, items }`).
- [ ] **Step 7 — GREEN (service):** `listAdmin` valida (`page`/`size`/`estado`/`idCliente` → `AppError(400)`, mensajes: `'page debe ser un entero mayor o igual a 1'`, `'size debe ser un entero entre 1 y 100'`, `'estado debe ser REALIZADO, ABONADO, ENTREGADO o CANCELADO'`, `'idCliente debe ser un entero'`), arma `condiciones: Record<string, unknown>[]` → `const where = condiciones.length ? { $and: condiciones } : {}`, `Promise.all([em.find(...), em.count(...)])` con `populate: ['usuario']`, `orderBy: { fecha: 'desc', id: 'desc' }`, `offset: (page-1)*size`, `limit: size`. Helper privado `calcularFechaEntrega(ids): Promise<Map<number, Date>>` — early return si `ids.length === 0`; `em.find(HistorialEstado, { pedido: { $in: ids }, estado: 'ENTREGADO' }, { orderBy: { fecha: 'asc', id: 'asc' } })`; primer `fila.pedido.id` gana.
- [ ] **Step 8 — Run + commit:** `pnpm exec vitest run tests/unit/pedido-service.unit.test.ts` → PASS · `pnpm lint && pnpm typecheck` · `git commit -m "feat(013): listAdmin con filtros, paginacion y fechaEntrega"`.

### Task 2: `getByIdAdmin` + `getByIdOwn`

**Files:** Modify `src/modules/pedidos/service/PedidoService.ts` (entity ya tocada en Task 1) · Test `tests/unit/pedido-service.unit.test.ts`

**Consumes:** `findById`, `validarId`, `toDetalleAdmin`, `toDetalle`.
**Produces:** `getByIdAdmin(id: number): Promise<PedidoDetalleAdminPublic>` y `getByIdOwn(id: number, usuarioId: number): Promise<PedidoDetallePublic>` (los consume Task 3).

- [ ] **Step 1 — Test RED:**

```ts
it('getByIdAdmin devuelve items y datos completos del cliente', async () => {
  const item = { toPublic: () => ({ id: 1, producto: { id: 10, nombre: 'Barra' }, cantidad: 2, precioUnitario: '10.00', subtotal: '20.00', descuentoAplicado: null }) };
  const pedido = Object.assign(Object.create(Pedido.prototype), {
    id: 42, estado: 'REALIZADO', importeTotal: '20.00',
    usuario: { id: 5, nombre: 'Juan', email: 'juan@x.com', telefono: '123', direccion: 'Av. Siempreviva 742' },
    items: { getItems: () => [item] }, fecha: new Date(), createdAt: new Date(), updatedAt: new Date(),
  });
  vi.spyOn(em, 'findOne').mockResolvedValue(pedido as never);

  const result = await service.getByIdAdmin(42);

  expect(result.usuario).toEqual({ id: 5, nombre: 'Juan', email: 'juan@x.com', telefono: '123', direccion: 'Av. Siempreviva 742' });
  expect(result.items).toHaveLength(1);
  expect(result).not.toHaveProperty('passwordHash');
});

it('getByIdAdmin inexistente → 404 y id no entero → 400', async () => {
  vi.spyOn(em, 'findOne').mockResolvedValue(null);
  await expect(service.getByIdAdmin(404)).rejects.toMatchObject({ statusCode: 404 });
  await expect(service.getByIdAdmin(2.5)).rejects.toMatchObject({ statusCode: 400 });
});

it('getByIdOwn de pedido ajeno → 404 (where incluye el usuario)', async () => {
  vi.spyOn(em, 'findOne').mockResolvedValue(null);
  await expect(service.getByIdOwn(42, 7)).rejects.toMatchObject({ statusCode: 404 });
  expect(em.findOne).toHaveBeenCalledWith(
    Pedido, { id: 42, usuario: 7 },
    { populate: ['items', 'items.producto', 'usuario'] },
  );
});

it('getByIdOwn propio → detalle con items', async () => {
  const pedido = /* makePedido con items */;
  vi.spyOn(em, 'findOne').mockResolvedValue(pedido as never);
  const result = await service.getByIdOwn(42, 5);
  expect(result).toEqual(expect.objectContaining({ id: 42, items: expect.any(Array) }));
});
```

- [ ] **Step 2 — Run → FAIL.**
- [ ] **Step 3 — GREEN:** `getByIdAdmin(id)` = `const pedido = await this.findById(id)` (reusa validación + 404 + populate) → `pedido.toDetalleAdmin(pedido.items.getItems().map((i) => i.toPublic()))`. `getByIdOwn(id, usuarioId)` = `validarId` → `em.findOne(Pedido, { id, usuario: usuarioId }, { populate: ['items','items.producto','usuario'] })` → `null` → `AppError(404, 'Pedido no encontrado')` → `toDetalle(...)`. El 404 único no distingue "ajeno" de "inexistente" (anti-enumeración).
- [ ] **Step 4 — Run + commit:** `pnpm exec vitest run tests/unit/pedido-service.unit.test.ts` → PASS · lint+typecheck · `git commit -m "feat(013): getByIdAdmin y getByIdOwn con 404 en pedido ajeno"`.

### Task 3: HTTP (controller + rutas)

**Files:** Modify `src/modules/pedidos/controller/PedidoController.ts`, `src/modules/pedidos/routes/pedidos.routes.ts`, `src/modules/pedidos/routes/misPedidos.routes.ts`

**Consumes:** `listAdmin`, `getByIdAdmin` (Task 1/2), `getByIdOwn` (Task 2).

- [ ] **Step 1 — Controller:**

```ts
listAdmin = async (req: Request, res: Response): Promise<void> => {
  const filters: FilterPedidoAdminDto = {
    desde: req.query.desde as string | undefined,
    hasta: req.query.hasta as string | undefined,
    estado: req.query.estado as EstadoPedido | undefined,
    idCliente: req.query.idCliente !== undefined ? Number(req.query.idCliente) : undefined,
    cliente: req.query.cliente as string | undefined,
    page: req.query.page !== undefined ? Number(req.query.page) : 1,
    size: req.query.size !== undefined ? Number(req.query.size) : 20,
  };
  const result = await this.service.listAdmin(filters);
  res.json(result);
};

getByIdAdmin = async (req: Request, res: Response): Promise<void> => {
  res.json(await this.service.getByIdAdmin(Number(req.params.id)));
};

getByIdOwn = async (req: Request, res: Response): Promise<void> => {
  const usuarioId = (req.user as Usuario).id;
  res.json(await this.service.getByIdOwn(Number(req.params.id), usuarioId));
};
```

- [ ] **Step 2 — Rutas:** en `pedidos.routes.ts`, registrar **antes** de las acciones: `router.get('/', authenticate, authorize('ADMIN'), ctrl.listAdmin)` y `router.get('/:id', authenticate, authorize('ADMIN'), ctrl.getByIdAdmin)` (sin choque con `/:id/historial`: distinta cantidad de segmentos). En `misPedidos.routes.ts`: `router.get('/:id', authenticate, ctrl.getByIdOwn)`.
- [ ] **Step 3 — Verificar:** `pnpm lint` + `pnpm typecheck` → PASS (el RED/verde HTTP se cubre en el Task 4) · `git commit -m "feat(013): endpoints listado y detalle de pedidos"`.

### Task 4: Integración

**Files:** Create `tests/integration/pedido-listado.int.test.ts`

- [ ] **Step 1 — Setup** (estilo `pedido-admin.int.test.ts`): `updateSchema({ safe: true })`; seeds idempotentes con emails únicos: **cliente A** (con `telefono` + `direccion` seteados) y **cliente B**; marca/tipo; 2 productos (stock 100); limpieza de pedidos/carritos de A y B; helpers `crearPedido(token, productoId)` (carrito → `confirmar`) y `setFecha(pedidoId, fecha)` vía `RequestContext` + `em.findOne` + `flush`. Semilla: **A → ped1** (fecha `2026-03-15`, `POST /:id/entregar` → ENTREGADO), **A → ped2** (fecha `2026-06-20`, `POST /:id/cancelar` → CANCELADO), **B → ped3** (fecha `2026-09-10`, queda REALIZADO). `afterAll: closeDb`.
- [ ] **Step 2 — Casos admin (`GET /api/pedidos`):**
  - sin token → `401`; con CLIENTE → `403`; con ADMIN → `200` y `page:1, size:20` (defaults) + `data/total` presentes.
  - `?estado=REALIZADO&idCliente=A` → `total 0` (A no tiene REALIZADO); `?estado=CANCELADO&idCliente=A` → solo ped2; `?estado=PEPE` → `400`.
  - `?idCliente=A&desde=2026-03-15&hasta=2026-03-15` → solo ped1 (inclusivo); `&hasta=2026-03-14` → `data` sin ped1; `&desde=2026-12-31&hasta=2026-01-01` → `400`.
  - `?idCliente=A&cliente=LISTADO` (mayúsculas) → ped1+ped2 (case-insensitive); `?cliente=listado013-a@` → matches por email; `&estado=CANCELADO` → AND → solo ped2.
  - paginación con aislamiento: `?idCliente=A&page=1&size=1` → `data.length 1`, `total 2`, `size 1`; `page=2` → el otro; `page=99` → `data: []` y `total: 2`; `?size=101` → `400`; `?page=abc` → `400`.
  - item: tiene `fecha`, `estado`, `importeTotal`, `usuario.nombre`; **ped2 (CANCELADO) incluye `usuario.nombre`**; ped1 → `fechaEntrega` = string ISO no nulo (coincide con la última fila de `GET /:id/historial`); ped2/ped3 → `fechaEntrega: null`.
  - orden: `?idCliente=A` → `[ped2, ped1]` (fecha desc: `2026-06-20` > `2026-03-15`).
- [ ] **Step 3 — Casos detalle admin (`GET /api/pedidos/:id`):** ped1 con ADMIN → `200` con `items[0]` conteniendo `cantidad`, `precioUnitario`, `subtotal`, `descuentoAplicado`, y `usuario` con `nombre/email/telefono/direccion`; body sin `passwordHash`; `999999` → `404`; `abc` → `400`; sin token → `401`; CLIENTE → `403`.
- [ ] **Step 4 — Casos cliente:** `GET /api/mis-pedidos` con token A → solo ped1/ped2, cada item con `fecha`/`estado`/`importeTotal`; con token B → solo ped3. `GET /api/mis-pedidos/:id`: ped2 con token A → `200` con items; ped2 con token B → **`404`**; `999999` → `404`; sin token → `401`; `abc` → `400`.
- [ ] **Step 5 — Run + commit:** `pnpm test:integration` → PASS (incluye regresión de `pedido-admin.int.test.ts`) · `pnpm lint && pnpm typecheck` · `git commit -m "test(013): integracion de listado y detalle de pedidos"`.

### Task 5: Cierre (gates + docs)

- [ ] Gates: `pnpm format:check` · `pnpm lint` · `pnpm typecheck` · `pnpm build` · `pnpm test` (unit + integración con Podman).
- [ ] `spec/features/013-listado-pedidos/tasks.md` → todos `[x]` (el del índice se marca hecho con nota "ya existía desde 011/012").
- [ ] `spec.md`: `Estado: implementada` + criterios en `[x]`.
- [ ] `constitution/roadmap.md`: 013 a "Hecho" + tachado en "En orden".
- [ ] `CHANGELOG.md` → `v0.2.11 — Feature 013` + `package.json` versión `0.2.11`.
- [ ] `plan.md` de 013: desvíos (índice ya existente; `mis-pedidos` list ya cumplía fecha/estado/importeTotal desde 011 → solo se agregó test; `fechaEntrega` no se expone en el detalle admin porque el spec no lo pide).
- [ ] Ledger de cierre · commit final.
