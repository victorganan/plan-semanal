'use client';

import { useState } from 'react';
import { AddTaskInline } from '@/components/AddTaskInline';
import { TaskCard } from '@/components/TaskCard';
import { InboxTriageWizard } from '@/components/InboxTriageWizard';
import { QuickDateChips } from '@/components/QuickDateChips';
import { useToast } from '@/components/Toast';
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

export function InboxList({ tasks, projects, areas, tags, currentIsoWeek, onAdd, onUpdate, onDelete, onCreateCalendarEvent }: Props) {
  const [triageOpen, setTriageOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('bandeja');
  const { showToast } = useToast();

  const today = new Date();
  const pending = tasks.filter((t) => !t.done);

  // "Bandeja" (pestaña) = lo pendiente de procesar + lo ya organizado sin
  // fecha; el contador de la pestaña y el asistente solo cuentan lo primero.
  const queueTasks = pending.filter((t) => isPendingProcess(t, today));
  const organizedTasks = pending.filter((t) => t.gtdStatus === 'ACTIVA' && t.processedAt !== null && !hasReappeared(t, today));
  const esperandoTasks = pending.filter((t) => t.gtdStatus === 'ESPERANDO');
  const algunDiaTasks = pending.filter((t) => t.gtdStatus === 'ALGUN_DIA' && !hasReappeared(t, today));

  const esperandoGroups = esperandoTasks.reduce<Record<string, TaskWithProject[]>>((acc, t) => {
    const key = t.waitingOn?.trim() || text.esperandoView.groupFallback;
    acc[key] = acc[key] ? [...acc[key], t] : [t];
    return acc;
  }, {});

  async function remind(t: TaskWithProject) {
    const dateLabel = t.followUpDate ? formatDate(t.followUpDate) : '';
    const message = `Hola ${t.waitingOn ?? ''}, ¿cómo va "${t.text}"? Lo necesitaría para el ${dateLabel}. Si te puedo ayudar en algo, dime.`;
    try {
      await navigator.clipboard.writeText(message);
      showToast(text.esperandoView.remindCopied);
    } catch {
      showToast(text.esperandoView.remindCopied, 'error');
    }
  }

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <div className="mb-1 flex items-center justify-between gap-2">
        <h3 className="text-sm font-semibold">{text.inboxList.title}</h3>
      </div>
      <p className="mb-3 text-xs text-base-muted">{text.inboxList.description}</p>

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
            <div className="mb-3 flex items-center justify-between gap-2">
              <span className="text-xs text-base-muted">{text.inboxList.pendingCount(queueTasks.length)}</span>
              <button
                onClick={() => setTriageOpen(true)}
                className="shrink-0 rounded-full border border-accent px-3 py-1 text-xs font-medium text-accent hover:bg-accent/10"
              >
                {text.inboxList.processButton}
              </button>
            </div>
          ) : null}
          {triageOpen ? (
            <InboxTriageWizard
              items={queueTasks}
              areas={areas}
              onUpdate={onUpdate}
              onDelete={onDelete}
              onCreateCalendarEvent={onCreateCalendarEvent}
              onClose={() => setTriageOpen(false)}
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
              />
            ))}
            {queueTasks.length === 0 && organizedTasks.length === 0 ? (
              <p className="text-sm text-base-muted">{text.inboxList.empty}</p>
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
                  />
                ))}
              </div>
            </div>
          ) : null}
        </>
      ) : null}

      {tab === 'esperando' ? (
        <div className="space-y-4">
          {Object.keys(esperandoGroups).length === 0 ? (
            <p className="text-sm text-base-muted">{text.esperandoView.empty}</p>
          ) : (
            Object.entries(esperandoGroups).map(([person, group]) => (
              <div key={person}>
                <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-base-muted">{person}</h4>
                <div className="space-y-1.5">
                  {group.map((t) => {
                    const overdueDays = t.followUpDate ? Math.floor((today.getTime() - new Date(t.followUpDate).getTime()) / 86400000) : null;
                    const overdue = overdueDays !== null && overdueDays >= 0;
                    return (
                      <div
                        key={t.id}
                        className={
                          overdue
                            ? 'rounded-card border border-priority-high bg-priority-high/5 p-3'
                            : 'rounded-card border border-base-border p-3'
                        }
                      >
                        <p className="text-sm">{t.text}</p>
                        <div className="mt-1 flex items-center justify-between gap-2">
                          <span className={overdue ? 'text-xs font-medium text-priority-high' : 'text-xs text-base-muted'}>
                            {overdue && overdueDays !== null
                              ? text.esperandoView.overdue(overdueDays)
                              : t.followUpDate
                                ? text.esperandoView.followUpLabel(formatDate(t.followUpDate))
                                : ''}
                          </span>
                          <button onClick={() => remind(t)} className="shrink-0 text-xs font-medium text-accent hover:underline">
                            {text.esperandoView.remindButton}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
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
                    onClick={() => onUpdate(t.id, { gtdStatus: 'ACTIVA' })}
                    className="mt-2 text-xs font-medium text-accent hover:underline"
                  >
                    {text.algunDiaView.bringBackButton}
                  </button>
                  {!t.snoozeUntil ? <SetReminderControl onSet={(isoDate) => onUpdate(t.id, { snoozeUntil: isoDate })} /> : null}
                </div>
              );
            })
          )}
        </div>
      ) : null}
    </div>
  );
}
