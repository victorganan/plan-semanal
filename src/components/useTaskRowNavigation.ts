'use client';

import { useEffect } from 'react';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

// J / K: foco en la tarea siguiente / anterior visible (auditoría UX §3.4).
// Las acciones sobre la tarea enfocada (X, M, F, Intro, S) las resuelve la
// propia fila en TaskCard.
export function useTaskRowNavigation() {
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey || isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();
      if (key !== 'j' && key !== 'k') return;
      const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-task-row]')).filter((el) => el.offsetParent !== null);
      if (rows.length === 0) return;
      e.preventDefault();
      const current = (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-task-row]');
      const i = current ? rows.indexOf(current) : -1;
      const next = i === -1 ? rows[key === 'j' ? 0 : rows.length - 1] : rows[Math.min(Math.max(i + (key === 'j' ? 1 : -1), 0), rows.length - 1)];
      next.focus();
      next.scrollIntoView({ block: 'nearest' });
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
}
