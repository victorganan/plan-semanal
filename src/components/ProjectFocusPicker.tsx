import { AREA_LABELS } from '@/types';
import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';
import type { Project } from '@/types';

export function ProjectFocusPicker({
  projects,
  focusedIds,
  onToggle,
}: {
  projects: Project[];
  focusedIds: string[];
  onToggle: (projectId: string, focused: boolean) => Promise<void>;
}) {
  const active = projects.filter((p) => p.status === 'ACTIVE');

  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-3 text-sm font-semibold">Proyectos en foco esta semana</h3>
      {active.length === 0 ? (
        <p className="text-sm text-base-muted">Crea proyectos en la sección Proyectos para poder enfocarlos aquí.</p>
      ) : (
        <MultiSelectDropdown
          options={active.map((p) => ({ id: p.id, label: p.name, sublabel: AREA_LABELS[p.area] }))}
          selectedIds={focusedIds}
          onToggle={onToggle}
          placeholder="Buscar proyecto…"
          noSelectionLabel="Ningún proyecto en foco todavía."
        />
      )}
    </div>
  );
}
