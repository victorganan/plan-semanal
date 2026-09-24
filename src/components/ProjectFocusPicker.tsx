import { MultiSelectDropdown } from '@/components/MultiSelectDropdown';
import type { ProjectWithArea } from '@/types';
import { text } from '@/i18n/es';

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
      <h3 className="mb-3 text-sm font-semibold">{text.projectFocusPicker.title}</h3>
      {active.length === 0 ? (
        <p className="text-sm text-base-muted">{text.projectFocusPicker.empty}</p>
      ) : (
        <MultiSelectDropdown
          options={active.map((p) => ({ id: p.id, label: p.name, sublabel: p.area.name }))}
          selectedIds={focusedIds}
          onToggle={onToggle}
          placeholder={text.projectFocusPicker.searchPlaceholder}
          noSelectionLabel={text.projectFocusPicker.noSelection}
        />
      )}
    </div>
  );
}
