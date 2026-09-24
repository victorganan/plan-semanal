# Changelog — Evolución Nortvira

Registro de lo implementado, decisiones tomadas y pendientes durante la evolución descrita en `Nortvira — Especificación de Evolución de Producto v1.0` y su complemento `Mejoras basadas en nuevas fuentes`. Un bloque por módulo, en orden cronológico.

## Decisiones de alcance (previas al módulo 1.1)

- **Ritmo**: auditoría (Fase 0) primero, después un módulo por sesión, cada uno verificado y commiteado por separado — mismo ritmo que el resto de la app.
- **Terminología**: se adopta el glosario del documento (sección 4) según se toca cada pantalla existente, empezando por el módulo 1.1.
- **i18n**: retrofit completo de todos los textos de UI ya existentes a un fichero central, no solo los nuevos.
- **Feature flags**: sin infraestructura de flags por usuario (app de uso individual); cada módulo se activa en cuanto está terminado, como el resto de funciones.

## Fase 0 · Reconocimiento

- Entregado `docs/NORTVIRA_AUDIT.md`: stack, estructura, modelo de datos real, flujo del asistente semanal actual, integraciones, notificaciones (confirma que Vercel Cron ya está disponible y en uso — desbloquea M7.2), gestión de estado, estrategia de migraciones, mapeo campo a campo con la sección 8, propuesta de feature flags y riesgos técnicos.
- **Auditoría validada por el Product Owner**, con las siguientes decisiones y correcciones:

  **Decisiones de modelo**
  - Bandeja ≠ backlog: `kind` sigue indicando dónde vive la tarea; nuevo campo `Task.processedAt` (`null` = en Bandeja sin procesar) separa la Bandeja del resto de pendientes sin fecha ya procesadas. Al procesar, la tarea recibe su `gtdStatus` (activa/esperando/algún_día). La migración de los `BACKLOG` actuales se propone antes de aplicarla, al llegar al módulo que toque `Task`.
  - `FocusSession`: tabla única (Pomodoro + Guardia de foco) con campo `mode: POMODORO | GUARDIA`.
  - `DailyLog` del documento no se crea como tabla nueva: se amplía `Day` con `energy`, `mood`, `dayGoal`, `firstTaskId`, `closeChecks`, `overloadAccepted`.
  - `isTop3` y `executedMinutes` se reutilizan tal cual (campo y comportamiento); solo cambian los textos de UI según el glosario.

  **Avisos**
  - La capa común de notificaciones (tope 3/día, prioridad Guardia > Cierre > Arranque > resto, silencio fuera de horario) es la primera pieza técnica de la Fase 1, antes de construir avisos nuevos.
  - Para avisos a horas concretas: evaluar un workflow programado de GitHub Actions (cada 15-30 min) llamando a un endpoint propio con `CRON_SECRET`; si no es viable, cálculo al abrir la app.

  **Preguntas abiertas (15.2) cerradas**: términos (P) del glosario aceptados tal cual · horario común L-V · hábito consolidado = 66 días con ≥80% · registro de tiempo real al completar desactivado por defecto (Guardia y Pomodoro ya registran).

  **Correcciones a la auditoría inicial**
  - Google Calendar: el scope `calendar.events` ya permite leer eventos (`events.list`/`events.get`); no hace falta un scope ni consentimiento adicional.
  - `StuckReason` sí está definido en M7.3: `objetivo_confuso`, `no_se_empezar`, `demasiado_grande`, `depende_de_otro`, `sin_sentido`, `se_cuela_otra`.
  - El tipo Trabajo/Personal (M11.2) es un campo nuevo de `Area`, no de `Task`. `workType` (Valor/Soporte/Relleno) sí es de `Task`.
  - Las fases del Momento de reflexión son las del documento (M3): Mirar atrás, Reconectar y Preparar.

- **Forma de trabajo acordada para cada módulo**: plan breve (cambios de modelo, pantallas afectadas, cómo probarlo) → OK del Product Owner → implementación → qué comprobar en la app → confirmación → commit + entrada en este changelog.

## Fase 1 · Cerrar el MVP con rumbo

### Módulo 1.1 · Textos centralizados + glosario aplicado a lo existente

**Completado y confirmado por el Product Owner.**

- Nuevo `src/i18n/es.ts`: fichero único con todo el texto de UI (títulos, botones, placeholders, aria-labels, mensajes de toast), organizado por componente/pantalla. Sustituye el texto que antes vivía incrustado en ~45 componentes y páginas.
- Las etiquetas de dominio ya centralizadas fuera de componentes (`PRIORITY_LABELS`, `RECURRENCE_LABELS`, `EISENHOWER_LABELS/HINTS` en `@/types`, y los generadores de texto de `@/lib/rrule-helpers`) se dejan donde están — no estaban incrustadas en un componente, solo se habría movido el mismo texto de un sitio centralizado a otro.
- Glosario aplicado donde el documento ya da un mapeo claro (sección 7): "Asistente de planificación semanal" → **Momento de reflexión**; "Top 3 de hoy/del día" → **Las 3 del día**. El resto de términos (P) se deja para cuando el módulo correspondiente los active con su nueva capacidad (p.ej. "Foco semanal" no se renombra a "Viaje semanal" hasta que exista el Viaje semanal real, en Fase 2).
- Sin cambios de modelo ni de lógica: commit de solo texto.
- Verificado: `tsc --noEmit`, `eslint` y `next build` limpios; barrida final sin coincidencias de texto suelto en JSX; smoke test de `/login` en local confirmando el texto centralizado en runtime; revisión visual del Product Owner en claro y oscuro sobre Hoy/Semana, Bandeja, Cierre del día, Tu espacio, Ajustes, Dashboard y Herramientas.

### Módulo 1.2 · Campos GTD de Task + migración

**Completado y confirmado por el Product Owner.**

- Nuevo enum `GtdStatus` (`ACTIVA` / `ESPERANDO` / `ALGUN_DIA`) y 9 campos nuevos en `Task`: `isPriority`, `firstStep`, `context` (contexto GTD con arroba: `@ordenador`, `@casa`, `@calle`…), `gtdStatus`, `processedAt`, `waitingOn`, `followUpDate`, `snoozeUntil`, `rescheduleCount`.
- Migración de esquema puramente aditiva (`CREATE TYPE` + `ADD COLUMN` ×9), sin tocar datos existentes; se despliega sola con el build de Vercel sin riesgo.
- `processedAt` (marca de "ya procesada", `null` = sigue en la Bandeja) se deriva en el backend, no es editable a mano: se rellena al crear una tarea que no sea BACKLOG suelta o que sea subtarea, y al salir de la Bandeja (se programa, cambia de `gtdStatus`, o se completa directamente).
- `rescheduleCount` (contador de tarea atascada) solo se incrementa cuando se pospone una tarea **no completada** a una fecha **posterior** a la que ya tenía; no cuenta adelantar, asignar fecha por primera vez, cambiar solo la hora dentro del mismo día, ni mandar la tarea a Algún día/Esperando. Regla implementada como función pura en `src/lib/reschedule.ts`, con 7 casos cubiertos en `src/lib/reschedule.test.ts` (primer test suite del proyecto; se introduce `vitest`).
- **Backfill de datos existentes** (no va en la migración de esquema, para poder revisarlo antes de aplicarlo en producción): endpoint temporal `GET /api/admin/backfill-task-gtd-fields`, protegido por login, alcance solo a las tareas del usuario que llama, idempotente (repetirlo no vuelve a tocar lo ya migrado). Sin `?apply=true` es un dry-run de solo lectura. Categoriza:
  - BACKLOG de nivel superior sin procesar y con `quadrant = ALGUN_DIA` → `gtdStatus = ALGUN_DIA`, `processedAt = updatedAt`.
  - Cualquier otra tarea sin procesar que no sea "BACKLOG de nivel superior sin subtareas" (incluye BACKLOG con subtareas ya organizado, subtareas, y tareas no-BACKLOG) → `processedAt = createdAt`.
  - El resto (BACKLOG de nivel superior, sin subtareas, sin `quadrant = ALGUN_DIA`) se queda en la Bandeja sin procesar.
- **Copia de seguridad**: sin acceso a la API de Neon ni a la conexión de producción desde el entorno de desarrollo, así que el Product Owner creó manualmente el branch de Neon `backup-antes-1-2` (a partir de production, auto-borrado en 7 días) antes de desplegar.
- Verificado: `tsc --noEmit`, `eslint`, `vitest run` (7/7) y `next build` limpios; script de verificación contra Postgres local sembrando 5 casos representativos (Bandeja genuina, BACKLOG+Algún día, BACKLOG con subtareas, subtarea, tarea de día) confirmando dry-run, apply e idempotencia — descartado tras la verificación, no forma parte del repo.
- Pendiente antes de cerrar el módulo: Product Owner visita el endpoint en producción (dry-run primero, revisa recuentos, luego `?apply=true`); una vez confirmado, se retira el endpoint `/api/admin/backfill-task-gtd-fields` en un commit aparte.

## Fase 2 · Beta: dirección, foco y aprendizaje

_(sin empezar todavía)_

## Fase 3 · Post-Beta: autoconocimiento y bienestar

_(sin empezar todavía)_

## Fase 4 · Asistente IA

_(sin empezar todavía)_
