'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import type { Area, TaskWithProject } from '@/types';
import { isoWeekAndDowFor, todayLocalString } from '@/lib/week';
import { TimeSelect } from '@/components/TimeSelect';
import { QuickDateChips } from '@/components/QuickDateChips';
import { text } from '@/i18n/es';

interface Props {
  items: TaskWithProject[];
  areas: Area[];
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateCalendarEvent?: (id: string) => Promise<void>;
  onClose: () => void;
}

// Árbol de decisión de A.6.1. La cola se captura una sola vez al abrir:
// `items` va encogiendo según se procesa cada tarea (sale de la Bandeja), y
// si indexáramos sobre esa lista en vivo el índice se desalinearía y
// saltaría elementos.
type Step =
  | 'actionable'
  | 'notActionable'
  | 'somedayForm'
  | 'twoMinutes'
  | 'timer'
  | 'yourTurn'
  | 'delegateChoice'
  | 'waitForm'
  | 'singleAction'
  | 'schedule'
  | 'calendarOffer'
  | 'project';

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

export function InboxTriageWizard({ items, areas, onUpdate, onDelete, onCreateCalendarEvent, onClose }: Props) {
  const [queue] = useState(items);
  const [index, setIndex] = useState(0);
  const [step, setStep] = useState<Step>('actionable');

  const [date, setDate] = useState(todayLocalString());
  const [areaId, setAreaId] = useState(areas[0]?.id ?? '');
  const [time, setTime] = useState('');
  const [firstStep, setFirstStep] = useState('');
  const [projectFirstStep, setProjectFirstStep] = useState('');
  const [somedayDate, setSomedayDate] = useState('');
  const [waitMode, setWaitMode] = useState<'wait' | 'delegate'>('wait');
  const [waitPerson, setWaitPerson] = useState('');
  const [waitFollowUp, setWaitFollowUp] = useState('');
  const [busy, setBusy] = useState(false);

  const current = queue[index];

  function resetFormState() {
    setDate(todayLocalString());
    setAreaId(areas[0]?.id ?? '');
    setTime('');
    setFirstStep('');
    setProjectFirstStep('');
    setSomedayDate('');
    setWaitPerson('');
    setWaitFollowUp('');
  }

  function advance() {
    setStep('actionable');
    resetFormState();
    setBusy(false);
    setIndex((i) => i + 1);
  }

  async function run(action: () => Promise<void>) {
    setBusy(true);
    try {
      await action();
      advance();
    } finally {
      setBusy(false);
    }
  }

  async function markDone() {
    await run(() => onUpdate(current.id, { done: true }));
  }

  async function discard() {
    await run(() => onDelete(current.id));
  }

  async function saveIdea() {
    await run(async () => {
      const tag = await api.post('/api/tags', { name: 'Idea' });
      const tagIds = Array.from(new Set([...current.tags.map((t) => t.id), tag.id]));
      await onUpdate(current.id, { gtdStatus: 'ALGUN_DIA', tagIds });
    });
  }

  async function submitSomeday() {
    const patch: Record<string, unknown> = { gtdStatus: 'ALGUN_DIA' };
    if (somedayDate) patch.snoozeUntil = new Date(`${somedayDate}T00:00`).toISOString();
    await run(() => onUpdate(current.id, patch));
  }

  async function submitWaitForm() {
    if (!waitPerson.trim() || !waitFollowUp) return;
    await run(() =>
      onUpdate(current.id, {
        gtdStatus: 'ESPERANDO',
        waitingOn: waitPerson.trim(),
        followUpDate: new Date(waitFollowUp).toISOString(),
        ...(waitMode === 'delegate' ? { assignedTo: waitPerson.trim() } : {}),
      })
    );
  }

  async function submitSchedule() {
    // "Sin fecha todavía" (date vacío): la tarea se queda en Bandeja, solo
    // organizada. No se le puede fijar área sin día (el modelo la limpia en
    // cualquier tarea que no sea DAY_AREA), así que en ese caso no se pide.
    if (!date) {
      const patch: Record<string, unknown> = { markProcessed: true, processedAt: new Date() };
      if (firstStep.trim()) patch.firstStep = firstStep.trim();
      await run(() => onUpdate(current.id, patch));
      return;
    }

    if (!areaId) return;
    const { isoWeek, dayOfWeek } = isoWeekAndDowFor(date);
    const patch: Record<string, unknown> = {
      kind: 'DAY_AREA',
      isoWeek,
      dayOfWeek,
      areaId,
    };
    if (firstStep.trim()) patch.firstStep = firstStep.trim();
    if (time) patch.scheduledAt = new Date(`${date}T${time}`).toISOString();
    setBusy(true);
    try {
      await onUpdate(current.id, patch);
      if (time) {
        setStep('calendarOffer');
        setBusy(false);
      } else {
        advance();
      }
    } catch {
      setBusy(false);
    }
  }

  async function createEventAndAdvance() {
    setBusy(true);
    try {
      if (onCreateCalendarEvent) await onCreateCalendarEvent(current.id);
    } finally {
      advance();
    }
  }

  async function submitProject() {
    if (!projectFirstStep.trim()) return;
    await run(async () => {
      await api.post('/api/tasks', { kind: 'BACKLOG', text: projectFirstStep.trim(), parentTaskId: current.id });
      await onUpdate(current.id, { markProcessed: true, processedAt: new Date() });
    });
  }

  if (!current) {
    return (
      <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4">
        <div className="w-full max-w-sm rounded-card bg-base-surface p-6 text-center shadow-xl">
          <p className="mb-1 text-lg font-semibold">{text.inboxTriage.emptyTitle}</p>
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
          <div className="flex flex-col gap-2">
            <button
              disabled={busy}
              onClick={saveIdea}
              className="rounded-full border border-base-border px-4 py-2 text-sm font-medium hover:bg-base-border/40 disabled:opacity-40"
            >
              {text.inboxTriage.notActionableIdea}
            </button>
            <button
              disabled={busy}
              onClick={() => setStep('somedayForm')}
              className="rounded-full border border-base-border px-4 py-2 text-sm font-medium hover:bg-base-border/40 disabled:opacity-40"
            >
              {text.inboxTriage.notActionableSomeday}
            </button>
            <button
              disabled={busy}
              onClick={discard}
              className="rounded-full px-4 py-2 text-sm font-medium text-priority-high hover:bg-priority-high/10 disabled:opacity-40"
            >
              {text.inboxTriage.notActionableDiscard}
            </button>
          </div>
        ) : null}

        {step === 'somedayForm' ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-base-muted">{text.inboxTriage.somedayDateQuestion}</p>
            <QuickDateChips onPick={setSomedayDate} />
            <input
              type="date"
              value={somedayDate}
              onChange={(e) => setSomedayDate(e.target.value)}
              className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            />
            {somedayDate ? (
              <button onClick={() => setSomedayDate('')} className="text-xs text-base-muted hover:underline">
                {text.inboxTriage.clearDate}
              </button>
            ) : null}
            <button
              onClick={submitSomeday}
              disabled={busy}
              className="w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {text.inboxTriage.somedaySubmit}
            </button>
          </div>
        ) : null}

        {step === 'twoMinutes' ? (
          <div className="space-y-2">
            <p className="mb-2 text-center text-sm text-base-muted">{text.inboxTriage.twoMinutesQuestion}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('timer')}
                className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                {text.inboxTriage.doItNow}
              </button>
              <button
                onClick={() => setStep('yourTurn')}
                className="flex-1 rounded-full border border-base-border px-4 py-2 text-sm font-medium hover:bg-base-border/40"
              >
                {text.inboxTriage.notTwoMinutes}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'timer' ? <TwoMinuteTimer onDone={markDone} /> : null}

        {step === 'yourTurn' ? (
          <div className="space-y-2">
            <p className="mb-2 text-center text-sm text-base-muted">{text.inboxTriage.yourTurnQuestion}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('singleAction')}
                className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                {text.inboxTriage.yes}
              </button>
              <button
                onClick={() => setStep('delegateChoice')}
                className="flex-1 rounded-full border border-base-border px-4 py-2 text-sm font-medium hover:bg-base-border/40"
              >
                {text.inboxTriage.no}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'delegateChoice' ? (
          <div className="flex gap-2">
            <button
              onClick={() => {
                setWaitMode('wait');
                setStep('waitForm');
              }}
              className="flex-1 rounded-full border border-base-border px-4 py-2 text-sm font-medium hover:bg-base-border/40"
            >
              {text.inboxTriage.waitForSomeone}
            </button>
            <button
              onClick={() => {
                setWaitMode('delegate');
                setStep('waitForm');
              }}
              className="flex-1 rounded-full border border-base-border px-4 py-2 text-sm font-medium hover:bg-base-border/40"
            >
              {text.inboxTriage.delegate}
            </button>
          </div>
        ) : null}

        {step === 'waitForm' ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-base-muted">
              {waitMode === 'delegate' ? text.inboxTriage.waitFormTitleDelegate : text.inboxTriage.waitFormTitleWait}
            </p>
            <input
              value={waitPerson}
              onChange={(e) => setWaitPerson(e.target.value)}
              placeholder={text.inboxTriage.waitFormPersonPlaceholder}
              className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            />
            <label className="block text-xs text-base-muted">
              {text.inboxTriage.waitFormFollowUpLabel}
              <input
                type="date"
                value={waitFollowUp}
                onChange={(e) => setWaitFollowUp(e.target.value)}
                className="mt-1 w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
              />
            </label>
            <button
              onClick={submitWaitForm}
              disabled={!waitPerson.trim() || !waitFollowUp || busy}
              className="w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {text.inboxTriage.waitFormSubmit}
            </button>
          </div>
        ) : null}

        {step === 'singleAction' ? (
          <div className="space-y-2">
            <p className="mb-2 text-center text-sm text-base-muted">{text.inboxTriage.singleActionQuestion}</p>
            <div className="flex gap-2">
              <button
                onClick={() => setStep('schedule')}
                className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white"
              >
                {text.inboxTriage.createTask}
              </button>
              <button
                onClick={() => setStep('project')}
                className="flex-1 rounded-full border border-base-border px-4 py-2 text-sm font-medium hover:bg-base-border/40"
              >
                {text.inboxTriage.createProject}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'schedule' ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-base-muted">{text.inboxTriage.whenWhereQuestion}</p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => setDate('')}
                className={
                  date === ''
                    ? 'rounded-full border border-accent px-2.5 py-1 text-xs font-medium text-accent'
                    : 'rounded-full border border-base-border px-2.5 py-1 text-xs hover:bg-base-border/40'
                }
              >
                {text.inboxTriage.noDateYet}
              </button>
              <QuickDateChips onPick={setDate} />
            </div>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            />
            {date ? (
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
            ) : null}
            {date ? (
              <label className="block text-xs text-base-muted">
                {text.inboxTriage.optionalTimeLabel}
                <TimeSelect value={time} onChange={setTime} className="mt-1 w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm" />
              </label>
            ) : null}
            <label className="block text-xs text-base-muted">
              {text.inboxTriage.optionalFirstStepLabel}
              <input
                value={firstStep}
                onChange={(e) => setFirstStep(e.target.value)}
                placeholder={text.inboxTriage.optionalFirstStepPlaceholder}
                maxLength={120}
                className="mt-1 w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
              />
            </label>
            <button
              onClick={submitSchedule}
              disabled={(!!date && !areaId) || busy}
              className="w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {text.inboxTriage.scheduleButton}
            </button>
          </div>
        ) : null}

        {step === 'calendarOffer' ? (
          <div className="space-y-3 text-center">
            <p className="text-sm text-base-muted">{text.inboxTriage.fixedDateTimeQuestion}</p>
            <div className="flex gap-2">
              {onCreateCalendarEvent ? (
                <button
                  onClick={createEventAndAdvance}
                  disabled={busy}
                  className="flex-1 rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
                >
                  {text.inboxTriage.createEvent}
                </button>
              ) : null}
              <button
                onClick={advance}
                className="flex-1 rounded-full border border-base-border px-4 py-2 text-sm font-medium hover:bg-base-border/40"
              >
                {text.inboxTriage.continueButton}
              </button>
            </div>
          </div>
        ) : null}

        {step === 'project' ? (
          <div className="space-y-3">
            <p className="text-center text-sm text-base-muted">{text.inboxTriage.firstStepQuestion}</p>
            <input
              value={projectFirstStep}
              onChange={(e) => setProjectFirstStep(e.target.value)}
              placeholder={text.inboxTriage.firstStepPlaceholder}
              className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            />
            <button
              onClick={submitProject}
              disabled={!projectFirstStep.trim() || busy}
              className="w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-40"
            >
              {text.inboxTriage.firstStepSubmit}
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
