# Minutas de avances y reuniones de coordinación

> Enunciado §4: _minutas de avances o reuniones de coordinación del equipo_.
> Plantilla al final. Agregar una entrada por evento, en orden cronológico inverso.
> Las entradas anteriores a 2026-10-15 se reconstruyeron desde `git log` y `CHANGELOG.md`.

---

## 2026-10-15 · Avance: emparejar back ↔ front (minutas, metodología y D4)

**Formato:** asíncrono.
**Participantes:** Mariano (con OpenCode).

### Realizado

- **`docs/gestion/` (nuevo)**: metodología (Scrum liviano + Kanban, DoD con gates, convenciones de cierre e issues) y estas minutas — requisito enunciado §4 que el roadmap listaba como pendiente.
- **Minutas reconstruidas** desde el scaffold (2026-09-22) hasta hoy a partir de `git log` + `CHANGELOG.md`.
- **D4 cerrado en el back**: `fechaEntrega` ahora se expone en `GET /api/pedidos/:id`, `GET /api/mis-pedidos/:id` y la respuesta de `entregar` (antes la API no lo daba y el panel del front lo mostraba vacío). TDD: 5 tests unit + 3 de integración; suite **413/413** (`61bf7c5`).
- **Spec y contrato**: `spec/013` (spec/plan/tasks) y `api-contract.md` (sección "Pedidos: detalle y fechaEntrega") actualizados (`25e80ac`). **⚠️ Resync pendiente para el front**: cambió `api-contract.md` → regla de resync en `docs/gestion/README.md`.
- **CHANGELOG** v0.2.12 + **AGENTS.md** (sección de gestión) + **roadmap** (evidencia ágil tachada).
- Concordancia general verificada contra el análisis D1–D7 del front (2026-10-14): D1, D2, D3, D5, D6 ya estaban resueltos de este lado; D4 era el único código pendiente.

### Acuerdos

1. **Board de GitHub Projects separado** para el back (no compartir el del front); URL pública pendiente de crear.
2. **Backlog del back** = `analisis-proyecto.md` (hallazgos/mejoras) + `spec/constitution/roadmap.md` (features); no se crea un `review-backlog.md` aparte.
3. Toda feature/lote que cierre pasa por el DoD de `docs/gestion/README.md` (gates → spec → changelog → commit).

### Pendientes para la próxima

- Crear el board del back y pegar la URL en `docs/gestion/README.md`.
- Avisar al front del resync de `api-contract.md` y, si el equipo quiere, restaurar el bloque "Fecha de entrega" en `PedidoDetallePanel.tsx`.
- Completar nombres de participantes de las entradas históricas.

---

## 2026-10-14 · Avance: concordancia con el front + contrato completo

**Formato:** asíncrono.
**Participantes:** Mariano (docs) · JuaniCroci (análisis D1–D7 en el front).

### Realizado

- **Análisis de concordancia back ↔ front** (del lado del front): todos los endpoints que consume el front existen y calzan con los filtros del back; divergencias D1–D7 registradas.
- **`api-contract.md` completado** (`d636d58`): secciones de Imágenes, Descuentos por cantidad, Carrito y `413` — cerró el D1 (antes el contrato no reflejaba imágenes/carrito).
- **Specs alineadas al código**: marcas `includeInactive` (003) y descuentos `GET` públicos (008).
- **Compose renombrado**: contenedor `entreno-2-mysql` para distinguirlo del MySQL del backend viejo (`5d4a586`).

### Acuerdos

1. Los snapshots del front se resincronizan desde el back cuando cambia `api-contract.md` (regla escrita en `docs/gestion/README.md`).

### Pendientes para la próxima

- Cerrar D4 (`fechaEntrega` en detalle) del lado del back.

---

## 2026-10-11 · Avance: imágenes de productos (013 del front / storage en back)

**Formato:** asíncrono.
**Participantes:** CarlosUBruno (fuente: `git log`; sin sesión de OpenCode en esta máquina).

### Realizado

- **Storage de imágenes de producto** (`958945a`): entidades `FotoProducto`, upload admin multipart (`POST /api/productos/admin/:id/imagenes`), endpoint público de bytes (`GET /api/productos/imagenes/:uid`), `imagenPrincipal` en listados y detalles de producto, directorio `PRODUCT_IMAGES_DIR` con nombres UUID y límite 5 MiB (`413`).

### Acuerdos

1. Sin acuerdos nuevos registrados.

### Pendientes para la próxima

- Documentar las imágenes en `api-contract.md` (hecho el 14/10).

---

## 2026-10-04 · Avance: 013 listado de pedidos (cierre de regularidad back)

**Formato:** asíncrono.
**Participantes:** Mariano (con OpenCode).

### Realizado

- **013 · Listado de pedidos**: `listAdmin` con filtros AND (fecha, estado, cliente), paginación `{ data, total, page, size }` y `fechaEntrega` derivada del historial (`293a178`); `getByIdAdmin`/`getByIdOwn` con 404 en pedido ajeno (`73fcfa9`); endpoints (`a785f34`); tests de integración (`a07aa36`).
- **Review + cierre**: fixes de review (rama del filtro `cliente`, `idCliente >= 1`) (`74743b7`), fix de CI (`ee7329c`), gates y changelog v0.2.11 (`591d2ae`). Suite en ese momento: **402 tests**.

### Acuerdos

1. Pedidos usan lock pesimista en `cambiarEstado` para que dos entregas concurrentes no ganen ambas (1026f6e, 012).

### Pendientes para la próxima

- Imágenes de productos (lo hizo CarlosUBruno el 11/10).

---

## 2026-10-02 · Avance: 012 gestión de pedido + entorno Podman documentado

**Formato:** asíncrono.
**Participantes:** Mariano (con OpenCode).

### Realizado

- **012 · Gestión de pedido**: máquina de transiciones fase 1 (`5686116`), `entregar`/`cancelar`/`historial`/`findById` en el service (`9061242`), endpoints solo ADMIN (`f7c84f0`), lock pesimista + tiebreaker del historial (`1026f6e`), cierre con changelog v0.2.10 (`9c9c809`).
- **Docs**: entorno de DB con Podman documentado en `AGENTS.md` (compose, puerto 3307) (`c308f62`); changelog retroactivo de v0.1.6 y v0.2.5–v0.2.9 (`f6c697d`).

### Acuerdos

1. `ABONADO` queda sin transiciones de salida hasta la feature de pago (aprobación).

### Pendientes para la próxima

- 013 (listado de pedidos).

---

## 2026-10-01 · Avance: 011 carrito y pedido

**Formato:** asíncrono.
**Participantes:** Mariano (con OpenCode).

### Realizado

- **011 · Carrito y pedido** (`c80a5ef`): carrito persistente con items, confirmación transaccional con validación de stock, descuento por línea (`mejorElegible`) y `mis-pedidos`. Índice `(idPedido, estado)` del historial creado acá.

### Acuerdos

1. Los importes se calculan siempre en el backend como string decimal (el front no hace aritmética).

### Pendientes para la próxima

- 012 (gestión de pedido).

---

## 2026-09-30 · Avance: 010 listado público de productos

**Formato:** asíncrono.
**Participantes:** Mariano (con OpenCode).

### Realizado

- **010 · Listado público** (`fb7ffe4`): filtros (tipo, marca, rango de precio), paginación y detalle ampliado.

### Acuerdos

1. Sin acuerdos nuevos registrados.

### Pendientes para la próxima

- Carrito y pedido (011).

---

## 2026-09-29 · Avance: 009 CRUD Ingreso + estabilización de la suite

**Formato:** asíncrono.
**Participantes:** Mariano (con OpenCode).

### Realizado

- **Estabilización** (v0.2.6): fixes de `tests/setup.ts` (race condition de schema), DTO validations rotos y **248 errores de tsc en tests** resueltos; typecheck agregado a CI con Node 24 (`fac75ab`, `fddc3d2`).
- **009 · CRUD Ingreso** (`dac796e`): ingresos de mercadería con líneas, importes y actualización de stock; preparación (`1a76586`: `descuento mejorElegible`, `assertExists`, `parseDateRange`).

### Acuerdos

1. Ingreso es asiento de movimiento: alta + listado + detalle + anular, sin PUT (decisión de la consulta a la cátedra).

### Pendientes para la próxima

- 010 (listado público).

---

## 2026-09-26 · Avance: 007 y 008 (producto y descuento)

**Formato:** asíncrono.
**Participantes:** Mariano (con OpenCode).

### Realizado

- **007 · CRUD Producto** (`080a714`): producto dependiente de tipo + marca + proveedor, stock inicial.
- **008 · CRUD Descuento** (`ef4f9f2`): descuentos con vigencia y aplicación a productos; CI verde resuelto.

### Acuerdos

1. Sin acuerdos nuevos registrados.

### Pendientes para la próxima

- Estabilizar la suite (se hizo 28–29/09) y seguir 009.

---

## 2026-09-23 · Avance: refresh token y CI

**Formato:** asíncrono.
**Participantes:** Mariano (con OpenCode).

### Realizado

- **Refresh token con DB** (BR-8) (`9a04e5a`): rotación de JWT sobre la decisión de dejarlo en backlog del plan de mejora.
- **CI**: GitHub Actions funcionando (v1→v3) (`b99e53f` `0cc8a56` `cc2d0ac`) y patrones de CI documentados en `AGENTS.md` (`6858f99`). Primer push al remoto (`94559f6`).

### Acuerdos

1. Gates de CI: lint + typecheck + test en Node 24.

### Pendientes para la próxima

- Features 003–006 (CRUDs maestros).

---

## 2026-09-22 · Avance: setup, análisis por skills y plan de mejora (Niveles 0–4)

**Formato:** asíncrono.
**Participantes:** Mariano (con OpenCode).

### Realizado

- **001–002 setup inicial** (`1ef3bcb`): Express 5 + MikroORM + MySQL, env tipado, auth JWT con roles, middleware, seed de admin, harness de tests; análisis completo del repo por las 11 skills instaladas → `analisis-proyecto.md` (~74 hallazgos priorizados).
- **Nivel 0 (base)**: `env.nodeEnv` en errorHandler, rama muerta eliminada, `AuthService.me()` quitado con `toPublic()`, DI, tests de `authenticate`/`errorHandler`/`validateDto`, rate limit en auth (0.1–0.8).
- **Niveles 1–3 (pre-003/006/007)**: controller auth, adminPassword `required()` en prod, JWT secret ≥32, DTOs duplicados borrados, `usuarios` con controller/routes y `findAll`, límites de body, tests de auth (1.1–3.8).
- **Nivel 4 (parcial)**: `index.ts` de módulos, logout (posterior), `app.ts` (4.2–4.6, 4.9).
- **CHANGELOG.md creado** (`5c5582c`) como historial con fecha y decisión.

### Acuerdos

1. Regla del equipo: no iniciar feature N si los items `Pre-N` del plan de mejora tienen `[ ]` sin marcar.

### Pendientes para la próxima

- Refresh token / CI (hecho el 23/09) y arrancar los CRUDs 003–006.

---

## Plantilla

```markdown
## AAAA-MM-DD · [Avance | Reunión de coordinación] · [tema corto]

**Formato:** presencial / videollamada / asíncrono.
**Participantes:** ...

### Realizado

-

### Acuerdos

1.

### Pendientes para la próxima

-
```
