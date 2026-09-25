'use client';

import { useState } from 'react';
import type { TaskWithProject } from '@/types';

// Marcar/desmarcar Las 3 del día, con protección contra doble clic (evita que
// dos toggles consecutivos se cancelen entre sí) y el selector de sustitución
// cuando ya hay 3 marcadas. Compartido por DayCard (día en curso),
// DayStartCard (Arranque) y DayCloseRitual (Las 3 de mañana).
export function useTop3Toggle(tasks: TaskWithProject[], onUpdateTask: (id: string, patch: Record<string, unknown>) => Promise<void>) {
  const [pendingSwap, setPendingSwap] = useState<{ id: string; text: string } | null>(null);
  const [swapBusy, setSwapBusy] = useState(false);
  const [pendingTop3, setPendingTop3] = useState<Set<string>>(new Set());

  const top3Tasks = tasks.filter((t) => t.isTop3);

  async function handleToggleTop3(id: string, next: boolean) {
    if (pendingTop3.has(id)) return;
    setPendingTop3((prev) => new Set(prev).add(id));
    try {
      if (!next) {
        await onUpdateTask(id, { isTop3: false });
        return;
      }
      if (top3Tasks.length >= 3) {
        const task = tasks.find((t) => t.id === id);
        if (task) setPendingSwap({ id, text: task.text });
        return;
      }
      await onUpdateTask(id, { isTop3: true });
    } finally {
      setPendingTop3((prev) => {
        const nextSet = new Set(prev);
        nextSet.delete(id);
        return nextSet;
      });
    }
  }

  async function confirmSwap(outgoingId: string) {
    if (!pendingSwap) return;
    setSwapBusy(true);
    try {
      await onUpdateTask(outgoingId, { isTop3: false });
      await onUpdateTask(pendingSwap.id, { isTop3: true });
      setPendingSwap(null);
    } finally {
      setSwapBusy(false);
    }
  }

  function cancelSwap() {
    setPendingSwap(null);
  }

  return { top3Tasks, pendingTop3, handleToggleTop3, pendingSwap, swapBusy, confirmSwap, cancelSwap };
}
