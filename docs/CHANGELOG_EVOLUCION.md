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
- **Backfill de datos existentes** (no fue parte de la migración de esquema, para poder revisarlo antes de aplicarlo en producción): endpoint temporal `GET /api/admin/backfill-task-gtd-fields`, protegido por login, alcance solo a las tareas del usuario que llama, idempotente. Sin `?apply=true`, dry-run de solo lectura con 4 recuentos separados: `inboxStays` / `inboxToAlgunDia` / `inboxToProcesada` (los tres suman exactamente lo que se ve en la pantalla de Bandeja) y `otherTasksToProcesada` (tareas de día/prioridad/llamada y subtareas, fuera de la Bandeja, que también reciben `processedAt = createdAt` para que el módulo 1.3 no las trate como pendientes de triaje). Categoriza:
  - BACKLOG de nivel superior sin procesar y con `quadrant = ALGUN_DIA` → `gtdStatus = ALGUN_DIA`, `processedAt = updatedAt`.
  - BACKLOG de nivel superior sin procesar y con subtareas (miniproyecto ya organizado) → `processedAt = createdAt`.
  - Cualquier tarea que no sea BACKLOG de nivel superior (día, prioridad, llamada, subtareas) → `processedAt = createdAt`.
  - El resto (BACKLOG de nivel superior, sin subtareas, sin `quadrant = ALGUN_DIA`) se queda en la Bandeja sin procesar.
  - Primera versión del recuento mezclaba sin querer las tareas fuera de Bandeja en un único número, dando resultados que no cuadraban con lo que el Product Owner veía en pantalla — corregido antes de aplicar nada en producción.
- **Copia de seguridad**: sin acceso a la API de Neon ni a la conexión de producción desde el entorno de desarrollo, así que el Product Owner creó manualmente el branch de Neon `backup-antes-1-2` (a partir de production, auto-borrado en 7 días) antes de desplegar.
- Verificado: `tsc --noEmit`, `eslint`, `vitest run` (7/7) y `next build` limpios; script de verificación contra Postgres local sembrando 7 casos representativos (Bandeja genuina, BACKLOG+Algún día, BACKLOG con subtareas, subtarea, tarea de día/prioridad/llamada) confirmando dry-run, apply e idempotencia — descartado tras la verificación, no forma parte del repo.
- **Aplicado en producción y confirmado por el Product Owner**: 37 tareas marcadas como procesadas, Bandeja vacía coincidiendo con la pantalla, Semana y Hoy sin cambios visibles. Endpoint `/api/admin/backfill-task-gtd-fields` retirado en un commit aparte una vez confirmado el resultado.

### Módulo 1.3 · Captura rápida, Procesar Bandeja, Esperando, Algún día (M6.1-M6.4)

**Completado y confirmado por el Product Owner, en producción.**

- **Captura rápida (M6.1)**: botón flotante global + atajo de teclado `N` (desactivado con el foco en un campo de texto), disponible en cualquier pantalla. Crea la tarea directo en la Bandeja.
- **Procesar Bandeja (M6.2)**: árbol de decisión completo con los textos de A.6.1 — ¿hay que hacer algo? (idea / algún día / eliminar) → ¿menos de 2 minutos? (temporizador) → ¿te toca a ti? (esperar a alguien / delegar, con persona y fecha de seguimiento) → ¿una sola acción? (crear tarea, con fecha real opcional y "Sin fecha todavía" / crear proyecto con su primer paso). Cierre "Bandeja a cero. Cabeza despejada." solo cuando de verdad no queda nada pendiente; si se saltó alguna tarea, "Has procesado X. Quedan Y pendientes." con botón "Procesar las que quedan" (reabre el asistente con la cola recalculada, no una copia recordada).
- **Esperando (M6.3)**: pestaña agrupada por persona; seguimiento vencido resaltado en rojo con botón "Recordar" (copia al portapapeles el mensaje de A.7.4). La alerta automática `esperando_vencido` queda para el módulo 1.7 (capa común de notificaciones).
- **Algún día (M6.4)**: con fecha de reaparición opcional (`snoozeUntil`, atajos Hoy/Mañana/Lunes que viene) o sin fecha; al llegar la fecha, la tarea vuelve a contar como pendiente de procesar en la Bandeja. "Guardar como idea" usa una etiqueta `Idea` (Tag existente) como tratamiento temporal hasta que exista el Cuaderno de bitácora (módulo 1.8).
- **Bandeja como página propia** (`/bandeja`): las 3 pestañas + sección "Organizadas, sin fecha" (tareas ya procesadas sin fecha — miniproyecto con su primera subtarea, o "Crear tarea" con "Sin fecha todavía") + botón Procesar. Entrada "Bandeja (N)" en el menú, con N = solo lo realmente pendiente de procesar. En Semana y Hoy, línea compacta con enlace en vez del bloque completo. Evento en Calendar reutiliza `createCalendarEvent` ya existente.
- **Fecha real en vez de día de la semana**: "Crear tarea" del asistente y el botón único "Asignar fecha" en las tarjetas de Bandeja (sustituye a los antiguos "Mover a esta semana" y "Asignar día", que estaban duplicados) usan selector de fecha real + atajos Hoy/Mañana/Lunes que viene, para cualquier fecha futura — no solo la semana en curso. La semana destino se crea sola si no existe (`getOrCreateWeek`, ya existente).
- **Campo nuevo de intención** `markProcessed` en el PATCH de tareas (el backend sigue siendo quien calcula `processedAt`), para los dos casos que no encajaban en las reglas ya existentes de "sale de la Bandeja sin procesar": miniproyecto que recibe su primera subtarea, y "Crear tarea" sin fecha.
- **Bugs encontrados en producción y corregidos antes de cerrar el módulo**:
  - El recuento de "procesadas" del backfill (módulo 1.2) no filtraba por `kind = 'BACKLOG'` y contaba también tareas de fuera de la Bandeja — corregido y separado en 4 recuentos antes de aplicar nada.
  - `isPendingProcess` combinaba con un único `&&` dos casos alternativos ("activa sin procesar" y "Algún día reaparecida", que exige `gtdStatus = ALGUN_DIA`, incompatible con exigir `ACTIVA` a la vez): la reaparición nunca contaba, dejando esas tareas invisibles en cualquier pestaña. Ahora son dos casos alternativos, con test de regresión.
  - El contador "Bandeja (N)" del menú (calculado en el servidor) y la lista de tareas de la pantalla actual no se enteraban de las capturas hechas con la captura rápida hasta recargar — corregido con `router.refresh()` para el contador y un `InboxCaptureContext` (mismo patrón que los toasts) para que la lista se actualice al instante.
- Verificado en cada entrega: `tsc --noEmit`, `eslint`, `vitest run` (18/18 al cierre, incluye `src/lib/reschedule.test.ts` e `src/lib/inbox.test.ts`) y `next build` limpios; scripts de verificación contra Postgres local para cada pieza de lógica nueva (descartados tras verificar, no forman parte del repo).

### Módulo 1.4 · Las 3 del día + Carga (M4.1-M4.2)

**Completado y confirmado por el Product Owner, en producción.**

- **Las 3 del día (M4.1)**: se reutiliza `isTop3` tal cual (ya existía). Sección propia sobre la parrilla del día con estado vacío ("¿Qué 3 cosas harían que hoy fuera un buen día?") cuando no hay ninguna marcada. Al intentar marcar una 4ª con las 3 ya ocupadas, selector "Las 3 del día son 3. ¿Cuál cambias?" (`Top3SwapModal`) con las 3 actuales para sustituir en un solo paso (dos PATCH encadenados, sin recarga); cancelar deja todo igual.
- **Carga (M4.2)**: barra de capacidad diaria reutilizando `dailyCapacityMinutes` (ya existía) y nuevo ajuste **"Margen para imprevistos"** en Ajustes (slider 0-40%, por defecto 20%). `Capacidad = dailyCapacityMinutes × (1 − margen)`; `Carga = Σ duración estimada de las tareas del día (hechas y pendientes), excluyendo Esperando y Algún día ÷ Capacidad`. Colores: verde ≤85%, ámbar 86-100%, rojo >100% (reutilizando tokens de color ya existentes). Tareas sin duración estimada cuentan 30 min por defecto, con aviso de cuántas hay. Tooltip con el desglose (capacidad, margen aplicado, planificado, libre). Barra semanal agregada (lunes a viernes, tal como ya se había decidido en Fase 0) con el mismo componente `CapacityBar`, sin barra nueva.
- Lógica de negocio extraída a funciones puras y testeadas: `src/lib/capacity.ts` (`summarizeLoad`, `effectiveCapacity`, `loadColor`, `isCountedInLoad`).
- **Deliberadamente fuera de esta entrega** (acordado con el Product Owner): franjas del día ("mañana/tarde/noche"), para más adelante; "Disponible" leyendo Google Calendar, aplazado a la Fase 2 con Tu perfil (el scope `calendar.events` ya permite leerlo cuando toque); factor de estimación, se queda en 1,0.
- **Bugs encontrados en producción y corregidos antes de cerrar el módulo**:
  - Al marcar/desmarcar una estrella, la tarea podía aparecer y desaparecer sola sin F5 ("parpadeo"). Dos causas combinadas: `handleToggleTop3` no protegía contra un segundo clic mientras el PATCH anterior seguía en curso (dos toggles consecutivos se cancelaban entre sí sin ningún error visible); y el `<div draggable>` que envuelve cada tarjeta podía interpretar un pequeño movimiento del puntero sobre la estrella como inicio de arrastre nativo, perdiendo el clic. Corregido con un guard por tarea (`pendingTop3`, con el botón desactivado mientras su PATCH está en curso) y cancelando el `dragstart` cuando el gesto empieza sobre un control interactivo (`e.preventDefault()`).
  - Al marcar una 4ª estrella, el selector de sustitución se abría correctamente (sin tocar el servidor: confirmado que ningún camino, cliente o servidor, desmarca las 3 tareas existentes) pero un segundo clic pegado al primero (doble clic accidental, hábito que dejó el bug anterior) caía sobre el fondo del propio modal —a pantalla completa— y lo cerraba al instante: un flash oscuro tapando "Las 3 del día" que daba la sensación de que desaparecían sin selector. Corregido ignorando el cierre por clic en el fondo durante 250ms tras abrirse (`shouldIgnoreBackdropClick`, función pura con test de regresión).
- Verificado en cada entrega: `tsc --noEmit`, `eslint`, `vitest run` (33/33 al cierre, incluye `src/lib/capacity.test.ts` y `src/lib/top3-swap-modal.test.ts`) y `next build` limpios.

## Fase 2 · Beta: dirección, foco y aprendizaje

_(sin empezar todavía)_

## Fase 3 · Post-Beta: autoconocimiento y bienestar

_(sin empezar todavía)_

## Fase 4 · Asistente IA

_(sin empezar todavía)_
