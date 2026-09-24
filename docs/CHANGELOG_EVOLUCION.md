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

_(en curso)_

## Fase 2 · Beta: dirección, foco y aprendizaje

_(sin empezar todavía)_

## Fase 3 · Post-Beta: autoconocimiento y bienestar

_(sin empezar todavía)_

## Fase 4 · Asistente IA

_(sin empezar todavía)_
