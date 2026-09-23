'use client';

import { useState } from 'react';
import { MoodSliders } from '@/components/MoodSliders';
import { ProjectFocusPicker } from '@/components/ProjectFocusPicker';
import { PriorityListSection } from '@/components/PriorityListSection';
import { InboxList } from '@/components/InboxList';
import { ObjectivesForm } from '@/components/WeekMetaForm';
import type { WeekFull, ProjectWithAreaAndCollaborators, Area, Tag, TaskWithProject } from '@/types';

interface Props {
  week: WeekFull;
  inbox: TaskWithProject[];
  projects: ProjectWithAreaAndCollaborators[];
  areas: Area[];
  tags?: Tag[];
  isoWeek: string;
  onSaveWeekMeta: (patch: Record<string, unknown>) => void;
  onToggleProjectFocus: (projectId: string, focused: boolean) => Promise<void>;
  onAddPriority: (text: string) => Promise<void>;
  onAddCall: (text: string) => Promise<void>;
  onUpdateTask: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDeleteTask: (id: string) => Promise<void>;
  onAddBacklog: (text: string) => Promise<void>;
  onClose: () => void;
}

const STEPS = ['Cómo llegas', 'Objetivos', 'Proyectos en foco', 'Acciones y llamadas', 'Bandeja de entrada'];

export function PlanningWizard({
  week,
  inbox,
  projects,
  areas,
  tags,
  isoWeek,
  onSaveWeekMeta,
  onToggleProjectFocus,
  onAddPriority,
  onAddCall,
  onUpdateTask,
  onDeleteTask,
  onAddBacklog,
  onClose,
}: Props) {
  const [step, setStep] = useState(0);
  const focusIds = week.projectFocus.map((f) => f.projectId);
  const priorityTasks = week.tasks.filter((t) => t.kind === 'PRIORITY_ACTION');
  const callTasks = week.tasks.filter((t) => t.kind === 'CALL');

  const isLast = step === STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4">
      <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-t-2xl bg-base-surface p-6 shadow-xl sm:rounded-card">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Planificación semanal — {isoWeek}</h2>
          <button onClick={onClose} aria-label="Cerrar" className="rounded-full p-1.5 text-base-muted hover:bg-base-border/40">
            ✕
          </button>
        </div>

        <div className="mb-5 flex gap-1">
          {STEPS.map((s, i) => (
            <div key={s} className={`h-1 flex-1 rounded-full ${i <= step ? 'bg-accent' : 'bg-base-border'}`} />
          ))}
        </div>

        <p className="mb-4 text-xs font-medium uppercase tracking-wide text-base-muted">
          Paso {step + 1} de {STEPS.length} · {STEPS[step]}
        </p>

        <div className="min-h-[220px]">
          {step === 0 ? (
            <div>
              <p className="mb-3 text-sm text-base-muted">¿Cómo llegas a esta semana? Un chequeo rápido, mental y físico.</p>
              <MoodSliders mentalState={week.mentalState} physicalState={week.physicalState} onChange={onSaveWeekMeta} />
            </div>
          ) : null}

          {step === 1 ? (
            <div>
              <p className="mb-3 text-sm text-base-muted">¿Qué 1-3 cosas necesitan pasar sí o sí esta semana?</p>
              <ObjectivesForm week={week} onSave={onSaveWeekMeta} />
            </div>
          ) : null}

          {step === 2 ? (
            <div>
              <p className="mb-3 text-sm text-base-muted">De tus proyectos activos, ¿cuáles tienen prioridad esta semana?</p>
              <ProjectFocusPicker projects={projects} focusedIds={focusIds} onToggle={onToggleProjectFocus} />
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <p className="text-sm text-base-muted">Reuniones, llamadas y cosas que no puedes olvidar esta semana.</p>
              <PriorityListSection
                title="Acciones prioritarias / No olvidar"
                tasks={priorityTasks}
                projects={projects}
                tags={tags}
                onAdd={onAddPriority}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
              />
              <PriorityListSection
                title="Llamadas"
                tasks={callTasks}
                projects={projects}
                tags={tags}
                onAdd={onAddCall}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
              />
            </div>
          ) : null}

          {step === 4 ? (
            <div>
              <p className="mb-3 text-sm text-base-muted">
                Revisa lo que dejaste anotado. Muévelo a un día si ya sabes cuándo, o déjalo aquí si aún no.
              </p>
              <InboxList
                tasks={inbox}
                projects={projects}
                areas={areas}
                tags={tags}
                currentIsoWeek={isoWeek}
                onAdd={onAddBacklog}
                onUpdate={onUpdateTask}
                onDelete={onDeleteTask}
              />
            </div>
          ) : null}
        </div>

        <div className="mt-6 flex items-center justify-between border-t border-base-border pt-4">
          <button
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            disabled={step === 0}
            className="rounded-full border border-base-border px-4 py-2 text-sm disabled:opacity-40"
          >
            ← Anterior
          </button>
          {isLast ? (
            <button onClick={onClose} className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white">
              Ir a la semana →
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}
              className="rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white"
            >
              Siguiente →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
