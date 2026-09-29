'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/Toast';
import { text } from '@/i18n/es';

const OPTIONS = ['LABORABLES', 'SIEMPRE', 'NUNCA'] as const;
type ArranqueVisibility = (typeof OPTIONS)[number];

interface Props {
  initialVisibility: ArranqueVisibility;
  initialExtendedFocusEnabled: boolean;
}

export function ArranqueSettings({ initialVisibility, initialExtendedFocusEnabled }: Props) {
  const [visibility, setVisibility] = useState<ArranqueVisibility>(initialVisibility);
  const [extendedFocusEnabled, setExtendedFocusEnabled] = useState(initialExtendedFocusEnabled);
  const { showToast } = useToast();

  async function save(next: ArranqueVisibility) {
    const previous = visibility;
    setVisibility(next);
    try {
      await api.patch('/api/settings/day-ritual', { arranqueVisibility: next });
    } catch {
      setVisibility(previous);
      showToast(text.arranqueSettings.saveError, 'error');
    }
  }

  async function saveExtendedFocus(next: boolean) {
    const previous = extendedFocusEnabled;
    setExtendedFocusEnabled(next);
    try {
      await api.patch('/api/settings/day-ritual', { extendedFocusEnabled: next });
    } catch {
      setExtendedFocusEnabled(previous);
      showToast(text.arranqueSettings.saveError, 'error');
    }
  }

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-1 text-sm font-semibold">{text.arranqueSettings.title}</h3>
      <p className="mb-3 text-xs text-base-muted">{text.arranqueSettings.description}</p>
      <div className="flex flex-wrap gap-1.5">
        {OPTIONS.map((option) => (
          <button
            key={option}
            onClick={() => save(option)}
            className={
              visibility === option
                ? 'rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white'
                : 'rounded-full border border-base-border px-3 py-1.5 text-xs hover:bg-base-border/40'
            }
          >
            {text.arranqueSettings.optionLabels[option]}
          </button>
        ))}
      </div>

      <div className="mt-4 border-t border-base-border pt-4">
        <label className="flex items-start gap-2">
          <input
            type="checkbox"
            checked={extendedFocusEnabled}
            onChange={(e) => saveExtendedFocus(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-base-border"
          />
          <span>
            <span className="block text-sm font-semibold">{text.arranqueSettings.extendedFocusTitle}</span>
            <span className="block text-xs text-base-muted">{text.arranqueSettings.extendedFocusDescription}</span>
          </span>
        </label>
      </div>
    </div>
  );
}
