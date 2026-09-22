# spec/ — Entreno 2.0 Backend

> Desarrollo dirigido por especificación (SDD): primero la spec, luego el plan, luego las tareas, y solo entonces el código.

## Estructura

```
spec/
├── constitution/            ← reglas estables del proyecto
│   ├── mission.md           ← qué construimos y para quién
│   ├── tech-stack.md        ← tecnologías, modelo de dominio, MikroORM, convenciones, límites
│   ├── roadmap.md           ← orden y estado de las features
│   ├── coding-playbook.md   ← fuente de verdad para escribir código
│   ├── api-contract.md      ← contrato de respuestas HTTP
│   └── engineering-loop.md  ← loop de validación por feature (gates)
└── features/                ← una carpeta por feature
    └── NNN-nombre-feature/
        ├── spec.md          ← qué hace + criterios de aceptación
        ├── plan.md          ← cómo se implementa + interfaces externas
        └── tasks.md         ← checklist de tareas
```

## Flujo para una feature

1. Revisar `spec.md` y `plan.md` (ya escritos para las 13 features de regularidad).
2. Seguir `constitution/engineering-loop.md` (carga de contexto → prereqs → tasks → gates).
3. Ejecutar las tareas de `tasks.md` marcando `[x]`.
4. Validar contra los criterios de aceptación de `spec.md`.
5. Pasar los 4 gates: `pnpm lint` → `pnpm build` → `pnpm test` → playbook review.
6. Mover la feature a "Hecho" en `constitution/roadmap.md` y reportar desvíos en `plan.md`.

> La constitución manda: si una feature choca con `mission.md` o `tech-stack.md`, se replantea la feature, no la constitución.
