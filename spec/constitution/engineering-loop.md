# Engineering Loop — Entreno 2.0 Backend

> Protocolo de implementación para agentes de IA.
> Cada feature se implementa con este ciclo. No se avanza a la siguiente feature hasta que todos los gates pasan.

---

## Visión general del loop

```
┌─────────────────────────────────────────────────────────┐
│  PARA CADA FEATURE (001 → 013, en orden)                │
│                                                         │
│  1. CARGA DE CONTEXTO          (leer docs)              │
│  2. VERIFICAR PREREQUISITOS    (features anteriores OK) │
│  3. IMPLEMENTAR                (tasks.md)               │
│  4. GATE: lint                 (pnpm lint)              │
│  5. GATE: build                (pnpm build)             │
│  6. GATE: tests                (pnpm test)              │
│  7. GATE: playbook review      (checklist manual)       │
│  8. MARCAR HECHO               (roadmap.md)             │
│  9. REPORTE DE DESVÍOS         (si los hay)             │
└─────────────────────────────────────────────────────────┘
```

---

## Paso 1 — Carga de contexto

El agente **debe leer** estos archivos antes de escribir una sola línea:

| Archivo                                | Por qué                                       |
| -------------------------------------- | --------------------------------------------- |
| `spec/constitution/tech-stack.md`      | Stack, modelo de datos, límites duros         |
| `spec/constitution/coding-playbook.md` | Convenciones de código                        |
| `spec/constitution/api-contract.md`    | Formato de respuestas HTTP                    |
| `spec/constitution/mission.md`         | Qué construimos y para quién                  |
| `spec/features/NNN-nombre/spec.md`     | Qué hace la feature + criterios de aceptación |
| `spec/features/NNN-nombre/plan.md`     | Cómo implementarla + interfaces externas      |
| `spec/features/NNN-nombre/tasks.md`    | Checklist de tareas a ejecutar                |

> **No** leer otros `plan.md` o código fuente salvo que la sección "Interfaces externas" del `plan.md` de la feature lo indique explícitamente.

---

## Paso 2 — Verificar prerequisitos

Antes de implementar, confirmar que las features de las que depende están marcadas como `✅` en `roadmap.md`.

| Feature         | Depende de              |
| --------------- | ----------------------- |
| 001 · Setup     | — (primera)             |
| 002 · Auth      | 001                     |
| 003 · Marca     | 001, 002                |
| 004 · TipoProd  | 001, 002                |
| 005 · Proveedor | 001, 002                |
| 006 · Cliente   | 001, 002                |
| 007 · Producto  | 001, 002, 003, 004, 005 |
| 008 · Descuento | 001, 002, 007           |
| 009 · Ingreso   | 001, 002, 005, 007      |
| 010 · ListProd  | 001, 002, 007           |
| 011 · Carrito   | 001, 002, 007, 008      |
| 012 · GestPed   | 001, 002, 011           |
| 013 · ListPed   | 001, 002, 011           |

Si alguna dependencia no está hecha, **detenerse** e implementarla primero.

---

## Paso 3 — Implementar

Ejecutar las tareas de `tasks.md` en orden, marcando `[x]` a medida que se completan.

### Reglas durante la implementación

1. **Respetar las interfaces externas**: los métodos de services de otras features solo se llaman con la firma definida en la sección "Interfaces externas" del `plan.md`.
2. **No crear archivos sin respaldo en tasks.md**: si se necesita un archivo no listado, agregarlo al `tasks.md` antes de crearlo.
3. **Un flush por operación de negocio**: no llamar a `em.flush()` más de una vez por método de service (salvo transacciones).
4. **Sin lógica en routes**: las routes solo configuran middlewares y enlazan al controller.
5. **Idioma**: mensajes de error, nombres de campos y comentarios en español.

---

## Paso 4 — GATE: Lint

```bash
pnpm lint
```

**Condición de paso:** cero errores. Los warnings son aceptables pero deben documentarse.

Si falla → corregir antes de continuar. No parchear con `// eslint-disable`.

---

## Paso 5 — GATE: Build

```bash
pnpm build
```

**Condición de paso:** compilación TypeScript sin errores (`strict: true`).

Errores comunes a verificar:

- Acceso a relaciones sin populate (el tipo puede ser correcto pero el valor vacío en runtime).
- `null` vs `undefined` en asignaciones a entidades.
- Imports circulares entre módulos.

---

## Paso 6 — GATE: Tests

```bash
pnpm test
```

**Condición de paso:** todos los tests pasan, incluidos los nuevos de la feature.

Si un test nuevo no pasa → es un bug en la implementación o en el test. Corregir. No borrar el test.

Verificar cobertura mínima de la feature:

- Al menos 1 test unitario del service (happy path).
- Al menos 1 test de integración que recorra el flujo HTTP completo.
- Al menos 1 test de caso de error (4xx).

---

## Paso 7 — GATE: Playbook Review

Checklist manual contra `coding-playbook.md`. El agente responde cada ítem antes de avanzar:

```
[ ] Nombres de archivos siguen la tabla de sección 1 del playbook
[ ] Métodos del service usan el vocabulario canónico (sección 2)
[ ] Controller: arrow functions, sin try/catch, sin lógica de negocio
[ ] Service: getEm() en getter privado, no en constructor
[ ] Todas las relaciones se cargan con populate explícito (tabla sección 5)
[ ] Campos opcionales: null en entidad, undefined en DTO
[ ] Fechas: ISO 8601 UTC en salida; parseDateRange para filtros
[ ] Respuestas siguen el contrato de api-contract.md (wrapper { data, total } en listas; objeto directo en items; 201 en POST create; 204 en DELETE)
[ ] Dinero: decimal(10,2) en entidad; string en JSON de respuesta
[ ] No hay console.log en el código
[ ] No hay .env commiteado
[ ] passwordHash no aparece en ninguna respuesta
```

Si algún ítem falla → corregir y volver al gate de lint.

---

## Paso 8 — Marcar hecho

Una vez que todos los gates pasan:

1. Marcar la feature como `✅` en `spec/constitution/roadmap.md`.
2. Actualizar el estado en `spec/features/NNN-nombre/spec.md` de `propuesta` a `implementada`.
3. Marcar todos los ítems de `tasks.md` como `[x]`.

---

## Paso 9 — Reporte de desvíos

Si durante la implementación se tomó alguna decisión que **no estaba en el plan** o que **difiere del playbook**, documentarla al final del `plan.md` de la feature en una sección nueva:

```markdown
## Desvíos de implementación

- **[descripción breve]**: [razón]. Impacto: [qué puede afectar].
```

Esto sirve de contexto para el agente que implemente features posteriores y para el humano que hace la revisión final.

---

## Orden de implementación y modelo de invocación

### Fase 1 — Regularidad (features 001–013)

Implementar en orden estricto. Las features 003–006 pueden implementarse en paralelo (subagentes) porque no dependen entre sí — solo dependen de 001 y 002.

```
Serie obligatoria:    001 → 002
Paralelo posible:     003, 004, 005, 006  (todos dependen de 001+002)
Serie obligatoria:    007 → 008
Serie obligatoria:    009, 010            (paralelo posible entre sí)
Serie obligatoria:    011 → 012, 013      (012 y 013 paralelo posible)
```

### Prompt base para invocar un agente por feature

Usar este template al lanzar el agente de cada feature:

```
Implementa la feature NNN-[nombre] del backend Entreno 2.0.

Lee estos archivos antes de escribir código:
- spec/constitution/tech-stack.md
- spec/constitution/coding-playbook.md
- spec/constitution/api-contract.md
- spec/constitution/mission.md
- spec/features/NNN-[nombre]/spec.md
- spec/features/NNN-[nombre]/plan.md
- spec/features/NNN-[nombre]/tasks.md

Sigue el engineering-loop.md al pie de la letra:
1. Lee los archivos de contexto.
2. Verifica que los prerequisitos estén implementados.
3. Implementa los tasks en orden.
4. Ejecuta pnpm lint → pnpm build → pnpm test.
5. Completa el checklist de playbook review.
6. Marca la feature como hecha en roadmap.md.
7. Reporta desvíos al final del plan.md si los hay.

No modifiques archivos fuera de:
- src/modules/[recurso]/
- src/common/ (si la feature lo requiere)
- tests/unit/ y tests/integration/
- spec/features/NNN-[nombre]/ (solo para marcar tasks y desvíos)
- spec/constitution/roadmap.md (solo para marcar hecho)
```

---

## Reglas de oro del loop

> 1. **Un gate roto detiene la feature.** No avanzar a la siguiente con gates fallidos.
> 2. **No parchear los gates.** Si lint falla, corregir el código, no deshabilitar la regla.
> 3. **Los desvíos se documentan, no se ocultan.** Un agente posterior que lea el plan.md puede adaptar su implementación.
> 4. **La constitución manda.** Si el plan de la feature choca con `mission.md` o `tech-stack.md`, se replantea la feature, no la constitución.
> 5. **El orden de features es el orden de dependencias.** No omitir features "simples" para ir directo a las complejas.
