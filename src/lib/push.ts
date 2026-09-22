import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

let configured = false;

function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:admin@example.com',
    process.env.VAPID_PUBLIC_KEY ?? '',
    process.env.VAPID_PRIVATE_KEY ?? ''
  );
  configured = true;
}

export async function sendPushToUser(userId: string, payload: { title: string; body: string; url?: string }) {
  ensureConfigured();
  const subs = await prisma.pushSubscription.findMany({ where: { userId } });

  let sent = 0;
  let expired = 0;
  let failed = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: { p256dh: sub.p256dh, auth: sub.auth },
          },
          JSON.stringify(payload)
        );
        sent += 1;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 404 || statusCode === 410) {
          expired += 1;
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          failed += 1;
          console.error(`[push] fallo enviando a userId=${userId} statusCode=${statusCode ?? 'desconocido'}`, err);
        }
      }
    })
  );

  return { total: subs.length, sent, expired, failed };
}
