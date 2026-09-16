'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { api } from '@/lib/api-client';
import { AREA_LABELS } from '@/types';
import type { Project } from '@/types';

export function ProjectsClient({ initialProjects }: { initialProjects: Project[] }) {
  const [projects, setProjects] = useState(initialProjects);
  const [name, setName] = useState('');
  const [area, setArea] = useState<'SERVILIA' | 'GESTIONA' | 'PERSONAL'>('SERVILIA');
  const [showArchived, setShowArchived] = useState(false);

  async function refresh() {
    setProjects(await api.get('/api/projects'));
  }

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await api.post('/api/projects', { name: name.trim(), area });
    setName('');
    await refresh();
  }

  async function toggleStatus(p: Project) {
    await api.patch(`/api/projects/${p.id}`, { status: p.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' });
    await refresh();
  }

  async function remove(p: Project) {
    await api.delete(`/api/projects/${p.id}`);
    await refresh();
  }

  const visible = projects.filter((p) => (showArchived ? true : p.status === 'ACTIVE'));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Proyectos</h1>
        <p className="text-sm text-base-muted">Registro global de proyectos por área.</p>
      </div>

      <form onSubmit={createProject} className="flex flex-wrap items-end gap-3 rounded-card border border-base-border bg-base-surface p-4">
        <label className="flex-1 min-w-[200px]">
          <span className="mb-1 block text-xs text-base-muted">Nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            placeholder="Nombre del proyecto"
          />
        </label>
        <label>
          <span className="mb-1 block text-xs text-base-muted">Área</span>
          <select
            value={area}
            onChange={(e) => setArea(e.target.value as typeof area)}
            className="rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
          >
            {Object.entries(AREA_LABELS).map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">
          Añadir proyecto
        </button>
      </form>

      <label className="flex items-center gap-2 text-sm text-base-muted">
        <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
        Mostrar archivados
      </label>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <div key={p.id} className={clsx('rounded-card border border-base-border bg-base-surface p-4', p.status === 'ARCHIVED' && 'opacity-60')}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-medium">{p.name}</h3>
                <p className="text-xs text-base-muted">{AREA_LABELS[p.area]}</p>
              </div>
              <span
                className={clsx(
                  'rounded-full px-2 py-0.5 text-xs font-medium',
                  p.status === 'ACTIVE' ? 'bg-accent/10 text-accent' : 'bg-base-border text-base-muted'
                )}
              >
                {p.status === 'ACTIVE' ? 'Activo' : 'Archivado'}
              </span>
            </div>
            <div className="mt-3 flex gap-2">
              <button onClick={() => toggleStatus(p)} className="rounded-full border border-base-border px-3 py-1 text-xs hover:bg-base-border/40">
                {p.status === 'ACTIVE' ? 'Archivar' : 'Reactivar'}
              </button>
              <button onClick={() => remove(p)} className="rounded-full px-3 py-1 text-xs text-priority-high hover:bg-priority-high/10">
                Eliminar
              </button>
            </div>
          </div>
        ))}
        {visible.length === 0 ? <p className="text-sm text-base-muted">No hay proyectos todavía.</p> : null}
      </div>
    </div>
  );
}
