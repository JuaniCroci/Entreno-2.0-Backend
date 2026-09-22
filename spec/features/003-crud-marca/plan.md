# 003 · CRUD Marca — Plan

## Enfoque

Módulo `marcas` siguiendo el patrón canónico de la constitución: entity → dto → service → controller → routes. El service centraliza la regla de `nombre` unique (chequeo + constraint) y el soft-delete. Las rutas de escritura quedan atrás de `authenticate` + `authorize('ADMIN')`; las de lectura, públicas.

## Implementación

1. `src/modules/marcas/entity/Marca.ts` — `id`, `nombre` unique, `activo` (default true), timestamps.
2. Migración `AddMarcas`.
3. `dto/CreateMarcaDto.ts` (`nombre`: string 2–80), `UpdateMarcaDto.ts` (partial de Create).
4. `MarcaService` — `list(includeInactive?)`, `getById`, `create`, `update`, `softDelete`; en `create/update` verifica nombre duplicado → `AppError(409)`.
5. `MarcaController` + `routes` con la protección indicada en la spec.
6. Tests unit del service (happy, duplicado, 404, soft-delete).
7. Tests integración de permisos y listado filtrado.

## Decisiones

- **Soft-delete (`activo`) en vez de DELETE físico** — productos pueden referenciar la marca (FK) sin Romper integridad referencial; coherente con el resto del catálogo.
- **Unique global en `nombre` aunque esté inactiva** — evita dos "Star Nutrition" confusas al reactivar/crear.
- **Detalle público** — el frontend lo usa para chips/filtros; no filtra `activo=false` en la URL (404 si inactiva para no público).

## Riesgos

- **Producto referenciando marca borrada** — mitigación: nunca baja física; 007 valida `activo` al asignar FK.
- **Race de duplicado concurrente** — mitigación: unique a nivel de columna (constraint), el 409 del service es el mensaje amigable.
