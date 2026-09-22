# Skills del proyecto

Carpeta estándar (multi-agente) para Agent Skills de este repo. OpenCode descubre skills aquí; también la usan Copilot, Gemini CLI, etc.

## Política de uso

No dejar nada en el aire: antes de actuar, **revisar siempre las skills disponibles** (en OpenCode: tool `skill` / lista `<available_skills>`; en terminal: `npx skills ls`) y **evaluar si alguna es útil** para la situación.

Esta revisión es **obligatoria en tres momentos**:

1. **Ante un error** — antes de parchear a las penas, ver si una skill ya documenta el procedimiento de diagnóstico/fix.
2. **Al tomar una decisión de diseño o implementación** — evaluar si una skill define el approach correcto.
3. **Al implementar algo nuevo** — evaluar si una skill trae plantillas, checklists o buenas prácticas del dominio.

Si alguna aplica: **buscar el procedimiento correcto para usarla** — leer su `SKILL.md` completo, respetar subcomandos/pasos y requisitos previos, y tratar su contenido como instrucción obligatoria. Si no aplica ninguna, seguir con criterio propio y las convenciones del proyecto.

## Estructura

Cada skill vive en su propio directorio con un `SKILL.md`:

```
.agents/skills/
  <nombre>/
    SKILL.md
    ... archivos de apoyo opcionales
```

## Formato de SKILL.md

Debe empezar con frontmatter YAML obligatorio:

```markdown
---
name: <nombre>
description: <qué hace y cuándo usarla, 1–1024 caracteres>
---

## Qué hago
...

## Cuándo usarme
...
```

Reglas de `name` (regex: `^[a-z0-9]+(-[a-z0-9]+)*$`):

- 1–64 caracteres, minúsculas, números y guiones simples.
- No empezar ni terminar con `-`, sin `--` consecutivos.
- **Debe coincidir con el nombre del directorio** que contiene el `SKILL.md`.

Los campos desconocidos del frontmatter se ignoran.

## Cómo instalar una skill

Opción A — CLI de skills (recomendada; para OpenCode instala **en esta carpeta**, `.agents/skills/`):

```bash
npx skills add <paquete> --skill <nombre>
# ej: npx skills add https://github.com/vercel-labs/agentic-commerce-skills --skill ucp
# alias: npx skills a ...
```

Opción B — manual:

1. Crear `.agents/skills/<nombre>/SKILL.md` con el frontmatter válido.
2. Copiar archivos de apoyo junto al `SKILL.md` si los tiene.

> No duplicar la misma skill en otra carpeta descubierta (`.opencode/skills/`, `.claude/skills/`, …): los nombres deben ser únicos.

## Después de instalar

- Reiniciar la sesión de OpenCode: la skill aparece en `<available_skills>` y el agente la carga con la tool `skill`.
- Listar las instaladas: `npx skills ls` (proyecto) / `npx skills ls -g` (globales).
- Quitar una: `npx skills remove <nombre>`.

## Referencia

- Doc de OpenCode: https://opencode.ai/docs/skills/
- El agente debe cargar skills relevantes antes de actuar (política en [`AGENTS.md`](../../AGENTS.md)).
