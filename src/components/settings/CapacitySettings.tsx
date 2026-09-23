'use client';

import { useState } from 'react';
import { DurationPicker } from '@/components/DurationPicker';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { formatDurationMinutes } from '@/types';

export function CapacitySettings({ initialMinutes }: { initialMinutes: number }) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const { showToast } = useToast();

  async function save(next: number | null) {
    if (!next) return;
    const previous = minutes;
    setMinutes(next);
    try {
      await api.patch('/api/settings/capacity', { dailyCapacityMinutes: next });
    } catch {
      setMinutes(previous);
      showToast('No se pudo guardar la capacidad diaria', 'error');
    }
  }

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-1 text-sm font-semibold">Capacidad diaria</h3>
      <p className="mb-3 text-xs text-base-muted">
        Horas reales que sueles tener disponibles al día (descontando reuniones fijas, comidas, etc.). Se usa para
        avisarte cuando sobreplanificas un día.
      </p>
      <div className="flex items-center gap-3">
        <DurationPicker minutes={minutes} onChange={save} />
        <span className="text-xs text-base-muted">Ahora mismo: {formatDurationMinutes(minutes)}</span>
      </div>
    </div>
  );
}
