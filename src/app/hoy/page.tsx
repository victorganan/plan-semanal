import { auth } from '@/auth';
import { currentIsoWeek, todayDayOfWeek } from '@/lib/week';
import { getWeekPageData } from '@/lib/page-data';
import { PlanWeekClient } from '@/components/PlanWeekClient';

export default async function HoyPage() {
  const session = await auth();
  const isoWeek = currentIsoWeek();
  const data = await getWeekPageData(session!.user.id, isoWeek);

  return (
    <PlanWeekClient
      initialWeek={data.week}
      habits={data.habits}
      projects={data.projects}
      isoWeek={isoWeek}
      mode="today"
      todayDow={todayDayOfWeek()}
      todoistConnected={data.todoistConnected}
      calendarConnected={data.calendarConnected}
    />
  );
}
