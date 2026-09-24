# Nortvira — Auditoría técnica (Fase 0)

Entregable de la Fase 0 · Reconocimiento del documento *Nortvira — Especificación de Evolución de Producto v1.0*. Mapea el estado real del repositorio contra el modelo conceptual de la sección 8 y responde a los requisitos de la sección 12 (stack, carpetas, modelo de datos, asistente semanal, integraciones, notificaciones, estado, migraciones, mapeo campo a campo, feature flags, riesgos).

## 1. Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 15 (App Router), React 18, TypeScript |
| Estilos | Tailwind CSS, tema claro/oscuro vía `data-theme` + `prefers-color-scheme` |
| Datos | PostgreSQL (Neon en producción, Postgres local en desarrollo) vía Prisma ORM 5 |
| Auth | Auth.js (`next-auth` 5 beta) con provider Google, adapter Prisma, sesión JWT, allowlist de emails (`ALLOWED_EMAILS`) |
| Gráficos | Recharts (usado en Dashboard y en el nuevo panel Real vs. Estimado) |
| Recurrencia | `rrule` |
| Notificaciones push | `web-push` (VAPID) + Service Worker propio (`public/sw.js`) |
| Cron | Vercel Cron (`vercel.json`) — **confirma que sí hay tareas programadas en servidor**, ver §6 |
| Errores | Sentry (`@sentry/nextjs`) |
| Despliegue | Vercel Hobby + Neon (capa gratuita) |
| Validación | Zod en todas las rutas API |

## 2. Estructura de carpetas

```
src/
  app/                    rutas (App Router): páginas + api/*
  components/             componentes cliente y servidor, incl. components/settings/*
  lib/                     lógica de dominio, integraciones y utilidades
  types/                   tipos derivados de Prisma + helpers de UI (colores, formato)
  auth.ts, auth.config.ts, middleware.ts
prisma/
  schema.prisma
  migrations/              una carpeta por migración, todas additive hasta ahora
public/
  sw.js, manifest.json, iconos (PWA instalable)
```

No existe carpeta `docs/` previa (se crea con esta auditoría) ni capa de `i18n/` (ver §7).

## 3. Modelo de datos real (resumen)

Entidades actuales relevantes (`prisma/schema.prisma`): `User`, `Account`/`Session`/`VerificationToken` (Auth.js), `Area`, `Week`, `Day`, `Task`, `Tag`, `FocusSession` (sesiones Pomodoro, **no confundir** con el `FocusSession` de la Guardia de foco del documento — ver §5.2 riesgo de nombres), `Habit`, `HabitCompletion`, `Project`, `ProjectCollaborator`, `WeekProjectFocus`, `RecurringTaskTemplate`, `ActivityLog`, `IntegrationToken`, `PushSubscription`.

Puntos clave del modelo actual:

- `Task.kind: DAY_AREA | PRIORITY_ACTION | CALL | BACKLOG` decide *dónde vive* la tarea. **Decidido**: `kind` sigue siendo solo eso; la Bandeja pasa a ser un concepto independiente marcado por un nuevo campo `Task.processedAt` (`null` = todavía en la Bandeja, sin procesar). Al procesar, la tarea recibe su `gtdStatus` (`activa` / `esperando` / `algun_dia`). Una tarea `BACKLOG` con `processedAt` ya puesto (pendiente sin fecha, ya procesada) **no** es Bandeja. Migración de los `BACKLOG` actuales pendiente de propuesta concreta en el módulo que toque `Task` (1.2/1.3).
- `Task.order` se puntúa por `(dayId, areaId)`; ya existe reordenado automático por hora y manual por arrastre.
- `Task.durationMinutes` (estimado, pasos de 15') y `Task.executedMinutes` (ejecutado real, acumulado) ya existen — cubren `actualMinutes` del documento, ver mapeo §8.
- `Task.isTop3` (booleano, por día) ya cubre `isTopThree` del documento casi 1:1.
- `Task.quadrant` (Eisenhower), `assignedTo`, `tags` (M2M vía `Tag`), `description`, `parentTaskId`/`subtasks` (miniproyectos) ya existen.
- `Habit.active: boolean` es el único campo de estado; no hay noción de experimento/rutina.
- `Project.areaId` obligatorio (`onDelete: Restrict`). **Corrección**: el tipo Trabajo/Personal que pide el documento (M11.2) es un campo nuevo de `Area`, no de `Task`; `workType` (Valor/Soporte/Relleno) sí es de `Task`, ya recogido en la tabla de §9.1.
- `Week` guarda estado, mood, objetivos y evaluación de la semana (`objective1-3`, `evalNextWeekFocus`, `evalPostponed`, `evalToImprove`, `evalDelegate` + arrays de ids relacionados) — es el sustrato de lo que hoy es el asistente de planificación semanal.
- `Day.journalNote` + `Day.starRating` son el cierre del día actual.
- `User.dailyCapacityMinutes` es el presupuesto de capacidad diaria (Carga del día ya implementada parcialmente).

## 4. Flujo del "asistente de planificación semanal" actual

`PlanningWizard.tsx` (modal de 5 pasos: *Cómo llegas* → *Objetivos* → *Proyectos en foco* → *Acciones y llamadas* → *Bandeja de entrada*) es el candidato directo a convertirse en **Momento de reflexión** (glosario, mapeo explícito en la sección 7 del documento). Hoy:

- No tiene fases explícitas "haz limpieza / ponte al día / sé creativo" — la estructura actual es plana, un paso detrás de otro.
- No calcula el Índice de alineación, % Valor ni Carga (esas métricas no existen todavía).
- `DayCloseRitual.tsx` (cierre del día: tareas hechas/pendientes, replanificar pendientes, nota de diario, fijar primera tarea de mañana) ya es una base muy cercana al **Cierre del día** del documento (M2); solo le faltan `dayGoal` explícito y el `overloadAccepted` de la Balanza.
- No existe un "Arranque del día" (tarjeta matinal de 60s con energía + primera tarea) — es nuevo.

## 5. Integraciones

### 5.1 Google Calendar
- Scope pedido en el login: `openid email profile https://www.googleapis.com/auth/calendar.events` (consentimiento único, `access_type=offline`, `prompt=consent`).
- Token guardado en `Account` (adapter de Auth.js), refresco automático en `lib/google-calendar.ts::getValidGoogleAccessToken`.
- Un único uso hoy: crear evento 1:1 desde una tarea (`createCalendarEvent`). No hay lectura/sincronización bidireccional de eventos implementada todavía.
- **Corrección**: `calendar.events` (sin `.readonly`) es el scope de lectura+escritura de eventos de la API de Calendar — ya incluye `events.list`/`events.get`, no solo `events.insert`. No hace falta un scope adicional ni un segundo consentimiento para leer eventos y detectar huecos en fases futuras; solo falta escribir el código que llame a `events.list`. (Confirmable también en Google Cloud Console → pantalla de consentimiento OAuth → scopes configurados, o en la página de permisos de terceros de la cuenta Google del usuario.)

### 5.2 Todoist
- OAuth2 completo (`connect` → `callback` → token en `IntegrationToken`), import/export unidireccional de tareas, mapeo de prioridades 1↔4.
- Los campos nuevos del documento (contexto, energía, `gtdStatus`, etc.) **no se exportan** a Todoist en v1, tal y como exige la sección 13 de requisitos no funcionales — no requiere cambio de código, es una omisión deliberada a respetar.

### 5.3 `FocusSession` — decidido
El documento define su propia entidad `FocusSession` para la **Guardia de foco** (bloque de 120 min); Nortvira ya tiene una tabla `FocusSession` (sesiones Pomodoro). **Decisión aprobada**: una sola tabla, con un campo `mode: POMODORO | GUARDIA` y los campos opcionales de la Guardia (`singleAction`, `plannedMinutes`, `breakTaken`, `interruptionsCaptured`, `focusRating`, `calendarEventId`) nulos para las filas `POMODORO`. Se implementa al llegar al módulo M5.2 (Fase 2); no requiere cambios en Fase 1.

## 6. Sistema de notificaciones

- **Push**: `web-push` con claves VAPID, suscripción por navegador en `PushSubscription`, Service Worker propio (`public/sw.js`) que muestra la notificación y enruta el click a una URL.
- **Programación en servidor**: `vercel.json` ya define dos crons diarios (`/api/cron/weekly-reminder?slot=MORNING|EVENING`, 08:00 y 18:00 UTC) protegidos por `CRON_SECRET`. **Esto responde directamente a la pregunta abierta 15.2 del documento** ("¿la persistencia actual permite tareas programadas (cron) para alertas y avisos?"): **sí**, Vercel Cron está disponible y ya en uso; no bloquea M7.2. El límite práctico es el de la capa Hobby de Vercel (crons con granularidad mínima diaria en el plan gratuito — para avisos con otra cadencia habría que evaluar llamarlos al abrir la app, como ya prevé la mitigación de riesgos del documento).
- Hoy solo hay un tipo de aviso (recordatorio semanal, configurable por usuario en día+franja). El "tope de 3 avisos/día y silencio fuera de horario" de la sección 15.1 no existe todavía como mecanismo genérico.
- **Decidido**: esta capa común de avisos (tope 3/día, prioridad Guardia > Cierre > Arranque > resto, silencio fuera de horario) es la **primera pieza técnica de la Fase 1**, antes de construir ningún aviso nuevo. Para avisos a horas concretas (Arranque, Cierre, Guardia), evaluar un *workflow* programado de GitHub Actions (`schedule:` cada 15-30 min) que llame a un endpoint propio protegido por `CRON_SECRET` — evita el límite de granularidad diaria de los crons de Vercel Hobby sin coste adicional, ya que GitHub Actions en un repo con el plan gratuito da minutos de sobra para un `curl` cada 15 min. Si no resulta viable (límites de Actions, fiabilidad), la alternativa ya prevista es calcular el aviso al abrir la app.

## 7. Gestión de estado

No hay store global (ni Redux ni Zustand ni Context de datos): cada página server component carga los datos iniciales (`getWeekPageData`, `getTodayPendingTasks`, `getTimeReport`, etc.) y los pasa a un client component que mantiene su propio `useState`, actualiza de forma optimista y hace rollback si la petición falla (patrón usado de forma consistente en `PlanWeekClient`, `HerramientasMatrizClient`, `PomodoroTimer`, `TaskCard`). Las nuevas entidades (Norte, Plan de navegación, Experimentos…) deberían seguir el mismo patrón: carga server-side + estado local optimista, sin introducir una librería de estado global nueva.

## 8. Estrategia de migraciones

Migraciones additive, generadas con `npx prisma migrate diff --from-url … --to-schema-datamodel prisma/schema.prisma --script` (más fiable que escribir a mano las convenciones de M2M/índices implícitas de Prisma), aplicadas con `migrate deploy` + `generate`, y verificadas con un script Node puntual contra Postgres local antes de dar cada cambio por bueno. Mismo patrón se aplicará a las entidades nuevas de la sección 8. Todas las migraciones hasta ahora son reversibles en el sentido de "solo añaden" (columnas con default, tablas nuevas) — ninguna ha tocado ni renombrado una columna existente.

## 9. Mapeo campo a campo con la sección 8 del documento

### 9.1 `Task` (ampliación 8.1)

| Campo del documento | Estado en Nortvira | Acción |
|---|---|---|
| `isPriority` | No existe (distinto de `isTop3`) | Nuevo — Fase 1, M1.6 (Acción prioritaria) |
| `isTopThree` | **Ya existe** como `isTop3` | Reutilizar, sin renombrar el campo en BD (solo el texto de UI a "Las 3 del día" si el glosario lo pide) |
| `northId` | No existe | Nuevo — Fase 2, requiere `North` primero |
| `voyageId` | No existe | Nuevo — Fase 2, requiere `WeeklyVoyage` primero |
| `workType` | No existe | Nuevo — Fase 2, M2.6 |
| `energy` | No existe | Nuevo — Fase 2, M2.7 |
| `context` | No existe | Nuevo — Fase 1, M1.3 |
| `firstStep` | No existe | Nuevo — Fase 1, M1.6 |
| `gtdStatus` | No existe (ortogonal a `kind`) | Nuevo — Fase 1, M1.3. **Decidido**: `kind` no cambia de significado; se añade `gtdStatus` como eje independiente |
| `processedAt` | No existe | **Nuevo, decidido**: `null` = en Bandeja sin procesar; con fecha = ya procesada (tenga o no `gtdStatus` de tipo pendiente-sin-fecha). Sustituye a usar `kind=BACKLOG` como proxy de "Bandeja" |
| `waitingOn` / `followUpDate` | No existen | Nuevos — Fase 1, M1.3 |
| `snoozeUntil` | No existe | Nuevo — Fase 1, M1.3 |
| `rescheduleCount` | No existe | Nuevo — necesita regla de incremento en el PATCH de tareas (§8.3 del documento) |
| `startedAt` | No existe (no hay estado "en curso") | Nuevo — Fase 2/3, ligado a Guardia de foco |
| `actualMinutes` | **Ya existe** como `executedMinutes` | Reutilizar tal cual, campo y comportamiento — solo cambia el texto de UI si el glosario lo pide |
| `stuckReason` | No existe | Nuevo — Fase 2/3. **Corrección**: sí está definido en M7.3, enum de 6 valores: `objetivo_confuso`, `no_se_empezar`, `demasiado_grande`, `depende_de_otro`, `sin_sentido`, `se_cuela_otra` |
| `origin` | No existe | Nuevo — Fase 2/3 |

### 9.2 `Habit` (ampliación 8.1)

| Campo | Estado | Acción |
|---|---|---|
| `status` | Solo `active: boolean` | Nuevo enum — Fase 2, M8 |
| `trigger` | No existe | Nuevo |
| `experimentId` | No existe | Nuevo, requiere `Experiment` |
| `routineId` | No existe | Nuevo, requiere `Routine` (Fase 3) |

### 9.3 `Project` — `northId` no existe, nuevo en Fase 2.

### 9.4 Entidades nuevas (8.2)

Tablas nuevas: `North`, `MonthlyGoal`, `WeeklyVoyage`, `ReflectionMoment`, `LogbookEntry`, `Interruption`, `Experiment` + `ExperimentEntry`, `UserProfile`, `NavigationCheck`, `RouteAlert`, `Routine`. Dos excepciones **decididas**, no se crean como tabla nueva:

- **`FocusSession`** (Guardia de foco) → se fusiona con el `FocusSession` existente (Pomodoro) + campo `mode`, ver §5.3.
- **`DailyLog`** (Arranque + Cierre del día) → se fusiona en el `Day` existente en vez de crear tabla aparte, ver §9.5.

### 9.5 `Day` (ampliación, sustituye a `DailyLog` del documento)

`Day` ya tiene `journalNote` y `starRating`. **Decidido**: ampliar `Day` con los campos de `DailyLog` en vez de crear una tabla nueva.

| Campo de `DailyLog` (documento) | Acción sobre `Day` |
|---|---|
| `energy` (1-5, Arranque) | Nuevo campo `energy` |
| `mood` (1-5) | Nuevo campo `mood` |
| `dayGoal` | Nuevo campo `dayGoal` |
| `firstTaskId` | Nuevo campo `firstTaskId` (fijada en el Cierre anterior) |
| `closeChecks` | Nuevo campo `closeChecks` (JSON) |
| `overloadAccepted` | Nuevo campo `overloadAccepted` (Balanza) |
| `closedAt` | Redundante con marcar el cierre hecho; valorar si hace falta o basta con que `closeChecks` no esté vacío |
| `date` | Ya cubierto: `Day` se identifica por `weekId` + `dayOfWeek` |

## 10. Propuesta de feature flags

Decisión del Product Owner: **sin infraestructura de flags por usuario**. Nortvira es hoy de uso individual; cada módulo se activa en producción en cuanto está terminado y verificado, igual que el resto de funciones ya construidas (Pomodoro, Matriz, Real vs. Estimado…). Si en el futuro hay Beta con varios usuarios, se puede añadir entonces una tabla simple `userId + featureKey + enabled` sin tocar el resto del diseño.

## 11. Riesgos técnicos

| Riesgo | Mitigación propuesta |
|---|---|
| Colisión de nombre `FocusSession` (Pomodoro existente vs. Guardia de foco del documento) | **Resuelto** — tabla única con campo `mode`, ver §5.3 |
| `gtdStatus` nuevo vs. `kind=BACKLOG` existente (doble función bandeja/backlog) | **Resuelto** — `Task.processedAt` separa la Bandeja de `kind`/`gtdStatus`, ver §3 y §9.1 |
| Retrofit completo de i18n (~40 componentes con texto embebido), decidido hacerlo entero antes de seguir con módulos nuevos, sin tests de UI automatizados | Un solo commit de solo-texto (sin lógica), verificación visual pantalla por pantalla antes de dar el módulo 1.1 por cerrado |
| Límite de crons en Vercel Hobby (granularidad diaria) si M7 necesita avisos más frecuentes | Calcular alertas al abrir la app como alternativa (ya previsto en la mitigación del propio documento) |
| Nortes/Planes de navegación añaden una jerarquía más (Norte → Objetivo mensual → Viaje semanal → Área/Proyecto → Tarea) sobre un modelo que ya tiene 4 niveles (Área → Proyecto → Miniproyecto → Subtarea) | Dejar claro en la UI que Norte es opcional y no bloquea el uso de Áreas/Proyectos sin Norte asignado (el documento ya lo plantea como capa "por encima", no sustitutiva) |
| Capa gratuita de Neon/Vercel con más tablas y consultas (Nortes, Experimentos, Logbook, NavigationCheck…) | Vigilar tamaño de BD y nº de invocaciones; ninguna de las tablas nuevas es de alto volumen para un solo usuario |

## 12. Decisiones del Product Owner (cierran la sección 15.2 del documento)

| Pregunta abierta (15.2) | Decisión |
|---|---|
| ¿Se validan los términos (P) del glosario tal cual? | Sí, se aplican tal cual |
| ¿Horario distinto por día o uno común? | Horario común L-V |
| ¿66 días / 80 % es el criterio de hábito consolidado? | Sí, 66 días con ≥ 80 % |
| ¿Registro de tiempo real activo por defecto al completar? | No, desactivado por defecto — la Guardia de foco y el Pomodoro ya registran tiempo por su cuenta |

## 13. Conclusión

El modelo actual cubre una parte no trivial de la Fase 1 del documento sin necesidad de nada nuevo: `isTop3`, `executedMinutes`, `dailyCapacityMinutes`, el cierre del día, el Pomodoro con registro de tiempo y el panel Real vs. Estimado ya construidos este mismo trimestre encajan casi directamente con Las 3 del día, `actualMinutes`, Carga del día y parte de las métricas de la sección 10. El trabajo real de la Fase 1 es: (1) el retrofit de textos + renombrado a glosario (M1.1), (2) los campos GTD nuevos de Task (M1.2), y (3) los tres flujos guiados nuevos (bandeja GTD, Arranque del día, Filtro de imprevistos) que no tienen hoy equivalente.

**Auditoría validada por el Product Owner. Módulo 1.1 en marcha.**
