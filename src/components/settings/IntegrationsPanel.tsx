'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';

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
      <h3 className="mb-3 text-sm font-semibold">Integraciones</h3>

      <div className="space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium">Todoist</p>
            <p className="text-xs text-base-muted">Importa tareas de Todoist y exporta tus acciones/llamadas.</p>
          </div>
          {todoistConnected ? (
            <button onClick={disconnectTodoist} className="rounded-full border border-base-border px-3 py-1.5 text-xs hover:bg-base-border/40">
              Desconectar
            </button>
          ) : (
            <a href="/api/integrations/todoist/connect" className="rounded-full bg-accent px-3 py-1.5 text-xs font-medium text-white">
              Conectar
            </a>
          )}
        </div>

        <div className="flex items-center justify-between gap-4 border-t border-base-border pt-4">
          <div>
            <p className="text-sm font-medium">Google Calendar</p>
            <p className="text-xs text-base-muted">
              Usa el mismo permiso de tu login con Google. Si no aparece conectado, cierra sesión y vuelve a entrar concediendo el acceso a Calendar.
            </p>
          </div>
          <span
            className={
              initialCalendarConnected
                ? 'rounded-full bg-accent/10 px-3 py-1.5 text-xs font-medium text-accent'
                : 'rounded-full bg-base-border px-3 py-1.5 text-xs font-medium text-base-muted'
            }
          >
            {initialCalendarConnected ? 'Conectado' : 'Sin conectar'}
          </span>
        </div>
      </div>
    </div>
  );
}
