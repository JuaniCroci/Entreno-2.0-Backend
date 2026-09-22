# Misión

## Qué construimos

**Entreno 2.0** es el **backend de una API REST** para un e-commerce de artículos de gimnasio y entrenamiento (suplementos, accesorios y más). Expone los endpoints que el frontend (repo separado) consume para consultar el catálogo, gestionar stock, realizar pedidos y administrar el negocio.

Piezas principales:

1. **Catálogo** — productos con marca, tipo y proveedor; descuentos por cantidad mínima con vigencia.
2. **Stock e ingresos** — stock por producto; ingresos de mercadería de proveedores que lo incrementan.
3. **Carrito y pedidos** — carrito persistente por usuario; pedido con snapshot de precios, descuentos aplicados e historial de estados.
4. **Autenticación y autorización** — registro/login con JWT y dos niveles de acceso: `ADMIN` y `CLIENTE`.

## Para quién

- **Cliente final** — se registra, arma el carrito, confirma pedidos y consulta su historial.
- **Administrador** — gestiona catálogo, proveedores, clientes, ingresos de mercadería y el ciclo de vida de los pedidos (entregar / cancelar).
- **Cátedra DSW (UNICEN)** — evalúa el TP según el [README de la cátedra](../../datos_pre_inicio/README.md); la propuesta aceptada está en [proposal.md](../../datos_pre_inicio/proposal.md).
- **Equipo del TP** — 4 integrantes que desarrollan por features con evidencia de participación.

## Principios

- **Regularidad primero, aprobación en el diseño** — todo lo de fase 1 se implementa pensando en fase 2 (Tag, Favorito, Reseña, Pago) sin rehacer el modelo.
- **Spec-driven** — no se escribe código de una feature sin `spec.md`, `plan.md` y `tasks.md` definidos; la constitución manda.
- **Capas y módulos** — route → middleware → controller → service → EntityManager; un módulo por recurso (requisito cátedra).
- **Seguridad por defecto** — todo protegido salvo que se declare público; contraseñas hasheadas; entrada validada; errores centralizados.
- **Modelo derivado del DER, no de la idea suelta** — las decisiones de dominio salen del DER (`DER-Entreno2.0.drawio.html`) auditado, no de la proposal rough.

## Qué NO es

- **No es el frontend** — este repo es solo la API; el frontend vive en [Frontend-TP-DSW](https://github.com/JuaniCroci/Frontend-TP-DSW).
- **No es una pasarela de pago real en fase 1** — "Abonar pedido" es fase de aprobación (Stripe o MercadoPago, a decidir); queda en el backlog.
- **No es un ERP** — no maneja órdenes de compra complejas, solo ingresos de mercadería con precio de compra por línea.
- **No incluye alcance voluntario** — cupones, notificaciones y valoraciones agregadas están en el backlog de la cátedra, fuera del alcance comprometido.
- **No implementa hasta 3 roles** — solo `ADMIN` y `CLIENTE` (mínimo exigido para aprobación).
