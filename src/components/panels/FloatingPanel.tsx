'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useEscapeToClose } from '@/components/useEscapeToClose';
import { resolveSheetDrag, swipeDirection, type SheetHeight } from '@/lib/panels';
import { text } from '@/i18n/es';

// Panel flotante de la auditoría UX §3.3/§3.5: no modal (sin velo, sobre el
// contenido, aria-modal="false"), anclado a la derecha en escritorio. En
// móvil es una hoja inferior con dos alturas (50%/90%), asa para cambiarla
// o cerrar deslizando hacia abajo, y pestañas (también deslizando en
// horizontal) para pasar de un panel a otro. Un solo panel abierto a la
// vez — lo gestiona quien lo usa (PlanWeekClient).
export function FloatingPanel<K extends string>({
  title,
  onClose,
  triggerRef,
  tabs,
  activeTab,
  onSelectTab,
  onSwipe,
  children,
}: {
  title: string;
  onClose: () => void;
  triggerRef?: React.RefObject<HTMLElement | null>;
  tabs?: { key: K; label: string }[];
  activeTab?: K;
  onSelectTab?: (key: K) => void;
  onSwipe?: (direction: 1 | -1) => void;
  children: React.ReactNode;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLButtonElement>(null);
  const [height, setHeight] = useState<SheetHeight>('half');
  const dragStartY = useRef<number | null>(null);
  const draggedHandle = useRef(false);
  const touchStart = useRef<{ x: number; y: number } | null>(null);

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

  useEffect(() => {
    activeTabRef.current?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTab]);

  function endHandleDrag(clientY: number) {
    if (dragStartY.current === null) return;
    const next = resolveSheetDrag(height, clientY - dragStartY.current);
    // Un arrastre real no debe contar además como toque (onClick).
    draggedHandle.current = Math.abs(clientY - dragStartY.current) >= 10;
    dragStartY.current = null;
    if (next === 'close') onClose();
    else setHeight(next);
  }

  return (
    <div
      ref={panelRef}
      role="dialog"
      aria-modal="false"
      aria-label={title}
      className={clsx(
        'fixed inset-x-0 bottom-0 z-40 flex flex-col rounded-t-card border border-base-border bg-base-surface shadow-lg motion-safe:transition-[height] motion-safe:duration-200',
        height === 'full' ? 'h-[90vh]' : 'h-[50vh]',
        'sm:inset-x-auto sm:bottom-auto sm:right-4 sm:top-20 sm:h-auto sm:max-h-[calc(100vh-6rem)] sm:w-[360px] sm:rounded-card'
      )}
    >
      <button
        type="button"
        aria-label={text.panels.handleAriaLabel}
        onClick={() => {
          if (draggedHandle.current) {
            draggedHandle.current = false;
            return;
          }
          setHeight((h) => (h === 'full' ? 'half' : 'full'));
        }}
        onPointerDown={(e) => {
          dragStartY.current = e.clientY;
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerUp={(e) => endHandleDrag(e.clientY)}
        className="flex h-6 w-full shrink-0 touch-none items-center justify-center sm:hidden"
      >
        <span className="h-1 w-10 rounded-full bg-base-border" />
      </button>

      <div className="flex shrink-0 items-center gap-1 border-b border-base-border pb-2 pl-3 pr-1 sm:hidden">
        {tabs && onSelectTab ? (
          <div role="tablist" aria-label={text.panels.tabsAriaLabel} className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                ref={tab.key === activeTab ? activeTabRef : undefined}
                role="tab"
                type="button"
                aria-selected={tab.key === activeTab}
                onClick={() => onSelectTab(tab.key)}
                className={clsx(
                  'min-h-[44px] shrink-0 rounded-full px-3 text-xs font-medium',
                  tab.key === activeTab ? 'bg-base-border/50 text-base-text' : 'text-base-muted'
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        ) : (
          <h2 className="flex-1 text-sm font-semibold">{title}</h2>
        )}
        <button onClick={onClose} aria-label={text.common.close} className="flex h-11 w-11 shrink-0 items-center justify-center text-base-muted">
          ✕
        </button>
      </div>

      <div className="hidden items-center justify-between border-b border-base-border px-4 pb-2 pt-4 sm:flex">
        <h2 className="text-sm font-semibold">{title}</h2>
        <button onClick={onClose} aria-label={text.common.close} className="text-base-muted hover:text-base-text">
          ✕
        </button>
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto p-4"
        onTouchStart={(e) => {
          touchStart.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        }}
        onTouchEnd={(e) => {
          if (!touchStart.current || !onSwipe) return;
          const t = e.changedTouches[0];
          const dir = swipeDirection(t.clientX - touchStart.current.x, t.clientY - touchStart.current.y);
          touchStart.current = null;
          if (dir) onSwipe(dir);
        }}
      >
        {children}
      </div>
    </div>
  );
}
