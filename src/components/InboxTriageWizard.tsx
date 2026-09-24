'use client';

import { useEffect, useState } from 'react';
import type { Area, TaskWithProject } from '@/types';
import { DAY_NAMES } from '@/lib/week';
import { text } from '@/i18n/es';

interface Props {
  items: TaskWithProject[];
  areas: Area[];
  currentIsoWeek: string;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onClose: () => void;
}

type Step = 'actionable' | 'twoMinutes' | 'schedule' | 'notActionable';

function TwoMinuteTimer({ onDone }: { onDone: () => void }) {
  const [seconds, setSeconds] = useState(120);
  useEffect(() => {
    if (seconds <= 0) return;
    const t = setTimeout(() => setSeconds((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [seconds]);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return (
    <div className="space-y-3 text-center">
      <p className="text-3xl font-semibold tabular-nums">
        {mm}:{ss}
      </p>
      <p className="text-sm text-base-muted">{text.inboxTriage.doItNowBody}</p>
      <button onClick={onDone} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white">
        {text.inboxTriage.doneButton}
      </button>
    </div>
  );
}

export function InboxTriageWizard({ items, areas, currentIsoWeek, onUpdate, onDelete, onClose }: Props) {
  // La cola se captura una sola vez al abrir: `items` va encogiendo según se
  // procesa cada tarea (sale de la bandeja), y si indexáramos sobre esa lista
  // en vivo el índice se desalinearía y saltaría elementos.
  const [queue] = useState(items);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>('actionable');
  const [timerActive, setTimerActive] = useState(false);
  const [day, setDay] = useState(0);
  const [areaId, setAreaId] = useState(areas[0]?.id ?? '');

  const current = queue[index];

  function advance() {
    setStep('actionable');
    setTimerActive(false);
    setIndex((i) => i + 1);
  }

  async function markDone() {
    await onUpdate(current.id, { done: true });
    advance();
  }

  async function discard() {
    await onDelete(current.id);
    advance();
  }

  async function someday() {
    await onUpdate(current.id, { quadrant: 'ALGUN_DIA' });
    advance();
  }

  async function schedule() {
    if (!areaId) return;
    await onUpdate(current.id, { kind: 'DAY_AREA', isoWeek: currentIsoWeek, dayOfWeek: day, areaId });
    advance();
  }

  if (!current) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm rounded-card bg-base-surface p-6 text-center shadow-xl">
          <p className="mb-4 text-lg font-semibold">{text.inboxTriage.emptyTitle}</p>
          <p className="mb-4 text-sm text-base-muted">{text.inboxTriage.emptyBody}</p>
          <button onClick={onClose} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white">
            {text.inboxTriage.close}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-md rounded-t-2xl bg-base-surface p-6 shadow-xl sm:rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-medium uppercase tracking-wide text-base-muted">
            {text.inboxTriage.progress(index + 1, queue.length)}
          </span>
          <button onClick={onClose} aria-label={text.inboxTriage.closeAriaLabel} className="rounded-full p-1.5 text-base-muted hover:bg-base-border/40">
            ✕
          </button>
        </div>

        <p className="mb-5 text-center text-lg font-medium">{current.text}</p>

        {step === 'actionable' ? (
          <div className="space-y-2">
            <p className="mb-2 text-center text-sm text-base-muted">{text.inboxTriage.actionableQuestion}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('twoMinutes')}
                className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                {text.inboxTriage.yes}
              </button>
              <button
                onClick={() => setStep('notActionable')}
                className="flex-1 rounded-full border border-base-border px-4 py-2 text-sm font-medium hover:bg-base-border/40"
              >
                {text.inboxTriage.no}
              </button>
            </div>
            <button onClick={advance} className="mt-2 w-full text-center text-xs text-base-muted hover:underline">
              {text.inboxTriage.skip}
            </button>
          </div>
        ) : null}

        {step === 'notActionable' ? (
          <div className="space-y-2">
            <p className="mb-2 text-center text-sm text-base-muted">{text.inboxTriage.notActionableQuestion}</p>
            <div className="flex gap-2">
              <button
                onClick={someday}
                className="flex-1 rounded-full border border-base-border px-4 py-2 text-sm font-medium hover:bg-base-border/40"
              >
                {text.inboxTriage.someday}
              </button>
              <button
                onClick={discard}
                className="flex-1 rounded-full px-4 py-2 text-sm font-medium text-priority-high hover:bg-priority-high/10"
              >
                {text.inboxTriage.discard}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'twoMinutes' && !timerActive ? (
          <div className="space-y-2">
            <p className="mb-2 text-center text-sm text-base-muted">{text.inboxTriage.twoMinutesQuestion}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setTimerActive(true)}
                className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                {text.inboxTriage.doItNow}
              </button>
              <button
                onClick={() => setStep('schedule')}
                className="flex-1 rounded-full border border-base-border px-4 py-2 text-sm font-medium hover:bg-base-border/40"
              >
                {text.inboxTriage.reserveTime}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'twoMinutes' && timerActive ? <TwoMinuteTimer onDone={markDone} /> : null}

        {step === 'schedule' ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-base-muted">{text.inboxTriage.whenWhereQuestion}</p>
            <div className="flex gap-1.5">
              <select
                value={day}
                onChange={(e) => setDay(Number(e.target.value))}
                className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
              >
                {DAY_NAMES.map((d, i) => (
                  <option key={d} value={i}>
                    {d}
                  </option>
                ))}
              </select>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={schedule}
              disabled={!areaId}
              className="w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {text.inboxTriage.scheduleButton}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
