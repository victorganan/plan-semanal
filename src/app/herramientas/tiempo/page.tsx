import { auth } from '@/auth';
import { getTimeReport } from '@/lib/time-report';
import { TimeReportClient } from '@/components/TimeReportClient';

export default async function HerramientasTiempoPage() {
  const session = await auth();
  const report = await getTimeReport(session!.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Real vs. Estimado</h1>
        <p className="text-sm text-base-muted">
          Compara el tiempo estimado de tus tareas con el tiempo que realmente les has dedicado.
        </p>
      </div>

      <TimeReportClient week={report.week} all={report.all} />
    </div>
  );
}
