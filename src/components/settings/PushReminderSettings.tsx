'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { DAY_NAMES } from '@/lib/week';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export function PushReminderSettings({
  initialDayOfWeek,
  initialSlot,
}: {
  initialDayOfWeek: number | null;
  initialSlot: string | null;
}) {
  const [supported, setSupported] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [dayOfWeek, setDayOfWeek] = useState(initialDayOfWeek ?? 4);
  const [slot, setSlot] = useState(initialSlot ?? 'EVENING');
  const { showToast } = useToast();

  useEffect(() => {
    const ok = typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
    setSupported(ok);
    if (!ok) return;
    navigator.serviceWorker.getRegistration('/sw.js').then(async (reg) => {
      const sub = await reg?.pushManager.getSubscription();
      setSubscribed(!!sub);
    });
  }, []);

  async function subscribe() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        showToast('Necesitamos tu permiso de notificaciones para avisarte', 'error');
        return;
      }
      const reg = await navigator.serviceWorker.register('/sw.js');
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? '';
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
      const json = sub.toJSON();
      await api.post('/api/push/subscribe', { endpoint: json.endpoint, keys: json.keys });
      setSubscribed(true);
      showToast('Notificaciones activadas');
    } catch {
      showToast('No se pudo activar las notificaciones', 'error');
    }
  }

  async function saveSchedule(nextDay: number, nextSlot: string) {
    setDayOfWeek(nextDay);
    setSlot(nextSlot);
    try {
      await api.patch('/api/settings/reminder', { weeklyReminderDayOfWeek: nextDay, weeklyReminderTime: nextSlot });
    } catch {
      showToast('No se pudo guardar el recordatorio', 'error');
    }
  }

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">Recordatorio semanal</h3>
      <p className="mb-3 text-xs text-base-muted">
        Un aviso tipo notificación para que prepares la semana siguiente. Por limitaciones del plan gratuito de
        alojamiento, la hora es aproximada (mañana ≈ 9:00, tarde ≈ 19:00), no al minuto exacto.
      </p>

      {!supported ? (
        <p className="text-sm text-base-muted">Tu navegador no soporta notificaciones push.</p>
      ) : !subscribed ? (
        <button onClick={subscribe} className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">
          Activar notificaciones
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={dayOfWeek}
            onChange={(e) => saveSchedule(Number(e.target.value), slot)}
            className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
          >
            {DAY_NAMES.map((d, i) => (
              <option key={d} value={i}>
                {d}
              </option>
            ))}
          </select>
          <select
            value={slot}
            onChange={(e) => saveSchedule(dayOfWeek, e.target.value)}
            className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
          >
            <option value="MORNING">Por la mañana (~9:00)</option>
            <option value="EVENING">Por la tarde (~19:00)</option>
          </select>
          <span className="text-xs text-accent">✓ Activado</span>
        </div>
      )}
    </div>
  );
}
