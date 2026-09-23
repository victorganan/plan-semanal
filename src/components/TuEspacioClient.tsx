'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { api, ApiError } from '@/lib/api-client';
import { areaBgClass, AREA_PALETTE_SIZE } from '@/types';
import type { Area, ProjectWithAreaAndCollaborators } from '@/types';

const STATUS_LABELS: Record<string, string> = {
  ACTIVE: 'Activo',
  COMPLETED: 'Completado',
  ARCHIVED: 'Archivado',
};

function ColorSwatchPicker({ value, onChange }: { value: number; onChange: (i: number) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {Array.from({ length: AREA_PALETTE_SIZE }, (_, i) => (
        <button
          key={i}
          type="button"
          onClick={() => onChange(i)}
          aria-label={`Color ${i + 1}`}
          className={clsx(
            'h-6 w-6 rounded-full border-2',
            areaBgClass(i),
            value === i ? 'border-base-text' : 'border-transparent'
          )}
        />
      ))}
    </div>
  );
}

function ChipInput({
  values,
  onChange,
  placeholder,
}: {
  values: string[];
  onChange: (v: string[]) => void;
  placeholder: string;
}) {
  const [draft, setDraft] = useState('');

  function add() {
    const v = draft.trim();
    if (v && !values.includes(v)) onChange([...values, v]);
    setDraft('');
  }

  return (
    <div>
      <div className="mb-1.5 flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="inline-flex items-center gap-1 rounded-full bg-accent/10 px-2.5 py-1 text-xs text-accent">
            {v}
            <button type="button" onClick={() => onChange(values.filter((x) => x !== v))} aria-label={`Quitar ${v}`}>
              ✕
            </button>
          </span>
        ))}
      </div>
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            add();
          }
        }}
        onBlur={add}
        placeholder={placeholder}
        className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
      />
    </div>
  );
}

function AreaBlockers({
  blockers,
  areas,
  currentAreaId,
  onMoved,
}: {
  blockers: { projects: { id: string; name: string }[]; templates: { id: string; name: string }[] };
  areas: Area[];
  currentAreaId: string;
  onMoved: (kind: 'project' | 'template', id: string) => void;
}) {
  const destinations = areas.filter((a) => a.id !== currentAreaId);
  const [target, setTarget] = useState(destinations[0]?.id ?? '');

  async function move(kind: 'project' | 'template', id: string) {
    if (!target) return;
    if (kind === 'project') await api.patch(`/api/projects/${id}`, { areaId: target });
    else await api.patch(`/api/recurring-templates/${id}`, { areaId: target });
    onMoved(kind, id);
  }

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-priority-high/30 bg-priority-high/5 p-3">
      <div className="flex items-center gap-2 text-xs">
        <span className="text-base-muted">Mover a:</span>
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs"
        >
          {destinations.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </div>
      <ul className="space-y-1">
        {blockers.projects.map((p) => (
          <li key={p.id} className="flex items-center justify-between text-xs">
            <span>📁 {p.name}</span>
            <button onClick={() => move('project', p.id)} className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-white">
              Mover
            </button>
          </li>
        ))}
        {blockers.templates.map((t) => (
          <li key={t.id} className="flex items-center justify-between text-xs">
            <span>🔁 {t.name}</span>
            <button onClick={() => move('template', t.id)} className="rounded-full bg-accent px-2.5 py-1 text-xs font-medium text-white">
              Mover
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function AreaRow({
  area,
  areas,
  onSave,
  onDelete,
}: {
  area: Area;
  areas: Area[];
  onSave: (id: string, patch: { name: string; description: string | null; colorIndex: number }) => Promise<string | null>;
  onDelete: (id: string) => Promise<{ error: string; blockers?: { projects: { id: string; name: string }[]; templates: { id: string; name: string }[] } } | null>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(area.name);
  const [description, setDescription] = useState(area.description ?? '');
  const [colorIndex, setColorIndex] = useState(area.colorIndex);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<{ projects: { id: string; name: string }[]; templates: { id: string; name: string }[] } | null>(null);
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    const err = await onSave(area.id, { name: name.trim(), description: description.trim() || null, colorIndex });
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
    const result = await onDelete(area.id);
    setBusy(false);
    if (result) {
      setError(result.error);
      setBlockers(result.blockers ?? null);
    } else {
      setError(null);
      setBlockers(null);
    }
  }

  async function retryAfterMove() {
    // Si ya no quedan bloqueadores, reintenta el borrado automáticamente.
    const result = await onDelete(area.id);
    if (!result) {
      setError(null);
      setBlockers(null);
    }
  }

  function handleMoved(kind: 'project' | 'template', id: string) {
    setBlockers((b) => {
      if (!b) return b;
      const next =
        kind === 'project'
          ? { ...b, projects: b.projects.filter((p) => p.id !== id) }
          : { ...b, templates: b.templates.filter((t) => t.id !== id) };
      if (next.projects.length === 0 && next.templates.length === 0) {
        retryAfterMove();
      }
      return next;
    });
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
        <div className="mt-3">
          <span className="mb-1.5 block text-xs text-base-muted">Color</span>
          <ColorSwatchPicker value={colorIndex} onChange={setColorIndex} />
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
              setColorIndex(area.colorIndex);
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
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className={clsx('h-2.5 w-2.5 shrink-0 rounded-full', areaBgClass(area.colorIndex))} />
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
      {blockers ? <AreaBlockers blockers={blockers} areas={areas} currentAreaId={area.id} onMoved={handleMoved} /> : null}
    </div>
  );
}

function AreasSection({ areas, onRefresh }: { areas: Area[]; onRefresh: () => Promise<void> }) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [colorIndex, setColorIndex] = useState(areas.length % AREA_PALETTE_SIZE);
  const [error, setError] = useState<string | null>(null);

  async function createArea(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/api/areas', { name: name.trim(), description: description.trim() || null, colorIndex });
      setName('');
      setDescription('');
      setColorIndex((areas.length + 1) % AREA_PALETTE_SIZE);
      setError(null);
      await onRefresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear el área');
    }
  }

  async function saveArea(id: string, patch: { name: string; description: string | null; colorIndex: number }) {
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
      if (err instanceof ApiError) {
        return { error: err.message, blockers: err.data.blockers as { projects: { id: string; name: string }[]; templates: { id: string; name: string }[] } | undefined };
      }
      return { error: 'No se pudo eliminar' };
    }
  }

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-semibold">Áreas</h2>
        <p className="text-sm text-base-muted">Tus espacios de gestión. Organizan el día, los proyectos y el dashboard.</p>
      </div>

      <form onSubmit={createArea} className="space-y-3 rounded-card border border-base-border bg-base-surface p-4">
        <div className="flex flex-wrap items-end gap-3">
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
        </div>
        <div>
          <span className="mb-1.5 block text-xs text-base-muted">Color</span>
          <ColorSwatchPicker value={colorIndex} onChange={setColorIndex} />
        </div>
      </form>
      {error ? <p className="text-xs text-priority-high">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {areas.map((a) => (
          <AreaRow key={a.id} area={a} areas={areas} onSave={saveArea} onDelete={deleteArea} />
        ))}
        {areas.length === 0 ? <p className="text-sm text-base-muted">Aún no tienes áreas. Crea la primera arriba.</p> : null}
      </div>
    </div>
  );
}

function ProjectCard({
  project,
  areas,
  onRefresh,
}: {
  project: ProjectWithAreaAndCollaborators;
  areas: Area[];
  onRefresh: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(project.name);
  const [areaId, setAreaId] = useState(project.areaId);
  const [status, setStatus] = useState(project.status);
  const [dueDate, setDueDate] = useState(project.dueDate ? project.dueDate.toString().slice(0, 10) : '');
  const [collaboratorNames, setCollaboratorNames] = useState(project.collaborators.map((c) => c.name));
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!name.trim()) return;
    setBusy(true);
    await api.patch(`/api/projects/${project.id}`, {
      name: name.trim(),
      areaId,
      status,
      dueDate: dueDate ? new Date(dueDate).toISOString() : null,
      collaboratorNames,
    });
    setBusy(false);
    setEditing(false);
    await onRefresh();
  }

  async function remove() {
    await api.delete(`/api/projects/${project.id}`);
    await onRefresh();
  }

  if (editing) {
    return (
      <div className="rounded-card border border-base-border bg-base-surface p-4">
        <div className="space-y-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-base-border bg-base-bg px-3 py-2 text-sm"
            placeholder="Nombre del proyecto"
          />
          <div className="grid gap-2 sm:grid-cols-3">
            <select value={areaId} onChange={(e) => setAreaId(e.target.value)} className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm">
              {areas.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
            >
              {Object.entries(STATUS_LABELS).map(([v, l]) => (
                <option key={v} value={v}>
                  {l}
                </option>
              ))}
            </select>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-lg border border-base-border bg-base-bg px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <span className="mb-1 block text-xs text-base-muted">Personas que participan</span>
            <ChipInput values={collaboratorNames} onChange={setCollaboratorNames} placeholder="Añadir persona y pulsar Enter…" />
          </div>
        </div>
        <div className="mt-3 flex gap-2">
          <button onClick={save} disabled={busy} className="rounded-full bg-accent px-4 py-1.5 text-xs font-semibold text-white disabled:opacity-40">
            Guardar
          </button>
          <button onClick={() => setEditing(false)} className="rounded-full border border-base-border px-4 py-1.5 text-xs">
            Cancelar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={clsx('rounded-card border border-base-border bg-base-surface p-4', project.status === 'ARCHIVED' && 'opacity-60')}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <h3 className="font-medium">{project.name}</h3>
          <p className="text-xs text-base-muted">{project.area.name}</p>
        </div>
        <span
          className={clsx(
            'rounded-full px-2 py-0.5 text-xs font-medium',
            project.status === 'ACTIVE' && 'bg-accent/10 text-accent',
            project.status === 'COMPLETED' && 'bg-priority-low/10 text-priority-low',
            project.status === 'ARCHIVED' && 'bg-base-border text-base-muted'
          )}
        >
          {STATUS_LABELS[project.status]}
        </span>
      </div>
      {project.dueDate ? (
        <p className="mt-1 text-xs text-base-muted">Vence: {new Date(project.dueDate).toLocaleDateString('es-ES')}</p>
      ) : null}
      {project.collaborators.length > 0 ? (
        <div className="mt-2 flex flex-wrap gap-1">
          {project.collaborators.map((c) => (
            <span key={c.id} className="rounded-full bg-base-border/50 px-2 py-0.5 text-xs">
              {c.name}
            </span>
          ))}
        </div>
      ) : null}
      <div className="mt-3 flex gap-2">
        <button onClick={() => setEditing(true)} className="rounded-full border border-base-border px-3 py-1 text-xs hover:bg-base-border/40">
          Editar
        </button>
        <button onClick={remove} className="rounded-full px-3 py-1 text-xs text-priority-high hover:bg-priority-high/10">
          Eliminar
        </button>
      </div>
    </div>
  );
}

function ProjectsSection({
  projects,
  areas,
  onRefresh,
}: {
  projects: ProjectWithAreaAndCollaborators[];
  areas: Area[];
  onRefresh: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [areaId, setAreaId] = useState(areas[0]?.id ?? '');
  const [filterArea, setFilterArea] = useState('');
  const [filterStatus, setFilterStatus] = useState<'ACTIVE' | 'COMPLETED' | 'ARCHIVED' | ''>('ACTIVE');
  const [sort, setSort] = useState<'createdAt_desc' | 'createdAt_asc' | 'dueDate_asc'>('createdAt_desc');

  async function createProject(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !areaId) return;
    await api.post('/api/projects', { name: name.trim(), areaId });
    setName('');
    await onRefresh();
  }

  let visible = projects;
  if (filterArea) visible = visible.filter((p) => p.areaId === filterArea);
  if (filterStatus) visible = visible.filter((p) => p.status === filterStatus);
  visible = visible.slice().sort((a, b) => {
    if (sort === 'dueDate_asc') {
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
    }
    const diff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    return sort === 'createdAt_asc' ? diff : -diff;
  });

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

      <div className="flex flex-wrap items-center gap-3 rounded-card border border-base-border bg-base-surface p-3 text-sm">
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-base-muted">Área</span>
          <select value={filterArea} onChange={(e) => setFilterArea(e.target.value)} className="rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs">
            <option value="">Todas</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-base-muted">Estado</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as typeof filterStatus)}
            className="rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs"
          >
            <option value="">Todos</option>
            <option value="ACTIVE">Activos</option>
            <option value="COMPLETED">Completados</option>
            <option value="ARCHIVED">Archivados</option>
          </select>
        </label>
        <label className="flex items-center gap-1.5">
          <span className="text-xs text-base-muted">Ordenar</span>
          <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} className="rounded-lg border border-base-border bg-base-bg px-2 py-1 text-xs">
            <option value="createdAt_desc">Más recientes primero</option>
            <option value="createdAt_asc">Más antiguos primero</option>
            <option value="dueDate_asc">Vencimiento más próximo</option>
          </select>
        </label>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <ProjectCard key={p.id} project={p} areas={areas} onRefresh={onRefresh} />
        ))}
        {visible.length === 0 ? <p className="text-sm text-base-muted">No hay proyectos con esos filtros.</p> : null}
      </div>
    </div>
  );
}

export function TuEspacioClient({
  initialAreas,
  initialProjects,
}: {
  initialAreas: Area[];
  initialProjects: ProjectWithAreaAndCollaborators[];
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
