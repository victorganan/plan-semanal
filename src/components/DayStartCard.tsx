'use client';

import { EnergyPicker } from '@/components/EnergyPicker';
import type { Day, Habit, HabitCompletion, TaskWithProject } from '@/types';
import { text } from '@/i18n/es';
import { Top3Today } from '@/components/Top3Today';
import { useTop3Toggle } from '@/components/useTop3Toggle';
import { pickDailyTip } from '@/lib/daily-tip';
import { DayStartExtendedSection } from '@/components/DayStartExtendedSection';

interface Props {
  day: Day;
  tasks: TaskWithProject[]; // tareas DAY_AREA de hoy
  showChooseTop3Prompt: boolean;
  onSaveEnergy: (value: number) => Promise<void>;
  onSaveGoal: (value: string) => Promise<void>;
  onSetFirstTask: (taskId: string | null) => Promise<void>;
  onUpdateTask: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onStartFirstTask: (taskId: string) => void;
  onDismiss: () => void;
  extendedFocusEnabled: boolean;
  dayOfWeek: number;
  inbox: TaskWithProject[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  yesterdayTasks: TaskWithProject[] | null;
  yesterdayLearning: string | null;
  avoidTodaySuggestions: string[];
  onSaveInspiration: (value: string) => Promise<void>;
  onSendInspirationAsIdea: (ideaText: string) => Promise<void>;
  onSaveDesiredFeeling: (value: string) => Promise<void>;
  onSaveYesterdayReview: (value: string) => Promise<void>;
  onSaveAvoidToday: (value: string) => Promise<void>;
  onAddBandejaTaskToToday: (taskId: string) => Promise<void>;
  onCreateKeyTask: (taskText: string) => Promise<void>;
  onToggleHabit: (habitId: string, done: boolean) => Promise<void>;
}

export function DayStartCard({
  day,
  tasks,
  showChooseTop3Prompt,
  onSaveEnergy,
  onSaveGoal,
  onSetFirstTask,
  onUpdateTask,
  onStartFirstTask,
  onDismiss,
  extendedFocusEnabled,
  dayOfWeek,
  inbox,
  habits,
  habitCompletions,
  yesterdayTasks,
  yesterdayLearning,
  avoidTodaySuggestions,
  onSaveInspiration,
  onSendInspirationAsIdea,
  onSaveDesiredFeeling,
  onSaveYesterdayReview,
  onSaveAvoidToday,
  onAddBandejaTaskToToday,
  onCreateKeyTask,
  onToggleHabit,
}: Props) {
  const { top3Tasks, handleToggleTop3 } = useTop3Toggle(tasks, onUpdateTask);
  const firstTask = day.firstTaskId ? tasks.find((t) => t.id === day.firstTaskId) ?? null : null;
  const tip = pickDailyTip(text.dayStartCard.tips, new Date());

  return (
    <section className="rounded-card border border-accent/40 bg-accent/5 p-4">
      <div className="mb-3 flex items-start justify-between gap-2">
        <h2 className="text-base font-semibold">{text.dayStartCard.title}</h2>
        <button
          onClick={onDismiss}
          aria-label={text.dayStartCard.dismissAriaLabel}
          className="rounded-full p-1.5 text-base-muted hover:bg-base-border/40"
        >
          ✕
        </button>
      </div>

      <p className="mb-4 text-xs text-base-muted">
        {text.dayStartCard.tipPrefix}
        {tip}
      </p>

      <div className="space-y-4 text-sm">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-base-muted">{text.dayStartCard.energyTitle}</p>
          <EnergyPicker value={day.energy} onChange={onSaveEnergy} />
        </div>

        <div>
          {showChooseTop3Prompt ? <p className="mb-1.5 text-xs font-medium text-priority-high">{text.dayStartCard.chooseTop3Prompt}</p> : null}
          <Top3Today
            tasks={top3Tasks}
            onToggleDone={(id, done) => onUpdateTask(id, { done })}
            onUnstar={(id) => handleToggleTop3(id, false)}
          />
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-base-muted">{text.dayStartCard.firstTaskTitle}</p>
          {firstTask ? (
            <div className="flex flex-wrap items-center gap-2">
              <span className="flex-1 truncate">{firstTask.text}</span>
              <button onClick={() => onStartFirstTask(firstTask.id)} className="rounded-full bg-accent px-3 py-1 text-xs font-medium text-white">
                {text.dayStartCard.startButton}
              </button>
              <select
                value={firstTask.id}
                onChange={(e) => onSetFirstTask(e.target.value || null)}
                aria-label={text.dayStartCard.firstTaskChangeButton}
                className="rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs"
              >
                {tasks.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.text}
                  </option>
                ))}
              </select>
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-xs text-base-muted">{text.dayStartCard.firstTaskNone}</p>
          ) : (
            <select
              value=""
              onChange={(e) => onSetFirstTask(e.target.value || null)}
              className="w-full rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
            >
              <option value="">{text.dayStartCard.firstTaskPlaceholder}</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.text}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-base-muted">{text.dayStartCard.goalLabel}</label>
          <input
            type="text"
            defaultValue={day.dayGoal ?? ''}
            onBlur={(e) => onSaveGoal(e.target.value)}
            placeholder={text.dayStartCard.goalPlaceholder}
            className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
          />
        </div>

        {extendedFocusEnabled ? (
          <DayStartExtendedSection
            day={day}
            dayOfWeek={dayOfWeek}
            inbox={inbox}
            habits={habits}
            habitCompletions={habitCompletions}
            yesterdayTasks={yesterdayTasks}
            yesterdayLearning={yesterdayLearning}
            avoidTodaySuggestions={avoidTodaySuggestions}
            onSaveInspiration={onSaveInspiration}
            onSendInspirationAsIdea={onSendInspirationAsIdea}
            onSaveDesiredFeeling={onSaveDesiredFeeling}
            onSaveYesterdayReview={onSaveYesterdayReview}
            onSaveAvoidToday={onSaveAvoidToday}
            onAddBandejaTaskToToday={onAddBandejaTaskToToday}
            onCreateKeyTask={onCreateKeyTask}
            onToggleHabit={onToggleHabit}
          />
        ) : null}
      </div>
    </section>
  );
}
