import { useRef } from 'react';
import type { TaskWithProject } from '@/types';
import { text } from '@/i18n/es';
import { shouldIgnoreBackdropClick } from '@/lib/top3-swap-modal';

interface Props {
  currentTop3: TaskWithProject[];
  incomingTaskText: string;
  busy: boolean;
  onSwap: (outgoingId: string) => void;
  onCancel: () => void;
}

// "Al intentar marcar una cuarta: «Las 3 del día son 3. ¿Cuál cambias?» con
// las tres actuales para sustituir" (M4.1).
export function Top3SwapModal({ currentTop3, incomingTaskText, busy, onSwap, onCancel }: Props) {
  const openedAtRef = useRef(Date.now());
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={() => {
        // Un doble clic sobre la estrella (o un evento duplicado) puede caer,
        // en su segundo golpe, sobre este mismo fondo justo al abrirse: lo
        // ignoramos durante un breve margen para que no se cierre solo.
        if (shouldIgnoreBackdropClick(openedAtRef.current, Date.now())) return;
        onCancel();
      }}
    >
      <div className="w-full max-w-sm rounded-card bg-base-surface p-5 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <p className="mb-1 text-center text-base font-medium">{text.top3Swap.question}</p>
        <p className="mb-4 text-center text-xs text-base-muted">{incomingTaskText}</p>
        <div className="space-y-2">
          {currentTop3.map((t) => (
            <button
              key={t.id}
              disabled={busy}
              onClick={() => onSwap(t.id)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border border-base-border px-3 py-2 text-left text-sm hover:bg-base-border/40 disabled:opacity-40"
            >
              <span className="truncate">{t.text}</span>
              <span className="shrink-0 text-xs font-medium text-accent">{text.top3Swap.swapButton}</span>
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="mt-3 w-full text-center text-xs text-base-muted hover:underline">
          {text.top3Swap.cancel}
        </button>
      </div>
    </div>
  );
}
