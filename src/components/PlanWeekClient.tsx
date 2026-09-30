'use client';

import { useCallback, useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { api, ApiError } from '@/lib/api-client';
import { currentIsoWeek } from '@/lib/week';
import { useToast } from '@/components/Toast';
import { useInboxCapture } from '@/components/InboxCaptureContext';
import type { WeekFull, Habit, ProjectWithAreaAndCollaborators, Area, Tag, TaskWithProject } from '@/types';
import { DayCard } from '@/components/DayCard';
import { CapacityBar } from '@/components/CapacityBar';
import { HabitGrid } from '@/components/HabitGrid';
import { MoodSliders } from '@/components/MoodSliders';
import { ObjectivesForm, EvaluationForm } from '@/components/WeekMetaForm';
import { PriorityListSection } from '@/components/PriorityListSection';
import { ProjectFocusPicker } from '@/components/ProjectFocusPicker';
import { BandejaSummaryLink } from '@/components/BandejaSummaryLink';
import { PlanningWizard } from '@/components/PlanningWizard';
import { DayCloseRitual } from '@/components/DayCloseRitual';
import type { PendingTaskDecision } from '@/components/DayCloseRitual';
import { DayStartCard } from '@/components/DayStartCard';
import { FocusMode } from '@/components/FocusMode';
import { PinnedFirstTask } from '@/components/PinnedFirstTask';
import { WeekNav } from '@/components/WeekNav';
import { DayNav } from '@/components/DayNav';
import { ViewSwitcher } from '@/components/ViewSwitcher';
import { DAY_NAMES, dateForDayOfWeek, nextBusinessDay, previousBusinessDay, todayLocalString, isoWeekAndDowFor } from '@/lib/week';
import { countPendingProcess } from '@/lib/inbox';
import { summarizeLoad } from '@/lib/capacity';
// Alias: muchos callbacks locales de este componente usan `text` como nombre de parámetro.
import { text as t } from '@/i18n/es';

interface Props {
  initialWeek: WeekFull;
  initialInbox: TaskWithProject[];
  habits: Habit[];
  projects: ProjectWithAreaAndCollaborators[];
  areas: Area[];
  tags: Tag[];
  isoWeek: string;
  mode: 'day' | 'week';
  viewDow: number;
  todayDow: number;
  todoistConnected: boolean;
  calendarConnected: boolean;
  dailyCapacityMinutes: number;
  bufferPercent: number;
  arranqueVisibility: 'LABORABLES' | 'SIEMPRE' | 'NUNCA';
  extendedFocusEnabled: boolean;
  avoidTodaySuggestions: string[];
  // Aviso de sobrecarga de prioritarias (M1.6e): solo se calcula/pasa en modo semana.
  priorityOverload?: { currentCount: number; average: number; shouldWarn: boolean };
}

function tempId() {
  return `tmp_${Math.random().toString(36).slice(2)}`;
}

// H1 (auditoría UX): un único botón de ritual según el momento, en vez de
// los 3 siempre visibles. Viernes o domingo → Momento de reflexión; viendo
// hoy antes de las 17:00 → Arrancar el día; el resto → Cerrar el día. Los
// tres siguen accesibles siempre desde "Más" (ajuste 1 de la Fase 2).
function getContextualRitual(isViewingToday: boolean): 'reflection' | 'start' | 'close' {
  if (!isViewingToday) return 'close';
  const now = new Date();
  const dow = now.getDay(); // 0 = domingo, 5 = viernes
  if (dow === 5 || dow === 0) return 'reflection';
  return now.getHours() < 17 ? 'start' : 'close';
}

export function PlanWeekClient({
  initialWeek,
  initialInbox,
  habits,
  projects,
  areas,
  tags,
  isoWeek,
  mode,
  viewDow,
  todayDow,
  todoistConnected,
  calendarConnected,
  dailyCapacityMinutes,
  bufferPercent,
  arranqueVisibility,
  extendedFocusEnabled,
  avoidTodaySuggestions,
  priorityOverload,
}: Props) {
  const [week, setWeek] = useState(initialWeek);
  const [inbox, setInbox] = useState(initialInbox);
  const [wizardOpen, setWizardOpen] = useState(false);
  const [overloadDismissed, setOverloadDismissed] = useState(false);
  const [overloadReviewOpen, setOverloadReviewOpen] = useState(false);
  const [closeRitualOpen, setCloseRitualOpen] = useState(false);
  const [startCardOpen, setStartCardOpen] = useState(false);
  // Modo foco (M1.6d + Fase 2 ajuste 3): sustituye a la página independiente
  // del Pomodoro. Se lanza desde el botón "Empezar" de cualquier tarea.
  const [focusTask, setFocusTask] = useState<{ id: string; text: string } | null>(null);
  // Datos de la semana de "mañana"/"ayer" cuando caen fuera de la semana
  // cargada (p.ej. al cerrar un viernes, o al arrancar un lunes): se cargan
  // solo cuando hacen falta, desde el Cierre o el Arranque respectivamente.
  const [tomorrowWeekData, setTomorrowWeekData] = useState<WeekFull | null>(null);
  const [yesterdayWeekData, setYesterdayWeekData] = useState<WeekFull | null>(null);
  const { showToast } = useToast();
  const { subscribe } = useInboxCapture();
  const weekIsoOfToday = currentIsoWeek();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Los 3 rituales son siempre accesibles desde "Más" (Fase 2, ajuste 1):
  // sus enlaces navegan aquí con ?ritual=..., que abre el modal y se limpia
  // de la URL para no reabrirlo en un refresco de página.
  useEffect(() => {
    const ritual = searchParams.get('ritual');
    if (!ritual) return;
    if (ritual === 'start') setStartCardOpen(true);
    else if (ritual === 'close') setCloseRitualOpen(true);
    else if (ritual === 'reflection') setWizardOpen(true);
    router.replace(pathname, { scroll: false });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const isViewingToday = isoWeek === weekIsoOfToday && viewDow === todayDow;
  // "Mañana" en el Cierre es siempre el próximo día LABORABLE (nunca sábado
  // ni domingo), aunque eso cruce a la semana ISO siguiente.
  const { isoWeek: tomorrowIsoWeek, dayOfWeek: tomorrowDow } = nextBusinessDay(isoWeek, viewDow);
  const tomorrowCrossesWeek = tomorrowIsoWeek !== isoWeek;
  const tomorrowLabel = `${DAY_NAMES[tomorrowDow]} ${dateForDayOfWeek(tomorrowIsoWeek, tomorrowDow).getUTCDate()}`;
  const { isoWeek: yesterdayIsoWeek, dayOfWeek: yesterdayDow } = previousBusinessDay(isoWeek, viewDow);
  const yesterdayCrossesWeek = yesterdayIsoWeek !== isoWeek;

  // La captura rápida (botón flotante / atajo N) vive en el layout, fuera de
  // esta pantalla: publica la tarea creada por aquí para que aparezca en la
  // Bandeja al instante, sin esperar a un recargado.
  useEffect(() => subscribe((task) => setInbox((prev) => [...prev, task])), [subscribe]);
  useEffect(() => {
    setOverloadDismissed(false);
    setOverloadReviewOpen(false);
  }, [isoWeek]);

  // Tarjeta de Arranque del día: se muestra sola la primera vez que se entra
  // en Hoy cada día (según el ajuste de visibilidad), y se recuerda cerrada
  // por navegador hasta el día siguiente. El botón manual "Arrancar el día"
  // la reabre siempre, sea cual sea este cálculo.
  useEffect(() => {
    if (!isViewingToday) return;
    if (arranqueVisibility === 'NUNCA') return;
    const isWeekday = viewDow <= 4; // 0=lunes..4=viernes
    if (arranqueVisibility === 'LABORABLES' && !isWeekday) return;
    try {
      const key = `nortvira:arranque-dismissed:${todayLocalString()}`;
      if (localStorage.getItem(key)) return;
    } catch {
      // almacenamiento no disponible (privado/bloqueado): se muestra igualmente
    }
    setStartCardOpen(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function dismissStartCard() {
    setStartCardOpen(false);
    try {
      localStorage.setItem(`nortvira:arranque-dismissed:${todayLocalString()}`, '1');
    } catch {
      // sin almacenamiento disponible: la tarjeta podrá reaparecer, sin más consecuencia
    }
  }

  function startFocus(id: string) {
    const found = findTask(id);
    if (found) setFocusTask({ id: found.task.id, text: found.task.text });
  }

  function startFirstTask(taskId: string) {
    const el = document.getElementById(`task-${taskId}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    el.classList.add('ring-2', 'ring-accent');
    setTimeout(() => el.classList.remove('ring-2', 'ring-accent'), 2000);
  }

  // "Mañana" del Cierre puede caer en una semana que no está cargada (p.ej.
  // al cerrar un viernes, mañana es el lunes de la semana siguiente): se
  // carga sola (y se crea si hace falta, vía getOrCreateWeek en el propio
  // GET) al abrir el Cierre.
  useEffect(() => {
    if (!closeRitualOpen || !tomorrowCrossesWeek) {
      setTomorrowWeekData(null);
      return;
    }
    let cancelled = false;
    api.get(`/api/weeks/${tomorrowIsoWeek}`).then((data) => {
      if (!cancelled) setTomorrowWeekData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [closeRitualOpen, tomorrowCrossesWeek, tomorrowIsoWeek]);

  async function refreshTomorrowWeekData() {
    setTomorrowWeekData(await api.get(`/api/weeks/${tomorrowIsoWeek}`));
  }

  // Actualizar una tarea de "mañana" (Las 3 de mañana) cuando mañana cae en
  // una semana distinta de la cargada: no puede pasar por el updateTask
  // optimista normal (que solo conoce `week`), así que aplica el PATCH
  // directo y refresca la copia de la semana de mañana.
  async function updateTomorrowTask(id: string, patch: Record<string, unknown>) {
    if (!tomorrowCrossesWeek) {
      await updateTask(id, patch);
      return;
    }
    await api.patch(`/api/tasks/${id}`, patch);
    await refreshTomorrowWeekData();
  }

  async function setTomorrowFirstTask(taskId: string | null) {
    if (!tomorrowCrossesWeek) {
      await saveDayFields(tomorrowDow, { firstTaskId: taskId });
    } else {
      await api.patch(`/api/weeks/${tomorrowIsoWeek}`, { days: [{ dayOfWeek: tomorrowDow, firstTaskId: taskId }] });
      await refreshTomorrowWeekData();
    }
    // C2 (auditoría UX): la primera tarea de mañana se marca sola como una
    // de Las 3, para no elegirla dos veces. Si ya hay 3 marcadas, el PATCH
    // lo rechaza (400): se ignora, elegir la primera tarea no debe fallar
    // por eso.
    if (taskId) {
      try {
        await updateTomorrowTask(taskId, { isTop3: true });
      } catch {
        // ya hay 3 marcadas ese día: se deja como estaba
      }
    }
  }

  // "Ayer" (revisión rápida del Enfoque diario ampliado) puede caer en una
  // semana que no está cargada (p.ej. Arranque de un lunes, ayer es el
  // viernes de la semana anterior): solo hace falta cuando la sección
  // ampliada está activa y el Arranque está abierto, así que se carga sola
  // en ese momento, igual que "mañana" en el Cierre.
  useEffect(() => {
    if (!startCardOpen || !extendedFocusEnabled || !yesterdayCrossesWeek) {
      setYesterdayWeekData(null);
      return;
    }
    let cancelled = false;
    api.get(`/api/weeks/${yesterdayIsoWeek}`).then((data) => {
      if (!cancelled) setYesterdayWeekData(data);
    });
    return () => {
      cancelled = true;
    };
  }, [startCardOpen, extendedFocusEnabled, yesterdayCrossesWeek, yesterdayIsoWeek]);

  const hardRefresh = useCallback(async () => {
    const fresh = await api.get(`/api/weeks/${isoWeek}`);
    setWeek(fresh);
  }, [isoWeek]);

  function findTask(id: string): { location: 'week' | 'inbox'; task: TaskWithProject } | null {
    const w = week.tasks.find((t) => t.id === id);
    if (w) return { location: 'week', task: w };
    const i = inbox.find((t) => t.id === id);
    if (i) return { location: 'inbox', task: i };
    return null;
  }

  // ---------- Tareas (optimista: se ve al instante, se confirma en segundo plano) ----------

  async function addTask(
    kind: 'DAY_AREA' | 'PRIORITY_ACTION' | 'CALL',
    text: string,
    extra?: { dayOfWeek?: number; areaId?: string }
  ) {
    const day = extra?.dayOfWeek !== undefined ? week.days.find((d) => d.dayOfWeek === extra.dayOfWeek) : undefined;
    const optimisticArea = extra?.areaId ? areas.find((a) => a.id === extra.areaId) ?? null : null;
    const optimistic: TaskWithProject = {
      id: tempId(),
      userId: '',
      weekId: week.id,
      dayId: day?.id ?? null,
      kind,
      areaId: extra?.areaId ?? null,
      area: optimisticArea,
      text,
      description: null,
      tags: [],
      done: false,
      priority: 'MEDIUM',
      durationMinutes: null,
      calendarEventId: null,
      desiredOutcome: null,
      quadrant: null,
      assignedTo: null,
      isTop3: false,
      executedMinutes: 0,
      isPriority: kind === 'PRIORITY_ACTION',
      firstStep: null,
      context: null,
      gtdStatus: 'ACTIVA',
      processedAt: null,
      waitingOn: null,
      followUpDate: null,
      snoozeUntil: null,
      rescheduleCount: 0,
      projectId: null,
      project: null,
      scheduledAt: null,
      recurrence: 'NONE',
      recurringTemplateId: null,
      parentTaskId: null,
      subtasks: [],
      recurringTemplate: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setWeek((w) => ({ ...w, tasks: [...w.tasks, optimistic] }));

    try {
      const created = await api.post('/api/tasks', { isoWeek, kind, text, ...extra });
      setWeek((w) => ({
        ...w,
        tasks: w.tasks.map((t) =>
          t.id === optimistic.id ? { ...created, project: null, area: optimisticArea, subtasks: [], recurringTemplate: null, tags: [] } : t
        ),
      }));
    } catch {
      setWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== optimistic.id) }));
      showToast(t.planWeekClient.createTaskError, 'error');
    }
  }

  async function addBacklog(text: string) {
    const optimistic: TaskWithProject = {
      id: tempId(),
      userId: '',
      weekId: null,
      dayId: null,
      kind: 'BACKLOG',
      areaId: null,
      area: null,
      text,
      description: null,
      tags: [],
      done: false,
      priority: 'MEDIUM',
      durationMinutes: null,
      calendarEventId: null,
      desiredOutcome: null,
      quadrant: null,
      assignedTo: null,
      isTop3: false,
      executedMinutes: 0,
      isPriority: false,
      firstStep: null,
      context: null,
      gtdStatus: 'ACTIVA',
      processedAt: null,
      waitingOn: null,
      followUpDate: null,
      snoozeUntil: null,
      rescheduleCount: 0,
      projectId: null,
      project: null,
      scheduledAt: null,
      recurrence: 'NONE',
      recurringTemplateId: null,
      parentTaskId: null,
      subtasks: [],
      recurringTemplate: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setInbox((prev) => [...prev, optimistic]);

    try {
      const created = await api.post('/api/tasks', { kind: 'BACKLOG', text });
      setInbox((prev) =>
        prev.map((t) => (t.id === optimistic.id ? { ...created, project: null, area: null, subtasks: [], recurringTemplate: null, tags: [] } : t))
      );
    } catch {
      setInbox((prev) => prev.filter((t) => t.id !== optimistic.id));
      showToast(t.planWeekClient.saveInboxError, 'error');
    }
  }

  async function updateTask(id: string, patch: Record<string, unknown>) {
    const found = findTask(id);
    if (!found) return;
    const { location, task: previous } = found;

    const project = 'projectId' in patch ? projects.find((p) => p.id === patch.projectId) ?? null : previous.project;
    const promotedOut = location === 'inbox' && patch.kind && patch.kind !== 'BACKLOG';
    const demotedToBacklog = location === 'week' && patch.kind === 'BACKLOG';
    const movesToOtherWeek =
      location === 'week' && !demotedToBacklog && patch.isoWeek !== undefined && patch.isoWeek !== isoWeek;

    // El servidor resuelve dayId a partir de isoWeek+dayOfWeek; el patch nunca lo
    // incluye directamente, así que hay que recalcularlo aquí o la tarjeta se queda
    // "pegada" visualmente a su día anterior tras moverla (p.ej. al arrastrarla).
    let dayId = previous.dayId;
    if (demotedToBacklog || movesToOtherWeek) {
      dayId = null;
    } else if (typeof patch.dayOfWeek === 'number') {
      const targetDow = patch.dayOfWeek;
      dayId = week.days.find((d) => d.dayOfWeek === targetDow)?.id ?? null;
    }

    const optimisticTask = { ...previous, ...patch, project, dayId } as TaskWithProject;

    // El servidor reordena por hora todo el grupo día+área cuando cambia la
    // hora, el día o el área de una tarea; refrescamos para reflejar ese
    // reordenado (afecta también a otras tareas, no solo a esta).
    const needsOrderRefresh =
      optimisticTask.kind === 'DAY_AREA' &&
      !!optimisticTask.dayId &&
      !!optimisticTask.areaId &&
      ('scheduledAt' in patch || typeof patch.dayOfWeek === 'number' || 'areaId' in patch);

    if (promotedOut) {
      // Sale de la bandeja de entrada; si pertenece a la semana que se está viendo, se añade ahí.
      setInbox((prev) => prev.filter((t) => t.id !== id));
      if (patch.isoWeek === isoWeek) {
        setWeek((w) => ({ ...w, tasks: [...w.tasks, optimisticTask] }));
      }
    } else if (demotedToBacklog) {
      // Pasa a la bandeja de entrada; si se está viendo, la reflejamos ahí también.
      setWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== id) }));
      setInbox((prev) => [...prev, optimisticTask]);
    } else if (movesToOtherWeek) {
      // Se va a una semana distinta de la que se está viendo: desaparece de aquí.
      setWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== id) }));
    } else if (location === 'week') {
      setWeek((w) => ({ ...w, tasks: w.tasks.map((t) => (t.id === id ? optimisticTask : t)) }));
    } else {
      setInbox((prev) => prev.map((t) => (t.id === id ? optimisticTask : t)));
    }

    try {
      await api.patch(`/api/tasks/${id}`, patch);
      if ((promotedOut && patch.isoWeek === isoWeek) || needsOrderRefresh) await hardRefresh();
    } catch (err) {
      if (promotedOut) {
        setInbox((prev) => [...prev, previous]);
        setWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== id) }));
      } else if (demotedToBacklog) {
        setInbox((prev) => prev.filter((t) => t.id !== id));
        setWeek((w) => ({ ...w, tasks: [...w.tasks, previous] }));
      } else if (movesToOtherWeek) {
        setWeek((w) => ({ ...w, tasks: [...w.tasks, previous] }));
      } else if (location === 'week') {
        setWeek((w) => ({ ...w, tasks: w.tasks.map((t) => (t.id === id ? previous : t)) }));
      } else {
        setInbox((prev) => prev.map((t) => (t.id === id ? previous : t)));
      }
      showToast(err instanceof ApiError ? err.message : t.planWeekClient.saveChangeError, 'error');
    }
  }

  // Reordenación manual al arrastrar dentro de la misma lista día+área.
  async function reorderTasks(orderedIds: string[]) {
    const previousOrders = new Map(week.tasks.filter((t) => orderedIds.includes(t.id)).map((t) => [t.id, t.order]));
    setWeek((w) => ({
      ...w,
      tasks: w.tasks.map((t) => {
        const index = orderedIds.indexOf(t.id);
        return index === -1 ? t : { ...t, order: index };
      }),
    }));
    try {
      await Promise.all(orderedIds.map((id, index) => api.patch(`/api/tasks/${id}`, { order: index })));
    } catch {
      setWeek((w) => ({
        ...w,
        tasks: w.tasks.map((t) => (previousOrders.has(t.id) ? { ...t, order: previousOrders.get(t.id)! } : t)),
      }));
      showToast(t.planWeekClient.reorderError, 'error');
    }
  }

  async function deleteTask(id: string) {
    const found = findTask(id);
    if (!found) return;
    const { location, task: previous } = found;

    if (location === 'week') setWeek((w) => ({ ...w, tasks: w.tasks.filter((t) => t.id !== id) }));
    else setInbox((prev) => prev.filter((t) => t.id !== id));

    try {
      await api.delete(`/api/tasks/${id}`);
    } catch {
      if (location === 'week') setWeek((w) => ({ ...w, tasks: [...w.tasks, previous] }));
      else setInbox((prev) => [...prev, previous]);
      showToast(t.planWeekClient.deleteTaskError, 'error');
    }
  }

  async function exportTodoist(id: string) {
    try {
      await api.post('/api/integrations/todoist/export', { taskId: id });
      showToast(t.planWeekClient.exportedTodoist);
    } catch {
      showToast(t.planWeekClient.exportTodoistError, 'error');
    }
  }

  async function createCalendarEvent(id: string) {
    try {
      await api.post('/api/integrations/calendar/create-event', { taskId: id });
      // El evento también mueve la tarea a ese día/hora en Nortvira: se
      // recarga la semana para que se vea en su día correcto sin F5.
      await hardRefresh();
      showToast(t.planWeekClient.calendarEventCreated);
    } catch (err) {
      const message = err instanceof ApiError ? err.message : t.planWeekClient.calendarEventError;
      showToast(message, 'error');
    }
  }

  // ---------- Hábitos ----------

  async function toggleHabit(habitId: string, dayOfWeek: number, done: boolean) {
    const previous = week.habitCompletions;
    const exists = previous.some((c) => c.habitId === habitId && c.dayOfWeek === dayOfWeek);
    const next = exists
      ? previous.map((c) => (c.habitId === habitId && c.dayOfWeek === dayOfWeek ? { ...c, done } : c))
      : [...previous, { id: tempId(), habitId, weekId: week.id, dayOfWeek, done }];
    setWeek((w) => ({ ...w, habitCompletions: next }));

    try {
      await api.patch(`/api/habits/${habitId}/completions`, { isoWeek, dayOfWeek, done });
    } catch {
      setWeek((w) => ({ ...w, habitCompletions: previous }));
      showToast(t.planWeekClient.saveHabitError, 'error');
    }
  }

  // ---------- Semana: estado, objetivos, evaluación, estrellas ----------

  async function saveWeekMeta(patch: Record<string, unknown>) {
    setWeek((w) => ({ ...w, ...patch }));
    try {
      await api.patch(`/api/weeks/${isoWeek}`, patch);
    } catch {
      showToast(t.planWeekClient.saveGenericError, 'error');
      await hardRefresh();
    }
  }

  async function saveStar(dayOfWeek: number, v: number) {
    const value = v === 0 ? null : v;
    setWeek((w) => ({
      ...w,
      days: w.days.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, starRating: value } : d)),
    }));
    try {
      await api.patch(`/api/weeks/${isoWeek}`, { days: [{ dayOfWeek, starRating: value }] });
    } catch {
      showToast(t.planWeekClient.saveRatingError, 'error');
      await hardRefresh();
    }
  }

  async function saveJournal(dayOfWeek: number, note: string) {
    const value = note.trim() || null;
    setWeek((w) => ({
      ...w,
      days: w.days.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, journalNote: value } : d)),
    }));
    try {
      await api.patch(`/api/weeks/${isoWeek}`, { days: [{ dayOfWeek, journalNote: value }] });
    } catch {
      showToast(t.planWeekClient.saveJournalError, 'error');
      await hardRefresh();
    }
  }

  // Campos nuevos de Day (Arranque/Cierre): misma mecánica optimista que
  // saveStar/saveJournal, pero genérica para poder reutilizarla con
  // cualquier combinación de energy/dayGoal/firstTaskId/closeChecks/closedAt,
  // y para poder escribir en el Day de MAÑANA (no solo en el que se ve).
  async function saveDayFields(dayOfWeek: number, fields: Record<string, unknown>) {
    setWeek((w) => ({
      ...w,
      days: w.days.map((d) => (d.dayOfWeek === dayOfWeek ? { ...d, ...fields } : d)),
    }));
    try {
      await api.patch(`/api/weeks/${isoWeek}`, { days: [{ dayOfWeek, ...fields }] });
    } catch {
      showToast(t.planWeekClient.saveGenericError, 'error');
      await hardRefresh();
    }
  }

  // Decisión en un toque para una tarea pendiente al cerrar el día: todas
  // reutilizan updateTask/deleteTask ya existentes, así que una tarea
  // decidida desaparece sola de "pendientes" (cambia de día, de kind, se
  // marca hecha o se elimina) sin necesidad de llevar un estado aparte.
  async function decidePendingTask(taskId: string, decision: PendingTaskDecision, dateStr?: string) {
    switch (decision) {
      case 'MANANA':
        await updateTask(taskId, { isoWeek: tomorrowIsoWeek, dayOfWeek: tomorrowDow });
        break;
      case 'OTRA_FECHA': {
        if (!dateStr) return;
        const { isoWeek: iw, dayOfWeek: dow } = isoWeekAndDowFor(dateStr);
        await updateTask(taskId, { isoWeek: iw, dayOfWeek: dow });
        break;
      }
      case 'ALGUN_DIA':
        await updateTask(taskId, { kind: 'BACKLOG', gtdStatus: 'ALGUN_DIA' });
        break;
      case 'HECHA':
        await updateTask(taskId, { done: true });
        break;
      case 'ELIMINAR':
        await deleteTask(taskId);
        break;
    }
  }

  async function createPrepTask(taskText: string) {
    const areaId = areas[0]?.id;
    if (!areaId) return;
    if (tomorrowCrossesWeek) {
      // No pertenece a la semana cargada: se crea directo, sin estado optimista local.
      await api.post('/api/tasks', { isoWeek: tomorrowIsoWeek, kind: 'DAY_AREA', text: taskText, dayOfWeek: tomorrowDow, areaId });
      await refreshTomorrowWeekData();
    } else {
      await addTask('DAY_AREA', taskText, { dayOfWeek: tomorrowDow, areaId });
    }
  }

  async function finishClose(closeChecks: string[]) {
    await saveDayFields(viewDow, { closeChecks, closedAt: new Date().toISOString() });
    // C3 (auditoría UX): en vez de una pantalla extra "Día cerrado" con su
    // propio botón, un aviso y vuelta directa a Hoy.
    setCloseRitualOpen(false);
    showToast(t.dayCloseRitual.closedMessage);
  }

  // ---------- Enfoque diario ampliado (Arranque/Cierre, opcional) ----------

  async function sendInspirationAsIdea(ideaText: string) {
    const tag = await api.post('/api/tags', { name: 'Idea' });
    const created = await api.post('/api/tasks', { kind: 'BACKLOG', text: ideaText });
    await api.patch(`/api/tasks/${created.id}`, { tagIds: [tag.id] });
    setInbox((prev) => [...prev, { ...created, project: null, area: null, subtasks: [], recurringTemplate: null, tags: [tag] }]);
  }

  async function addBandejaTaskToToday(taskId: string) {
    await updateTask(taskId, { kind: 'DAY_AREA', isoWeek, dayOfWeek: viewDow, areaId: areas[0]?.id });
  }

  async function createKeyTaskForToday(taskText: string) {
    if (!areas[0]?.id) return;
    await addTask('DAY_AREA', taskText, { dayOfWeek: viewDow, areaId: areas[0].id });
  }

  async function addAndTag(text: string, field: 'evalPostponedTaskIds' | 'evalDelegateTaskIds') {
    const id = tempId();
    const optimistic: TaskWithProject = {
      id,
      userId: '',
      weekId: null,
      dayId: null,
      kind: 'BACKLOG',
      areaId: null,
      area: null,
      text,
      description: null,
      tags: [],
      done: false,
      priority: 'MEDIUM',
      durationMinutes: null,
      calendarEventId: null,
      desiredOutcome: null,
      quadrant: null,
      assignedTo: null,
      isTop3: false,
      executedMinutes: 0,
      isPriority: false,
      firstStep: null,
      context: null,
      gtdStatus: 'ACTIVA',
      processedAt: null,
      waitingOn: null,
      followUpDate: null,
      snoozeUntil: null,
      rescheduleCount: 0,
      projectId: null,
      project: null,
      scheduledAt: null,
      recurrence: 'NONE',
      recurringTemplateId: null,
      parentTaskId: null,
      subtasks: [],
      recurringTemplate: null,
      order: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    setInbox((prev) => [...prev, optimistic]);
    setWeek((w) => ({ ...w, [field]: [...(w[field] ?? []), id] }));

    try {
      const created = await api.post('/api/tasks', { kind: 'BACKLOG', text });
      setInbox((prev) =>
        prev.map((t) => (t.id === id ? { ...created, project: null, area: null, subtasks: [], recurringTemplate: null, tags: [] } : t))
      );
      setWeek((w) => ({ ...w, [field]: w[field].map((x: string) => (x === id ? created.id : x)) }));
      await api.patch(`/api/weeks/${isoWeek}`, { [field]: week[field]?.map((x) => (x === id ? created.id : x)) ?? [created.id] });
    } catch {
      setInbox((prev) => prev.filter((t) => t.id !== id));
      setWeek((w) => ({ ...w, [field]: (w[field] ?? []).filter((x: string) => x !== id) }));
      showToast(t.planWeekClient.createTaskError, 'error');
    }
  }

  async function toggleProjectFocus(projectId: string, focused: boolean) {
    const previous = week.projectFocus;
    if (focused) {
      const project = projects.find((p) => p.id === projectId);
      if (!project) return;
      setWeek((w) => ({
        ...w,
        projectFocus: [...w.projectFocus, { id: tempId(), weekId: w.id, projectId, project }],
      }));
    } else {
      setWeek((w) => ({ ...w, projectFocus: w.projectFocus.filter((f) => f.projectId !== projectId) }));
    }

    try {
      if (focused) await api.post(`/api/weeks/${isoWeek}/project-focus`, { projectId });
      else await api.delete(`/api/weeks/${isoWeek}/project-focus`, { projectId });
    } catch {
      setWeek((w) => ({ ...w, projectFocus: previous }));
      showToast(t.planWeekClient.saveProjectFocusError, 'error');
    }
  }

  // "Acciones prioritarias" ya no es un kind aparte: cualquier tarea de la
  // semana (con día o sin él) marcada isPriority aparece aquí, además de en
  // su propio sitio (día/área), igual que ya hace Las 3 del día.
  const priorityTasks = week.tasks.filter((t) => t.isPriority);
  const callTasks = week.tasks.filter((t) => t.kind === 'CALL');
  const focusIds = week.projectFocus.map((f) => f.projectId);

  const exportProps = todoistConnected ? { onExportTodoist: exportTodoist } : {};
  const calendarProps = calendarConnected ? { onCreateCalendarEvent: createCalendarEvent } : {};

  if (mode === 'day') {
    const day = week.days.find((d) => d.dayOfWeek === viewDow);
    const dayTasks = week.tasks.filter((t) => t.kind === 'DAY_AREA' && t.dayId === day?.id);
    const viewDate = dateForDayOfWeek(isoWeek, viewDow);
    const contextualRitual = getContextualRitual(isViewingToday);
    const tomorrowDay = tomorrowCrossesWeek
      ? tomorrowWeekData?.days.find((d) => d.dayOfWeek === tomorrowDow)
      : week.days.find((d) => d.dayOfWeek === tomorrowDow);
    const tomorrowTasks = tomorrowCrossesWeek
      ? tomorrowWeekData
        ? tomorrowWeekData.tasks.filter((t) => t.kind === 'DAY_AREA' && t.dayId === tomorrowDay?.id)
        : null
      : week.tasks.filter((t) => t.kind === 'DAY_AREA' && t.dayId === tomorrowDay?.id);
    const yesterdayDay = yesterdayCrossesWeek
      ? yesterdayWeekData?.days.find((d) => d.dayOfWeek === yesterdayDow)
      : week.days.find((d) => d.dayOfWeek === yesterdayDow);
    const showChooseTop3Prompt = isViewingToday && !yesterdayCrossesWeek && !!yesterdayDay && !yesterdayDay.closedAt;
    const firstTask = isViewingToday && day?.firstTaskId ? dayTasks.find((task) => task.id === day.firstTaskId) ?? null : null;
    // Primera tarea hecha (ajuste 1.6/Fase 2): si queda alguna de Las 3 del
    // día sin hacer, se ofrece como "Siguiente" en vez de dejar el hueco vacío.
    const nextTop3Task =
      firstTask?.done ? dayTasks.find((task) => task.isTop3 && !task.done && task.id !== firstTask.id) ?? null : null;
    // Solo se resuelve de verdad cuando hace falta (Enfoque ampliado abierto):
    // en otro caso da igual, DayStartCard no la usa si extendedFocusEnabled es false.
    const yesterdayTasks = yesterdayCrossesWeek
      ? yesterdayWeekData
        ? yesterdayWeekData.tasks.filter((t) => t.kind === 'DAY_AREA' && t.dayId === yesterdayDay?.id)
        : null
      : yesterdayDay
        ? week.tasks.filter((t) => t.kind === 'DAY_AREA' && t.dayId === yesterdayDay.id)
        : null;
    const yesterdayLearning = yesterdayDay?.learning ?? null;

    return (
      <div className="space-y-6">
        {focusTask ? (
          <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onTaskDone={() => updateTask(focusTask.id, { done: true })} />
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold">{isViewingToday ? t.planWeekClient.todayTitle : DAY_NAMES[viewDow]}</h1>
            <p className="text-sm text-base-muted">
              {viewDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })}
            </p>
            {day?.dayGoal ? <p className="mt-0.5 text-[13px] text-base-muted">{day.dayGoal}</p> : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {contextualRitual === 'reflection' ? (
              <button
                onClick={() => setWizardOpen(true)}
                className="rounded-full border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
              >
                {t.planWeekClient.openReflectionMoment}
              </button>
            ) : contextualRitual === 'start' ? (
              <button
                onClick={() => setStartCardOpen(true)}
                className="rounded-full border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
              >
                {t.planWeekClient.startDayButton}
              </button>
            ) : (
              <button
                onClick={() => setCloseRitualOpen(true)}
                className="rounded-full border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
              >
                {t.planWeekClient.closeDayButton}
              </button>
            )}
            <ViewSwitcher mode="day" isoWeek={isoWeek} />
            <DayNav isoWeek={isoWeek} dayOfWeek={viewDow} />
          </div>
        </div>

        {isViewingToday && firstTask && !firstTask.done ? (
          <PinnedFirstTask
            task={firstTask}
            candidateTasks={dayTasks}
            onToggleDone={async (done) => {
              await updateTask(firstTask.id, { done });
              if (done) showToast(t.pinnedFirstTask.doneToast);
            }}
            onChange={(taskId) => saveDayFields(viewDow, { firstTaskId: taskId })}
            onStart={() => startFirstTask(firstTask.id)}
          />
        ) : null}

        {isViewingToday && firstTask?.done && nextTop3Task ? (
          <div className="flex items-center gap-2 rounded-card border border-accent bg-accent/10 px-4 py-2.5 text-sm">
            <span className="flex-1 truncate">{t.pinnedFirstTask.nextLabel(nextTop3Task.text)}</span>
            <button
              onClick={() => startFirstTask(nextTop3Task.id)}
              className="shrink-0 rounded-full bg-accent px-3 py-1 text-xs font-medium text-white"
            >
              {t.pinnedFirstTask.startButton}
            </button>
          </div>
        ) : null}

        {isViewingToday && startCardOpen && day ? (
          <DayStartCard
            day={day}
            tasks={dayTasks}
            showChooseTop3Prompt={showChooseTop3Prompt}
            onSaveEnergy={(value) => saveDayFields(viewDow, { energy: value })}
            onSaveGoal={(value) => saveDayFields(viewDow, { dayGoal: value.trim() || null })}
            onSetFirstTask={(taskId) => saveDayFields(viewDow, { firstTaskId: taskId })}
            onUpdateTask={updateTask}
            onStartFirstTask={startFirstTask}
            onDismiss={dismissStartCard}
            extendedFocusEnabled={extendedFocusEnabled}
            dayOfWeek={viewDow}
            inbox={inbox}
            habits={habits}
            habitCompletions={week.habitCompletions}
            yesterdayTasks={yesterdayTasks}
            yesterdayLearning={yesterdayLearning}
            avoidTodaySuggestions={avoidTodaySuggestions}
            onSaveInspiration={(value) => saveDayFields(viewDow, { inspiration: value.trim() || null })}
            onSendInspirationAsIdea={sendInspirationAsIdea}
            onSaveDesiredFeeling={(value) => saveDayFields(viewDow, { desiredFeeling: value.trim() || null })}
            onSaveYesterdayReview={(value) => saveDayFields(viewDow, { yesterdayReview: value.trim() || null })}
            onSaveAvoidToday={(value) => saveDayFields(viewDow, { avoidToday: value.trim() || null })}
            onAddBandejaTaskToToday={addBandejaTaskToToday}
            onCreateKeyTask={createKeyTaskForToday}
            onToggleHabit={(habitId, done) => toggleHabit(habitId, viewDow, done)}
          />
        ) : null}

        {wizardOpen ? (
          <PlanningWizard
            week={week}
            inbox={inbox}
            projects={projects}
            areas={areas}
            tags={tags}
            isoWeek={isoWeek}
            onSaveWeekMeta={saveWeekMeta}
            onToggleProjectFocus={toggleProjectFocus}
            onAddPriority={(text) => addTask('PRIORITY_ACTION', text)}
            onAddCall={(text) => addTask('CALL', text)}
            onUpdateTask={updateTask}
            onDeleteTask={deleteTask}
            onAddBacklog={addBacklog}
            onClose={() => setWizardOpen(false)}
          />
        ) : null}

        {closeRitualOpen ? (
          <DayCloseRitual
            dayLabel={isViewingToday ? t.planWeekClient.dayLabelToday : t.planWeekClient.dayLabelOther(DAY_NAMES[viewDow])}
            tasks={dayTasks}
            tomorrowLabel={tomorrowLabel}
            tomorrowTasks={tomorrowTasks}
            tomorrowFirstTaskId={tomorrowDay?.firstTaskId ?? null}
            initialJournalNote={day?.journalNote ?? ''}
            onSaveJournal={(note) => saveJournal(viewDow, note)}
            starRating={day?.starRating ?? null}
            onStarChange={(v) => saveStar(viewDow, v)}
            extendedFocusEnabled={extendedFocusEnabled}
            initialGratitude={day?.gratitude ?? ''}
            initialLearning={day?.learning ?? ''}
            onSaveGratitude={(value) => saveDayFields(viewDow, { gratitude: value.trim() || null })}
            onSaveLearning={(value) => saveDayFields(viewDow, { learning: value.trim() || null })}
            onDecidePendingTask={decidePendingTask}
            onUpdateTask={updateTomorrowTask}
            onSetTomorrowFirstTask={setTomorrowFirstTask}
            onCreatePrepTask={createPrepTask}
            onFinishClose={finishClose}
            onClose={() => setCloseRitualOpen(false)}
          />
        ) : null}

        <DayCard
          isoWeek={isoWeek}
          dayOfWeek={viewDow}
          tasks={dayTasks}
          projects={projects}
          areas={areas}
          tags={tags}
          isToday={isViewingToday}
          capacityMinutes={dailyCapacityMinutes}
          bufferPercent={bufferPercent}
          onAddTask={(areaId, text) => addTask('DAY_AREA', text, { dayOfWeek: viewDow, areaId })}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onReorderTasks={reorderTasks}
          focusMode={isViewingToday}
          onStartFocus={startFocus}
          {...exportProps}
          {...calendarProps}
        />

        <BandejaSummaryLink pendingCount={countPendingProcess(inbox)} />

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-base-muted">
              {isViewingToday ? t.planWeekClient.todayHabits : t.planWeekClient.dayHabits(DAY_NAMES[viewDow])}
            </h3>
            <HabitGrid habits={habits} completions={week.habitCompletions} onToggle={toggleHabit} mode="today" todayDow={viewDow} />
          </div>
          <div className="space-y-4">
            <PriorityListSection
              title={t.planWeekClient.priorityActionsTitle}
              tasks={priorityTasks}
              projects={projects}
              tags={tags}
              onAdd={(text) => addTask('PRIORITY_ACTION', text)}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onStartFocus={startFocus}
              {...exportProps}
              {...calendarProps}
            />
            <PriorityListSection
              title={t.planWeekClient.callsTitle}
              tasks={callTasks}
              projects={projects}
              tags={tags}
              onAdd={(text) => addTask('CALL', text)}
              onUpdate={updateTask}
              onDelete={deleteTask}
              onStartFocus={startFocus}
              {...exportProps}
              {...calendarProps}
            />
          </div>
        </div>
      </div>
    );
  }

  // Carga semanal = suma de días laborables (L-V, ya decidido en la Fase 0
  // como horario común); sábado y domingo no cuentan ni en lo planificado
  // ni en la capacidad.
  const weekdayIds = new Set(week.days.filter((d) => d.dayOfWeek <= 4).map((d) => d.id));
  const weekdayTasks = week.tasks.filter((t) => t.kind === 'DAY_AREA' && t.dayId && weekdayIds.has(t.dayId));
  const weekLoad = summarizeLoad(weekdayTasks);

  return (
    <div className="space-y-6">
      {focusTask ? (
        <FocusMode task={focusTask} onClose={() => setFocusTask(null)} onTaskDone={() => updateTask(focusTask.id, { done: true })} />
      ) : null}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-2xl font-semibold">{t.planWeekClient.weekTitle}</h1>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setWizardOpen(true)}
            className="rounded-full border border-accent px-3 py-1.5 text-sm font-medium text-accent hover:bg-accent/10"
          >
            {t.planWeekClient.openReflectionMoment}
          </button>
          <ViewSwitcher mode="week" isoWeek={isoWeek} />
          <WeekNav isoWeek={isoWeek} />
        </div>
      </div>

      {weekLoad.plannedMinutes > 0 ? (
        <div className="flex items-center justify-between gap-3 rounded-card border border-base-border bg-base-surface px-4 py-3">
          <span className="text-sm font-medium">{t.weeklyCapacity.title}</span>
          <CapacityBar
            plannedMinutes={weekLoad.plannedMinutes}
            capacityMinutes={dailyCapacityMinutes * 5}
            bufferPercent={bufferPercent}
            unestimatedCount={weekLoad.unestimatedCount}
          />
        </div>
      ) : null}

      {priorityOverload?.shouldWarn && !overloadDismissed ? (
        <div className="space-y-2 rounded-card border border-fuchsia-500/40 bg-fuchsia-500/5 px-4 py-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span>{t.planWeekClient.priorityOverloadMessage(priorityOverload.currentCount, priorityOverload.average)}</span>
            <div className="flex shrink-0 gap-2">
              <button
                onClick={() => setOverloadReviewOpen((v) => !v)}
                className="rounded-full border border-fuchsia-500/40 px-3 py-1 text-xs font-medium text-fuchsia-600 hover:bg-fuchsia-500/10"
              >
                {t.planWeekClient.reviewPriorityTasks}
              </button>
              <button
                onClick={() => setOverloadDismissed(true)}
                className="rounded-full border border-base-border px-3 py-1 text-xs font-medium hover:bg-base-border/40"
              >
                {t.common.close}
              </button>
            </div>
          </div>
          {overloadReviewOpen ? (
            <div className="space-y-1.5 border-t border-fuchsia-500/20 pt-2">
              {priorityTasks.length === 0 ? (
                <p className="text-xs text-base-muted">{t.planWeekClient.noPriorityTasks}</p>
              ) : (
                priorityTasks.map((pt) => (
                  <div key={pt.id} className="flex items-center justify-between gap-2 text-xs">
                    <span className={`truncate ${pt.done ? 'text-base-muted line-through' : ''}`}>{pt.text}</span>
                    <button
                      onClick={() => updateTask(pt.id, { isPriority: false })}
                      className="shrink-0 rounded-full border border-base-border px-2.5 py-1 font-medium hover:bg-base-border/40"
                    >
                      {t.planWeekClient.unmarkPriority}
                    </button>
                  </div>
                ))
              )}
            </div>
          ) : null}
        </div>
      ) : null}

      {wizardOpen ? (
        <PlanningWizard
          week={week}
          inbox={inbox}
          projects={projects}
          areas={areas}
          tags={tags}
          isoWeek={isoWeek}
          onSaveWeekMeta={saveWeekMeta}
          onToggleProjectFocus={toggleProjectFocus}
          onAddPriority={(text) => addTask('PRIORITY_ACTION', text)}
          onAddCall={(text) => addTask('CALL', text)}
          onUpdateTask={updateTask}
          onDeleteTask={deleteTask}
          onAddBacklog={addBacklog}
          onClose={() => setWizardOpen(false)}
        />
      ) : null}

      <div className="space-y-4">
        {week.days
          .slice()
          .sort((a, b) => a.dayOfWeek - b.dayOfWeek)
          .map((day) => (
            <DayCard
              key={day.id}
              isoWeek={isoWeek}
              dayOfWeek={day.dayOfWeek}
              tasks={week.tasks.filter((t) => t.kind === 'DAY_AREA' && t.dayId === day.id)}
              projects={projects}
              areas={areas}
              tags={tags}
              isToday={isoWeek === weekIsoOfToday && day.dayOfWeek === todayDow}
              capacityMinutes={dailyCapacityMinutes}
              bufferPercent={bufferPercent}
              onAddTask={(areaId, text) => addTask('DAY_AREA', text, { dayOfWeek: day.dayOfWeek, areaId })}
              onUpdateTask={updateTask}
              onDeleteTask={deleteTask}
              onReorderTasks={reorderTasks}
              onStartFocus={startFocus}
              {...exportProps}
              {...calendarProps}
            />
          ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <PriorityListSection
          title={t.planWeekClient.priorityActionsTitle}
          tasks={priorityTasks}
          projects={projects}
          tags={tags}
          onAdd={(text) => addTask('PRIORITY_ACTION', text)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onStartFocus={startFocus}
          {...exportProps}
          {...calendarProps}
        />
        <PriorityListSection
          title={t.planWeekClient.callsTitle}
          tasks={callTasks}
          projects={projects}
          tags={tags}
          onAdd={(text) => addTask('CALL', text)}
          onUpdate={updateTask}
          onDelete={deleteTask}
          onStartFocus={startFocus}
          {...exportProps}
          {...calendarProps}
        />
      </div>

      <ProjectFocusPicker projects={projects} focusedIds={focusIds} onToggle={toggleProjectFocus} />

      <ObjectivesForm week={week} onSave={saveWeekMeta} />

      {/* S3 (auditoría UX): deja de ser lo primero bajo la cabecera; una versión
          compacta en panel llega en la Fase 2. */}
      <MoodSliders mentalState={week.mentalState} physicalState={week.physicalState} onChange={saveWeekMeta} />

      <BandejaSummaryLink pendingCount={countPendingProcess(inbox)} />

      <div>
        <h3 className="mb-2 text-sm font-semibold text-base-muted">{t.planWeekClient.weekHabits}</h3>
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <HabitGrid habits={habits} completions={week.habitCompletions} onToggle={toggleHabit} mode="week" todayDow={todayDow} />
        </div>
      </div>

      <EvaluationForm
        week={week}
        projects={projects}
        pendingTasks={week.tasks.filter((t) => !t.done)}
        onSave={saveWeekMeta}
        onAddAndTag={addAndTag}
      />
    </div>
  );
}
