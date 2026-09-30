import { useEffect } from 'react';

// G8 (auditoría UX): los modales/asistentes se cerraban solo con el botón
// ✕. Esc los cierra igual, y el foco vuelve a quien abrió el modal (el
// propio onClose ya lo gestiona en cada caso: quita el modal del árbol y el
// navegador devuelve el foco al elemento que lo tenía antes).
export function useEscapeToClose(active: boolean, onClose: () => void) {
  useEffect(() => {
    if (!active) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [active, onClose]);
}
