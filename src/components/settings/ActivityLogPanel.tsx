'use client';

import { useState } from 'react';
import { api } from '@/lib/api-client';

interface LogItem {
  id: string;
  summary: string;
  action: string;
  createdAt: string;
}

export function ActivityLogPanel({ initialItems }: { initialItems: LogItem[] }) {
  const [items, setItems] = useState(initialItems);
  const [open, setOpen] = useState(false);

  async function load() {
    setOpen((v) => !v);
    if (!open) {
      const res = await api.get('/api/activity');
      setItems(res.items);
    }
  }

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <button onClick={load} className="flex w-full items-center justify-between text-sm font-semibold">
        Registro de actividad
        <span className="text-base-muted">{open ? '▲' : '▼'}</span>
      </button>
      {open ? (
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm">
          {items.map((i) => (
            <li key={i.id} className="border-t border-base-border pt-2 first:border-t-0 first:pt-0">
              <p>{i.summary}</p>
              <p className="text-xs text-base-muted">{new Date(i.createdAt).toLocaleString('es-ES')}</p>
            </li>
          ))}
          {items.length === 0 ? <p className="text-sm text-base-muted">Sin actividad registrada todavía.</p> : null}
        </ul>
      ) : null}
    </div>
  );
}
