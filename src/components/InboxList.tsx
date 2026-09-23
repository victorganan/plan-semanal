'use client';

import { useState } from 'react';
import { AddTaskInline } from '@/components/AddTaskInline';
import { TaskCard } from '@/components/TaskCard';
import { InboxTriageWizard } from '@/components/InboxTriageWizard';
import type { Area, ProjectWithAreaAndCollaborators, Tag, TaskWithProject } from '@/types';

interface Props {
  tasks: TaskWithProject[];
  projects: ProjectWithAreaAndCollaborators[];
  areas: Area[];
  tags?: Tag[];
  currentIsoWeek: string;
  onAdd: (text: string) => Promise<void>;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function InboxList({ tasks, projects, areas, tags, currentIsoWeek, onAdd, onUpdate, onDelete }: Props) {
  const [triageOpen, setTriageOpen] = useState(false);

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">Vaciado de mente / Bandeja de entrada</h3>
        {tasks.length > 0 ? (
          <button
            onClick={() => setTriageOpen(true)}
            className="shrink-0 rounded-full border border-accent px-3 py-1 text-xs font-medium text-accent hover:bg-accent/10"
          >
            🧹 Procesar bandeja
          </button>
        ) : null}
      </div>
      <p className="mb-3 text-xs text-base-muted">
        Todo lo que no quieres olvidar. Queda aquí hasta que decidas moverlo a un día concreto.
      </p>
      {triageOpen ? (
        <InboxTriageWizard
          items={tasks}
          areas={areas}
          currentIsoWeek={currentIsoWeek}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onClose={() => setTriageOpen(false)}
        />
      ) : null}
      <div className="space-y-2">
        {tasks.map((t) => (
          <TaskCard
            key={t.id}
            task={t}
            projects={projects}
            areas={areas}
            tags={tags}
            onUpdate={onUpdate}
            onDelete={onDelete}
            currentIsoWeek={currentIsoWeek}
          />
        ))}
        {tasks.length === 0 ? <p className="text-sm text-base-muted">Vacía por ahora.</p> : null}
      </div>
      <div className="mt-2 border-t border-base-border pt-2">
        <AddTaskInline onAdd={onAdd} placeholder="Anota algo que no quieres olvidar…" />
      </div>
    </div>
  );
}
