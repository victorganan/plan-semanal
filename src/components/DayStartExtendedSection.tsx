'use client';

import { useState } from 'react';
import type { Day, Habit, HabitCompletion, TaskWithProject } from '@/types';
import { text } from '@/i18n/es';

interface Props {
  day: Day;
  dayOfWeek: number;
  inbox: TaskWithProject[];
  habits: Habit[];
  habitCompletions: HabitCompletion[];
  yesterdayTasks: TaskWithProject[] | null; // null = cargando (o cruza a otra semana, todavía sin cargar)
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

export function DayStartExtendedSection({
  day,
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
  const [open, setOpen] = useState(false);
  const [inspiration, setInspiration] = useState(day.inspiration ?? '');
  const [inspirationSent, setInspirationSent] = useState(false);
  const [feeling, setFeeling] = useState(day.desiredFeeling ?? '');
  const [searchQuery, setSearchQuery] = useState('');
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set());
  const [newKeyTask, setNewKeyTask] = useState('');

  const done = yesterdayTasks?.filter((t) => t.done).length ?? 0;
  const total = yesterdayTasks?.length ?? 0;

  const searchResults =
    searchQuery.trim().length > 0
      ? inbox.filter((t) => t.text.toLowerCase().includes(searchQuery.trim().toLowerCase())).slice(0, 5)
      : [];

  async function sendIdea() {
    if (!inspiration.trim()) return;
    await onSendInspirationAsIdea(inspiration.trim());
    setInspirationSent(true);
  }

  async function addFromSearch(taskId: string) {
    await onAddBandejaTaskToToday(taskId);
    setAddedIds((prev) => new Set(prev).add(taskId));
  }

  async function createKeyTask() {
    const trimmed = newKeyTask.trim();
    if (!trimmed) return;
    await onCreateKeyTask(trimmed);
    setNewKeyTask('');
  }

  return (
    <div className="border-t border-base-border pt-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent"
      >
        {text.dayStartCard.extendedSectionTitle} {open ? `(${text.dayStartCard.extendedSectionHide})` : `(${text.dayStartCard.extendedSectionShow})`}
      </button>

      {open ? (
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-base-muted">
              {text.dayStartCard.inspirationLabel}
            </label>
            <textarea
              value={inspiration}
              onChange={(e) => {
                setInspiration(e.target.value);
                setInspirationSent(false);
              }}
              onBlur={() => onSaveInspiration(inspiration)}
              rows={2}
              placeholder={text.dayStartCard.inspirationPlaceholder}
              className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            />
            {inspirationSent ? (
              <p className="mt-1 text-xs text-accent">{text.dayStartCard.inspirationSent}</p>
            ) : (
              <button onClick={sendIdea} className="mt-1 text-xs font-medium text-accent hover:underline">
                {text.dayStartCard.inspirationSendButton}
              </button>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-base-muted">
              {text.dayStartCard.feelingLabel}
            </label>
            <div className="mb-1.5 flex flex-wrap gap-1.5">
              {text.dayStartCard.feelingChips.map((chip) => (
                <button
                  key={chip}
                  onClick={() => {
                    setFeeling(chip);
                    onSaveDesiredFeeling(chip);
                  }}
                  className={
                    feeling === chip
                      ? 'rounded-full bg-accent px-3 py-1 text-xs font-medium text-white'
                      : 'rounded-full border border-base-border px-3 py-1 text-xs hover:bg-base-border/40'
                  }
                >
                  {chip}
                </button>
              ))}
            </div>
            <input
              type="text"
              value={feeling}
              onChange={(e) => setFeeling(e.target.value)}
              onBlur={() => onSaveDesiredFeeling(feeling)}
              placeholder={text.dayStartCard.feelingPlaceholder}
              className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-base-muted">
              {text.dayStartCard.yesterdayReviewLabel}
            </label>
            <p className="mb-1.5 text-xs text-base-muted">
              {yesterdayTasks === null
                ? text.dayStartCard.yesterdayReviewLoading
                : total === 0
                  ? text.dayStartCard.yesterdayReviewNoTasks
                  : text.dayStartCard.yesterdayReviewSummary(done, total)}
              {yesterdayLearning ? ` ${text.dayStartCard.yesterdayReviewLearning(yesterdayLearning)}` : ''}
            </p>
            <input
              type="text"
              defaultValue={day.yesterdayReview ?? ''}
              onBlur={(e) => onSaveYesterdayReview(e.target.value)}
              placeholder={text.dayStartCard.yesterdayReviewPlaceholder}
              className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-base-muted">
              {text.dayStartCard.keyTasksSearchLabel}
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={text.dayStartCard.keyTasksSearchPlaceholder}
              className="mb-1.5 w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            />
            {searchResults.length > 0 ? (
              <div className="mb-2 space-y-1">
                {searchResults.map((t) => (
                  <div key={t.id} className="flex items-center gap-2 rounded-lg border border-base-border px-2 py-1.5">
                    <span className="flex-1 truncate text-xs">{t.text}</span>
                    {addedIds.has(t.id) ? (
                      <span className="text-xs text-accent">{text.dayStartCard.keyTasksAdded}</span>
                    ) : (
                      <button onClick={() => addFromSearch(t.id)} className="shrink-0 text-xs font-medium text-accent hover:underline">
                        {text.dayStartCard.keyTasksAddToToday}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : null}
            <label className="mb-1 block text-xs text-base-muted">{text.dayStartCard.keyTasksCreateLabel}</label>
            <div className="flex gap-1.5">
              <input
                type="text"
                value={newKeyTask}
                onChange={(e) => setNewKeyTask(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    createKeyTask();
                  }
                }}
                placeholder={text.dayStartCard.keyTasksCreatePlaceholder}
                className="min-w-0 flex-1 rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
              />
              <button
                onClick={createKeyTask}
                disabled={!newKeyTask.trim()}
                className="shrink-0 rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white disabled:opacity-40"
              >
                {text.dayStartCard.keyTasksCreateButton}
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-base-muted">
              {text.dayStartCard.habitsLabel}
            </label>
            {habits.length === 0 ? (
              <p className="text-xs text-base-muted">{text.dayStartCard.habitsEmpty}</p>
            ) : (
              <div className="space-y-1.5">
                {habits.map((habit) => {
                  const completed = habitCompletions.some((c) => c.habitId === habit.id && c.dayOfWeek === dayOfWeek && c.done);
                  return (
                    <label key={habit.id} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={completed}
                        onChange={(e) => onToggleHabit(habit.id, e.target.checked)}
                        className="h-4 w-4 rounded border-base-border"
                      />
                      <span className={completed ? 'text-base-muted line-through' : ''}>{habit.name}</span>
                    </label>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-base-muted">
              {text.dayStartCard.avoidTodayLabel}
            </label>
            <textarea
              defaultValue={day.avoidToday ?? ''}
              onBlur={(e) => onSaveAvoidToday(e.target.value)}
              rows={2}
              placeholder={text.dayStartCard.avoidTodayPlaceholder}
              className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            />
            {avoidTodaySuggestions.length > 0 ? (
              <div className="mt-1.5">
                <p className="mb-1 text-xs text-base-muted">{text.dayStartCard.avoidTodaySuggestionsLabel}</p>
                <div className="flex flex-wrap gap-1.5">
                  {avoidTodaySuggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => onSaveAvoidToday(s)}
                      className="rounded-full border border-base-border px-2.5 py-1 text-xs hover:bg-base-border/40"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
