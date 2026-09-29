# DESIGN.md — Nortvira

Contexto de diseño y usabilidad. Claude Code debe leer este archivo antes de crear o modificar cualquier pantalla o componente.

## 1. Brief

**Qué es.** App de productividad personal que une GTD con un método de dirección y foco. La herramienta es secundaria: su trabajo es mantener la mente en las tareas de valor.

**Para quién.** Profesionales con muchos frentes abiertos (directivos, consultores, docentes, autónomos) que llegan saturados y quieren terminar el día con la cabeza despejada y tiempo libre de verdad.

**Trabajo principal de la interfaz.** Que en cualquier momento del día la persona sepa, en menos de 3 segundos, cuál es su siguiente acción de valor, y que capturar algo nuevo no le saque de ella.

**Metáfora.** Navegación con carta náutica. Tomamos de las cartas su precisión y su calma, no su decoración: nada de timones, anclas, brújulas dibujadas ni azul marino con dorado.

## 2. Paleta

Inspirada en los colores reales de una carta náutica: agua profunda casi blanca, bajíos en azul pálido, tinta de impresión y el magenta que las cartas reservan para lo que hay que ver sí o sí (faros, peligros).

| Token | Hex | Uso |
|---|---|---|
| `--agua` | `#FAFCFD` | Fondo general |
| `--bajio` | `#DCEBF2` | Superficies secundarias, filas seleccionadas, zonas agrupadas |
| `--tinta` | `#1D2B36` | Texto principal e iconos |
| `--sonda` | `#5B6F7C` | Texto secundario, metadatos, bordes activos |
| `--faro` | `#B0206E` | Acento único: Acción prioritaria, foco, estado activo del CTA principal |
| `--estribor` | `#2E7D5B` | Completado y confirmaciones |
| `--babor` | `#C2412D` | Alertas de rumbo y errores |
| `--linea` | `#C9D6DE` | Bordes y divisores |

**Guardia nocturna (tema oscuro):** `--agua #0E1A24`, `--bajio #172836`, `--tinta #E4ECF1`, `--sonda #93A6B3`, `--faro #E0619F`, `--estribor #5BB58C`, `--babor #E7735F`, `--linea #26394A`.

**Reglas de color**
- `--faro` es escaso por diseño: como máximo un elemento magenta visible por pantalla fuera del modo foco. Si todo es prioritario, nada lo es.
- `--babor` solo para algo que exige decisión (retraso, conflicto, error). Nunca para decorar fechas.
- Sin degradados ni sombras decorativas. La jerarquía se construye con tipografía, espacio y `--bajio`.
- Contraste mínimo AA (4,5:1 texto normal). Verificado para `--tinta` y `--sonda` sobre `--agua`.

## 3. Tipografía

**Una sola familia: Atkinson Hyperlegible Next** (Google Fonts), pesos 400, 600 y 800. Diseñada para legibilidad máxima: encaja con una app que promete menos carga mental. Fallback: `system-ui, -apple-system, "Segoe UI", sans-serif`.

| Rol | Tamaño / interlineado | Peso |
|---|---|---|
| Norte / título de pantalla | 31 / 36 | 800 |
| Acción prioritaria | 25 / 30 | 600 |
| Título de sección | 20 / 26 | 600 |
| Cuerpo y tareas | 16 / 24 (17 / 26 en escritorio) | 400 |
| Metadatos | 13 / 18 | 400, color `--sonda` |

- Escala 1,25. Nada por debajo de 13 px.
- Todo en minúscula tipo frase. Sin mayúsculas sostenidas en etiquetas.
- Cifras tabulares (`font-variant-numeric: tabular-nums`) en temporizadores y contadores.
- Longitud de línea máxima 70 caracteres en notas y Cuaderno de bitácora.

## 4. Layout

**Idea central: la línea de rumbo.** La vista Hoy es una línea vertical fina (`--sonda`, 2 px) con las acciones del día como puntos de paso. La Acción prioritaria es el primer punto, en magenta y a mayor tamaño. Es el único elemento audaz de la app; todo lo demás es silencioso.

Móvil (vista Hoy):
```
┌─────────────────────────────┐
│ Martes 29                   │
│ Norte: cerrar propuesta X   │  ← recordatorio del Objetivo mensual, 13 px
│                             │
│ ●  Enviar propuesta a X     │  ← Acción prioritaria (--faro, 25 px)
│ │  [Empezar]                │
│ │                           │
│ ○  Llamar a Laura           │
│ │                           │
│ ○  Revisar diapositivas     │
│ │                           │
│ ◌  3 en espera              │  ← colapsado
│                             │
├─────────────────────────────┤
│  Hoy   Viaje   Bitácora  [+]│  ← [+] = capturar, siempre visible
└─────────────────────────────┘
```

Escritorio (dos columnas, nunca tres):
```
┌──────────┬──────────────────────────────┐
│ Hoy      │ Martes 29 · Norte            │
│ Bandeja  │                              │
│ Viaje    │ ● Acción prioritaria         │
│ Plan     │ │                            │
│ Bitácora │ ○ ...                        │
│          │ │                            │
│          │ ○ ...                        │
└──────────┴──────────────────────────────┘
```

- Alineación a la izquierda en todo. Centrado solo en el modo foco.
- Rejilla de 8 px. Márgenes laterales 20 px móvil, 32 px escritorio. Ancho máximo del contenido 720 px.
- Radios: 6 px en controles, 12 px en hojas modales. Las tareas no son tarjetas: son filas separadas por espacio, no por cajas.
- Modo foco: pantalla limpia con la acción en curso centrada, temporizador y un solo botón para salir. Sin navegación.

## 5. Principios de usabilidad (GTD + foco)

1. **Capturar en dos toques o un atajo.** Botón [+] en toda pantalla, atajo global `N` en escritorio. Capturar nunca pide clasificar: eso es otro momento.
2. **Procesar pregunta a pregunta.** La Bandeja se procesa en pantalla completa, un elemento cada vez: ¿requiere acción? → ¿menos de 2 minutos? → ¿un paso o varios? → ¿cuándo? Nunca un formulario largo.
3. **Una Acción prioritaria al día.** Máximo 3 acciones en el foco del día; el resto queda plegado. La app pide elegir antes de añadir una cuarta.
4. **Posponer mueve, nunca duplica.** Al cerrar el día, una tarea no completada se mueve a la nueva fecha conservando su historial.
5. **Cada ritual tiene su pantalla.** Momento de reflexión (cierre del día) y Viaje semanal (revisión) son flujos guiados de pocos pasos con progreso visible, no páginas llenas de campos.
6. **La app se calla.** Notificaciones solo para Alertas de rumbo y recordatorios que la persona ha pedido. En modo foco, ninguna.
7. **Vacío = siguiente paso.** Cada estado vacío explica qué hacer y ofrece el botón para hacerlo.

## 6. Vocabulario y microcopy

| Término | Qué es para el usuario |
|---|---|
| Norte | Su propósito o meta de fondo |
| Plan de navegación | Planificación de proyectos y objetivos |
| Objetivo mensual | La meta del mes |
| Viaje semanal | Revisión y plan de la semana |
| Acción prioritaria | Lo único que, si se hace hoy, hace que el día haya merecido la pena |
| Alertas de rumbo | Avisos de desvío (retrasos, sobrecarga, conflictos) |
| Momento de reflexión | Cierre del día |
| Cuaderno de bitácora | Registro de lo hecho y aprendizajes |

- La metáfora náutica vive en los nombres de las secciones. Los botones usan verbos normales: "Capturar", "Mover a mañana", "Empezar", "Terminar". Nada de "Zarpar" o "Izar velas".
- Un verbo, un resultado: el botón "Mover a mañana" genera el aviso "Movida a mañana".
- Errores sin disculpas y con solución: "No se ha guardado la tarea. Revisa la conexión y vuelve a intentarlo."
- Tuteo, frases cortas, voz activa.

## 7. Movimiento

- Un único momento orquestado: al completar la Acción prioritaria, el punto magenta se rellena y la línea de rumbo avanza hasta la siguiente acción (≤400 ms).
- El resto del movimiento solo responde a acciones del usuario (abrir, plegar, mover) y muestra qué ha cambiado.
- Respetar `prefers-reduced-motion`: sustituir por cambio instantáneo.

## 8. Suelo de calidad (no negociable)

- Responsive desde 360 px.
- Foco de teclado visible: contorno 2 px `--faro` con separación de 2 px.
- Objetivos táctiles de al menos 44 × 44 px.
- Todo icono sin texto lleva `aria-label`.
- Soporte de tema claro y oscuro con `prefers-color-scheme`.

## 9. Tokens CSS

```css
:root {
  --agua: #FAFCFD; --bajio: #DCEBF2; --tinta: #1D2B36; --sonda: #5B6F7C;
  --faro: #B0206E; --estribor: #2E7D5B; --babor: #C2412D; --linea: #C9D6DE;
  --font: "Atkinson Hyperlegible Next", system-ui, -apple-system, "Segoe UI", sans-serif;
  --fs-meta: 13px; --fs-body: 16px; --fs-section: 20px; --fs-priority: 25px; --fs-title: 31px;
  --space: 8px; --radius-control: 6px; --radius-sheet: 12px;
  --max-content: 720px;
}
@media (prefers-color-scheme: dark) {
  :root {
    --agua: #0E1A24; --bajio: #172836; --tinta: #E4ECF1; --sonda: #93A6B3;
    --faro: #E0619F; --estribor: #5BB58C; --babor: #E7735F; --linea: #26394A;
  }
}
```

## 10. Antes de dar por terminada una pantalla

- ¿Se ve la siguiente acción de valor en menos de 3 segundos?
- ¿Hay más de un elemento magenta?
- ¿Se puede capturar algo sin salir de aquí?
- ¿Hay tarjetas, sombras o degradados que no aportan información? Quitarlos.
- ¿Funciona con teclado, a 360 px y en tema oscuro?
