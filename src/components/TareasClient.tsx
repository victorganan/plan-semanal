'use client';

import { useEffect, useMemo, useState } from 'react';
import clsx from 'clsx';
import { api, describeApiError } from '@/lib/api-client';
import {
  DEFAULT_LIST_VIEW,
  collapseRecurring,
  filterTasks,
  groupTasks,
  listViewConfigSchema,
  personOf,
  sortTasks,
  type ListTask,
  type ListViewConfig,
} from '@/lib/task-list';
import { todayLocalString } from '@/lib/week';
import { TaskCard } from '@/components/TaskCard';
import { FocusMode } from '@/components/FocusMode';
import { useToast } from '@/components/Toast';
import { useTaskRowNavigation } from '@/components/useTaskRowNavigation';
import { SelectionProvider, SelectToggleButton } from '@/components/selection/SelectionContext';
import { PRIORITY_LABELS } from '@/types';
import type { Area, ProjectWithAreaAndCollaborators, Tag, Task } from '@/types';
import { text } from '@/i18n/es';

const t = text.tareas;

type SavedViewDTO = { id: string; name: string; config: unknown };

// Vistas de serie (no se guardan en base de datos). "Delegadas y en espera"
// sustituye a la vista propia que pedía el módulo 1.3/M3.
const PRESETS: { key: string; label: string; config: Partial<ListViewConfig> }[] = [
  { key: 'pending', label: t.presets.pending, config: {} },
  { key: 'today', label: t.presets.today, config: { when: 'today' } },
  { key: 'overdue', label: t.presets.overdue, config: { when: 'overdue' } },
  { key: 'priority', label: t.presets.priority, config: { onlyPriority: true } },
  { key: 'waiting', label: t.presets.waiting, config: { gtd: 'ESPERANDO', group: 'person' } },
  { key: 'someday', label: t.presets.someday, config: { gtd: 'ALGUN_DIA' } },
  { key: 'done', label: t.presets.done, config: { status: 'done', sort: 'created' } },
];

const LAST_CONFIG_KEY = 'nortvira.tareas.lastView';

function parseConfig(raw: unknown): ListViewConfig {
  const parsed = listViewConfigSchema.safeParse(raw);
  return parsed.success ? parsed.data : DEFAULT_LIST_VIEW;
}

const sameConfig = (a: ListViewConfig, b: ListViewConfig) => JSON.stringify(a) === JSON.stringify(b);

export function TareasClient({
  initialTasks,
  projects,
  areas,
  tags,
  initialSavedViews,
  calendarConnected,
}: {
  initialTasks: ListTask[];
  projects: ProjectWithAreaAndCollaborators[];
  areas: Area[];
  tags: Tag[];
  initialSavedViews: SavedViewDTO[];
  calendarConnected: boolean;
}) {
  const { showToast } = useToast();
  const [tasks, setTasks] = useState(initialTasks);
  const [savedViews, setSavedViews] = useState(initialSavedViews);
  const [config, setConfig] = useState<ListViewConfig>(DEFAULT_LIST_VIEW);
  const [activeView, setActiveView] = useState<string>('pending'); // clave de preset o id de vista guardada
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [savingName, setSavingName] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [focusTask, setFocusTask] = useState<{ id: string; text: string } | null>(null);
  useTaskRowNavigation();

  // Última vista usada en este navegador (comodidad, no dato a conservar).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAST_CONFIG_KEY);
      if (raw) {
        const { key, config: c } = JSON.parse(raw);
        setConfig(parseConfig(c));
        setActiveView(typeof key === 'string' ? key : 'custom');
      }
    } catch {
      // Sin almacenamiento: se empieza en "Pendientes".
    }
  }, []);

  function apply(next: ListViewConfig, key = 'custom') {
    setConfig(next);
    setActiveView(key);
    try {
      localStorage.setItem(LAST_CONFIG_KEY, JSON.stringify({ key, config: next }));
    } catch {
      // Sin almacenamiento: no se recuerda.
    }
  }
  const set = <K extends keyof ListViewConfig>(k: K, v: ListViewConfig[K]) => apply({ ...config, [k]: v });

  const today = todayLocalString();
  const names = useMemo(
    () => ({ areas: new Map(areas.map((a) => [a.id, a.name])), projects: new Map(projects.map((p) => [p.id, p.name])) }),
    [areas, projects]
  );
  const contexts = useMemo(() => [...new Set(tasks.map((x) => x.context).filter((c): c is string => !!c))].sort(), [tasks]);
  const people = useMemo(() => [...new Set(tasks.map(personOf).filter((p): p is string => !!p))].sort((a, b) => a.localeCompare(b, 'es')), [tasks]);

  const groups = useMemo(() => {
    const visible = sortTasks(filterTasks(collapseRecurring(tasks), config, today), config.sort);
    return groupTasks(visible, config.group, today, t.groupLabels, names);
  }, [tasks, config, today, names]);
  const visibleCount = groups.reduce((n, g) => n + g.tasks.length, 0);

  const activeSaved = savedViews.find((v) => v.id === activeView);
  const activePreset = PRESETS.find((p) => p.key === activeView);
  const modified = activeSaved
    ? !sameConfig(config, parseConfig(activeSaved.config))
    : activePreset
      ? !sameConfig(config, { ...DEFAULT_LIST_VIEW, ...activePreset.config })
      : true;
  const activeFilterCount = (Object.keys(DEFAULT_LIST_VIEW) as (keyof ListViewConfig)[]).filter(
    (k) => k !== 'sort' && k !== 'group' && JSON.stringify(config[k]) !== JSON.stringify(DEFAULT_LIST_VIEW[k])
  ).length;

  async function reload() {
    try {
      setTasks(await api.get('/api/tasks/list'));
    } catch (err) {
      showToast(describeApiError(err, t.loadError), 'error');
    }
  }

  async function updateTask(id: string, patch: Record<string, unknown>) {
    setTasks((prev) => prev.map((x) => (x.id === id ? ({ ...x, ...patch } as ListTask) : x)));
    try {
      await api.patch(`/api/tasks/${id}`, patch);
    } catch (err) {
      showToast(describeApiError(err, text.planWeekClient.saveChangeError), 'error');
    }
    await reload(); // fecha del día, proyecto, siguiente recurrente…
  }

  async function deleteTask(id: string) {
    const previous = tasks;
    setTasks((prev) => prev.filter((x) => x.id !== id));
    try {
      await api.delete(`/api/tasks/${id}`);
    } catch (err) {
      setTasks(previous);
      showToast(describeApiError(err, text.planWeekClient.deleteTaskError), 'error');
    }
  }

  async function toggleSubtask(sub: Task) {
    try {
      await api.patch(`/api/tasks/${sub.id}`, { done: !sub.done });
      await reload();
    } catch (err) {
      showToast(describeApiError(err, text.planWeekClient.saveChangeError), 'error');
    }
  }

  async function createCalendarEvent(id: string) {
    try {
      await api.post('/api/integrations/calendar/create-event', { taskId: id });
      showToast(text.planWeekClient.calendarEventCreated);
    } catch (err) {
      showToast(describeApiError(err, text.planWeekClient.calendarEventError), 'error');
    }
  }

  async function saveView() {
    const name = savingName?.trim();
    if (!name) return;
    try {
      const view: SavedViewDTO = await api.post('/api/saved-views', { name, config });
      setSavedViews((prev) => [...prev, view]);
      setSavingName(null);
      apply(config, view.id);
      showToast(t.viewSaved(name));
    } catch (err) {
      showToast(describeApiError(err, t.viewSaveError), 'error');
    }
  }

  async function updateActiveView() {
    if (!activeSaved) return;
    try {
      const view: SavedViewDTO = await api.patch(`/api/saved-views/${activeSaved.id}`, { config });
      setSavedViews((prev) => prev.map((v) => (v.id === view.id ? view : v)));
      apply(config, view.id);
      showToast(t.viewSaved(view.name));
    } catch (err) {
      showToast(describeApiError(err, t.viewSaveError), 'error');
    }
  }

  async function deleteView(view: SavedViewDTO) {
    if (!window.confirm(t.viewDeleteConfirm(view.name))) return;
    try {
      await api.delete(`/api/saved-views/${view.id}`);
      setSavedViews((prev) => prev.filter((v) => v.id !== view.id));
      if (activeView === view.id) setActiveView('custom');
    } catch (err) {
      showToast(describeApiError(err, t.viewSaveError), 'error');
    }
  }

  const chip = (on: boolean) =>
    clsx(
      'min-h-[36px] shrink-0 rounded-full border px-3 text-xs font-medium',
      on ? 'border-base-text bg-base-border/40 text-base-text' : 'border-base-border text-base-muted hover:text-base-text'
    );
  const field = 'min-h-[36px] rounded-lg border border-base-border bg-base-bg px-2 text-sm';

  return (
    <SelectionProvider getTask={(id) => tasks.find((x) => x.id === id)} areas={areas} onApplied={reload} className="space-y-4">
      {focusTask ? (
        <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onTaskDone={() => updateTask(focusTask.id, { done: true })} />
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{t.title}</h1>
          <p className="text-[13px] text-base-muted">{t.count(visibleCount)}</p>
        </div>
        <SelectToggleButton />
      </div>

      {/* Vistas: de serie + guardadas */}
      <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1" role="toolbar" aria-label={t.viewsAriaLabel}>
        {PRESETS.map((p) => (
          <button key={p.key} type="button" aria-pressed={activeView === p.key} onClick={() => apply({ ...DEFAULT_LIST_VIEW, ...p.config }, p.key)} className={chip(activeView === p.key)}>
            {p.label}
          </button>
        ))}
        {savedViews.map((v) => (
          <span key={v.id} className={clsx(chip(activeView === v.id), 'flex items-center gap-1 pr-1')}>
            <button type="button" aria-pressed={activeView === v.id} onClick={() => apply(parseConfig(v.config), v.id)}>
              {v.name}
            </button>
            <button type="button" onClick={() => deleteView(v)} aria-label={t.viewDeleteAriaLabel(v.name)} className="flex h-7 w-7 items-center justify-center rounded-full hover:text-priority-high">
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Filtros, orden y agrupación */}
      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={config.search}
            onChange={(e) => set('search', e.target.value)}
            placeholder={t.searchPlaceholder}
            aria-label={t.searchPlaceholder}
            className={clsx(field, 'w-full sm:w-auto sm:min-w-0 sm:max-w-xs sm:flex-1')}
          />
          <button type="button" onClick={() => setFiltersOpen((v) => !v)} aria-expanded={filtersOpen} className={chip(filtersOpen || activeFilterCount > 0)}>
            {t.filtersButton(activeFilterCount)}
          </button>
          <label className="flex items-center gap-1 text-xs text-base-muted">
            {t.sortLabel}
            <select value={config.sort} onChange={(e) => set('sort', e.target.value as ListViewConfig['sort'])} className={field}>
              {Object.entries(t.sortOptions).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-1 text-xs text-base-muted">
            {t.groupLabel}
            <select value={config.group} onChange={(e) => set('group', e.target.value as ListViewConfig['group'])} className={field}>
              {Object.entries(t.groupOptions).map(([k, label]) => (
                <option key={k} value={k}>
                  {label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {filtersOpen ? (
          <div className="grid gap-2 rounded-card border border-base-border p-3 sm:grid-cols-3">
            <label className="space-y-1 text-xs text-base-muted">
              <span className="block">{t.filters.status}</span>
              <select value={config.status} onChange={(e) => set('status', e.target.value as ListViewConfig['status'])} className={clsx(field, 'w-full')}>
                {Object.entries(t.statusOptions).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-base-muted">
              <span className="block">{t.filters.gtd}</span>
              <select value={config.gtd} onChange={(e) => set('gtd', e.target.value as ListViewConfig['gtd'])} className={clsx(field, 'w-full')}>
                {Object.entries(t.gtdOptions).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-base-muted">
              <span className="block">{t.filters.when}</span>
              <select value={config.when} onChange={(e) => set('when', e.target.value as ListViewConfig['when'])} className={clsx(field, 'w-full')}>
                {Object.entries(t.whenOptions).map(([k, label]) => (
                  <option key={k} value={k}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-base-muted">
              <span className="block">{t.filters.area}</span>
              <select value={config.areaIds[0] ?? ''} onChange={(e) => set('areaIds', e.target.value ? [e.target.value] : [])} className={clsx(field, 'w-full')}>
                <option value="">{t.all}</option>
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
                <option value="none">{t.groupLabels.noArea}</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-base-muted">
              <span className="block">{t.filters.project}</span>
              <select value={config.projectIds[0] ?? ''} onChange={(e) => set('projectIds', e.target.value ? [e.target.value] : [])} className={clsx(field, 'w-full')}>
                <option value="">{t.all}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
                <option value="none">{t.groupLabels.noProject}</option>
              </select>
            </label>
            <label className="space-y-1 text-xs text-base-muted">
              <span className="block">{t.filters.priority}</span>
              <select
                value={config.priorities[0] ?? ''}
                onChange={(e) => set('priorities', e.target.value ? [e.target.value as 'LOW' | 'MEDIUM' | 'HIGH'] : [])}
                className={clsx(field, 'w-full')}
              >
                <option value="">{t.all}</option>
                {(['HIGH', 'MEDIUM', 'LOW'] as const).map((p) => (
                  <option key={p} value={p}>
                    {PRIORITY_LABELS[p]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-base-muted">
              <span className="block">{t.filters.context}</span>
              <select value={config.context} onChange={(e) => set('context', e.target.value)} className={clsx(field, 'w-full')}>
                <option value="">{t.all}</option>
                {contexts.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-xs text-base-muted">
              <span className="block">{t.filters.person}</span>
              <select value={config.person} onChange={(e) => set('person', e.target.value)} className={clsx(field, 'w-full')}>
                <option value="">{t.all}</option>
                {people.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex min-h-[44px] items-center gap-2 self-end text-sm">
              <input type="checkbox" checked={config.onlyPriority} onChange={(e) => set('onlyPriority', e.target.checked)} className="h-4 w-4" />
              {t.filters.onlyPriority}
            </label>
            {activeFilterCount > 0 ? (
              <button type="button" onClick={() => apply({ ...DEFAULT_LIST_VIEW, sort: config.sort, group: config.group })} className="min-h-[44px] text-left text-xs font-medium text-accent hover:underline sm:col-span-3">
                {t.clearFilters}
              </button>
            ) : null}
          </div>
        ) : null}

        {/* Guardar la vista actual */}
        {modified || savingName !== null ? (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {savingName === null ? (
              <>
                <button type="button" onClick={() => setSavingName('')} className="min-h-[36px] font-medium text-accent hover:underline">
                  {t.saveAsView}
                </button>
                {activeSaved ? (
                  <button type="button" onClick={updateActiveView} className="min-h-[36px] font-medium text-accent hover:underline">
                    {t.updateView(activeSaved.name)}
                  </button>
                ) : null}
              </>
            ) : (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveView();
                }}
                className="flex items-center gap-2"
              >
                <input
                  autoFocus
                  value={savingName}
                  onChange={(e) => setSavingName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Escape' && setSavingName(null)}
                  placeholder={t.viewNamePlaceholder}
                  aria-label={t.viewNamePlaceholder}
                  maxLength={60}
                  className={field}
                />
                <button type="submit" disabled={!savingName.trim()} className="min-h-[36px] rounded-full bg-accent px-3 font-medium text-white disabled:opacity-40">
                  {text.common.save}
                </button>
                <button type="button" onClick={() => setSavingName(null)} className="min-h-[36px] px-2">
                  {text.common.cancel}
                </button>
              </form>
            )}
          </div>
        ) : null}
      </div>

      {/* Lista */}
      {visibleCount === 0 ? (
        <div className="rounded-card border border-dashed border-base-border p-6 text-sm text-base-muted">
          <p>{t.empty}</p>
          {activeFilterCount > 0 ? (
            <button type="button" onClick={() => apply({ ...DEFAULT_LIST_VIEW, sort: config.sort, group: config.group })} className="mt-2 min-h-[44px] font-medium text-accent hover:underline">
              {t.clearFilters}
            </button>
          ) : null}
        </div>
      ) : (
        groups.map((g) => (
          <section key={g.key} aria-label={g.label || t.title} className="space-y-2">
            {g.label ? (
              <h2 className="text-sm font-semibold">
                {g.label} <span className="font-normal tabular-nums text-base-muted">{g.tasks.length}</span>
              </h2>
            ) : null}
            {g.tasks.map((task) => (
              <div key={task.id}>
                <TaskCard
                  task={task}
                  projects={projects}
                  areas={areas}
                  tags={tags}
                  onUpdate={updateTask}
                  onDelete={deleteTask}
                  onStartFocus={(id) => setFocusTask({ id, text: task.text })}
                  showRecurrence
                  {...(calendarConnected ? { onCreateCalendarEvent: createCalendarEvent } : {})}
                />
                {task.subtasks.length > 0 ? (
                  <div className="ml-6 mt-1">
                    <button
                      type="button"
                      aria-expanded={expanded.has(task.id)}
                      onClick={() =>
                        setExpanded((prev) => {
                          const next = new Set(prev);
                          if (next.has(task.id)) next.delete(task.id);
                          else next.add(task.id);
                          return next;
                        })
                      }
                      className="min-h-[36px] text-xs text-base-muted hover:text-base-text"
                    >
                      {expanded.has(task.id) ? '▾' : '▸'} {t.subtasks(task.subtasks.filter((s) => s.done).length, task.subtasks.length)}
                    </button>
                    {expanded.has(task.id) ? (
                      <ul className="space-y-0.5 border-l border-base-border pl-3">
                        {task.subtasks.map((s) => (
                          <li key={s.id}>
                            <label className="flex min-h-[36px] items-center gap-2 text-sm">
                              <input type="checkbox" checked={s.done} onChange={() => toggleSubtask(s)} className="h-4 w-4" />
                              <span className={clsx(s.done && 'text-base-muted line-through')}>{s.text}</span>
                            </label>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ) : null}
              </div>
            ))}
          </section>
        ))
      )}
    </SelectionProvider>
  );
}
