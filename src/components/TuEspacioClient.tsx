'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { api } from '@/lib/api-client';
import { areaBgClass } from '@/types';
import type { Area, ProjectWithArea } from '@/types';

function AreaRow({
  area,
  colorIndex,
  onSave,
  onDelete,
}: {
  area: Area;
  colorIndex: number;
  onSave: (id: string, patch: { name: string; description: string | null }) => Promise<string | null>;
  onDelete: (id: string) => Promise<string | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(area.name);
  const [description, setDescription] = useState(area.description ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    const err = await onSave(area.id, { name: name.trim(), description: description.trim() || null });
    setBusy(false);
    if (err) {
      setError(err);
      return;
    }
    setError(null);
    setEditing(false);
  }

  async function remove() {
    setBusy(true);
    const err = await onDelete(area.id);
    setBusy(false);
    if (err) setError(err);
  }

  if (editing) {
    return (
      <div className="rounded-card border border-base-border bg-base-surface p-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            placeholder="Nombre del área"
          />
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            placeholder="Descripción (opcional)"
          />
        </div>
        {error ? <p className="mt-2 text-xs text-priority-high">{error}</p> : null}
        <div className="mt-3 flex gap-2">
          <button
            onClick={save}
            disabled={busy}
            className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
          >
            Guardar
          </button>
          <button
            onClick={() => {
              setEditing(false);
              setName(area.name);
              setDescription(area.description ?? '');
              setError(null);
            }}
            className="rounded-full border border-base-border px-4 py-1.5 text-xs"
          >
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-start justify-between gap-3 rounded-card border border-base-border bg-base-surface p-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', areaBgClass(colorIndex))} />
          <h3 className="font-medium">{area.name}</h3>
        </div>
        {area.description ? <p className="mt-1 text-sm text-base-muted">{area.description}</p> : null}
        {error ? <p className="mt-1 text-xs text-priority-high">{error}</p> : null}
      </div>
      <div className="flex shrink-0 gap-2">
        <button onClick={() => setEditing(true)} className="rounded-full border border-base-border px-3 py-1 text-xs hover:bg-base-border/40">
          Editar
        </button>
        <button onClick={remove} disabled={busy} className="rounded-full px-3 py-1 text-xs text-priority-high hover:bg-priority-high/10">
          Eliminar
        </button>
      </div>
    </div>
  );
}

function AreasSection({ areas, onRefresh }: { areas: Area[]; onRefresh: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function createArea(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/api/areas', { name: name.trim(), description: description.trim() || null });
      setName('');
      setDescription('');
      setError(null);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el área');
    }
  }

  async function saveArea(id: string, patch: { name: string; description: string | null }) {
    try {
      await api.patch(`/api/areas/${id}`, patch);
      await onRefresh();
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'No se pudo guardar';
    }
  }

  async function deleteArea(id: string) {
    try {
      await api.delete(`/api/areas/${id}`);
      await onRefresh();
      return null;
    } catch (err) {
      return err instanceof Error ? err.message : 'No se pudo eliminar';
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Áreas</h2>
        <p className="text-sm text-base-muted">Tus espacios de gestión. Organizan el día, los proyectos y el dashboard.</p>
      </div>

      <form onSubmit={createArea} className="flex flex-wrap items-end gap-3 rounded-card border border-base-border bg-base-surface p-4">
        <label className="min-w-[160px] flex-1">
          <span className="mb-1 block text-xs text-base-muted">Nombre</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            placeholder="Nombre del área"
          />
        </label>
        <label className="min-w-[200px] flex-1">
          <span className="mb-1 block text-xs text-base-muted">Descripción (opcional)</span>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            placeholder="Para qué usas este área"
          />
        </label>
        <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">
          Añadir área
        </button>
      </form>
      {error ? <p className="text-xs text-priority-high">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {areas.map((a, i) => (
          <AreaRow key={a.id} area={a} colorIndex={i} onSave={saveArea} onDelete={deleteArea} />
        ))}
        {areas.length === 0 ? <p className="text-sm text-base-muted">Aún no tienes áreas. Crea la primera arriba.</p> : null}
      </div>
    </div>
  );
}

function ProjectsSection({ projects, areas, onRefresh }: { projects: ProjectWithArea[]; areas: Area[]; onRefresh: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [areaId, setAreaId] = useState(areas[0]?.id ?? '');
  const [showArchived, setShowArchived] = useState(false);

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !areaId) return;
    await api.post('/api/projects', { name: name.trim(), areaId });
    setName('');
    await onRefresh();
  }

  async function toggleStatus(p: ProjectWithArea) {
    await api.patch(`/api/projects/${p.id}`, { status: p.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE' });
    await onRefresh();
  }

  async function remove(p: ProjectWithArea) {
    await api.delete(`/api/projects/${p.id}`);
    await onRefresh();
  }

  const visible = projects.filter((p) => (showArchived ? true : p.status === 'ACTIVE'));

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Proyectos</h2>
        <p className="text-sm text-base-muted">Registro global de proyectos por área.</p>
      </div>

      {areas.length === 0 ? (
        <p className="text-sm text-priority-high">Crea al menos un área arriba antes de añadir proyectos.</p>
      ) : (
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
              value={areaId}
              onChange={(e) => setAreaId(e.target.value)}
              className="rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            >
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white">
            Añadir proyecto
          </button>
        </form>
      )}

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
                <p className="text-xs text-base-muted">{p.area.name}</p>
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

export function TuEspacioClient({
  initialAreas,
  initialProjects,
}: {
  initialAreas: Area[];
  initialProjects: ProjectWithArea[];
}) {
  const [areas, setAreas] = useState(initialAreas);
  const [projects, setProjects] = useState(initialProjects);

  async function refreshAreas() {
    setAreas(await api.get('/api/areas'));
  }

  async function refreshProjects() {
    setProjects(await api.get('/api/projects'));
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Tu espacio</h1>
        <p className="text-sm text-base-muted">Tus áreas y proyectos, todo en un sitio.</p>
      </div>
      <AreasSection areas={areas} onRefresh={refreshAreas} />
      <ProjectsSection projects={projects} areas={areas} onRefresh={refreshProjects} />
    </div>
  );
}
