import { auth } from '@/auth';
import { getWeekPageData } from '@/lib/page-data';
import { currentIsoWeek } from '@/lib/week';
import { HerramientasMatrizClient } from '@/components/HerramientasMatrizClient';

export default async function HerramientasMatrizPage() {
  const session = await auth();
  const data = await getWeekPageData(session!.user.id, currentIsoWeek());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Matriz de Eisenhower</h1>
        <p className="text-sm text-base-muted">
          Clasifica las tareas pendientes de esta semana por urgencia e importancia.
        </p>
      </div>

      <HerramientasMatrizClient
        initialTasks={data.week.tasks}
        projects={data.projects}
        calendarConnected={data.calendarConnected}
      />
    </div>
  );
}
