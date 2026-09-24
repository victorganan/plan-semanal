import { auth } from '@/auth';
import { getTodayPendingTasks } from '@/lib/page-data';
import { PomodoroTimer } from '@/components/PomodoroTimer';
import { text } from '@/i18n/es';

export default async function HerramientasPomodoroPage() {
  const session = await auth();
  const todayTasks = await getTodayPendingTasks(session!.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{text.herramientas.pomodoroPageTitle}</h1>
        <p className="text-sm text-base-muted">{text.herramientas.pomodoroPageSubtitle}</p>
      </div>

      <PomodoroTimer todayTasks={todayTasks} />
    </div>
  );
}
