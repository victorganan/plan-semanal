import { auth } from '@/auth';
import { getWeekPageData } from '@/lib/page-data';
import { currentIsoWeek } from '@/lib/week';
import { HerramientasMatrizClient } from '@/components/HerramientasMatrizClient';
import { text } from '@/i18n/es';

export default async function HerramientasMatrizPage() {
  const session = await auth();
  const data = await getWeekPageData(session!.user.id, currentIsoWeek());

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{text.herramientas.matrixPageTitle}</h1>
        <p className="text-sm text-base-muted">{text.herramientas.matrixPageSubtitle}</p>
      </div>

      <HerramientasMatrizClient
        initialTasks={data.week.tasks}
        projects={data.projects}
        calendarConnected={data.calendarConnected}
      />
    </div>
  );
}
