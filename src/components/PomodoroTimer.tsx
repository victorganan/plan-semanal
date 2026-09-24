'use client';

import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { text } from '@/i18n/es';

type Phase = 'work' | 'short_break' | 'long_break';

interface TodayTask {
  id: string;
  text: string;
}

const PHASE_LABELS: Record<Phase, string> = {
  work: text.pomodoro.phaseWork,
  short_break: text.pomodoro.phaseShortBreak,
  long_break: text.pomodoro.phaseLongBreak,
};

function playChime() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    [880, 1108].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = freq;
      const start = ctx.currentTime + i * 0.18;
      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.18, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + 0.35);
      osc.start(start);
      osc.stop(start + 0.4);
    });
    setTimeout(() => ctx.close(), 900);
  } catch {
    // el navegador no soporta Web Audio; silencioso
  }
}

function notify(title: string, body: string) {
  if (typeof Notification === 'undefined') return;
  if (Notification.permission === 'granted') {
    new Notification(title, { body, icon: '/icon.png' });
  }
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function PomodoroTimer({ todayTasks: initialTodayTasks }: { todayTasks: TodayTask[] }) {
  const { showToast } = useToast();

  const [workMinutes, setWorkMinutes] = useState(25);
  const [shortBreakMinutes, setShortBreakMinutes] = useState(5);
  const [longBreakMinutes, setLongBreakMinutes] = useState(15);
  const [cyclesBeforeLong, setCyclesBeforeLong] = useState(4);
  const [settingsOpen, setSettingsOpen] = useState(false);

  const [phase, setPhase] = useState<Phase>('work');
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState(workMinutes * 60);
  const [cyclesCompleted, setCyclesCompleted] = useState(0);
  const [todayTasks, setTodayTasks] = useState(initialTodayTasks);
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [pomodorosToday, setPomodorosToday] = useState(0);
  const [minutesToday, setMinutesToday] = useState(0);
  const [taskCompletionPrompt, setTaskCompletionPrompt] = useState<TodayTask | null>(null);

  const endAtRef = useRef<number | null>(null);
  const phaseStartRef = useRef<string | null>(null);

  const durations: Record<Phase, number> = {
    work: workMinutes,
    short_break: shortBreakMinutes,
    long_break: longBreakMinutes,
  };

  useEffect(() => {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    api
      .get(`/api/focus-sessions?from=${from.toISOString()}`)
      .then((data) => {
        setPomodorosToday(data.count ?? 0);
        setMinutesToday(data.totalMinutes ?? 0);
      })
      .catch(() => {});
    if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (!running) return;
    const tick = () => {
      if (!endAtRef.current) return;
      const secondsLeft = Math.max(0, Math.round((endAtRef.current - Date.now()) / 1000));
      setRemaining(secondsLeft);
      if (secondsLeft === 0) handlePhaseComplete();
    };
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  function start() {
    endAtRef.current = Date.now() + remaining * 1000;
    if (phase === 'work' && remaining === durations.work * 60) {
      phaseStartRef.current = new Date().toISOString();
    }
    setRunning(true);
  }

  function pause() {
    setRunning(false);
  }

  function resetPhase() {
    setRunning(false);
    setRemaining(durations[phase] * 60);
    endAtRef.current = null;
  }

  // Registra el pomodoro trabajado (natural o adelantado) y pasa a descanso.
  // Si hay una tarea vinculada, pregunta si ya se ha terminado.
  async function finishWorkPhase(minutesWorked: number) {
    setRunning(false);
    playChime();

    try {
      await api.post('/api/focus-sessions', {
        taskId: selectedTaskId || null,
        minutes: minutesWorked,
        startedAt: phaseStartRef.current ?? new Date(Date.now() - minutesWorked * 60000).toISOString(),
      });
      setPomodorosToday((n) => n + 1);
      setMinutesToday((m) => m + minutesWorked);
    } catch {
      // si falla el registro, el temporizador sigue funcionando igualmente
    }

    const nextCycles = cyclesCompleted + 1;
    setCyclesCompleted(nextCycles);
    const nextPhase: Phase = nextCycles % cyclesBeforeLong === 0 ? 'long_break' : 'short_break';
    setPhase(nextPhase);
    setRemaining(durations[nextPhase] * 60);
    endAtRef.current = null;
    phaseStartRef.current = null;
    notify(text.pomodoro.completedNotifTitle, text.pomodoro.completedNotifBody);

    const linkedTask = selectedTaskId ? todayTasks.find((t) => t.id === selectedTaskId) : undefined;
    if (linkedTask) setTaskCompletionPrompt(linkedTask);
  }

  async function handlePhaseComplete() {
    if (phase === 'work') {
      await finishWorkPhase(durations.work);
    } else {
      setRunning(false);
      playChime();
      setPhase('work');
      setRemaining(durations.work * 60);
      endAtRef.current = null;
      notify(text.pomodoro.breakOverNotifTitle, text.pomodoro.breakOverNotifBody);
    }
  }

  // Botón manual: termina el enfoque antes de que suene el timer y arranca el descanso.
  function startBreakNow() {
    const elapsedMinutes = Math.max(1, Math.round((durations.work * 60 - remaining) / 60));
    finishWorkPhase(elapsedMinutes);
  }

  function skipBreak() {
    setRunning(false);
    setPhase('work');
    setRemaining(durations.work * 60);
    endAtRef.current = null;
  }

  async function confirmTaskDone(done: boolean) {
    const task = taskCompletionPrompt;
    setTaskCompletionPrompt(null);
    if (!task || !done) return;
    try {
      await api.patch(`/api/tasks/${task.id}`, { done: true });
      setTodayTasks((prev) => prev.filter((t) => t.id !== task.id));
      if (selectedTaskId === task.id) setSelectedTaskId('');
      showToast(text.pomodoro.taskMarkedDone);
    } catch {
      showToast(text.pomodoro.taskMarkDoneError, 'error');
    }
  }

  const total = durations[phase] * 60;
  const progress = total > 0 ? 1 - remaining / total : 0;
  const radius = 110;
  const circumference = 2 * Math.PI * radius;
  const hasStartedWork = phase === 'work' && remaining !== durations.work * 60;

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-center gap-2 text-sm font-medium text-base-muted">
        <span
          className={clsx(
            'rounded-full px-3 py-1',
            phase === 'work' ? 'bg-accent/15 text-accent' : 'bg-priority-low/15 text-priority-low'
          )}
        >
          {PHASE_LABELS[phase]}
        </span>
        <span>{text.pomodoro.todayStats(pomodorosToday, minutesToday)}</span>
      </div>

      <div className="relative mx-auto flex h-64 w-64 items-center justify-center">
        <svg className="absolute inset-0 -rotate-90" width="256" height="256" viewBox="0 0 256 256">
          <circle cx="128" cy="128" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-base-border" />
          <circle
            cx="128"
            cy="128"
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth="10"
            strokeLinecap="round"
            className={phase === 'work' ? 'text-accent' : 'text-priority-low'}
            strokeDasharray={circumference}
            strokeDashoffset={circumference * (1 - progress)}
            style={{ transition: 'stroke-dashoffset 1s linear' }}
          />
        </svg>
        <span className="text-5xl font-semibold tabular-nums">{formatTime(remaining)}</span>
      </div>

      {taskCompletionPrompt ? (
        <div className="mx-auto max-w-sm space-y-2 rounded-card border border-accent/40 bg-accent/5 p-3 text-center text-sm">
          <p>{text.pomodoro.taskDoneQuestion(taskCompletionPrompt.text)}</p>
          <div className="flex justify-center gap-2">
            <button
              onClick={() => confirmTaskDone(true)}
              className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white"
            >
              {text.pomodoro.taskDoneYes}
            </button>
            <button
              onClick={() => confirmTaskDone(false)}
              className="rounded-full border border-base-border px-4 py-1.5 text-xs font-medium hover:bg-base-border/40"
            >
              {text.pomodoro.taskDoneNo}
            </button>
          </div>
        </div>
      ) : null}

      {phase === 'work' && todayTasks.length > 0 ? (
        <select
          value={selectedTaskId}
          onChange={(e) => setSelectedTaskId(e.target.value)}
          className="mx-auto block w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
        >
          <option value="">{text.pomodoro.noTaskLinked}</option>
          {todayTasks.map((t) => (
            <option key={t.id} value={t.id}>
              {t.text}
            </option>
          ))}
        </select>
      ) : null}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={resetPhase}
          className="rounded-full border border-base-border px-4 py-2 text-sm font-medium hover:bg-base-border/40"
        >
          {text.pomodoro.reset}
        </button>
        {running ? (
          <button onClick={pause} className="rounded-full bg-accent px-8 py-3 text-base font-semibold text-white">
            {text.pomodoro.pause}
          </button>
        ) : (
          <button onClick={start} className="rounded-full bg-accent px-8 py-3 text-base font-semibold text-white">
            {remaining === total ? text.pomodoro.start : text.pomodoro.resume}
          </button>
        )}
        {phase === 'work' ? (
          <button
            onClick={startBreakNow}
            disabled={!hasStartedWork}
            className="rounded-full border border-base-border px-4 py-2 text-sm font-medium hover:bg-base-border/40 disabled:opacity-40"
          >
            {text.pomodoro.startBreak}
          </button>
        ) : (
          <button
            onClick={skipBreak}
            className="rounded-full border border-base-border px-4 py-2 text-sm font-medium hover:bg-base-border/40"
          >
            {text.pomodoro.skipBreak}
          </button>
        )}
      </div>

      <div className="text-center">
        <button onClick={() => setSettingsOpen((v) => !v)} className="text-xs text-base-muted hover:underline">
          {settingsOpen ? text.pomodoro.settingsHide : text.pomodoro.settingsShow}
        </button>
      </div>

      {settingsOpen ? (
        <div className="grid grid-cols-2 gap-3 rounded-card border border-base-border bg-base-surface p-4 text-sm">
          <label className="space-y-1">
            <span className="block text-xs text-base-muted">{text.pomodoro.workMinutesLabel}</span>
            <input
              type="number"
              min={1}
              max={120}
              value={workMinutes}
              onChange={(e) => setWorkMinutes(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-base-muted">{text.pomodoro.shortBreakMinutesLabel}</span>
            <input
              type="number"
              min={1}
              max={60}
              value={shortBreakMinutes}
              onChange={(e) => setShortBreakMinutes(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-base-muted">{text.pomodoro.longBreakMinutesLabel}</span>
            <input
              type="number"
              min={1}
              max={90}
              value={longBreakMinutes}
              onChange={(e) => setLongBreakMinutes(Math.max(1, Number(e.target.value) || 1))}
              className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs text-base-muted">{text.pomodoro.cyclesLabel}</span>
            <input
              type="number"
              min={2}
              max={10}
              value={cyclesBeforeLong}
              onChange={(e) => setCyclesBeforeLong(Math.max(2, Number(e.target.value) || 2))}
              className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5"
            />
          </label>
        </div>
      ) : null}
    </div>
  );
}
