# Roadmap

Orden y estado de las features. Cada entrada apunta a su carpeta en `features/`.

## Hecho ✅

1. **[001 · Setup](../features/001-setup/)** — esqueleto del proyecto: Docker + MySQL, Express 5, MikroORM, env, lint, harness de tests, health-check.
2. **[002 · Auth y usuarios](../features/002-auth-usuarios/)** — Usuario, register/login JWT, roles, middleware, seed de admin.

## Siguiente 🔜

1. **[003 · CRUD Marca](../features/003-crud-marca/)** — alta/baja/edición/listado de marcas (admin).

## En orden (regularidad)

1. ~~[001 · Setup](../features/001-setup/)~~ — ✅
2. ~~[002 · Auth y usuarios](../features/002-auth-usuarios/)~~ — ✅
3. **[003 · CRUD Marca](../features/003-crud-marca/)** — alta/baja/edición/listado de marcas (admin).
4. **[004 · CRUD Tipo de producto](../features/004-crud-tipo-producto/)** — CRUD de tipos de producto (admin).
5. **[005 · CRUD Proveedor](../features/005-crud-proveedor/)** — CRUD de proveedores (admin).
6. **[006 · CRUD Cliente](../features/006-crud-cliente/)** — gestión de usuarios con rol CLIENTE (admin).
7. **[007 · CRUD Producto](../features/007-crud-producto/)** — producto dependiente de tipo + marca + proveedor; stock inicial.
8. **[008 · CRUD Descuento](../features/008-crud-descuento/)** — descuentos y su aplicación a productos con vigencia.
9. **[009 · CRUD Ingreso](../features/009-crud-ingreso/)** — ingresos de mercadería con líneas, importes y actualización de stock.
10. **[010 · Listado de productos](../features/010-listado-productos/)** — listado público con filtros (tipo, marca, rango de precio) + detalle.
11. **[011 · Carrito y pedido](../features/011-carrito-pedido/)** — CU: carrito persistente y confirmación de pedido con stock y descuentos.
12. **[012 · Gestión de pedido](../features/012-gestion-pedido/)** — CU: admin entrega/cancela pedido con historial de estados y restitución de stock.
13. **[013 · Listado de pedidos](../features/013-listado-pedidos/)** — listado admin con filtros (fecha, estado, cliente) + detalle; el cliente ve los suyos.

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
- Validar con el docente que **Ingreso (009)** cuenta como CRUD y que **Descuento N:M** cumple "CRUD dependiente" (la proposal decía N:1). _(009 es alta+listado+detalle+anular, sin PUT clásico.)_
- ~~Alinear `datos_pre_inicio/proposal.md` con el modelo final si la cátedra lo requiere (Ingreso, Descuento M:N, TS).~~ — pendiente solo si la cátedra lo pide.

### Gestión / evidencia

- **Evidencia ágil**: GitHub Projects (issues/PRs) + minutas de reuniones (README de la cátedra la exige).
- **Distribución de tareas**: asignar 1 CRUD simple por integrante (003–006) con commits a nombre/legajo.
- Checklist de arranque del `implementation-plan.md` completo antes de invocar cualquier agente de implementación.

> Cada feature nueva se crea como `features/NNN-nombre/` con `spec.md`, `plan.md` y `tasks.md` antes de tocar código.
