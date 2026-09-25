import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { todayDayOfWeek } from '@/lib/week';
import { getWeekPageData } from '@/lib/page-data';
import { PlanWeekClient } from '@/components/PlanWeekClient';

export default async function SemanaPage({ params }: { params: Promise<{ iso: string }> }) {
  const { iso } = await params;
  if (!/^\d{4}-W\d{2}$/.test(iso)) notFound();

  const session = await auth();
  const data = await getWeekPageData(session!.user.id, iso);

  return (
    <PlanWeekClient
      initialWeek={data.week}
      initialInbox={data.inbox}
      habits={data.habits}
      projects={data.projects}
      areas={data.areas}
      tags={data.tags}
      isoWeek={iso}
      mode="week"
      viewDow={todayDayOfWeek()}
      todayDow={todayDayOfWeek()}
      todoistConnected={data.todoistConnected}
      calendarConnected={data.calendarConnected}
      dailyCapacityMinutes={data.dailyCapacityMinutes}
      bufferPercent={data.bufferPercent}
    />
  );
}
