'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import type { Habit } from '@/types';
import { text } from '@/i18n/es';

export function HabitsManager({ initialHabits }: { initialHabits: Habit[] }) {
  const [habits, setHabits] = useState(initialHabits);
  const [name, setName] = useState('');

  async function refresh() {
    setHabits(await api.get('/api/habits'));
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post('/api/habits', { name: name.trim() });
    setName('');
    await refresh();
  }

  async function remove(id: string) {
    await api.delete(`/api/habits/${id}`);
    await refresh();
  }

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">{text.habitsManager.title}</h3>
      <ul className="space-y-2">
        {habits.map((h) => (
          <li key={h.id} className="flex items-center justify-between rounded-lg border border-base-border px-3 py-2 text-sm">
            {h.name}
            <button onClick={() => remove(h.id)} className="text-xs text-priority-high hover:underline">
              {text.habitsManager.deleteButton}
            </button>
          </li>
        ))}
        {habits.length === 0 ? <p className="text-sm text-base-muted">{text.habitsManager.empty}</p> : null}
      </ul>
      <form onSubmit={add} className="mt-3 flex gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={text.habitsManager.newHabitPlaceholder}
          className="flex-1 rounded-lg border border-base-border bg-base-bg px-3 py-1.5 text-sm"
        />
        <button type="submit" className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white">
          {text.habitsManager.addButton}
        </button>
      </form>
    </div>
  );
}
