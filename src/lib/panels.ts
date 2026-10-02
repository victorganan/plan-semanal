// Paneles flotantes de Hoy/Semana (auditoría UX §3.3-§3.5): lógica pura,
// sin React, para poder probarla.

export const PANEL_KEYS = ['objetivos', 'proyectos', 'habitos', 'estado', 'llamadas', 'prioritarias'] as const;
export type PanelKey = (typeof PANEL_KEYS)[number];

export function isPanelKey(value: unknown): value is PanelKey {
  return typeof value === 'string' && (PANEL_KEYS as readonly string[]).includes(value);
}

// Pestaña vecina al deslizar en la hoja móvil (sin dar la vuelta).
export function adjacentPanel(current: PanelKey, direction: 1 | -1): PanelKey {
  const i = PANEL_KEYS.indexOf(current) + direction;
  return PANEL_KEYS[Math.min(Math.max(i, 0), PANEL_KEYS.length - 1)];
}

export type SheetHeight = 'half' | 'full';

// Al soltar el asa de la hoja móvil: arrastre corto = nada; hacia arriba
// = 90%; hacia abajo = de 90% a 50%, o cerrar si ya estaba al 50%.
export function resolveSheetDrag(height: SheetHeight, deltaY: number, threshold = 60): SheetHeight | 'close' {
  if (Math.abs(deltaY) < threshold) return height;
  if (deltaY < 0) return 'full';
  return height === 'full' ? 'half' : 'close';
}

// Deslizar horizontal en el contenido de la hoja = cambiar de pestaña,
// solo si el gesto es claramente horizontal.
export function swipeDirection(dx: number, dy: number, threshold = 60): 1 | -1 | null {
  if (Math.abs(dx) < threshold || Math.abs(dx) < Math.abs(dy) * 1.5) return null;
  return dx < 0 ? 1 : -1;
}

const LAST_PANEL_KEY = 'nortvira.lastPanel';

export function readLastPanel(): PanelKey | null {
  try {
    const v = window.localStorage.getItem(LAST_PANEL_KEY);
    return isPanelKey(v) ? v : null;
  } catch {
    return null;
  }
}

export function writeLastPanel(key: PanelKey) {
  try {
    window.localStorage.setItem(LAST_PANEL_KEY, key);
  } catch {
    // Sin almacenamiento (modo privado, bloqueado): no se recuerda, nada más.
  }
}
