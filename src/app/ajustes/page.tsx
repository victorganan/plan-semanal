import { auth } from '@/auth';
import { prisma } from '@/lib/prisma';
import { getTodoistToken } from '@/lib/todoist';
import { hasCalendarAccess } from '@/lib/google-calendar';
import { IntegrationsPanel } from '@/components/settings/IntegrationsPanel';
import { HabitsManager } from '@/components/settings/HabitsManager';
import { RecurringTemplatesManager } from '@/components/settings/RecurringTemplatesManager';
import { ActivityLogPanel } from '@/components/settings/ActivityLogPanel';
import { PushReminderSettings } from '@/components/settings/PushReminderSettings';
import { CapacitySettings } from '@/components/settings/CapacitySettings';

export default async function AjustesPage({ searchParams }: { searchParams: Promise<{ todoist?: string }> }) {
  const session = await auth();
  const userId = session!.user.id;
  const { todoist } = await searchParams;

  const [habits, templates, areas, todoistToken, calendarConnected, activity, user] = await Promise.all([
    prisma.habit.findMany({ where: { userId, active: true }, orderBy: { order: 'asc' } }),
    prisma.recurringTaskTemplate.findMany({ where: { userId, active: true }, include: { area: true }, orderBy: [{ dtstart: 'asc' }] }),
    prisma.area.findMany({ where: { userId }, orderBy: { order: 'asc' } }),
    getTodoistToken(userId),
    hasCalendarAccess(userId),
    prisma.activityLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' }, take: 50 }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { weeklyReminderDayOfWeek: true, weeklyReminderTime: true, dailyCapacityMinutes: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Ajustes</h1>
        <p className="text-sm text-base-muted">Integraciones, hábitos, tareas recurrentes y actividad.</p>
      </div>

      {todoist === 'error' ? (
        <p className="rounded-card border border-priority-high/40 bg-priority-high/10 px-4 py-2 text-sm text-priority-high">
          No se pudo conectar con Todoist. Inténtalo de nuevo.
        </p>
      ) : null}
      {todoist === 'connected' ? (
        <p className="rounded-card border border-accent/40 bg-accent/10 px-4 py-2 text-sm text-accent">Todoist conectado correctamente.</p>
      ) : null}

      <IntegrationsPanel initialTodoistConnected={!!todoistToken} initialCalendarConnected={calendarConnected} />
      <CapacitySettings initialMinutes={user?.dailyCapacityMinutes ?? 300} />
      <PushReminderSettings
        initialDayOfWeek={user?.weeklyReminderDayOfWeek ?? null}
        initialSlot={user?.weeklyReminderTime ?? null}
      />
      <HabitsManager initialHabits={habits} />
      <RecurringTemplatesManager initialTemplates={templates} areas={areas} />
      <ActivityLogPanel
        initialItems={activity.map((a) => ({ id: a.id, summary: a.summary, action: a.action, createdAt: a.createdAt.toISOString() }))}
      />
    </div>
  );
}
