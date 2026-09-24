import { auth } from '@/auth';
import { getTodayPendingTasks } from '@/lib/page-data';
import { PomodoroTimer } from '@/components/PomodoroTimer';

export default async function HerramientasPomodoroPage() {
  const session = await auth();
  const todayTasks = await getTodayPendingTasks(session!.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Temporizador Pomodoro</h1>
        <p className="text-sm text-base-muted">
          Bloques de enfoque de 25 minutos con descansos, vinculados a tus tareas de hoy.
        </p>
      </div>

      <PomodoroTimer todayTasks={todayTasks} />
    </div>
  );
}
