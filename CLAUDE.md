## Arranque de sesión

Al empezar cada sesión, lee la sección PENDIENTE de docs/CHANGELOG_EVOLUCION.md antes de hacer nada. Cada tarea nueva que se pida se añade ahí; cada una que se termine se mueve de PENDIENTE al bloque de lo hecho correspondiente en el mismo documento.

## Jerarquía de prioridad (reglas, diseño y plugins)

Cuando dos fuentes de instrucciones se contradigan, manda la de mayor rango:

1. **Reglas de este CLAUDE.md y el glosario de vocabulario** (DESIGN.md §6: nombres como "Acciones prioritarias", "Primera tarea", "Momento de reflexión", "Cerrar el día", "Áreas y proyectos", "Estadísticas"...). No negociable.
2. **DESIGN.md y la skill `nortvira-design`** (resto de decisiones de diseño propias de Nortvira).
3. **Skills oficiales de Anthropic** (p. ej. `frontend-design`).
4. **Resto de plugins y skills de terceros** (`ponytail` y sus variantes, las skills de `agent-skills`, `graphify`, `impeccable`, `emil-design-eng`, `design-taste-frontend`, `redesign-existing-projects`): solo asesoran, nunca deciden por sí solos.

Si dos plugins del mismo nivel 4 se contradicen entre sí, coméntalo en una línea antes de aplicar ninguno. Si una fuente de rango inferior contradice a una superior, gana la superior y se comenta en una línea.

## Diseño
- Antes de crear o modificar cualquier pantalla, componente o estilo, lee y cumple DESIGN.md.
- Si cambias DESIGN.md, copia el cambio a .claude/skills/nortvira-design/references/DESIGN.md.

## Plugins de terceros instalados (nivel proyecto)

Instalados como skills/comandos/agentes estáticos en `.claude/` (sin hooks activos: ningún script se ejecuta solo en cada sesión). Revisados antes de instalar: sin conexiones a servicios externos no solicitadas, sin comandos destructivos.

- **Ponytail** (`.claude/skills/ponytail*`, DietrichGebert/ponytail, MIT): modo "lazy senior dev" — YAGNI, evita abstracciones no pedidas. **Nivel fijado en este proyecto: `lite`** (anula el "full" por defecto del skill). **Regla dura: Ponytail nunca elimina tests, validaciones de entrada, manejo de errores ni accesibilidad para reducir código** — eso siempre gana sobre "menos código".
- **Agent Skills** (`.claude/skills/*` + `.claude/commands/*` + `.claude/agents/*`, addyosmani/agent-skills, MIT): skills de ciclo de vida de ingeniería (spec, plan, build, test, review, ship...) y subagentes (`code-reviewer`, `security-auditor`, `test-engineer`, `web-performance-auditor`). Solo asesoran (nivel 4 de la jerarquía).
- **Graphify** (`.claude/skills/graphify`, Graphify-Labs/graphify, Apache-2.0/MIT): construye un grafo de conocimiento del código bajo demanda (`/graphify`). Se instala como skill únicamente; el CLI (`graphifyy`, Python vía `uv`/`pipx`) no se descarga hasta que se invoque, y no toca `package.json` ni el build de Vercel. No se ha instalado el hook de "always-on" ni el post-commit hook: solo corre cuando se pide explícitamente.
- **Omniroute: descartado a propósito.** No instalar. Decisión explícita: el código y los datos de este proyecto no deben pasar por pasarelas de terceros.
