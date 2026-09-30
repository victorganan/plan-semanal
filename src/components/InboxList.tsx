'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AddTaskInline } from '@/components/AddTaskInline';
import { TaskCard } from '@/components/TaskCard';
import { InboxTriageWizard } from '@/components/InboxTriageWizard';
import { QuickDateChips } from '@/components/QuickDateChips';
import { hasReappeared, isPendingProcess } from '@/lib/inbox';
import type { Area, ProjectWithAreaAndCollaborators, Tag, TaskWithProject } from '@/types';
import { text } from '@/i18n/es';

interface Props {
  tasks: TaskWithProject[];
  projects: ProjectWithAreaAndCollaborators[];
  areas: Area[];
  tags?: Tag[];
  currentIsoWeek: string;
  onAdd: (text: string) => Promise<void>;
  onUpdate: (id: string, patch: Record<string, unknown>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onCreateCalendarEvent?: (id: string) => Promise<void>;
  onStartFocus?: (id: string) => void;
}

type Tab = 'bandeja' | 'esperando' | 'algunDia';

function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function SetReminderControl({ onSet }: { onSet: (isoDate: string) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState('');
  const [busy, setBusy] = useState(false);

  if (!open) {
    return (
      <button onClick={() => setOpen(true)} className="mt-2 text-xs font-medium text-accent hover:underline">
        {text.algunDiaView.setReminderButton}
      </button>
    );
  }

  return (
    <div className="mt-2 space-y-1.5">
      <QuickDateChips onPick={setDate} />
      <div className="flex items-center gap-1.5">
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs"
        />
        <button
          disabled={!date || busy}
          onClick={async () => {
            setBusy(true);
            await onSet(new Date(`${date}T00:00`).toISOString());
            setBusy(false);
            setOpen(false);
          }}
          className="rounded-full bg-accent px-3 py-1 text-xs font-semibold text-white disabled:opacity-40"
        >
          {text.algunDiaView.setReminderSubmit}
        </button>
      </div>
    </div>
  );
}

export function InboxList({ tasks, projects, areas, tags, currentIsoWeek, onAdd, onUpdate, onDelete, onCreateCalendarEvent, onStartFocus }: Props) {
  const [triageOpen, setTriageOpen] = useState(false);
  const [wizardKey, setWizardKey] = useState(0);
  const [tab, setTab] = useState<Tab>('bandeja');
  const router = useRouter();

  // El contador de "Bandeja (N)" del menú se calcula en el layout (servidor)
  // y no se entera solo de los cambios optimistas del cliente: lo refrescamos
  // justo en los tres momentos que pueden variarlo — procesar (asistente) y
  // traer de vuelta desde Algún día. La captura rápida se refresca por su
  // cuenta, desde su propio componente.
  async function wizardUpdate(id: string, patch: Record<string, unknown>) {
    await onUpdate(id, patch);
    router.refresh();
  }

  async function wizardDelete(id: string) {
    await onDelete(id);
    router.refresh();
  }

  async function bringBackToInbox(id: string) {
    await onUpdate(id, { gtdStatus: 'ACTIVA' });
    router.refresh();
  }

  const today = new Date();
  const pending = tasks.filter((t) => !t.done);

  // "Bandeja" (pestaña) = lo pendiente de procesar + lo ya organizado sin
  // fecha; el contador de la pestaña y el asistente solo cuentan lo primero.
  const queueTasks = pending.filter((t) => isPendingProcess(t, today));
  const organizedTasks = pending.filter((t) => t.gtdStatus === 'ACTIVA' && t.processedAt !== null && !hasReappeared(t, today));
  const esperandoTasks = pending.filter((t) => t.gtdStatus === 'ESPERANDO');
  const algunDiaTasks = pending.filter((t) => t.gtdStatus === 'ALGUN_DIA' && !hasReappeared(t, today));

  // Delegadas y en espera (M3): dentro de gtdStatus=ESPERANDO, "Delegada" es
  // la que además tiene assignedTo (se ha pasado a otra persona); "En
  // espera" es la que solo depende de alguien (waitingOn) sin delegarla.
  function groupByPerson(list: TaskWithProject[], personOf: (t: TaskWithProject) => string | null) {
    return list.reduce<Record<string, TaskWithProject[]>>((acc, task) => {
      const key = personOf(task)?.trim() || text.esperandoView.groupFallback;
      acc[key] = acc[key] ? [...acc[key], task] : [task];
      return acc;
    }, {});
  }
  const delegatedGroups = groupByPerson(
    esperandoTasks.filter((t) => t.assignedTo?.trim()),
    (t) => t.assignedTo
  );
  const waitingGroups = groupByPerson(
    esperandoTasks.filter((t) => !t.assignedTo?.trim()),
    (t) => t.waitingOn
  );

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <div className="mb-3 flex gap-1 border-b border-base-border text-sm">
        {(
          [
            ['bandeja', text.inboxList.tabBandeja, queueTasks.length],
            ['esperando', text.inboxList.tabEsperando, esperandoTasks.length],
            ['algunDia', text.inboxList.tabAlgunDia, algunDiaTasks.length],
          ] as [Tab, string, number][]
        ).map(([id, label, count]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={
              tab === id
                ? 'border-b-2 border-accent px-3 py-1.5 font-semibold text-accent'
                : 'px-3 py-1.5 text-base-muted hover:text-base-fg'
            }
          >
            {label}
            {count > 0 ? ` (${count})` : ''}
          </button>
        ))}
      </div>

      {tab === 'bandeja' ? (
        <>
          {queueTasks.length > 0 ? (
            <button
              onClick={() => setTriageOpen(true)}
              className="mb-3 w-full rounded-full bg-accent px-4 py-2 text-sm font-semibold text-white hover:brightness-110"
            >
              {text.inboxList.processButton(queueTasks.length)}
            </button>
          ) : null}
          {triageOpen ? (
            <InboxTriageWizard
              key={wizardKey}
              items={queueTasks}
              areas={areas}
              onUpdate={wizardUpdate}
              onDelete={wizardDelete}
              onCreateCalendarEvent={onCreateCalendarEvent}
              onClose={() => setTriageOpen(false)}
              onRestart={() => setWizardKey((k) => k + 1)}
            />
          ) : null}
          <div className="space-y-2">
            {queueTasks.map((t) => (
              <TaskCard
                key={t.id}
                task={t}
                projects={projects}
                areas={areas}
                tags={tags}
                onUpdate={onUpdate}
                onDelete={onDelete}
                currentIsoWeek={currentIsoWeek}
                onCreateCalendarEvent={onCreateCalendarEvent}
                onStartFocus={onStartFocus}
              />
            ))}
            {queueTasks.length === 0 && organizedTasks.length === 0 ? (
              <div>
                <p className="text-sm font-medium">{text.inboxList.empty}</p>
                <p className="mt-1 text-xs text-base-muted">{text.inboxList.description}</p>
              </div>
            ) : null}
          </div>
          <div className="mt-2 border-t border-base-border pt-2">
            <AddTaskInline onAdd={onAdd} placeholder={text.inboxList.addPlaceholder} />
          </div>

          {organizedTasks.length > 0 ? (
            <div className="mt-4 border-t border-base-border pt-3">
              <h4 className="text-xs font-semibold uppercase tracking-wide text-base-muted">{text.inboxList.organizedSectionTitle}</h4>
              <p className="mb-2 text-xs text-base-muted">{text.inboxList.organizedSectionHint}</p>
              <div className="space-y-2">
                {organizedTasks.map((t) => (
                  <TaskCard
                    key={t.id}
                    task={t}
                    projects={projects}
                    areas={areas}
                    tags={tags}
                    onUpdate={onUpdate}
                    onDelete={onDelete}
                    currentIsoWeek={currentIsoWeek}
                    dragEnabled
                    onCreateCalendarEvent={onCreateCalendarEvent}
                    onStartFocus={onStartFocus}
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'esperando' ? (
        <div className="space-y-5">
          {esperandoTasks.length === 0 ? (
            <p className="text-sm text-base-muted">{text.esperandoView.empty}</p>
          ) : (
            <>
              {Object.keys(delegatedGroups).length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-base-muted">
                    {text.esperandoView.delegatedSectionTitle}
                  </h3>
                  {Object.entries(delegatedGroups).map(([person, group]) => (
                    <div key={person}>
                      <h4 className="mb-1.5 text-xs font-semibold text-base-muted">{person}</h4>
                      <div className="space-y-1.5">
                        {group.map((t) => (
                          <TaskCard
                            key={t.id}
                            task={t}
                            projects={projects}
                            areas={areas}
                            tags={tags}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            currentIsoWeek={currentIsoWeek}
                            onCreateCalendarEvent={onCreateCalendarEvent}
                            onStartFocus={onStartFocus}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {Object.keys(waitingGroups).length > 0 ? (
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-base-muted">
                    {text.esperandoView.waitingSectionTitle}
                  </h3>
                  {Object.entries(waitingGroups).map(([person, group]) => (
                    <div key={person}>
                      <h4 className="mb-1.5 text-xs font-semibold text-base-muted">{person}</h4>
                      <div className="space-y-1.5">
                        {group.map((t) => (
                          <TaskCard
                            key={t.id}
                            task={t}
                            projects={projects}
                            areas={areas}
                            tags={tags}
                            onUpdate={onUpdate}
                            onDelete={onDelete}
                            currentIsoWeek={currentIsoWeek}
                            onCreateCalendarEvent={onCreateCalendarEvent}
                            onStartFocus={onStartFocus}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {tab === 'algunDia' ? (
        <div className="space-y-2">
          {algunDiaTasks.length === 0 ? (
            <p className="text-sm text-base-muted">{text.algunDiaView.empty}</p>
          ) : (
            algunDiaTasks.map((t) => {
              const isIdea = t.tags.some((tag) => tag.name === 'Idea');
              return (
                <div key={t.id} className="rounded-card border border-base-border p-3">
                  <p className="text-sm">{t.text}</p>
                  <p className="mt-1 text-xs text-base-muted">
                    {t.snoozeUntil ? text.algunDiaView.withDate(formatDate(t.snoozeUntil)) : text.algunDiaView.withoutDate}
                  </p>
                  {isIdea ? <p className="mt-1 text-xs text-base-muted italic">{text.algunDiaView.ideaTag}</p> : null}
                  <button
                    onClick={() => bringBackToInbox(t.id)}
                    className="mt-2 text-xs font-medium text-accent hover:underline"
                  >
                    {text.algunDiaView.bringBackButton}
                  </button>
                  {!t.snoozeUntil ? (
                    <SetReminderControl onSet={async (isoDate) => { await onUpdate(t.id, { snoozeUntil: isoDate }); router.refresh(); }} />
                  ) : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
