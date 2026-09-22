'use client';

import { useState } from 'react';
import { AddTaskInline } from '@/components/AddTaskInline';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';
import { AREA_LABELS } from '@/types';
import type { WeekFull, Project, TaskWithProject } from '@/types';

function TextField({
  label,
  defaultValue,
  onSave,
  rows = 1,
}: {
  label: string;
  defaultValue: string;
  onSave: (v: string) => void;
  rows?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const Tag = rows > 1 ? 'textarea' : 'input';
  return (
    <label className="block">
      <span className="mb-1 block text-xs text-base-muted">{label}</span>
      <Tag
        value={value}
        rows={rows > 1 ? rows : undefined}
        onChange={(e) => setValue(e.target.value)}
        onBlur={() => onSave(value)}
        className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm outline-none focus:border-accent"
      />
    </label>
  );
}

export function ObjectivesForm({ week, onSave }: { week: WeekFull; onSave: (patch: Record<string, unknown>) => void }) {
  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">Objetivos de la semana</h3>
      <div className="space-y-3">
        <TextField label="Objetivo 1" defaultValue={week.objective1 ?? ''} onSave={(v) => onSave({ objective1: v })} />
        <TextField label="Objetivo 2" defaultValue={week.objective2 ?? ''} onSave={(v) => onSave({ objective2: v })} />
        <TextField label="Objetivo 3" defaultValue={week.objective3 ?? ''} onSave={(v) => onSave({ objective3: v })} />
      </div>
    </div>
  );
}

function ProjectMultiSelect({
  projects,
  selectedIds,
  onToggle,
}: {
  projects: Project[];
  selectedIds: string[];
  onToggle: (id: string, selected: boolean) => void;
}) {
  const active = projects.filter((p) => p.status === 'ACTIVE');
  if (active.length === 0) return <p className="text-sm text-base-muted">No hay proyectos activos.</p>;
  return (
    <MultiSelectDropdown
      options={active.map((p) => ({ id: p.id, label: p.name, sublabel: AREA_LABELS[p.area] }))}
      selectedIds={selectedIds}
      onToggle={onToggle}
      placeholder="Buscar proyecto…"
    />
  );
}

function TaskMultiSelect({
  tasks,
  selectedIds,
  onToggle,
  onAddNew,
}: {
  tasks: TaskWithProject[];
  selectedIds: string[];
  onToggle: (id: string, selected: boolean) => void;
  onAddNew: (text: string) => Promise<void>;
}) {
  return (
    <div>
      {tasks.length === 0 ? (
        <p className="mb-2 text-sm text-base-muted">No hay tareas pendientes esta semana.</p>
      ) : (
        <MultiSelectDropdown
          options={tasks.map((t) => ({ id: t.id, label: t.text }))}
          selectedIds={selectedIds}
          onToggle={onToggle}
          placeholder="Buscar tarea…"
          noSelectionLabel="Ninguna marcada todavía."
        />
      )}
      <div className="mt-2">
        <AddTaskInline onAdd={onAddNew} placeholder="Crear tarea nueva y marcarla…" />
      </div>
    </div>
  );
}

interface EvaluationProps {
  week: WeekFull;
  projects: Project[];
  pendingTasks: TaskWithProject[];
  onSave: (patch: Record<string, unknown>) => void;
  onAddAndTag: (text: string, field: 'evalPostponedTaskIds' | 'evalDelegateTaskIds') => Promise<void>;
}

export function EvaluationForm({ week, projects, pendingTasks, onSave, onAddAndTag }: EvaluationProps) {
  function toggleInArray(field: 'evalNextWeekFocusProjectIds' | 'evalPostponedTaskIds' | 'evalDelegateTaskIds', id: string, selected: boolean) {
    const current = week[field] ?? [];
    const next = selected ? [...current, id] : current.filter((x) => x !== id);
    onSave({ [field]: next });
  }

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-1 text-sm font-semibold">Evaluación de la semana</h3>
      <p className="mb-3 text-xs text-base-muted">Complétala al finalizar la semana, antes de planificar la siguiente.</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-1 block text-xs text-base-muted">Foco próxima semana (proyectos)</span>
          <ProjectMultiSelect
            projects={projects}
            selectedIds={week.evalNextWeekFocusProjectIds ?? []}
            onToggle={(id, sel) => toggleInArray('evalNextWeekFocusProjectIds', id, sel)}
          />
        </div>
        <TextField label="A mejorar" defaultValue={week.evalToImprove ?? ''} onSave={(v) => onSave({ evalToImprove: v })} rows={3} />
        <div>
          <span className="mb-1 block text-xs text-base-muted">Aplazado</span>
          <TaskMultiSelect
            tasks={pendingTasks}
            selectedIds={week.evalPostponedTaskIds ?? []}
            onToggle={(id, sel) => toggleInArray('evalPostponedTaskIds', id, sel)}
            onAddNew={(text) => onAddAndTag(text, 'evalPostponedTaskIds')}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs text-base-muted">Delegar</span>
          <TaskMultiSelect
            tasks={pendingTasks}
            selectedIds={week.evalDelegateTaskIds ?? []}
            onToggle={(id, sel) => toggleInArray('evalDelegateTaskIds', id, sel)}
            onAddNew={(text) => onAddAndTag(text, 'evalDelegateTaskIds')}
          />
        </div>
      </div>
    </div>
  );
}
