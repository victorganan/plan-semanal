// El fondo del selector "¿Cuál cambias?" cierra el modal al pulsarlo (clic
// fuera de la tarjeta). Un segundo clic/tap pegado a la apertura (doble clic
// accidental sobre la estrella, o un evento duplicado nativo+sintético) cae
// justo sobre ese fondo en vez de sobre la estrella original y lo cierra al
// instante, dando la sensación de que el selector "nunca apareció" y de que
// las 3 tareas marcadas "desaparecieron" (era el fondo oscuro tapándolas un
// instante). Ignoramos el cierre por fondo durante un breve margen tras abrir.
export function shouldIgnoreBackdropClick(openedAt: number, now: number, graceMs = 250): boolean {
  return now - openedAt < graceMs;
}
