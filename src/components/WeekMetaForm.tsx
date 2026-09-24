'use client';

import { useState } from 'react';
import { AddTaskInline } from '@/components/AddTaskInline';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';
import type { WeekFull, ProjectWithArea, TaskWithProject } from '@/types';
import { text } from '@/i18n/es';

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
      <h3 className="mb-3 text-sm font-semibold">{text.weekMetaForm.objectivesTitle}</h3>
      <div className="space-y-3">
        <TextField label={text.weekMetaForm.objective1} defaultValue={week.objective1 ?? ''} onSave={(v) => onSave({ objective1: v })} />
        <TextField label={text.weekMetaForm.objective2} defaultValue={week.objective2 ?? ''} onSave={(v) => onSave({ objective2: v })} />
        <TextField label={text.weekMetaForm.objective3} defaultValue={week.objective3 ?? ''} onSave={(v) => onSave({ objective3: v })} />
      </div>
    </div>
  );
}

function ProjectMultiSelect({
  projects,
  selectedIds,
  onToggle,
}: {
  projects: ProjectWithArea[];
  selectedIds: string[];
  onToggle: (id: string, selected: boolean) => void;
}) {
  const active = projects.filter((p) => p.status === 'ACTIVE');
  if (active.length === 0) return <p className="text-sm text-base-muted">{text.weekMetaForm.noActiveProjects}</p>;
  return (
    <MultiSelectDropdown
      options={active.map((p) => ({ id: p.id, label: p.name, sublabel: p.area.name }))}
      selectedIds={selectedIds}
      onToggle={onToggle}
      placeholder={text.weekMetaForm.searchProjectPlaceholder}
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
        <p className="mb-2 text-sm text-base-muted">{text.weekMetaForm.noPendingTasks}</p>
      ) : (
        <MultiSelectDropdown
          options={tasks.map((t) => ({ id: t.id, label: t.text }))}
          selectedIds={selectedIds}
          onToggle={onToggle}
          placeholder={text.weekMetaForm.searchTaskPlaceholder}
          noSelectionLabel={text.weekMetaForm.noSelectionMarked}
        />
      )}
      <div className="mt-2">
        <AddTaskInline onAdd={onAddNew} placeholder={text.weekMetaForm.addNewTaskPlaceholder} />
      </div>
    </div>
  );
}

interface EvaluationProps {
  week: WeekFull;
  projects: ProjectWithArea[];
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
      <h3 className="mb-1 text-sm font-semibold">{text.weekMetaForm.evaluationTitle}</h3>
      <p className="mb-3 text-xs text-base-muted">{text.weekMetaForm.evaluationSubtitle}</p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <span className="mb-1 block text-xs text-base-muted">{text.weekMetaForm.nextWeekFocus}</span>
          <ProjectMultiSelect
            projects={projects}
            selectedIds={week.evalNextWeekFocusProjectIds ?? []}
            onToggle={(id, sel) => toggleInArray('evalNextWeekFocusProjectIds', id, sel)}
          />
        </div>
        <TextField label={text.weekMetaForm.toImprove} defaultValue={week.evalToImprove ?? ''} onSave={(v) => onSave({ evalToImprove: v })} rows={3} />
        <div>
          <span className="mb-1 block text-xs text-base-muted">{text.weekMetaForm.postponed}</span>
          <TaskMultiSelect
            tasks={pendingTasks}
            selectedIds={week.evalPostponedTaskIds ?? []}
            onToggle={(id, sel) => toggleInArray('evalPostponedTaskIds', id, sel)}
            onAddNew={(value) => onAddAndTag(value, 'evalPostponedTaskIds')}
          />
        </div>
        <div>
          <span className="mb-1 block text-xs text-base-muted">{text.weekMetaForm.delegate}</span>
          <TaskMultiSelect
            tasks={pendingTasks}
            selectedIds={week.evalDelegateTaskIds ?? []}
            onToggle={(id, sel) => toggleInArray('evalDelegateTaskIds', id, sel)}
            onAddNew={(value) => onAddAndTag(value, 'evalDelegateTaskIds')}
          />
        </div>
      </div>
    </div>
  );
}
