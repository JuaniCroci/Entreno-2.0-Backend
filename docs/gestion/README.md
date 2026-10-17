# Gestión del proyecto — Evidencia de regularidad (backend)

> Requisito: enunciado §4 (_Gestión del proyecto_) — metodología + minutas + trackeo de features/bugfix.
> Espejo adaptado de [`Frontend-TP-DSW/docs/gestion`](https://github.com/JuaniCroci/Frontend-TP-DSW/tree/main/docs/gestion); los repos comparten la misma metodología.

## Metodología: Scrum liviano con tablero Kanban

Variante **ligera de Scrum** con tablero **Kanban**, adaptada a un grupo chico y a un flujo spec→código:

| Elemento Scrum     | Cómo trabajamos en este TP                                                                                                                                                        |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Product Backlog    | [`analisis-proyecto.md`](../../analisis-proyecto.md) (hallazgos priorizados) + [`spec/constitution/roadmap.md`](../../spec/constitution/roadmap.md) (features) + el board (abajo) |
| Sprint / lote      | Un **lote** por ciclo (feature o lote de mejoras): alcance acordado, gates verdes, commit y cierre marcado con fecha + hash                                                       |
| Daily              | Coordinación asíncrona por la tool del equipo; decisiones registradas en las [minutas](./minutas.md)                                                                              |
| Review             | Revisión de la rama al cerrar el lote (gates + revisión de código; hallazgos → sección de ejecución del `analisis-proyecto.md`)                                                   |
| Retro              | Los hallazgos nuevos se registran en `analisis-proyecto.md` (o en la minuta) **antes** de arreglarlos y alimentan el próximo lote                                                 |
| Definition of Done | `pnpm lint` → `pnpm typecheck` → `pnpm format:check` → `pnpm build` → `pnpm test` verdes + docs/spec actualizados + changelog + commit                                            |

## Trackeo (GitHub Projects)

- **Board del backend:** _pendiente de crear_ — board separado del front (decisión del equipo 2026-10-15); dejar la URL pública acá al crearlo.
- **Columnas (campo Status):** `Todo` · `In Progress` · `Done`.
- **Issues:** <https://github.com/JuaniCroci/Entreno-2.0-Backend/issues>
- **Commits/PRs:** historial en <https://github.com/JuaniCroci/Entreno-2.0-Backend>. Los cambios de más de una feature se hacen en rama y se mergean a `main`; los lotes chicos commitean directo (historial trunk-based del repo).

## Minutas

Registro de avances y reuniones de coordinación: [`minutas.md`](./minutas.md) — se agrega una entrada por reunión/avance relevante, en orden cronológico inverso. Las entradas anteriores a 2026-10-15 se reconstruyeron desde `git log` y `CHANGELOG.md`.

## Changelog

Historial de cambios con versión, fecha y secciones Feature / Comportamiento / Tests / Gates: [`CHANGELOG.md`](../../CHANGELOG.md) — se agrega una entrada al cerrar cada feature o lote, junto con su entrada en las minutas cuando el avance lo amerite.

## Convenciones de cierre (obligatorias)

Al cerrar una feature o lote:

1. Gates verdes: `pnpm lint` → `pnpm typecheck` → `pnpm format:check` → `pnpm build` → `pnpm test`.
2. Actualizar `spec/` (spec.md / plan.md / tasks.md con `[x]` y fecha) si tocó contrato o alcance.
3. Entrada en [`CHANGELOG.md`](../../CHANGELOG.md) (versión nueva + fecha).
4. Commit de cierre (convención `feat(NNN)`, `docs(NNN)`, `fix(...)` según corresponda).
5. Entrada en [`minutas.md`](./minutas.md) si el avance lo amerita.

## Convenciones de los issues

- El título lleva el número de feature cuando corresponde (`009 CRUD Tag (fase aprobacion)`).
- El body incluye contexto + **AC** (criterios de aceptación) con checklist.
- Un issue pasa a `In Progress` cuando arranca y a `Done` al mergear con gates verdes.

## Regla de resync de snapshots (back → front)

El front copia del back `spec/constitution/api-contract.md` y su catálogo de endpoints como **snapshots**. Cada vez que cambia `api-contract.md` (o se agregan endpoints/filtros nuevos) hay que **avisarle al equipo del front** para que resincronice — la divergencia D1 del análisis de concordancia (2026-10-14) existió porque el back actualizó su contrato sin el aviso correspondiente.
