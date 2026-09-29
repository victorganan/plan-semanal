---
name: nortvira-design
description: Sistema de diseño y usabilidad de Nortvira, la app de productividad GTD + foco de Víctor Manuel. Úsala SIEMPRE que se cree, modifique, revise o critique cualquier pantalla, componente, estilo, texto de interfaz o flujo de Nortvira (vista Hoy, Bandeja, Viaje semanal, Momento de reflexión, Cuaderno de bitácora, modo foco, Plan de navegación, Alertas de rumbo), aunque no se mencione "diseño" explícitamente — incluidos cambios de CSS, colores, tipografía, botones, estados vacíos, mensajes de error o capturas de pantalla para revisar.
---

# Nortvira Design

Nortvira es una app de productividad que une GTD con un método de dirección y foco. La interfaz tiene un único trabajo: que la persona vea en menos de 3 segundos su siguiente acción de valor y pueda capturar algo nuevo sin perderla de vista. Cada decisión de diseño se mide contra eso.

## Antes de trabajar

Lee `references/DESIGN.md` completo antes de escribir o modificar código de interfaz. Contiene la paleta (tokens CSS), la tipografía, el layout de la línea de rumbo, los principios de usabilidad, el vocabulario aprobado y el suelo de calidad. No inventes colores, tamaños ni nombres de sección fuera de ese documento; si algo nuevo no está cubierto, propón la ampliación y explica por qué.

## Al construir o modificar una pantalla

1. Usa solo los tokens de la sección 9 de DESIGN.md (variables CSS). Nada de hex sueltos en componentes.
2. Mantén un único elemento `--faro` (magenta) visible por pantalla fuera del modo foco: es la Acción prioritaria o el CTA principal, nunca ambos.
3. Las tareas son filas separadas por espacio, no tarjetas con sombra.
4. Respeta el vocabulario de la sección 6: la metáfora náutica solo en nombres de sección; los botones usan verbos normales y el mensaje de confirmación repite el verbo.
5. Aplica los principios GTD de la sección 5. En especial: capturar sin clasificar, procesar pregunta a pregunta, máximo 3 acciones de foco y posponer mueve la tarea, nunca la duplica.
6. Cumple el suelo de calidad de la sección 8 (360 px, teclado, 44 px táctiles, tema oscuro, `prefers-reduced-motion`).

## Al revisar o criticar una pantalla

Recorre la checklist de la sección 10 de DESIGN.md y entrega los hallazgos como tabla: problema, principio incumplido, corrección concreta (con el token o el texto exacto). Ordena por impacto en el foco del usuario, no por facilidad de arreglo.

## Al terminar

Antes de dar un cambio por cerrado, repasa la checklist de la sección 10 y di en una línea qué comprobaste. Si hay capacidad de hacer capturas (por ejemplo, Playwright), revisa la pantalla renderizada en claro, oscuro y móvil.
