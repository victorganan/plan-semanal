'use client';

import { useEffect, useRef } from 'react';
import { useEscapeToClose } from '@/components/useEscapeToClose';
import { text } from '@/i18n/es';

// Panel flotante de la auditoría UX §3.3: no modal (sin velo, sobre el
// contenido, aria-modal="false") en escritorio, anclado a la derecha;
// hoja inferior en móvil. Un solo panel abierto a la vez — lo gestiona
// quien lo usa (PlanWeekClient), este componente solo es la presentación.
export function FloatingPanel({
  title,
  onClose,
  triggerRef,
  children,
}: {
  title: string;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEscapeToClose(true, () => {
    onClose();
    triggerRef?.current?.focus();
  });

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (panelRef.current?.contains(target)) return;
      if (triggerRef?.current?.contains(target)) return;
      onClose();
    }
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [onClose, triggerRef]);

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={title}
      className="fixed inset-x-0 bottom-0 z-40 max-h-[80vh] overflow-y-auto rounded-t-card border border-base-border bg-base-surface p-4 shadow-lg motion-safe:transition-all motion-safe:duration-200 sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-20 sm:w-[360px] sm:max-h-[calc(100vh-6rem)] sm:rounded-card"
    >
      <div className="mb-3 flex items-center justify-between border-b border-base-border pb-2">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button onClick={onClose} aria-label={text.common.close} className="text-base-muted hover:text-base-text">
          ✕
        </button>
      </div>
      {children}
    </div>
  );
}
