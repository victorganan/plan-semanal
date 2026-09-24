import { auth } from '@/auth';
import { getTimeReport } from '@/lib/time-report';
import { TimeReportClient } from '@/components/TimeReportClient';
import { text } from '@/i18n/es';

export default async function HerramientasTiempoPage() {
  const session = await auth();
  const report = await getTimeReport(session!.user.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{text.herramientas.timeReportPageTitle}</h1>
        <p className="text-sm text-base-muted">{text.herramientas.timeReportPageSubtitle}</p>
      </div>

      <TimeReportClient week={report.week} all={report.all} />
    </div>
  );
}
