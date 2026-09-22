import { notFound } from 'next/navigation';
import { auth } from '@/auth';
import { todayDayOfWeek } from '@/lib/week';
import { getWeekPageData } from '@/lib/page-data';
import { PlanWeekClient } from '@/components/PlanWeekClient';

export default async function DiaPage({ params }: { params: Promise<{ iso: string; dow: string }> }) {
  const { iso, dow } = await params;
  if (!/^\d{4}-W\d{2}$/.test(iso)) notFound();
  const dayOfWeek = Number(dow);
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 0 || dayOfWeek > 6) notFound();

  const session = await auth();
  const data = await getWeekPageData(session!.user.id, iso);

  return (
    <PlanWeekClient
      initialWeek={data.week}
      initialInbox={data.inbox}
      habits={data.habits}
      projects={data.projects}
      isoWeek={iso}
      mode="day"
      viewDow={dayOfWeek}
      todayDow={todayDayOfWeek()}
      todoistConnected={data.todoistConnected}
      calendarConnected={data.calendarConnected}
    />
  );
}
