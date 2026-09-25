'use client';

import { useState } from 'react';
import { DurationPicker } from '@/components/DurationPicker';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { formatDurationMinutes } from '@/types';
import { text } from '@/i18n/es';

export function CapacitySettings({ initialMinutes, initialBufferPercent }: { initialMinutes: number; initialBufferPercent: number }) {
  const [minutes, setMinutes] = useState(initialMinutes);
  const [bufferPercent, setBufferPercent] = useState(initialBufferPercent);
  const { showToast } = useToast();

  async function save(next: number | null) {
    if (!next) return;
    const previous = minutes;
    setMinutes(next);
    try {
      await api.patch('/api/settings/capacity', { dailyCapacityMinutes: next });
    } catch {
      setMinutes(previous);
      showToast(text.capacitySettings.saveError, 'error');
    }
  }

  async function saveBuffer(next: number) {
    const previous = bufferPercent;
    setBufferPercent(next);
    try {
      await api.patch('/api/settings/capacity', { bufferPercent: next });
    } catch {
      setBufferPercent(previous);
      showToast(text.capacitySettings.bufferSaveError, 'error');
    }
  }

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-1 text-sm font-semibold">{text.capacitySettings.title}</h3>
      <p className="mb-3 text-xs text-base-muted">{text.capacitySettings.description}</p>
      <div className="flex items-center gap-3">
        <DurationPicker minutes={minutes} onChange={save} />
        <span className="text-xs text-base-muted">{text.capacitySettings.currentLabel(formatDurationMinutes(minutes))}</span>
      </div>

      <div className="mt-4 border-t border-base-border pt-4">
        <h4 className="mb-1 text-sm font-semibold">{text.capacitySettings.bufferTitle}</h4>
        <p className="mb-3 text-xs text-base-muted">{text.capacitySettings.bufferDescription}</p>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={40}
            step={5}
            value={bufferPercent}
            onChange={(e) => saveBuffer(Number(e.target.value))}
            className="w-40"
          />
          <span className="text-xs text-base-muted">{text.capacitySettings.bufferCurrentLabel(bufferPercent)}</span>
        </div>
      </div>
    </div>
  );
}
