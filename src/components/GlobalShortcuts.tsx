'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useEscapeToClose } from '@/components/useEscapeToClose';
import { text } from '@/i18n/es';

function isTypingTarget(el: EventTarget | null): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

const NAV_KEYS: Record<string, string> = {
  h: '/hoy',
  s: '/semana',
  b: '/bandeja',
};

const SHORTCUT_ROWS: { keys: string; label: string }[] = [
  { keys: 'G luego H', label: 'Ir a Hoy' },
  { keys: 'G luego S', label: 'Ir a Semana' },
  { keys: 'G luego B', label: 'Ir a Bandeja' },
  { keys: 'I', label: 'Arrancar el día' },
  { keys: 'C', label: 'Cerrar el día' },
  { keys: 'R', label: 'Momento de reflexión' },
  { keys: 'N', label: 'Captura rápida' },
  { keys: 'Esc', label: 'Cerrar panel abierto' },
  { keys: '?', label: 'Esta ayuda' },
];

// Fase 2 de la auditoría UX (§3): atajos de teclado globales con ayuda en
// "?". Se limita a navegación y a los 3 rituales (siempre accesibles
// también desde "Más"); el modelo completo de foco por fila (J/K/X/M/F/S)
// queda fuera de esta pasada.
export function GlobalShortcuts() {
  const router = useRouter();
  const [helpOpen, setHelpOpen] = useState(false);
  const gPendingRef = useRef(false);
  const gTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEscapeToClose(helpOpen, () => setHelpOpen(false));

  useEffect(() => {
    function clearGPending() {
      gPendingRef.current = false;
      if (gTimeoutRef.current) clearTimeout(gTimeoutRef.current);
      gTimeoutRef.current = null;
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isTypingTarget(e.target)) return;
      const key = e.key.toLowerCase();

      if (gPendingRef.current) {
        clearGPending();
        const href = NAV_KEYS[key];
        if (href) {
          e.preventDefault();
          router.push(href);
        }
        return;
      }

      if (key === 'g') {
        gPendingRef.current = true;
        gTimeoutRef.current = setTimeout(clearGPending, 1500);
        return;
      }
      if (key === 'i') {
        e.preventDefault();
        router.push('/hoy?ritual=start');
      } else if (key === 'c') {
        e.preventDefault();
        router.push('/hoy?ritual=close');
      } else if (key === 'r') {
        e.preventDefault();
        router.push('/semana?ritual=reflection');
      } else if (e.key === '?') {
        e.preventDefault();
        setHelpOpen((v) => !v);
      }
    }

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      clearGPending();
    };
  }, [router]);

  if (!helpOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" onClick={() => setHelpOpen(false)}>
      <div
        className="w-full max-w-sm rounded-card border border-base-border bg-base-bg p-5 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold">{text.globalShortcuts.title}</h2>
          <button onClick={() => setHelpOpen(false)} aria-label={text.common.close} className="text-base-muted hover:text-base-text">
            ✕
          </button>
        </div>
        <div className="space-y-1.5">
          {SHORTCUT_ROWS.map((row) => (
            <div key={row.keys} className="flex items-center justify-between gap-3 text-sm">
              <span className="text-base-muted">{row.label}</span>
              <kbd className="rounded border border-base-border bg-base-surface px-1.5 py-0.5 text-xs font-medium">{row.keys}</kbd>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
