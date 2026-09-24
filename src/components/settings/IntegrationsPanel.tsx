'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';
import { text } from '@/i18n/es';

export function IntegrationsPanel({
  initialTodoistConnected,
  initialCalendarConnected,
}: {
  initialTodoistConnected: boolean;
  initialCalendarConnected: boolean;
}) {
  const [todoistConnected, setTodoistConnected] = useState(initialTodoistConnected);

  async function disconnectTodoist() {
    await api.delete('/api/integrations/todoist/status');
    setTodoistConnected(false);
  }

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">{text.integrationsPanel.title}</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">{text.integrationsPanel.todoistName}</p>
            <p className="text-xs text-base-muted">{text.integrationsPanel.todoistDescription}</p>
          </div>
          {todoistConnected ? (
            <button onClick={disconnectTodoist} className="rounded-full border border-base-border px-3 py-1.5 text-xs hover:bg-base-border/40">
              {text.integrationsPanel.disconnect}
            </button>
          ) : (
            <a href="/api/integrations/todoist/connect" className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white">
              {text.integrationsPanel.connect}
            </a>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-base-border pt-4">
          <div>
            <p className="text-sm font-medium">{text.integrationsPanel.calendarName}</p>
            <p className="text-xs text-base-muted">{text.integrationsPanel.calendarDescription}</p>
          </div>
          <span
            className={
              initialCalendarConnected
                ? 'rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent'
                : 'rounded-full bg-base-border px-3 py-1.5 text-xs font-medium text-base-muted'
            }
          >
            {initialCalendarConnected ? text.integrationsPanel.connected : text.integrationsPanel.notConnected}
          </span>
        </div>
      </div>
    </div>
  );
}
