import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendPushToUser } from '@/lib/push';
import { mondayBasedDayOfWeek } from '@/lib/week';

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
  }

  const slot = req.nextUrl.searchParams.get('slot');
  if (slot !== 'MORNING' && slot !== 'EVENING') {
    return NextResponse.json({ error: 'slot inválido' }, { status: 400 });
  }

  const todayDow = mondayBasedDayOfWeek(new Date());

  const users = await prisma.user.findMany({
    where: { weeklyReminderDayOfWeek: todayDow, weeklyReminderTime: slot },
    select: { id: true },
  });

  const results = await Promise.all(
    users.map((u) =>
      sendPushToUser(u.id, {
        title: 'Prepara tu próxima semana',
        body: 'Es un buen momento para revisar objetivos, tareas pendientes y planificar lo que viene.',
        url: '/semana',
      })
    )
  );

  const summary = results.reduce(
    (acc, r) => ({
      sent: acc.sent + r.sent,
      expired: acc.expired + r.expired,
      failed: acc.failed + r.failed,
    }),
    { sent: 0, expired: 0, failed: 0 }
  );

  console.log(`[cron:weekly-reminder] slot=${slot} usuarios=${users.length}`, summary);

  return NextResponse.json({ ok: true, notified: users.length, ...summary });
}
