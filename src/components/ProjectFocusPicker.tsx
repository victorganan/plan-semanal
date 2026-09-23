import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';
import type { ProjectWithArea } from '@/types';

export function ProjectFocusPicker({
  projects,
  focusedIds,
  onToggle,
}: {
  projects: ProjectWithArea[];
  focusedIds: string[];
  onToggle: (projectId: string, focused: boolean) => Promise<void>;
}) {
  const active = projects.filter((p) => p.status === 'ACTIVE');

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">Proyectos en foco esta semana</h3>
      {active.length === 0 ? (
        <p className="text-sm text-base-muted">Crea proyectos en Tu espacio para poder enfocarlos aquí.</p>
      ) : (
        <MultiSelectDropdown
          options={active.map((p) => ({ id: p.id, label: p.name, sublabel: p.area.name }))}
          selectedIds={focusedIds}
          onToggle={onToggle}
          placeholder="Buscar proyecto…"
          noSelectionLabel="Ningún proyecto en foco todavía."
        />
      )}
    </div>
  );
}
