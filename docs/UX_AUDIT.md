# Nortvira — Auditoría de usabilidad

Rama `ux-audit` · 29-09-2026 · Solo análisis: no se ha tocado código de la app.

**Principio rector:** la usabilidad manda y el diseño está a su servicio. Toda propuesta se mide en tres ejes: **menos clics, menos tiempo de reacción, menos peso visual**.

**Fuentes y jerarquía aplicada** (según `CLAUDE.md`):
1. `DESIGN.md` y la skill `nortvira-design`: criterio principal (checklist §10, principios §5, vocabulario §6).
2. `frontend-design`: dirección visual general.
3. `impeccable` (`distill`, `audit`), `emil-design-eng`: solo asesoras.

> **Conflictos resueltos:**
> - `impeccable/distill` recomienda "quitar barras laterales". Gana la petición explícita de producto y `DESIGN.md` §4 (dos columnas). Los paneles *flotan* sobre el contenido y no crean una tercera columna.
> - `design-taste-frontend` empuja hacia estéticas llamativas. Gana `DESIGN.md`: "todo lo demás es silencioso".

**Método.** La medición sale de leer el código (`NavBar`, `PlanWeekClient`, `DayCard`, `AreaColumn`, `TaskCard`, `QuickCapture`, `DayCloseRitual`, `InboxList`, `PomodoroTimer`, etc.), no de sesiones con usuarios. Los desplazamientos se cuentan en pantallas de portátil (≈ 900 px de alto útil) con una semana tipo: 3 áreas, 4 tareas por área y día laborable, 5 hábitos. Son estimaciones y conviene validarlas con Playwright cuando haya datos de prueba.

---

## 0. Diagnóstico en una frase

Nortvira ya tiene las piezas GTD correctas (captura global con `N`, procesado pregunta a pregunta, límite de 3 del día, Cierre con decisiones en un toque). El problema es de **arquitectura y densidad**. Semana ocupa unas 5 pantallas y deja al final lo que menos cambia (objetivos, hábitos). Hoy repite la misma tarea hasta tres veces y reúne 6 u 8 controles en la cabecera. Y el temporizador y mover de día, dos de las acciones más frecuentes, quedan a 5 o 6 clics o fuera de la pantalla.

Además, **el sistema visual de `DESIGN.md` todavía no está aplicado**. El acento es índigo `#4f46e5` (no `--faro`), la fuente es la del sistema (no Atkinson Hyperlegible), las tareas son tarjetas con borde y hay emojis en botones. Esto se trata como deuda aparte, en el problema G2 de la sección 4.

---

## 1. Medición actual y objetivo

Leyenda: **C** = clics o toques · **D** = pantallas de desplazamiento · **⌨** = atajo de teclado.

| # | Acción | Vista | Ruta actual | Actual C / D / ⌨ | Objetivo C / D / ⌨ | Cómo se consigue |
|---|---|---|---|---|---|---|
| 1 | **Capturar una tarea** | Cualquiera | Botón `+` flotante → escribir → Intro | **1** / 0 / `N` ✓ | **1** / 0 / `N` | Ya cumple §5.1. Solo se aligera: hoja no modal y sin oscurecer la pantalla, y `+` en `--tinta` (no en acento) para no competir con la Acción prioritaria. |
| 1b | Capturar directamente en un día | Semana | Bajar hasta el día → clic en "+ Añadir" del área → Intro | 1 / 0–4 / — | 1 / 0 / — | Semana compacta (sección 3). |
| 2 | **Completar una tarea** | Hoy | Círculo de 20 px | **1** / 0–1 / — | **1** / 0 / `X` | Quitar lo que empuja la lista (tarjeta de Arranque, duplicados). Objetivo táctil de 44 px. |
| 2b | Completar una tarea | Semana (jueves) | Bajar hasta el jueves → círculo | 1 / **3–4** / — | 1 / 0 / `X` | Semana en rejilla de 5 columnas. |
| 3 | **Mover de día** | Semana, escritorio | Arrastrar con autodesplazamiento entre días apilados | 1 arrastre / **1–4** / — | 1 arrastre / 0 / `M` | Días en columnas: arrastre horizontal corto. |
| 3b | Mover de día | Hoy o móvil | ✏️ → fecha (2) → **hora obligatoria** (2) → "Guardar y cerrar" | **6** / 0–1 / — | **2** / 0 / `M`→`1‑3` | Acción "Mover" en la fila: Mañana · Lunes · Elegir fecha. En móvil, deslizar a la izquierda. ⚠ Error actual, ver H12. |
| 3c | Mover de día | Cierre del día | Botón "[Mañana]" por tarea o "Pasar todas" | 1 ✓ | 1 | Ya cumple §5.4. |
| 4 | **Marcar un hábito** | Hoy | Bajar hasta "Hábitos de hoy" → clic | 1 / **1–2** / — | 2 / 0 / `H` | Panel Hábitos desde la barra lateral o línea compacta "Hábitos 2/5" en Hoy. |
| 4b | Marcar un hábito | Semana | Bajar al final (tras 7 días, listas, proyectos, objetivos) → clic | 1 / **4–5** / — | 2 / 0 / `H` | Panel Hábitos. |
| 4c | Marcar un hábito | Hoy, fin de semana | No se puede: "solo laborables" | ✗ | 2 / 0 / `H` | El panel muestra la semana entera. |
| 5 | **Ver los objetivos de la semana** | Hoy | Ir a Semana (1) → bajar al penúltimo bloque | 1 / **~5** / — | **0** / 0 / `O` | El objetivo nº 1 siempre visible en la cabecera (13 px, `--sonda`). Los tres en el panel Objetivos. |
| 5b | Ver los objetivos de la semana | Semana | Bajar hasta "Objetivos" | 0 / **~5** / — | 0 / 0 / `O` | Ídem. |
| 6 | **Ir a la Bandeja** | Cualquiera | Menú "Bandeja (N)" | **1** ✓ | 1 / 0 / `G B` | Mantener el contador. Añadir atajo. |
| 6b | Procesar la Bandeja | Bandeja | Menú → botón pequeño "Procesar" | 2 | **1** | Si hay pendientes, abrir con "Procesar N" como acción principal visible. |
| 7 | **Iniciar el temporizador** | Hoy | Herramientas → Pomodoro → elegir tarea en desplegable (2) → Iniciar. Además, sales de Hoy | **5** / 0 | **1** / 0 / `F` | Botón "Empezar" en la fila de la Acción prioritaria y "Empezar" en el menú de cada fila, que abren el modo foco con temporizador. Hoy "Empezar" solo resalta la tarea 2 s (H3). |
| 7b | Cronómetro de la tarea | Hoy | ✏️ → bajar dentro del editor → "Registrar" | 2 (oculto) | — | Se unifica con el modo foco. |
| 8 | **Cerrar el día** | Hoy | "🌙 Cerrar el día" → pendientes ("Pasar todas", 1) → primera tarea de mañana (2) → 3 estrellas (3) → "Terminar" → "Cerrar" | **9–10** / 1–2 dentro del modal | **5–6** / 0 / `C` | Cuatro pasos guiados con progreso (§5.5). La primera tarea de mañana entra sola en "Las 3". El cierre final pasa a un aviso "Día cerrado", sin pantalla extra. |
| 8b | Cerrar el día | Semana | No existe: hay que ir a Hoy primero | +1 | 1 / 0 / `C` | Atajo global y botón contextual por la tarde. |

**Suma de un día tipo.** Capturar 5, completar 8, mover 2, 5 hábitos, consultar objetivos 2 veces, Bandeja 1, temporizador 2, cierre 1 (incluye volver a Hoy tras Semana o Pomodoro):

| | Clics | Pantallas de desplazamiento |
|---|---|---|
| Hoy (estimado) | ≈ **58** | ≈ **16** |
| Objetivo | ≈ **32** (−45 %) | ≈ **2** (−85 %) |

Con atajos de teclado, el objetivo baja a menos de 15 clics.

---

## 2. Arquitectura de navegación

### 2.1 Estado actual

El menú superior tiene 7 entradas: Hoy · Semana · Bandeja (N) · Tu espacio · Herramientas ▾ · Dashboard · Ajustes. A la derecha, el tema, el avatar y "Cerrar sesión" siempre visible. En móvil, fila con desplazamiento horizontal en la parte superior. Además:
- **No hay indicador de sección activa**: ningún enlace tiene estilo ni `aria-current`.
- El **pie repite el menú** y el conmutador **Día / Semana** duplica Hoy / Semana.
- **Herramientas** es una página intermedia de 3 tarjetas: un clic más que no aporta.

### 2.2 Propuesta

Criterio: **uso diario → menú principal**, **uso semanal o menor → secundario**. Máximo 4 destinos principales + Capturar.

| Destino | Frecuencia real | Ubicación propuesta | Nota |
|---|---|---|---|
| **Hoy** | Varias veces al día | Principal | Pantalla de inicio. |
| **Semana** | Diaria (planificar, mover) | Principal | |
| **Tareas** (nuevo) | Diaria | Principal | Lista maestra con filtros por contexto, proyecto y estado. Absorbe la **Matriz de Eisenhower** como una vista más ("Lista · Matriz"). |
| **Bandeja (N)** | Diaria | Principal | Contador silencioso (`--sonda`). Solo en `--babor` si supera un umbral que la persona elija. |
| **+ Capturar** | Continua | Siempre visible | `N` en escritorio. |
| Tu espacio → **Plan de navegación** | Mensual | Secundario | Áreas y proyectos. El nombre sale del vocabulario de `DESIGN.md` §6 ("planificación de proyectos y objetivos"). |
| Dashboard + Real vs. Estimado → **Bitácora** | Semanal | Secundario | Los dos son informes. "Dashboard" es un anglicismo fuera del vocabulario. |
| Pomodoro | — | **Desaparece como página** | Pasa a modo foco, lanzado desde la tarea (acción 7). |
| Matriz de Eisenhower | Ocasional | Dentro de **Tareas** | |
| Ajustes, tema, cerrar sesión | Rara | Menú de cuenta (avatar) | "Cerrar sesión" deja de ocupar sitio permanente. |
| Pie con enlaces | — | **Eliminar** | Duplicado. |
| Conmutador Día / Semana | — | **Eliminar** | Duplicado. |
| Rituales (Arrancar, Cerrar el día, Momento de reflexión) | Diaria / semanal | **Fuera del menú**: un único botón contextual en la cabecera | Mañana: "Arrancar el día". Desde las 17:00 (hora configurable): "Cerrar el día". Viernes o domingo: "Momento de reflexión". Nunca más de uno a la vez. |

**Escritorio:** columna izquierda de navegación, como en el boceto de `DESIGN.md` §4 (dos columnas, nunca tres). Tiene 200 px y se pliega a 56 px solo con iconos. Arriba los 4 destinos principales. Abajo, separados, los iconos de paneles (sección 3) y, al final, "Más" (Plan de navegación, Bitácora) y el avatar.
*Alternativa si se quiere conservar el menú superior:* barra superior con 4 destinos + "Más ▾", y la barra de paneles como carril vertical a la derecha.

**Móvil:** barra inferior fija de 5 huecos: **Hoy · Semana · [ + ] · Tareas · Bandeja**. "Más" y cuenta en el avatar de la cabecera.

> ⚠ **Decisión pendiente de vocabulario.** `DESIGN.md` §6 define *Momento de reflexión* = cierre del día y *Viaje semanal* = revisión de la semana. En la app, el botón "✨ Momento de reflexión" abre el asistente **semanal**, y el cierre diario se llama "Cerrar el día". La petición de esta auditoría (la Evaluación semanal irá al Momento de reflexión, módulo 1.8) sigue el uso de la app, no el de `DESIGN.md`. Hay que decidir antes de construir el módulo 1.8. Por jerarquía manda `DESIGN.md`, así que o se renombra el asistente a "Viaje semanal" o se actualiza `DESIGN.md` y su copia en la skill. Lo mismo pasa con la barra inferior móvil de `DESIGN.md` §4 ("Hoy · Viaje · Bitácora · +"): si se aprueba la propuesta de arriba, hay que actualizar `DESIGN.md`.

---

## 3. Barra lateral de iconos con paneles flotantes

### 3.1 Qué sale de la vista Semana

Hoy, la vista Semana apila, además de los 7 días: estado mental y físico, "Acciones prioritarias / No olvidar", "Llamadas", "Proyectos en foco", "Objetivos", el enlace a la Bandeja, los hábitos y la "Evaluación". Son bloques de **presencia continua pero de cambio lento**. Ocupan más de la mitad de la página y empujan los días.

| Panel | Icono (línea, sin emoji) | Atajo | Frecuencia de cambio | Contenido | Acción rápida | Indicador en el icono |
|---|---|---|---|---|---|---|
| **Objetivos de la semana** | diana | `O` | 1 vez por semana | Los 3 objetivos + Norte / Objetivo mensual cuando existan | Editar en línea (guardado automático) | — |
| **Proyectos en foco** | carpeta | `P` | 1 vez por semana | Proyectos marcados, con su siguiente acción | Añadir o quitar, abrir proyecto | nº de proyectos |
| **Hábitos** | casilla | `H` | **Diaria** | Hoy arriba (casillas de 44 px). Debajo, la rejilla L‑D (incluye fin de semana) | Marcar con 1 toque | "2/5" de hoy |
| **Estado** | pulso | `E` | 1 vez por semana (+ energía diaria del Arranque) | Estado mental y físico de la semana, energía de hoy | Escala 1‑5 con texto, sin caras emoji | — |
| **Llamadas** | teléfono | `L` | Varias por semana | Lista semanal de llamadas | Completar, "Pasar a hoy", arrastrar a un día | nº pendientes |
| **No olvidar** (hoy "Acciones prioritarias") | marcador | `A` | Varias por semana | Lista semanal sin fecha | Completar, "Pasar a hoy", arrastrar a un día | nº pendientes |

**Evaluación de la semana:** no va a panel. Sale de Semana y se integra en el Momento de reflexión (módulo 1.8).

**Enlace a la Bandeja:** sale de Semana y de Hoy. Ya lo cubre el contador del menú.

### 3.2 ¿Deben seguir visibles Llamadas y Acciones prioritarias?

**No como bloques fijos. Sí como señal mínima.** Razones:
1. **Choque de vocabulario grave.** "Acciones prioritarias" (lista semanal, puede tener 8 elementos) se confunde con **la** *Acción prioritaria* de `DESIGN.md` (una al día, en magenta). Hay que renombrarla a **"No olvidar"**, que ya es su segundo nombre en la interfaz.
2. Son listas **sin fecha**: su sitio natural en GTD es una lista de contexto, no el plan del día. Cuando llegue el campo `context` (M1.3), Llamadas = contexto "Llamadas" dentro de **Tareas**, y el panel será un acceso directo filtrado.
3. Visibilidad mínima para no olvidarlas: en **Hoy**, una línea de metadatos de 13 px en `--sonda` bajo la lista, "3 llamadas · 2 por no olvidar", que abre el panel. Ningún bloque, ninguna tarjeta.

### 3.3 Comportamiento (escritorio)

- **Carril de iconos** en la columna de navegación (sección 2.2), grupo "Paneles". Botones de 44 × 44 px con `aria-label`, `aria-expanded` y `aria-controls`.
- **Panel flotante** de 360 px anclado junto al carril, **sobre** el contenido y **sin oscurecerlo** (`role="dialog"`, `aria-modal="false"`). Como es no modal, se puede **arrastrar desde el panel a un día** de Semana (Llamadas o No olvidar → jueves).
- **Un solo panel abierto a la vez.** Se cierra con `Esc`, con el mismo icono o con un clic fuera. El foco vuelve al icono.
- Recuerda el último panel abierto por navegador (`localStorage`, con `try/catch`).
- Enlace directo opcional: `?panel=habitos`.
- **Estilo:** fondo `--agua`, borde de 1 px `--linea`, radio 12 px, **sin sombra decorativa** (§2). Indicadores en `--sonda`, nunca en `--faro`.
- **Movimiento:** 150–200 ms de desplazamiento + opacidad al abrir con ratón. **Sin animación** cuando se abre con teclado: es una acción frecuente (criterio de `emil-design-eng`). Con `prefers-reduced-motion`, cambio instantáneo.
- Disponible en **Hoy, Semana y Tareas**. No en Bandeja (el procesado es de pantalla completa, §5.2) ni en el modo foco (sin navegación, §4).

### 3.4 Atajos de teclado

Solo actúan cuando el foco no está en un campo de texto, igual que `N` hoy.

| Grupo | Atajo | Acción |
|---|---|---|
| Captura | `N` | Capturar (ya existe) |
| Navegación | `G` `H` / `G` `S` / `G` `T` / `G` `B` | Ir a Hoy / Semana / Tareas / Bandeja |
| Paneles | `O` `P` `H` `E` `L` `A` | Abrir el panel. Pulsar otra vez lo cierra |
| | `Esc` | Cerrar panel u hoja |
| Tarea con el foco | `J` / `K` | Siguiente / anterior |
| | `X` | Completar |
| | `M` → `1` `2` `3` `D` | Mover a hoy / mañana / lunes / elegir fecha |
| | `F` | Empezar (modo foco + temporizador) |
| | `Intro` | Editar |
| | `S` | Marcar o desmarcar en Las 3 del día |
| Rituales | `C` | Cerrar el día |
| Ayuda | `?` | Hoja con todos los atajos |

Sin conflictos: `H` abre Hábitos solo o, tras `G`, va a Hoy (secuencia a la manera de Gmail, 800 ms de ventana). Más adelante se puede añadir una paleta de órdenes `Ctrl/⌘ K`, compatible con todo lo anterior.

### 3.5 Adaptación a móvil

- **Barra inferior:** Hoy · Semana · [ + ] · Tareas · Bandeja. Captura en el centro, al alcance del pulgar.
- **Acceso a paneles:** un botón de icono en la cabecera de Hoy, Semana y Tareas ("Paneles", 44 px). Abre una **hoja inferior** con pestañas deslizables: Objetivos · Proyectos · Hábitos · Estado · Llamadas · No olvidar. Recuerda la última pestaña.
- **Hoja:** radio 12 px, dos alturas (50 % y 90 %), asa para arrastrar y cerrar deslizando hacia abajo, sin velo oscuro a media altura.
- **Accesos contextuales** que evitan un toque: la línea "Hábitos 2/5" de Hoy abre la hoja directamente en Hábitos, y "3 llamadas" la abre en Llamadas.
- **Gestos en la fila de tarea**, siempre con alternativa en botón: deslizar a la derecha = completar, a la izquierda = hoja "Mover" (Mañana · Lunes · Elegir fecha).

---

## 4. Problemas de usabilidad por pantalla

Impacto: **A** alto · **M** medio · **B** bajo. Esfuerzo: **S** < ½ día · **M** 1–2 días · **L** 3+ días. Dentro de cada pantalla, ordenados por impacto en el foco (criterio de `nortvira-design`).

### Global

| # | Problema | Principio incumplido | Corrección | Imp. | Esf. |
|---|---|---|---|---|---|
| G1 | El menú no marca la sección activa | Orientación, §10 | `usePathname` + `aria-current="page"` + texto `--tinta` peso 600 y una barra de 2 px | A | S |
| G2 | El sistema de `DESIGN.md` no está aplicado: acento índigo, fuente del sistema, tarjetas con borde, ámbar en Las 3 del día, `themeColor #4f46e5` | §2, §3, §9 | Migrar `globals.css` y `tailwind.config.ts` a los tokens `--agua … --linea` y cargar Atkinson Hyperlegible Next. El acento pasa a ser `--faro` y se reserva para un solo elemento | A | M |
| G3 | Varios elementos en acento por pantalla. En Hoy: "Momento de reflexión", conmutador activo, botón "Hoy", tarjeta del día, primera tarea y `+` | §2 "máximo un magenta" | Solo la Acción prioritaria en `--faro`. Todo lo demás en `--tinta` / `--sonda` | A | S |
| G4 | Vocabulario cruzado: "Acciones prioritarias / No olvidar" frente a "Acción prioritaria", y "Momento de reflexión" abre el asistente semanal | §6 | Renombrar a "No olvidar" y resolver la decisión de la sección 2.2 | A | S |
| G5 | Objetivos táctiles pequeños: completar 20 px, Las 3 del día 16 px, estrellas ~16 px, ✏️ ~32 px | §8 (44 × 44) | Zona táctil de 44 px con el icono visual intacto (relleno o pseudo-elemento) | A | S |
| G6 | Emojis en botones y etiquetas (✨ ☀️ 🌙 🏆 🍅 📅 👤 📝 ✏️) | §6 "verbos normales", §10 | Texto e iconos de línea. Los metadatos, como texto `--sonda` | M | S |
| G7 | Capturar abre un modal con velo oscuro que tapa la pantalla | §1 "capturar no le saque de ella" | Hoja no modal (inferior en móvil, flotante en escritorio) y sin velo | M | S |
| G8 | Modales sin `Esc` ni trampa de foco (Capturar, Cierre, asistentes) | §8 teclado | `Esc` cierra, foco atrapado, foco devuelto al disparador | M | S |
| G9 | Solo existe el atajo `N` | §5.1, rapidez | Tabla de la sección 3.4 | M | M |
| G10 | En móvil, menú superior con desplazamiento horizontal y `+` elevado (`bottom-20`) para una barra que no existe | §4 móvil | Barra inferior de la sección 3.5 | M | M |
| G11 | El desglose de Carga solo se ve al pasar el ratón | §8 (táctil) | Tocar abre el detalle en una hoja pequeña | B | S |
| G12 | El pie repite el menú | Peso visual | Eliminar | B | S |

### Hoy

| # | Problema | Principio incumplido | Corrección | Imp. | Esf. |
|---|---|---|---|---|---|
| H1 | Cabecera con 6–8 controles: Momento de reflexión, Arrancar, Cerrar, Día/Semana, ←, fecha, →, Hoy. La siguiente acción no se ve en 3 s | §1, §10 | Fecha + objetivo nº 1 (13 px) + **un** botón de ritual contextual. Navegar entre días con ← → discretos o con el teclado | A | S |
| H2 | La misma tarea aparece hasta 3 veces: primera tarea fijada, bloque Las 3 del día y su columna de área | Peso visual, `distill` | Una sola lista: **línea de rumbo** con la Acción prioritaria primero, luego Las 3 y el resto plegado ("7 más") | A | M |
| H3 | "Empezar" en la primera tarea solo la resalta 2 s. No inicia nada | Un verbo, un resultado (§6) | "Empezar" abre el modo foco con temporizador (acción 7) | A | M |
| H4 | Mover de día desde el editor exige fecha **y** hora. Solo con fecha no guarda nada y no avisa. Si la fecha cae en otra semana, cambia la hora programada pero la tarea **no cambia de día** (`TaskCard.saveSchedule`) | §5.4 "posponer mueve" | Acción "Mover" independiente de la hora (acción 3b). **Es un error funcional: conviene arreglarlo aunque no se haga el rediseño** | A | S |
| H5 | Áreas en rejilla de 3 columnas con tareas como tarjetas con borde | §4 "no son tarjetas", "dos columnas nunca tres" | Filas separadas por espacio. El área, como punto de color o subtítulo | A | L |
| H6 | La tarjeta de Arranque se abre sola encima de la lista y la empuja hacia abajo | §1 | Hoja o paso guiado una vez al día. Al cerrarlo queda resumido en la cabecera ("Energía 4 · Objetivo del día…") | M | S |
| H7 | En cada fila se ve siempre la prioridad ("● Media") | Peso visual | Mostrar solo si es Alta. El resto, en el editor | M | S |
| H8 | El título de la tarea es un campo siempre editable: un clic para arrastrar o seleccionar entra en edición | Previsibilidad | Texto estático. Se edita con doble clic, `Intro` o el menú | M | M |
| H9 | La tarjeta del día en Hoy repite "Hoy" (insignia + borde de acento) y muestra la valoración con estrellas en la cabecera | Redundancia | Quitar la insignia y el borde. Las estrellas pasan al Cierre | M | S |
| H10 | Listas semanales (Acciones prioritarias, Llamadas) y Hábitos ocupan la mitad inferior de Hoy | §3 de esta auditoría | Paneles + una línea de metadatos | M | M |
| H11 | "Momento de reflexión" desde Hoy te lleva a Semana al cerrar | Previsibilidad | Cerrar sin navegar | M | S |
| H12 | En fin de semana los hábitos no se pueden marcar desde Hoy | Cobertura | El panel Hábitos cubre L‑D | B | S |

### Semana

| # | Problema | Principio incumplido | Corrección | Imp. | Esf. |
|---|---|---|---|---|---|
| S1 | Unas 5 pantallas de alto. Objetivos y hábitos aparecen al final | §1, `distill` | Sacar los bloques a paneles (sección 3). Semana = cabecera + días | A | M |
| S2 | 7 días apilados en vertical: no hay vista de conjunto y arrastrar entre días obliga a desplazarse | Clics y desplazamientos | Rejilla de 5 columnas L‑V con filas compactas y fin de semana plegado en una sexta franja estrecha. En móvil, selector de día L M X J V S D + lista del día | A | L |
| S3 | Estado mental/físico es lo primero bajo la cabecera | Jerarquía | Panel Estado | M | S |
| S4 | Días pasados, fin de semana y días futuros pesan lo mismo | Jerarquía | Días pasados plegados a "5/7 hechas". Hoy resaltado solo con peso tipográfico | M | S |
| S5 | Bloque vacío punteado "Las 3 del día" repetido en cada día (×7) | Peso visual | Estado vacío solo en Hoy. En Semana, una estrella en la fila | M | S |
| S6 | Evaluación de la semana como formulario siempre visible | §5.5 | Pasa al Momento de reflexión (módulo 1.8) | M | M |
| S7 | Carga semanal en una caja propia + barra de carga y estrellas en cada día | Peso visual | La carga del día como número en la cabecera de la columna ("5 h / 6 h"). La barra solo si hay sobrecarga, en `--babor` | M | S |
| S8 | La navegación muestra el código ISO "2026-W40" | Lenguaje llano | "29 sep – 5 oct" | B | S |
| S9 | No hay "Cerrar el día" en Semana | Acción 8b | Atajo `C` + botón contextual global | B | S |

### Bandeja

| # | Problema | Principio incumplido | Corrección | Imp. | Esf. |
|---|---|---|---|---|---|
| B1 | "Procesar" es un botón pequeño con contorno, en segundo plano | §10, acción principal | Botón principal "Procesar 5" arriba. Si hay pendientes, la pantalla abre enfocada en él | M | S |
| B2 | Asignar fecha desde la lista pide fecha + área + hora + "Asignar" (4–5 clics) | §5.2 | Chips Hoy / Mañana / Lunes que asignan en 1 toque con el área por defecto. El resto es opcional | M | M |
| B3 | Doble contenedor: título de página + tarjeta con otro título y una descripción | `distill` | Un título. La descripción, solo en el estado vacío | B | S |
| B4 | Esperando y Algún día como pestañas de Bandeja | Arquitectura | Cuando exista Tareas, pasan a ser filtros de Tareas. La Bandeja queda solo para lo no procesado | B | M |

*Lo que ya cumple:* el asistente de procesado pregunta a pregunta (§5.2) y el contador del menú.

### Cierre del día

| # | Problema | Principio incumplido | Corrección | Imp. | Esf. |
|---|---|---|---|---|---|
| C1 | Un solo modal largo con 6 secciones y desplazamiento interno | §5.5 "pasos con progreso" | 4 pasos: **Pendientes → Mañana → Comprobaciones → Nota**, con "1/4" | A | M |
| C2 | "Primera tarea de mañana" y "Las 3 de mañana" se eligen por separado | Clics | La primera elegida se marca sola como una de Las 3 | M | S |
| C3 | Tras "Terminar", pantalla "Día cerrado" con otro botón | Clics | Aviso "Día cerrado" y volver a Hoy | B | S |

*Lo que ya cumple:* decisión en un toque por tarea pendiente y "Pasar todas a [día]" (§5.4).

### Tu espacio, Herramientas, Dashboard, Ajustes

| # | Problema | Corrección | Imp. | Esf. |
|---|---|---|---|---|
| T1 | "Tu espacio" es un nombre ambiguo (áreas + proyectos) | Renombrar a "Plan de navegación" y moverlo al menú secundario | M | S |
| HT1 | Herramientas es una página intermedia de 3 tarjetas | Eliminar la página. Cada herramienta va a su sitio natural (sección 2.2) | M | S |
| HT2 | Pomodoro desconectado de la tarea y de Hoy: 5 clics y cambio de pantalla | Modo foco lanzado desde la tarea | A | M |
| D1 | "Dashboard" (anglicismo) y "Real vs. Estimado" separados | Unir en "Bitácora" (menú secundario) | B | S |
| AJ1 | "Cerrar sesión" siempre visible en la barra | Menú de cuenta | B | S |

---

## 5. Propuesta visual mínima

Los bocetos son **estructura**, no estética: la estética la fija `DESIGN.md`. `●` = Acción prioritaria (`--faro`, único elemento magenta). `○` = tarea. `│` = línea de rumbo (`--sonda`, 2 px). `▸` = plegado.

### 5.1 Hoy · escritorio (panel cerrado)

```
┌────────────┬───────────────────────────────────────────────────────┐
│ Nortvira   │ Martes 29 sep                         [Cerrar el día] │ ← 1 ritual, según la hora
│            │ Objetivo: cerrar propuesta Grupo X                    │ ← objetivo nº 1, 13 px --sonda
│ ▸ Hoy      │ Carga 5 h 15 / 6 h                                    │
│   Semana   │                                                       │
│   Tareas   │ ●  Enviar propuesta a Grupo X            [Empezar]    │ ← 25 px, --faro
│   Bandeja 4│ │                                                     │
│            │ ○  Llamar a Laura (Gestiona)          ☆  ···          │ ← Las 3 del día
│ ────────── │ │                                                     │
│ PANELES    │ ○  Preparar clase UEMC tema 4         ☆  ···          │
│ ◎ Objetivos│ │                                                     │
│ ▢ Proyectos│ ▸  6 más · Servilia 3 · UEMC 2 · Personal 1           │ ← resto plegado
│ ☑ Hábitos 2/5                                                      │
│ ∿ Estado   │ Hábitos 2/5 · 3 llamadas · 2 por no olvidar           │ ← metadatos 13 px, abren paneles
│ ☎ Llamadas 3                                                       │
│ ⚑ No olvidar 2                                                     │
│ ────────── │                                                       │
│ Más ▾   (VM)                                                 [ + ] │ ← + en --tinta
└────────────┴───────────────────────────────────────────────────────┘
  ··· = menú de fila: Mover · Empezar · Editar · Eliminar
```

### 5.2 Semana · escritorio (panel Hábitos abierto, flotante)

```
┌────────────┬───────────────────────────────────────────────────────────────┐
│ Nortvira   │ Semana 29 sep – 5 oct            ‹  ›    [Momento de reflexión] │
│   Hoy      │ Objetivo: cerrar propuesta Grupo X · Carga 22 h / 30 h          │
│ ▸ Semana   ├──────────┬─────────┬─────────┬─────────┬─────────┬────────────┤
│   Tareas   │ Lun 29 ✓ │ MAR 30  │ Mié 1   │ Jue 2   │ Vie 3   │ S·D  ▸     │
│   Bandeja 4│ 5/5 hech.│ 5h/6h   │ 4h/6h   │ 6h/6h   │ 2h/6h   │ 1 tarea    │
│            │   ▸      │ ○ Propu.│ ○ Clase │ ○ Visita│ ○ Factu.│            │
│ PANELES ┌──────────────────────┐ Llamar │ ○ Post  │ ○ Oferta│         │            │
│ ◎       │ Hábitos         Esc ✕│ Diapos │ ○ Revis.│ ○ ...   │         │            │
│ ▢       │ Hoy                  │ + …    │ + …     │ + …     │ + …     │            │
│ ☑ ◀─────│ [✓] Leer 20 min      │        │         │         │         │            │
│ ∿       │ [ ] Caminar          │        │         │         │         │            │
│ ☎ 3     │ [✓] Sin pantallas    │        │         │         │         │            │
│ ⚑ 2     │ L M X J V S D        │  ← el panel flota sobre la rejilla, sin velo      │
│         │ ● ● ○ · · · ·  Leer  │    y sin sombra decorativa: borde --linea         │
│         └──────────────────────┘                                                  │
│ Más ▾      │  arrastrar entre columnas = mover de día (0 desplazamientos)   [ + ] │
└────────────┴───────────────────────────────────────────────────────────────┘
```

### 5.3 Hoy · móvil (360 px) y hoja de paneles

```
┌──────────────────────────────┐   ┌──────────────────────────────┐
│ Martes 29          ◫  (VM)   │   │ Martes 29          ◫  (VM)   │
│ Objetivo: cerrar propuesta X │   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │ ← contenido visible, sin velo
│                              │   │ ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ │
│ ●  Enviar propuesta a X      │   ├──────────── ▬ ───────────────┤ ← asa de la hoja
│ │  [Empezar]                 │   │ Objetivos Proyectos [Hábitos]│ ← pestañas deslizables
│ │                            │   │ Estado Llamadas No olvidar   │
│ ○  Llamar a Laura            │   │                              │
│ │                            │   │ [✓] Leer 20 min              │ ← filas de 44 px
│ ○  Preparar clase UEMC       │   │ [ ] Caminar                  │
│ │                            │   │ [✓] Sin pantallas            │
│ ▸  6 más                     │   │ [ ] Meditar                  │
│                              │   │ [ ] Inglés                   │
│ Hábitos 2/5 · 3 llamadas     │   │                              │
├──────────────────────────────┤   ├──────────────────────────────┤
│ Hoy  Semana  [+]  Tareas  Ban│   │ Hoy  Semana  [+]  Tareas  Ban│
└──────────────────────────────┘   └──────────────────────────────┘
 ◫ = Paneles · deslizar fila → completar · ← mover
```

---

## 6. Orden de implantación recomendado

| Fase | Contenido | Esfuerzo | Efecto |
|---|---|---|---|
| **0. Arreglo urgente** | H4 (mover de día sin hora y entre semanas) | S | Elimina una pérdida silenciosa de planificación |
| **1. Arreglos rápidos** | G1, G3, G4, G5, G6, G8, H1, H7, H9, H11, S3, S5, S8, B1, B3, C2, C3, G12 | ≈ 3–4 días | Menos peso visual y menos confusión sin tocar la arquitectura |
| **2. Estructura** | Navegación (sección 2) + barra de paneles y hojas (sección 3) + atajos (3.4) + "Mover" y "Empezar" en la fila | ≈ 1,5–2 semanas | −45 % de clics y −85 % de desplazamiento en un día tipo |
| **3. Visual y layout** | G2 (tokens de `DESIGN.md`) + línea de rumbo en Hoy (H2, H5) + Semana en rejilla (S2) + Cierre por pasos (C1) | ≈ 2 semanas | Cumplir `DESIGN.md` §4 y §10 |
| **4. Con módulos futuros** | Tareas (absorbe Matriz, Esperando y Algún día), Momento de reflexión 1.8 (absorbe Evaluación), Bitácora | En sus módulos | Cierra la arquitectura |

**Comprobado contra `DESIGN.md` §10:** la propuesta deja la siguiente acción visible en menos de 3 s (Acción prioritaria primera y única en magenta), permite capturar desde cualquier pantalla sin salir, elimina tarjetas, sombras y emojis decorativos, y cubre teclado, 360 px y tema oscuro (paneles y hojas usan solo tokens). Falta validarlo en pantalla con Playwright cuando haya datos de prueba.
