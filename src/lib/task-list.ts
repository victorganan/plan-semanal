import { z } from 'zod';
import { localDateString } from './week';
import type { TaskWithProject } from '../types';

// Módulo Lista de tareas (página "Tareas"): filtros, orden, agrupación y
// recurrentes, como funciones puras sobre las tareas ya cargadas.

export type ListTask = TaskWithProject & {
  // Fecha del día al que está asignada (YYYY-MM-DD, sin zona horaria),
  // calculada en el servidor a partir de semana+día. null si no tiene día.
  dayDate: string | null;
};

export const listViewConfigSchema = z.object({
  status: z.enum(['pending', 'done', 'all']).default('pending'),
  gtd: z.enum(['all', 'INBOX', 'ACTIVA', 'ESPERANDO', 'ALGUN_DIA']).default('all'),
  areaIds: z.array(z.string().max(40)).max(50).default([]), // 'none' = sin área
  projectIds: z.array(z.string().max(40)).max(100).default([]), // 'none' = sin proyecto
  priorities: z.array(z.enum(['LOW', 'MEDIUM', 'HIGH'])).max(3).default([]),
  context: z.string().max(50).default(''),
  person: z.string().max(100).default(''),
  when: z.enum(['all', 'overdue', 'today', 'week', 'upcoming', 'none']).default('all'),
  onlyPriority: z.boolean().default(false),
  search: z.string().max(100).default(''),
  sort: z.enum(['date', 'priority', 'created', 'alpha']).default('date'),
  group: z.enum(['none', 'area', 'project', 'status', 'date', 'context', 'person']).default('none'),
});

export type ListViewConfig = z.infer<typeof listViewConfigSchema>;
export const DEFAULT_LIST_VIEW: ListViewConfig = listViewConfigSchema.parse({});

// Fecha efectiva (YYYY-MM-DD local): la hora programada manda; si no, el día.
export function effectiveDate(task: Pick<ListTask, 'scheduledAt' | 'dayDate'>): string | null {
  if (task.scheduledAt) return localDateString(new Date(task.scheduledAt));
  return task.dayDate;
}

export type GtdBucket = 'INBOX' | 'ACTIVA' | 'ESPERANDO' | 'ALGUN_DIA';

export function gtdBucket(task: Pick<ListTask, 'kind' | 'processedAt' | 'gtdStatus'>): GtdBucket {
  if (task.gtdStatus === 'ESPERANDO' || task.gtdStatus === 'ALGUN_DIA') return task.gtdStatus;
  if (task.kind === 'BACKLOG' && !task.processedAt) return 'INBOX';
  return 'ACTIVA';
}

export function personOf(task: Pick<ListTask, 'assignedTo' | 'waitingOn'>): string | null {
  return task.assignedTo?.trim() || task.waitingOn?.trim() || null;
}

function areaIdOf(task: ListTask): string | null {
  return task.areaId ?? task.project?.areaId ?? null;
}

// Recurrentes: de cada serie solo se ve la próxima ocurrencia pendiente
// (la de fecha más temprana), no todas las semanas ya generadas.
export function collapseRecurring(tasks: ListTask[]): ListTask[] {
  const next = new Map<string, ListTask>();
  for (const t of tasks) {
    if (!t.recurringTemplateId || t.done) continue;
    const current = next.get(t.recurringTemplateId);
    const d = effectiveDate(t);
    const cd = current ? effectiveDate(current) : null;
    if (!current || (d !== null && (cd === null || d < cd))) next.set(t.recurringTemplateId, t);
  }
  return tasks.filter((t) => !t.recurringTemplateId || t.done || next.get(t.recurringTemplateId) === t);
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(`${dateStr}T00:00`);
  d.setDate(d.getDate() + n);
  return localDateString(d);
}

// Domingo de la semana de `today` (semana de lunes a domingo).
function endOfWeek(today: string): string {
  const dow = (new Date(`${today}T00:00`).getDay() + 6) % 7;
  return addDays(today, 6 - dow);
}

function matchesWhen(date: string | null, when: ListViewConfig['when'], today: string): boolean {
  switch (when) {
    case 'all':
      return true;
    case 'none':
      return date === null;
    case 'overdue':
      return date !== null && date < today;
    case 'today':
      return date === today;
    case 'week':
      return date !== null && date >= today && date <= endOfWeek(today);
    case 'upcoming':
      return date !== null && date > today;
  }
}

export function filterTasks(tasks: ListTask[], c: ListViewConfig, today: string): ListTask[] {
  const q = c.search.trim().toLowerCase();
  return tasks.filter((t) => {
    if (c.status === 'pending' && t.done) return false;
    if (c.status === 'done' && !t.done) return false;
    if (c.gtd !== 'all' && gtdBucket(t) !== c.gtd) return false;
    if (c.areaIds.length > 0 && !c.areaIds.includes(areaIdOf(t) ?? 'none')) return false;
    if (c.projectIds.length > 0 && !c.projectIds.includes(t.projectId ?? 'none')) return false;
    if (c.priorities.length > 0 && !c.priorities.includes(t.priority)) return false;
    if (c.context && (t.context ?? '') !== c.context) return false;
    if (c.person && personOf(t) !== c.person) return false;
    if (c.onlyPriority && !t.isPriority) return false;
    if (!matchesWhen(effectiveDate(t), c.when, today)) return false;
    if (q && !`${t.text} ${t.description ?? ''}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

const PRIORITY_RANK = { HIGH: 0, MEDIUM: 1, LOW: 2 } as const;

function compareDates(a: string | null, b: string | null): number {
  if (a === b) return 0;
  if (a === null) return 1; // sin fecha, al final
  if (b === null) return -1;
  return a < b ? -1 : 1;
}

export function sortTasks(tasks: ListTask[], sort: ListViewConfig['sort']): ListTask[] {
  const byCreated = (a: ListTask, b: ListTask) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
  const byPriority = (a: ListTask, b: ListTask) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
  const byDate = (a: ListTask, b: ListTask) =>
    compareDates(effectiveDate(a), effectiveDate(b)) ||
    compareDates(a.scheduledAt ? new Date(a.scheduledAt).toISOString() : null, b.scheduledAt ? new Date(b.scheduledAt).toISOString() : null);
  const cmp: Record<ListViewConfig['sort'], (a: ListTask, b: ListTask) => number> = {
    date: (a, b) => byDate(a, b) || byPriority(a, b) || byCreated(a, b),
    priority: (a, b) => byPriority(a, b) || byDate(a, b) || byCreated(a, b),
    created: (a, b) => byCreated(b, a),
    alpha: (a, b) => a.text.localeCompare(b.text, 'es'),
  };
  return [...tasks].sort(cmp[sort]);
}

export type TaskGroup = { key: string; label: string; tasks: ListTask[] };

export type GroupLabels = {
  noArea: string;
  noProject: string;
  noContext: string;
  noPerson: string;
  status: Record<GtdBucket, string>;
  date: { overdue: string; today: string; tomorrow: string; week: string; later: string; none: string };
};

function dateBucket(date: string | null, today: string): keyof GroupLabels['date'] {
  if (date === null) return 'none';
  if (date < today) return 'overdue';
  if (date === today) return 'today';
  if (date === addDays(today, 1)) return 'tomorrow';
  if (date <= endOfWeek(today)) return 'week';
  return 'later';
}

const DATE_ORDER = ['overdue', 'today', 'tomorrow', 'week', 'later', 'none'];
const STATUS_ORDER: GtdBucket[] = ['INBOX', 'ACTIVA', 'ESPERANDO', 'ALGUN_DIA'];

// Agrupa conservando el orden ya aplicado dentro de cada grupo. Los grupos
// "sin X" van al final; fecha y estado siguen su orden natural.
export function groupTasks(
  tasks: ListTask[],
  group: ListViewConfig['group'],
  today: string,
  labels: GroupLabels,
  names: { areas: Map<string, string>; projects: Map<string, string> }
): TaskGroup[] {
  if (group === 'none') return [{ key: 'all', label: '', tasks }];
  const keyOf = (t: ListTask): [string, string] => {
    switch (group) {
      case 'area': {
        const id = areaIdOf(t);
        return id ? [id, names.areas.get(id) ?? labels.noArea] : ['~none', labels.noArea];
      }
      case 'project':
        return t.projectId ? [t.projectId, names.projects.get(t.projectId) ?? labels.noProject] : ['~none', labels.noProject];
      case 'status': {
        const b = gtdBucket(t);
        return [String(STATUS_ORDER.indexOf(b)), labels.status[b]];
      }
      case 'date': {
        const b = dateBucket(effectiveDate(t), today);
        return [String(DATE_ORDER.indexOf(b)), labels.date[b]];
      }
      case 'context':
        return t.context ? [t.context, t.context] : ['~none', labels.noContext];
      case 'person': {
        const p = personOf(t);
        return p ? [p, p] : ['~none', labels.noPerson];
      }
    }
  };
  const groups = new Map<string, TaskGroup>();
  for (const t of tasks) {
    const [key, label] = keyOf(t);
    if (!groups.has(key)) groups.set(key, { key, label, tasks: [] });
    groups.get(key)!.tasks.push(t);
  }
  const ordered = group === 'status' || group === 'date';
  return [...groups.values()].sort((a, b) => {
    if (a.key === '~none') return 1;
    if (b.key === '~none') return -1;
    return ordered ? Number(a.key) - Number(b.key) : a.label.localeCompare(b.label, 'es');
  });
}
