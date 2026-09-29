'use client';

import { useRef, useState } from 'react';
import clsx from 'clsx';
import type { TaskWithProject } from '@/types';
import { text } from '@/i18n/es';
import { useTop3Toggle } from '@/components/useTop3Toggle';
import { Top3SwapModal } from '@/components/Top3SwapModal';
import { CLOSE_CHECK_IDS, PREP_OFFER_CHECK_IDS, type CloseCheckId } from '@/lib/day-close';

export type PendingTaskDecision = 'MANANA' | 'OTRA_FECHA' | 'ALGUN_DIA' | 'HECHA' | 'ELIMINAR';

interface Props {
  dayLabel: string;
  tasks: TaskWithProject[]; // tareas DAY_AREA de hoy
  tomorrowLabel: string; // día concreto, p.ej. "Lunes 28"
  tomorrowTasks: TaskWithProject[] | null; // null mientras se cargan (puede ser de otra semana)
  tomorrowFirstTaskId: string | null;
  initialJournalNote: string;
  onSaveJournal: (note: string) => Promise<void>;
  extendedFocusEnabled: boolean;
  initialGratitude: string;
  initialLearning: string;
  onSaveGratitude: (value: string) => Promise<void>;
  onSaveLearning: (value: string) => Promise<void>;
  onDecidePendingTask: (taskId: string, decision: PendingTaskDecision, dateStr?: string) => Promise<void>;
  onUpdateTask: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onSetTomorrowFirstTask: (taskId: string | null) => Promise<void>;
  onCreatePrepTask: (taskText: string) => Promise<void>;
  onFinishClose: (closeChecks: string[]) => Promise<void>;
  onClose: () => void;
}

const CHECK_LABELS: Record<CloseCheckId, string> = {
  firstTaskReady: text.dayCloseRitual.checkFirstTaskReady,
  firstTaskSupplies: text.dayCloseRitual.checkFirstTaskSupplies,
  someoneWaiting: text.dayCloseRitual.checkSomeoneWaiting,
  meetingsReady: text.dayCloseRitual.checkMeetingsReady,
  fixedTimeCommitment: text.dayCloseRitual.checkFixedTimeCommitment,
};

export function DayCloseRitual({
  dayLabel,
  tasks,
  tomorrowLabel,
  tomorrowTasks,
  tomorrowFirstTaskId,
  initialJournalNote,
  onSaveJournal,
  extendedFocusEnabled,
  initialGratitude,
  initialLearning,
  onSaveGratitude,
  onSaveLearning,
  onDecidePendingTask,
  onUpdateTask,
  onSetTomorrowFirstTask,
  onCreatePrepTask,
  onFinishClose,
  onClose,
}: Props) {
  const [journal, setJournal] = useState(initialJournalNote);
  const [gratitude, setGratitude] = useState(initialGratitude);
  const [learning, setLearning] = useState(initialLearning);
  const [extendedOpen, setExtendedOpen] = useState(false);
  const [otherDateOpenId, setOtherDateOpenId] = useState<string | null>(null);
  const [otherDateValue, setOtherDateValue] = useState('');
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [bulkDeciding, setBulkDeciding] = useState(false);
  const [checkedIds, setCheckedIds] = useState<Set<CloseCheckId>>(new Set());
  const [prepTaskCreated, setPrepTaskCreated] = useState<Partial<Record<CloseCheckId, boolean>>>({});
  const [closing, setClosing] = useState(false);
  const [closed, setClosed] = useState(false);
  const pendingSectionRef = useRef<HTMLDivElement>(null);

  const {
    top3Tasks: tomorrowTop3,
    pendingTop3,
    handleToggleTop3,
    pendingSwap,
    swapBusy,
    confirmSwap,
    cancelSwap,
  } = useTop3Toggle(tomorrowTasks ?? [], onUpdateTask);

  const done = tasks.filter((t) => t.done);
  const pending = tasks.filter((t) => !t.done);
  const firstTaskText = tomorrowTasks?.find((t) => t.id === tomorrowFirstTaskId)?.text ?? null;

  async function decide(taskId: string, decision: PendingTaskDecision, dateStr?: string) {
    setDecidingId(taskId);
    try {
      await onDecidePendingTask(taskId, decision, dateStr);
      setOtherDateOpenId(null);
      setOtherDateValue('');
    } finally {
      setDecidingId(null);
    }
  }

  async function decideAllTomorrow() {
    setBulkDeciding(true);
    try {
      await Promise.all(pending.map((task) => onDecidePendingTask(task.id, 'MANANA')));
    } finally {
      setBulkDeciding(false);
    }
  }

  function toggleCheck(id: CloseCheckId) {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function createPrepTask(id: CloseCheckId, taskText: string) {
    await onCreatePrepTask(taskText);
    setPrepTaskCreated((prev) => ({ ...prev, [id]: true }));
  }

  function handleFinishClose() {
    if (pending.length > 0) {
      const el = pendingSectionRef.current;
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Siempre da una señal visible al pulsar, aunque la sección ya estuviera a la vista.
      el?.classList.add('ring-2', 'ring-priority-medium');
      setTimeout(() => el?.classList.remove('ring-2', 'ring-priority-medium'), 1000);
      return;
    }
    void finishClose();
  }

  async function finishClose() {
    setClosing(true);
    try {
      await onFinishClose(Array.from(checkedIds));
      setClosed(true);
    } finally {
      setClosing(false);
    }
  }

  if (closed) {
    return (
      <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
        <div className="w-full max-w-sm rounded-t-2xl bg-base-surface p-6 text-center shadow-xl sm:rounded-card">
          <p className="text-base font-medium">{text.dayCloseRitual.closedMessage}</p>
          <button onClick={onClose} className="mt-4 w-full rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white">
            {text.dayCloseRitual.closedCloseButton}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      {pendingSwap ? (
        <Top3SwapModal
          currentTop3={tomorrowTop3}
          incomingTaskText={pendingSwap.text}
          busy={swapBusy}
          onSwap={confirmSwap}
          onCancel={cancelSwap}
        />
      ) : null}
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-base-surface p-6 shadow-xl sm:rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{text.dayCloseRitual.heading(dayLabel)}</h2>
          <button onClick={onClose} aria-label={text.dayCloseRitual.closeAriaLabel} className="rounded-full p-1.5 text-base-muted hover:bg-base-border/40">
            ✕
          </button>
        </div>

        <div className="space-y-5 text-sm">
          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-muted">{text.dayCloseRitual.doneTodaySection}</h3>
            {tasks.length === 0 ? (
              <p className="text-base-muted">{text.dayCloseRitual.noPlannedTasks}</p>
            ) : (
              <p>{text.dayCloseRitual.doneOfTotal(done.length, tasks.length)}</p>
            )}
          </section>

          {pending.length > 0 ? (
            <section
              ref={pendingSectionRef}
              className="rounded-lg border border-priority-medium bg-priority-medium/5 p-3 transition-shadow"
            >
              <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-base-muted">
                {text.dayCloseRitual.pendingSection(pending.length)}
              </h3>
              <p className="mb-2 text-xs font-medium text-priority-medium">{text.dayCloseRitual.pendingAlert(pending.length)}</p>
              <button
                onClick={decideAllTomorrow}
                disabled={bulkDeciding || decidingId !== null}
                className="mb-2 rounded-full border border-accent px-2.5 py-1 text-xs font-medium text-accent hover:bg-accent/10 disabled:opacity-40"
              >
                {text.dayCloseRitual.bulkTomorrowButton(tomorrowLabel)}
              </button>
              <div className="space-y-2">
                {pending.map((task) => (
                  <div key={task.id} className="rounded-lg border border-base-border bg-base-surface p-2">
                    <p className="mb-1.5 truncate text-sm">{task.text}</p>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        onClick={() => decide(task.id, 'MANANA')}
                        disabled={decidingId === task.id || bulkDeciding}
                        className="rounded-full border border-base-border px-2.5 py-1 text-xs hover:bg-base-border/40 disabled:opacity-40"
                      >
                        {tomorrowLabel}
                      </button>
                      <button
                        onClick={() => setOtherDateOpenId(otherDateOpenId === task.id ? null : task.id)}
                        disabled={decidingId === task.id || bulkDeciding}
                        className="rounded-full border border-base-border px-2.5 py-1 text-xs hover:bg-base-border/40 disabled:opacity-40"
                      >
                        {text.dayCloseRitual.decisionOtherDate}
                      </button>
                      <button
                        onClick={() => decide(task.id, 'ALGUN_DIA')}
                        disabled={decidingId === task.id || bulkDeciding}
                        className="rounded-full border border-base-border px-2.5 py-1 text-xs hover:bg-base-border/40 disabled:opacity-40"
                      >
                        {text.dayCloseRitual.decisionSomeday}
                      </button>
                      <button
                        onClick={() => decide(task.id, 'HECHA')}
                        disabled={decidingId === task.id || bulkDeciding}
                        className="rounded-full border border-base-border px-2.5 py-1 text-xs hover:bg-base-border/40 disabled:opacity-40"
                      >
                        {text.dayCloseRitual.decisionDone}
                      </button>
                      <button
                        onClick={() => decide(task.id, 'ELIMINAR')}
                        disabled={decidingId === task.id || bulkDeciding}
                        className="rounded-full border border-base-border px-2.5 py-1 text-xs text-priority-high hover:bg-priority-high/10 disabled:opacity-40"
                      >
                        {text.dayCloseRitual.decisionDelete}
                      </button>
                    </div>
                    {otherDateOpenId === task.id ? (
                      <div className="mt-1.5 flex items-center gap-1.5">
                        <input
                          type="date"
                          value={otherDateValue}
                          onChange={(e) => setOtherDateValue(e.target.value)}
                          className="rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs"
                        />
                        <button
                          onClick={() => otherDateValue && decide(task.id, 'OTRA_FECHA', otherDateValue)}
                          disabled={!otherDateValue || decidingId === task.id}
                          className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white disabled:opacity-40"
                        >
                          {text.dayCloseRitual.otherDateConfirm}
                        </button>
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </section>
          ) : null}

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-muted">
              {text.dayCloseRitual.firstTaskSection(tomorrowLabel)}
            </h3>
            {tomorrowTasks === null ? (
              <p className="text-base-muted">{text.dayCloseRitual.tomorrowLoading}</p>
            ) : tomorrowTasks.length === 0 ? (
              <p className="text-base-muted">{text.dayCloseRitual.firstTaskEmpty(tomorrowLabel)}</p>
            ) : (
              <select
                value={tomorrowFirstTaskId ?? ''}
                onChange={(e) => onSetTomorrowFirstTask(e.target.value || null)}
                className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
              >
                <option value="">{text.dayCloseRitual.firstTaskPlaceholder}</option>
                {tomorrowTasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.text}
                  </option>
                ))}
              </select>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-muted">
              {text.dayCloseRitual.tomorrowTop3Section(tomorrowLabel)}
            </h3>
            {tomorrowTasks === null ? (
              <p className="text-base-muted">{text.dayCloseRitual.tomorrowLoading}</p>
            ) : tomorrowTasks.length === 0 ? (
              <p className="text-base-muted">{text.dayCloseRitual.tomorrowEmpty(tomorrowLabel)}</p>
            ) : (
              <div className="space-y-1.5">
                {tomorrowTasks.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggleTop3(t.id, !t.isTop3)}
                      disabled={pendingTop3.has(t.id)}
                      aria-label={text.dayCloseRitual.toggleTop3AriaLabel(t.isTop3)}
                      className={clsx('shrink-0 disabled:opacity-40', t.isTop3 ? 'text-amber-500' : 'text-base-muted/50')}
                    >
                      {t.isTop3 ? '⭐' : '☆'}
                    </button>
                    <span className="flex-1 truncate">{t.text}</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-base-muted">{text.dayCloseRitual.checksTitle}</h3>
            <div className="space-y-2">
              {CLOSE_CHECK_IDS.map((id) => (
                <div key={id}>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={checkedIds.has(id)}
                      onChange={() => toggleCheck(id)}
                      className="h-4 w-4 rounded border-base-border"
                    />
                    <span>{CHECK_LABELS[id]}</span>
                  </label>
                  {PREP_OFFER_CHECK_IDS.includes(id) && tomorrowTasks !== null ? (
                    prepTaskCreated[id] ? (
                      <p className="ml-6 mt-0.5 text-xs text-accent">{text.dayCloseRitual.prepTaskCreated}</p>
                    ) : (
                      <button
                        onClick={() =>
                          createPrepTask(
                            id,
                            id === 'firstTaskSupplies'
                              ? `${text.dayCloseRitual.prepTaskPrefix} ${firstTaskText ?? text.dayCloseRitual.prepTaskFirstTaskFallback}`
                              : text.dayCloseRitual.prepTaskMeetings
                          )
                        }
                        className="ml-6 mt-0.5 text-xs font-medium text-accent hover:underline"
                      >
                        {text.dayCloseRitual.createPrepTaskLink}
                      </button>
                    )
                  ) : null}
                </div>
              ))}
            </div>
          </section>

          <section>
            <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-base-muted">
              {text.dayCloseRitual.journalLabel}
            </label>
            <textarea
              value={journal}
              onChange={(e) => setJournal(e.target.value)}
              onBlur={() => onSaveJournal(journal)}
              rows={2}
              placeholder={text.dayCloseRitual.journalPlaceholder}
              className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            />
          </section>

          {extendedFocusEnabled ? (
            <section className="border-t border-base-border pt-3">
              <button
                onClick={() => setExtendedOpen((v) => !v)}
                className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent"
              >
                {text.dayCloseRitual.extendedSectionTitle}{' '}
                {extendedOpen ? `(${text.dayCloseRitual.extendedSectionHide})` : `(${text.dayCloseRitual.extendedSectionShow})`}
              </button>
              {extendedOpen ? (
                <div className="space-y-4">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-base-muted">
                      {text.dayCloseRitual.gratitudeLabel}
                    </label>
                    <textarea
                      value={gratitude}
                      onChange={(e) => setGratitude(e.target.value)}
                      onBlur={() => onSaveGratitude(gratitude)}
                      rows={2}
                      placeholder={text.dayCloseRitual.gratitudePlaceholder}
                      className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-base-muted">
                      {text.dayCloseRitual.learningLabel}
                    </label>
                    <textarea
                      value={learning}
                      onChange={(e) => setLearning(e.target.value)}
                      onBlur={() => onSaveLearning(learning)}
                      rows={2}
                      placeholder={text.dayCloseRitual.learningPlaceholder}
                      className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
                    />
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}
        </div>

        <div className="mt-6 flex justify-end border-t border-base-border pt-4">
          <button
            onClick={handleFinishClose}
            disabled={closing}
            className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {text.dayCloseRitual.finishButton}
          </button>
        </div>
      </div>
    </div>
  );
}
