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

- `Task.kind: DAY_AREA | PRIORITY_ACTION | CALL | BACKLOG` decide *dónde vive* la tarea (día+área, prioritaria de la semana, llamada, o bandeja/backlog sin asignar). Es el eje que el documento llamaría de "contenedor"; es ortogonal al `gtdStatus` que pide el documento (activa/esperando/algún_dia), que describe *en qué estado GTD* está. `BACKLOG` hoy hace doble función: bandeja de entrada sin triar y backlog general — esto necesita una decisión de diseño en el módulo 1.3 (ver §8).
- `Task.order` se puntúa por `(dayId, areaId)`; ya existe reordenado automático por hora y manual por arrastre.
- `Task.durationMinutes` (estimado, pasos de 15') y `Task.executedMinutes` (ejecutado real, acumulado) ya existen — cubren `actualMinutes` del documento, ver mapeo §8.
- `Task.isTop3` (booleano, por día) ya cubre `isTopThree` del documento casi 1:1.
- `Task.quadrant` (Eisenhower), `assignedTo`, `tags` (M2M vía `Tag`), `description`, `parentTaskId`/`subtasks` (miniproyectos) ya existen.
- `Habit.active: boolean` es el único campo de estado; no hay noción de experimento/rutina.
- `Project.areaId` obligatorio (`onDelete: Restrict`); no hay campo de tipo (Valor/Soporte/Relleno) a nivel Área que pide el documento en 2.6.
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
- Un único uso hoy: crear evento 1:1 desde una tarea (`createCalendarEvent`). No hay lectura/sincronización bidireccional de eventos.
- **Implicación para el documento**: el principio "la agenda solo contiene compromisos fijos" (módulo GTD) es compatible sin cambios de scope; leer el calendario para detectar huecos (si se quisiera en fases futuras) necesitaría un scope adicional de solo lectura y un segundo consentimiento.

### 5.2 Todoist
- OAuth2 completo (`connect` → `callback` → token en `IntegrationToken`), import/export unidireccional de tareas, mapeo de prioridades 1↔4.
- Los campos nuevos del documento (contexto, energía, `gtdStatus`, etc.) **no se exportan** a Todoist en v1, tal y como exige la sección 13 de requisitos no funcionales — no requiere cambio de código, es una omisión deliberada a respetar.

### 5.3 Riesgo de nombres
El documento define su propia entidad `FocusSession` para la **Guardia de foco** (bloque de 120 min). Nortvira ya tiene un modelo `FocusSession` (sesiones Pomodoro, con `taskId`, `minutes`, `startedAt`). Son conceptos distintos con el mismo nombre. Propuesta: la Guardia de foco (Fase 2, M5.2) se modela como un modo/duración distinta sobre el `FocusSession` **existente** en vez de crear una segunda tabla — añadiría `singleAction`, `plannedMinutes`, `breakTaken`, `interruptionsCaptured`, `focusRating` como campos opcionales del `FocusSession` actual. Evita el choque de nombres y reutiliza el registro de tiempo ya construido. Se confirmará como pregunta concreta al llegar al módulo M5.2.

## 6. Sistema de notificaciones

- **Push**: `web-push` con claves VAPID, suscripción por navegador en `PushSubscription`, Service Worker propio (`public/sw.js`) que muestra la notificación y enruta el click a una URL.
- **Programación en servidor**: `vercel.json` ya define dos crons diarios (`/api/cron/weekly-reminder?slot=MORNING|EVENING`, 08:00 y 18:00 UTC) protegidos por `CRON_SECRET`. **Esto responde directamente a la pregunta abierta 15.2 del documento** ("¿la persistencia actual permite tareas programadas (cron) para alertas y avisos?"): **sí**, Vercel Cron está disponible y ya en uso; no bloquea M7.2. El límite práctico es el de la capa Hobby de Vercel (crons con granularidad mínima diaria en el plan gratuito — para avisos con otra cadencia habría que evaluar llamarlos al abrir la app, como ya prevé la mitigación de riesgos del documento).
- Hoy solo hay un tipo de aviso (recordatorio semanal, configurable por usuario en día+franja). El "tope de 3 avisos/día y silencio fuera de horario" de la sección 15.1 no existe todavía como mecanismo genérico — habrá que construirlo como capa común antes de M7 (Alertas de rumbo) para no duplicar lógica de límite/horario en cada tipo de aviso.

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
| `gtdStatus` | No existe (ortogonal a `kind`) | Nuevo — Fase 1, M1.3. Decisión pendiente: qué pasa con `kind=BACKLOG` al introducir `gtdStatus='algun_dia'` (ver §3) |
| `waitingOn` / `followUpDate` | No existen | Nuevos — Fase 1, M1.3 |
| `snoozeUntil` | No existe | Nuevo — Fase 1, M1.3 |
| `rescheduleCount` | No existe | Nuevo — necesita regla de incremento en el PATCH de tareas (§8.3 del documento) |
| `startedAt` | No existe (no hay estado "en curso") | Nuevo — Fase 2/3, ligado a Guardia de foco |
| `actualMinutes` | **Ya existe** como `executedMinutes` | Reutilizar el campo existente, no duplicar |
| `stuckReason` | No existe | Nuevo — Fase 2/3, + enum `StuckReason` (no definido en el documento leído; pendiente de detalle en M6.6) |
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

Ninguna existe hoy. Todas son tablas nuevas: `North`, `MonthlyGoal`, `WeeklyVoyage`, `ReflectionMoment`, `LogbookEntry`, `DailyLog`, `Interruption`, `Experiment` + `ExperimentEntry`, `UserProfile`, `NavigationCheck`, `RouteAlert`, `Routine`. La única que choca de nombre con algo existente es `FocusSession` (Guardia de foco) — ver §5.3. `DailyLog` solapa conceptualmente con `Day` (que ya tiene `journalNote`/`starRating`): valorar si `DailyLog` es una tabla nueva o una ampliación de `Day` cuando se aborde M2.

## 10. Propuesta de feature flags

Decisión del Product Owner: **sin infraestructura de flags por usuario**. Nortvira es hoy de uso individual; cada módulo se activa en producción en cuanto está terminado y verificado, igual que el resto de funciones ya construidas (Pomodoro, Matriz, Real vs. Estimado…). Si en el futuro hay Beta con varios usuarios, se puede añadir entonces una tabla simple `userId + featureKey + enabled` sin tocar el resto del diseño.

## 11. Riesgos técnicos

| Riesgo | Mitigación propuesta |
|---|---|
| Colisión de nombre `FocusSession` (Pomodoro existente vs. Guardia de foco del documento) | Unificar en una sola tabla con campos opcionales (§5.3), decidir al llegar a M5.2 |
| `gtdStatus` nuevo vs. `kind=BACKLOG` existente (doble función bandeja/backlog) | Diseño explícito en M1.3 antes de tocar el modelo; probablemente `gtdStatus` se vuelve el eje real de "algún día"/"esperando" y `kind` sigue describiendo solo dónde vive la tarea en la semana |
| Retrofit completo de i18n (~40 componentes con texto embebido) sin tests de UI automatizados | Migrar módulo a módulo (empezando por lo que ya se vaya a tocar en M1.1), verificar visualmente cada pantalla tras el cambio, no todo en un solo commit gigante |
| Límite de crons en Vercel Hobby (granularidad diaria) si M7 necesita avisos más frecuentes | Calcular alertas al abrir la app como alternativa (ya previsto en la mitigación del propio documento) |
| Nortes/Planes de navegación añaden una jerarquía más (Norte → Objetivo mensual → Viaje semanal → Área/Proyecto → Tarea) sobre un modelo que ya tiene 4 niveles (Área → Proyecto → Miniproyecto → Subtarea) | Dejar claro en la UI que Norte es opcional y no bloquea el uso de Áreas/Proyectos sin Norte asignado (el documento ya lo plantea como capa "por encima", no sustitutiva) |
| Capa gratuita de Neon/Vercel con más tablas y consultas (Nortes, Experimentos, Logbook, NavigationCheck…) | Vigilar tamaño de BD y nº de invocaciones; ninguna de las tablas nuevas es de alto volumen para un solo usuario |

## 12. Conclusión

El modelo actual cubre una parte no trivial de la Fase 1 del documento sin necesidad de nada nuevo: `isTop3`, `executedMinutes`, `dailyCapacityMinutes`, el cierre del día, el Pomodoro con registro de tiempo y el panel Real vs. Estimado ya construidos este mismo trimestre encajan casi directamente con Las 3 del día, `actualMinutes`, Carga del día y parte de las métricas de la sección 10. El trabajo real de la Fase 1 es: (1) el retrofit de textos + renombrado a glosario (M1.1), (2) los campos GTD nuevos de Task (M1.2), y (3) los tres flujos guiados nuevos (bandeja GTD, Arranque del día, Filtro de imprevistos) que no tienen hoy equivalente.

**Pendiente de validación del Product Owner antes de empezar el módulo 1.1.**
