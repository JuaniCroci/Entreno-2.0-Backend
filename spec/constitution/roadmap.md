# Roadmap

Orden y estado de las features. Cada entrada apunta a su carpeta en `features/`.

## Hecho ✅

1. **[001 · Setup](../features/001-setup/)** — esqueleto del proyecto: Docker + MySQL, Express 5, MikroORM, env, lint, harness de tests, health-check.
2. **[002 · Auth y usuarios](../features/002-auth-usuarios/)** — Usuario, register/login JWT, roles, middleware, seed de admin.
3. **[003 · CRUD Marca](../features/003-crud-marca/)** — alta/baja/edición/listado de marcas (admin).
4. **[004 · CRUD Tipo de producto](../features/004-crud-tipo-producto/)** — CRUD de tipos de producto (admin).
5. **[005 · CRUD Proveedor](../features/005-crud-proveedor/)** — CRUD de proveedores (admin).
6. **[006 · CRUD Cliente](../features/006-crud-cliente/)** — gestión de usuarios con rol CLIENTE (admin).
7. **[007 · CRUD Producto](../features/007-crud-producto/)** — producto dependiente de tipo + marca + proveedor; stock inicial.
8. **[008 · CRUD Descuento](../features/008-crud-descuento/)** — descuentos y su aplicación a productos con vigencia.

## En orden (regularidad)

1. ~~[001 · Setup](../features/001-setup/)~~ — ✅
2. ~~[002 · Auth y usuarios](../features/002-auth-usuarios/)~~ — ✅
3. ~~[003 · CRUD Marca](../features/003-crud-marca/)~~ — ✅
4. ~~[004 · CRUD Tipo de producto](../features/004-crud-tipo-producto/)~~ — ✅
5. ~~[005 · CRUD Proveedor](../features/005-crud-proveedor/)~~ — ✅
6. ~~[006 · CRUD Cliente](../features/006-crud-cliente/)~~ — ✅
7. ~~[007 · CRUD Producto](../features/007-crud-producto/)~~ — ✅
8. **[009 · CRUD Ingreso](../features/009-crud-ingreso/)** — ingresos de mercadería con líneas, importes y actualización de stock.
9. **[010 · Listado de productos](../features/010-listado-productos/)** — listado público con filtros (tipo, marca, rango de precio) + detalle.
10. **[011 · Carrito y pedido](../features/011-carrito-pedido/)** — CU: carrito persistente y confirmación de pedido con stock y descuentos.
11. **[012 · Gestión de pedido](../features/012-gestion-pedido/)** — CU: admin entrega/cancela pedido con historial de estados y restitución de stock.
12. **[013 · Listado de pedidos](../features/013-listado-pedidos/)** — listado admin con filtros (fecha, estado, cliente) + detalle; el cliente ve los suyos.

## Backlog / ideas 💡

_Features de **aprobación** (se crean sus carpetas al iniciar la fase) y **voluntario** de la cátedra._

- **CRUD Tag** — tags de catálogo + asociación N:M con producto (aprobación).
- **CRUD Favorito** — el cliente marca productos favoritos (aprobación).
- **Reseña de producto** — puntuación 1–5 + comentario por cliente (aprobación).
- **Abonar pedido** — CU de pago con pasarela (**Stripe o MercadoPago, decidir al iniciarla**); habilita estados `ABONADO` (aprobación).
- **Documentación API (Swagger)** — `swagger-jsdoc` + endpoint de docs (aprobación).
- **Deploy + credenciales** — publicar API y entregar links/credenciales (aprobación).
- **Cupones** — cupón de descuento a nivel pedido (voluntario).
- **Notificación de stock bajo** — email/alerta al reponer (voluntario).
- **Seguimiento de pedido para el cliente** — timeline desde `HistorialEstado` (voluntario; el historial ya existe desde 012).

## Riesgos / pendientes del equipo (no son features)

### Bloqueadores humanos ✍️ (antes del primer código)

- ~~Confirmar con la cátedra que **TypeScript** cumple "Desarrollarse en JavaScript".~~ ✅ confirmado por el equipo (21/09/2026).
- **Aviso a la cátedra sobre 009 y Descuento N:M** — borrador en [`spec/facts/009-crud-ingreso/consulta-catedra.md`](../facts/009-crud-ingreso/consulta-catedra.md) (aviso no bloqueante; `proposal.md` ya quedó alineado: Descuento N:M con vigencia en alcance mínimo, Ingreso como CRUD de aprobación). Posición del equipo: los cupos de regularidad se cubren con 003–008 (4 CRUDs simples + 2 dependientes); 009 es clase de negocio necesaria (README §3.2) — alta+listado+detalle+anular, sin PUT porque es un asiento de movimiento. **No bloquea implementar 009.**
- ~~Alinear `datos_pre_inicio/proposal.md` con el modelo final (Ingreso, Descuento M:N).~~ ✅ alineado (ver aviso de arriba). _TypeScript_: solo se aclara si la cátedra lo pide.

### Gestión / evidencia

- **Evidencia ágil**: GitHub Projects (issues/PRs) + minutas de reuniones (README de la cátedra la exige).
- Checklist de arranque del `implementation-plan.md` completo antes de invocar cualquier agente de implementación.

> Cada feature nueva se crea como `features/NNN-nombre/` con `spec.md`, `plan.md` y `tasks.md` antes de tocar código.
