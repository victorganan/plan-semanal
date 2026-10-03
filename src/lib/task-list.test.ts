import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIST_VIEW,
  collapseRecurring,
  effectiveDate,
  filterTasks,
  groupTasks,
  listViewConfigSchema,
  sortTasks,
  type GroupLabels,
  type ListTask,
} from './task-list';
import { movePatchFor } from './task-move';

let n = 0;
function task(over: Partial<ListTask> = {}): ListTask {
  n += 1;
  return {
    id: `t${n}`,
    userId: 'u',
    weekId: null,
    dayId: null,
    kind: 'DAY_AREA',
    areaId: 'a1',
    area: null,
    text: `Tarea ${n}`,
    description: null,
    done: false,
    priority: 'MEDIUM',
    durationMinutes: null,
    calendarEventId: null,
    quadrant: null,
    assignedTo: null,
    isTop3: false,
    executedMinutes: 0,
    isPriority: false,
    firstStep: null,
    desiredOutcome: null,
    context: null,
    gtdStatus: 'ACTIVA',
    processedAt: new Date('2026-01-01'),
    waitingOn: null,
    followUpDate: null,
    snoozeUntil: null,
    rescheduleCount: 0,
    projectId: null,
    scheduledAt: null,
    recurrence: 'NONE',
    recurringTemplateId: null,
    parentTaskId: null,
    order: 0,
    createdAt: new Date(`2026-01-${String(n % 28 + 1).padStart(2, '0')}`),
    updatedAt: new Date(),
    project: null,
    subtasks: [],
    recurringTemplate: null,
    tags: [],
    dayDate: null,
    ...over,
  } as ListTask;
}

const TODAY = '2026-10-07'; // miércoles
const cfg = (over: Partial<typeof DEFAULT_LIST_VIEW> = {}) => ({ ...DEFAULT_LIST_VIEW, ...over });

describe('effectiveDate', () => {
  it('usa el día si no hay hora y la hora si la hay', () => {
    expect(effectiveDate(task({ dayDate: '2026-10-08' }))).toBe('2026-10-08');
    expect(effectiveDate(task({ dayDate: '2026-10-08', scheduledAt: new Date('2026-10-09T10:00') }))).toBe('2026-10-09');
    expect(effectiveDate(task())).toBe(null);
  });
});

describe('collapseRecurring', () => {
  it('deja solo la próxima ocurrencia pendiente de cada serie', () => {
    const a = task({ recurringTemplateId: 'r', dayDate: '2026-10-14' });
    const b = task({ recurringTemplateId: 'r', dayDate: '2026-10-07' });
    const done = task({ recurringTemplateId: 'r', dayDate: '2026-09-30', done: true });
    const other = task();
    expect(collapseRecurring([a, b, done, other]).map((t) => t.id)).toEqual([b.id, done.id, other.id]);
  });
});

describe('filterTasks', () => {
  it('por estado, GTD, área (incluida "sin área") y persona', () => {
    const pending = task();
    const done = task({ done: true });
    const inbox = task({ kind: 'BACKLOG', processedAt: null, areaId: null });
    const waiting = task({ gtdStatus: 'ESPERANDO', assignedTo: 'Ana' });
    const all = [pending, done, inbox, waiting];
    expect(filterTasks(all, cfg(), TODAY)).toHaveLength(3);
    expect(filterTasks(all, cfg({ status: 'done' }), TODAY)).toEqual([done]);
    expect(filterTasks(all, cfg({ gtd: 'INBOX' }), TODAY)).toEqual([inbox]);
    expect(filterTasks(all, cfg({ areaIds: ['none'] }), TODAY)).toEqual([inbox]);
    expect(filterTasks(all, cfg({ person: 'Ana' }), TODAY)).toEqual([waiting]);
  });
  it('por fecha: vencidas, hoy, esta semana, sin fecha', () => {
    const past = task({ dayDate: '2026-10-05' });
    const today = task({ dayDate: TODAY });
    const sunday = task({ dayDate: '2026-10-11' });
    const nextWeek = task({ dayDate: '2026-10-12' });
    const none = task();
    const all = [past, today, sunday, nextWeek, none];
    expect(filterTasks(all, cfg({ when: 'overdue' }), TODAY)).toEqual([past]);
    expect(filterTasks(all, cfg({ when: 'today' }), TODAY)).toEqual([today]);
    expect(filterTasks(all, cfg({ when: 'week' }), TODAY)).toEqual([today, sunday]);
    expect(filterTasks(all, cfg({ when: 'none' }), TODAY)).toEqual([none]);
  });
  it('busca en título y notas sin distinguir mayúsculas', () => {
    const a = task({ text: 'Llamar a Laura' });
    const b = task({ description: 'propuesta LAURA' });
    expect(filterTasks([a, b, task()], cfg({ search: 'laura' }), TODAY)).toEqual([a, b]);
  });
});

describe('sortTasks', () => {
  it('por fecha deja las sin fecha al final y desempata por prioridad', () => {
    const none = task();
    const lateLow = task({ dayDate: '2026-10-09', priority: 'LOW' });
    const lateHigh = task({ dayDate: '2026-10-09', priority: 'HIGH' });
    const early = task({ dayDate: '2026-10-08' });
    expect(sortTasks([none, lateLow, lateHigh, early], 'date').map((t) => t.id)).toEqual([early.id, lateHigh.id, lateLow.id, none.id]);
  });
});

describe('groupTasks', () => {
  const labels: GroupLabels = {
    noArea: 'Sin área',
    noProject: 'Sin proyecto',
    noContext: 'Sin contexto',
    noPerson: 'Sin persona',
    status: { INBOX: 'Bandeja', ACTIVA: 'Activas', ESPERANDO: 'En espera', ALGUN_DIA: 'Algún día' },
    date: { overdue: 'Vencidas', today: 'Hoy', tomorrow: 'Mañana', week: 'Esta semana', later: 'Más adelante', none: 'Sin fecha' },
  };
  const names = { areas: new Map([['a1', 'Servilia'], ['a2', 'Casa']]), projects: new Map() };
  it('por área, alfabético y "sin área" al final', () => {
    const g = groupTasks([task({ areaId: null }), task({ areaId: 'a1' }), task({ areaId: 'a2' })], 'area', TODAY, labels, names);
    expect(g.map((x) => x.label)).toEqual(['Casa', 'Servilia', 'Sin área']);
  });
  it('por fecha en orden natural', () => {
    const g = groupTasks([task(), task({ dayDate: TODAY }), task({ dayDate: '2026-10-01' })], 'date', TODAY, labels, names);
    expect(g.map((x) => x.label)).toEqual(['Vencidas', 'Hoy', 'Sin fecha']);
  });
});

describe('listViewConfigSchema', () => {
  it('rellena valores por defecto en vistas guardadas incompletas', () => {
    expect(listViewConfigSchema.parse({ gtd: 'ESPERANDO' })).toEqual({ ...DEFAULT_LIST_VIEW, gtd: 'ESPERANDO' });
  });
});

describe('movePatchFor', () => {
  it('lleva la tarea al día en su área y conserva la hora', () => {
    const p = movePatchFor({ kind: 'BACKLOG', areaId: 'a1', scheduledAt: new Date('2026-10-07T09:30') }, '2026-10-09');
    expect(p).toMatchObject({ kind: 'DAY_AREA', isoWeek: '2026-W41', dayOfWeek: 4, areaId: 'a1' });
    expect(new Date(p!.scheduledAt as string).getHours()).toBe(9);
  });
  it('usa el área del proyecto o la de reserva, y si no hay ninguna devuelve null', () => {
    expect(movePatchFor({ kind: 'CALL', areaId: null, scheduledAt: null, project: { areaId: 'p' } }, '2026-10-09')?.areaId).toBe('p');
    expect(movePatchFor({ kind: 'CALL', areaId: null, scheduledAt: null }, '2026-10-09', 'f')?.areaId).toBe('f');
    expect(movePatchFor({ kind: 'CALL', areaId: null, scheduledAt: null }, '2026-10-09')).toBe(null);
  });
});
