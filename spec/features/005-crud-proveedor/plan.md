# 005 · CRUD Proveedor — Plan

## Enfoque

Módulo `proveedores` con el patrón canónico. Validación de CUIT por regex en el DTO (`/^\d{11}$/`) además del unique. Todas las rutas tras `authenticate` + `authorize('ADMIN')` (no hay lectura pública).

## Implementación

1. `src/modules/proveedores/entity/Proveedor.ts` — campos de la constitución; `cuit` unique; `activo`.
2. Migración `AddProveedores`.
3. DTOs con validaciones (`@Matches` para CUIT, `@IsEmail` opcional).
4. `ProveedorService` — CRUD + soft-delete + 409 en CUIT duplicado.
5. Controller + routes `/api/proveedores`.
6. Tests unit + integración.

## Decisiones

- **CUIT unique global** — dos proveedores no pueden compartir CUIT ni estando uno inactivo (mismo criterio que marca).
- **Sin endpoint público** — a diferencia de marcas/tipos, el cliente no necesita proveedores; si 007 los muestra en detalle de producto, se expone una proyección mínima (`id`, `razonSocial`) desde el módulo productos, no un listado abierto.
- **FK opcional en Producto** — constitución: `idProveedor` nullable; un producto puede quedar sin proveedor asignado.

## Riesgos

- **Productos existentes con proveedor desactivado** — permitido: la FK conserva el histórico; el soft-delete no invalida relaciones viejas, solo bloquea elegirlo en altas nuevas (007 valida `activo` al crear/editar producto).
