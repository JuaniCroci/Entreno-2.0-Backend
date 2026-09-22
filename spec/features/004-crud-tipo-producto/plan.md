# 004 · CRUD Tipo de producto — Plan

## Enfoque

Clon del patrón de `marcas` (003) con los campos extra `descripcion?`. Reutiliza `authenticate`, `authorize`, `validate` y `AppError`. Si 003 ya creó los middlewares comunes, este feature solo suma el módulo.

## Implementación

1. `src/modules/tipos-producto/entity/TipoProducto.ts` — `id`, `nombre` unique, `descripcion?`, `activo`, timestamps.
2. Migración `AddTiposProducto`.
3. DTOs `CreateTipoProductoDto` (`nombre` 2–80, `descripcion` max 500 opcional) y `UpdateTipoProductoDto`.
4. `TipoProductoService` — misma semántica que `MarcaService` (duplicado → 409, soft-delete).
5. `TipoProductoController` + `routes` en `/api/tipos-producto`.
6. Tests unit + integración (patrón de 003).

## Decisiones

- **Ruta `tipos-producto` (kebab, plural)** — convención de la constitución; el frontend y 007 la referencian igual.
- **PK surrogado `id`** — la elipse del DER marcaba `id_tipo_prod` y `nombre` como claves; nos quedamos con id + unique en nombre (decisión ya tomada en la constitución).
- **Sin atributos de "objetivo" (volumen/definición/rendimiento)** — esos filtros son alcance voluntario de la proposal, no del modelo base.

## Riesgos

- **Duplicar código con 003** — mitigación: si al tercer CRUD se repite, extraer helper de soft-delete/unique a `common/` sin sobre-ingeniar (YAGNI hasta 006+).
