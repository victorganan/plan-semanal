'use client';

import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import clsx from 'clsx';
import { api, describeApiError } from '@/lib/api-client';
import { movePatchFor } from '@/lib/task-move';
import { todayLocalString } from '@/lib/week';
import { QuickDateChips } from '@/components/QuickDateChips';
import { useToast } from '@/components/Toast';
import { useEscapeToClose } from '@/components/useEscapeToClose';
import { PRIORITY_LABELS } from '@/types';
import type { Area, TaskWithProject } from '@/types';
import { text } from '@/i18n/es';

const t = text.selection;

type SelectionState = {
  active: boolean;
  selected: Set<string>;
  isSelected: (id: string) => boolean;
  toggle: (id: string) => void;
  start: () => void;
  stop: () => void;
};

const SelectionContext = createContext<SelectionState | null>(null);

// null fuera de una vista con selección múltiple (p.ej. paneles sueltos).
export function useSelection() {
  return useContext(SelectionContext);
}

// Selección múltiple compartida por Hoy, Semana, Bandeja y Tareas: la vista
// envuelve su lista con el proveedor y cada TaskCard muestra su casilla
// cuando la selección está activa. La barra de acciones llama al endpoint
// batch y después a `onApplied` para que la vista recargue sus datos.
export function SelectionProvider({
  getTask,
  areas,
  onApplied,
  className,
  children,
}: {
  getTask: (id: string) => TaskWithProject | undefined;
  areas: Area[];
  onApplied: () => Promise<void> | void;
  className?: string;
  children: React.ReactNode;
}) {
  const [active, setActive] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const toggle = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);
  const stop = useCallback(() => {
    setActive(false);
    setSelected(new Set());
  }, []);
  const start = useCallback(() => setActive(true), []);

  const value = useMemo<SelectionState>(
    () => ({ active, selected, isSelected: (id) => selected.has(id), toggle, start, stop }),
    [active, selected, toggle, start, stop]
  );

  // "Todas": las tareas visibles ahora mismo en esta vista.
  function selectAllVisible() {
    const rows = containerRef.current?.querySelectorAll<HTMLElement>('[data-task-row]') ?? [];
    const ids = Array.from(rows)
      .filter((el) => el.offsetParent !== null)
      .map((el) => el.dataset.taskId!)
      .filter((id) => id && !id.startsWith('tmp_'));
    setSelected(new Set(ids));
  }

  return (
    <SelectionContext.Provider value={value}>
      <div ref={containerRef} className={className}>
        {children}
      </div>
      {active ? (
        <SelectionBar selected={selected} getTask={getTask} areas={areas} onApplied={onApplied} onSelectAll={selectAllVisible} onClose={stop} />
      ) : null}
    </SelectionContext.Provider>
  );
}

export function SelectToggleButton() {
  const selection = useSelection();
  if (!selection) return null;
  return (
    <button
      type="button"
      onClick={selection.active ? selection.stop : selection.start}
      aria-pressed={selection.active}
      className="min-h-[44px] rounded-full border border-base-border px-3 text-xs font-medium hover:bg-base-border/40"
    >
      {selection.active ? t.cancel : t.start}
    </button>
  );
}

type Panel = 'move' | 'area' | 'priority' | null;

function SelectionBar({
  selected,
  getTask,
  areas,
  onApplied,
  onSelectAll,
  onClose,
}: {
  selected: Set<string>;
  getTask: (id: string) => TaskWithProject | undefined;
  areas: Area[];
  onApplied: () => Promise<void> | void;
  onSelectAll: () => void;
  onClose: () => void;
}) {
  const { showToast } = useToast();
  const [panel, setPanel] = useState<Panel>(null);
  const [busy, setBusy] = useState(false);
  const [moveDate, setMoveDate] = useState(todayLocalString());
  const [fallbackAreaId, setFallbackAreaId] = useState('');
  const count = selected.size;

  useEscapeToClose(true, () => (panel ? setPanel(null) : onClose()));

  async function run(body: object, okMessage: (n: number) => string) {
    setBusy(true);
    try {
      const res: { done: number; failed: { id: string; error: string }[] } = await api.post('/api/tasks/batch', body);
      if (res.failed.length > 0) showToast(t.partialError(res.done, res.failed.length, res.failed[0].error), 'error');
      else showToast(okMessage(res.done));
      await onApplied();
      onClose();
    } catch (err) {
      showToast(describeApiError(err, t.error), 'error');
    } finally {
      setBusy(false);
    }
  }

  function update(patchFor: (task: TaskWithProject | undefined) => Record<string, unknown> | null, okMessage: (n: number) => string) {
    const updates: { id: string; patch: Record<string, unknown> }[] = [];
    let skipped = 0;
    for (const id of selected) {
      const patch = patchFor(getTask(id));
      if (patch) updates.push({ id, patch });
      else skipped += 1;
    }
    if (skipped > 0) {
      showToast(t.moveNeedsArea(skipped), 'error');
      return;
    }
    if (updates.length > 0) run({ updates }, okMessage);
  }

  const btn = 'min-h-[44px] shrink-0 rounded-full px-3 text-xs font-medium hover:bg-base-border/40 disabled:opacity-40';
  const field = 'rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-xs';
  const none = count === 0 || busy;

  return (
    <div
      role="region"
      aria-label={t.barAriaLabel}
      className="fixed inset-x-2 bottom-20 z-40 mx-auto max-w-3xl rounded-card border border-base-border bg-base-surface p-2 shadow-lg md:bottom-4 md:left-[calc(var(--nav-w)+1rem)]"
    >
      {panel === 'move' ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-base-border px-1 pb-2">
          <QuickDateChips onPick={setMoveDate} />
          <input type="date" value={moveDate} onChange={(e) => setMoveDate(e.target.value)} aria-label={t.moveDateLabel} className={field} />
          <select value={fallbackAreaId} onChange={(e) => setFallbackAreaId(e.target.value)} aria-label={t.moveAreaLabel} className={field}>
            <option value="">{t.moveAreaLabel}</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            disabled={none || !moveDate}
            onClick={() => update((task) => (task ? movePatchFor(task, moveDate, fallbackAreaId || null) : null), t.moved)}
            className={clsx(btn, 'bg-accent text-white hover:bg-accent')}
          >
            {t.apply}
          </button>
        </div>
      ) : null}
      {panel === 'area' ? (
        <div className="flex flex-wrap items-center gap-2 border-b border-base-border px-1 pb-2">
          <select
            defaultValue=""
            aria-label={t.area}
            disabled={none}
            onChange={(e) => e.target.value && update(() => ({ areaId: e.target.value === 'none' ? null : e.target.value }), t.updated)}
            className={field}
          >
            <option value="" disabled>
              {t.chooseArea}
            </option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {panel === 'priority' ? (
        <div className="flex flex-wrap items-center gap-1 border-b border-base-border px-1 pb-2">
          {(['HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
            <button key={p} type="button" disabled={none} onClick={() => update(() => ({ priority: p }), t.updated)} className={clsx(btn, 'border border-base-border')}>
              {PRIORITY_LABELS[p]}
            </button>
          ))}
        </div>
      ) : null}
      <div className="flex items-center gap-1 overflow-x-auto pt-1">
        <span className="shrink-0 px-2 text-xs font-semibold tabular-nums" aria-live="polite">
          {t.count(count)}
        </span>
        <button type="button" onClick={onSelectAll} className={btn}>
          {t.selectAll}
        </button>
        <button type="button" disabled={none} onClick={() => update(() => ({ done: true }), t.completed)} className={btn}>
          {t.complete}
        </button>
        <button type="button" disabled={none} aria-expanded={panel === 'move'} onClick={() => setPanel(panel === 'move' ? null : 'move')} className={btn}>
          {t.move}
        </button>
        <button type="button" disabled={none} aria-expanded={panel === 'area'} onClick={() => setPanel(panel === 'area' ? null : 'area')} className={btn}>
          {t.area}
        </button>
        <button type="button" disabled={none} aria-expanded={panel === 'priority'} onClick={() => setPanel(panel === 'priority' ? null : 'priority')} className={btn}>
          {t.priority}
        </button>
        <button
          type="button"
          disabled={none}
          onClick={() => window.confirm(t.deleteConfirm(count)) && run({ deleteIds: [...selected] }, t.deleted)}
          className={clsx(btn, 'text-priority-high hover:bg-priority-high/10')}
        >
          {t.delete}
        </button>
        <button type="button" onClick={onClose} aria-label={t.cancel} className={clsx(btn, 'ml-auto')}>
          ✕
        </button>
      </div>
    </div>
  );
}
