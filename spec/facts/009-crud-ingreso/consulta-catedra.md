# 009 · Aviso de alineación a la cátedra — Ingreso y Descuento N:M

> Borrador de mensaje para los docentes. **No bloquea** la implementación de
> 009: es un aviso de que el modelo final se alinea en `proposal.md` (que el
> README §3.3 pide entregar actualizada en regularidad). Basado en
> `datos_pre_inicio/README.md` (requisitos) y `datos_pre_inicio/proposal.md`.

---

## Mensaje

Equipo Entreno 2.0 — queríamos avisar dos ajustes del modelo final respecto de
la redacción original de la propuesta:

### 1. CRUD Ingreso (clase de negocio, alcance de aprobación)

Agregamos el CRUD de **Ingreso** (registro de ingresos de mercadería que
incrementa el stock): `POST /api/ingresos` (alta), `GET /api/ingresos` (listado
con filtros), `GET /api/ingresos/:id` (detalle con líneas) y
`POST /api/ingresos/:id/anular` (baja lógica).

- **No es una clase nueva del modelo**: `INGRESO`, `PROV_ING`, `ING_PTO` y
  `ESTADO_ING` ya figuraban en el DER enviado con la propuesta.
- Entra en **aprobación** (README §3.2: "CRUDs de todas las clases de negocio
  necesarias"): sin ingresos el stock solo tiene salida y nunca repone.
- **No toca los cupos de regularidad**: los 4 CRUDs simples (Cliente,
  Proveedor, Tipo producto, Marca) y los 2 dependientes (Producto, Descuento)
  ya están cubiertos.
- **No tiene `PUT`**: un ingreso es un asiento de movimiento que se registra,
  se consulta y se anula; editarlo con posterioridad sería incorrecto
  contablemente.

### 2. CRUD Descuento N:M con vigencia

El CRUD Descuento se implementa **N:M con Producto** (`DescuentoProducto`,
`DTO_PTO` en el DER), con ventana de vigencia por aplicación:

- Un descuento aplica a muchos productos; un producto puede tener varios
  descuentos **distintos** vigentes al mismo tiempo (habilita escalones tipo
  "5% desde 2 u. / 15% desde 5 u.").
- Al confirmar un pedido **no se acumulan**: se aplica un solo descuento por
  línea, eligiendo el de mayor porcentaje (empate → vigencia más reciente).
- Sigue siendo **CRUD dependiente**: toda aplicación requiere un producto
  existente (FK obligatoria). La cuota de regularidad (2 dependientes) se
  cumple con Producto + Descuento.

---

## Confirmación pedida (no bloqueante)

- ¿Dejan bien los dos ajustes? En caso afirmativo no hace falta nada más: la
  **proposal actualizada** con estos puntos se entrega junto con la
  regularidad (README §3.3, 12/10–16/10).
- Si prefieren que el descuento vuelva a N:1 (un descuento → un producto), lo
  ajustamos antes de la entrega; 009 no afecta cupos en ningún caso.

---

## Nota interna

- `proposal.md` ya quedó alineado con estos dos puntos (fila de CRUD
  Descuento en alcance mínimo + fila de CRUD Ingreso en aprobación).
- Defensa oral: si preguntan por 009, el argumento es "clase de negocio
  necesaria + ya existente en el DER", no "cuenta como CRUD de regularidad".
