// Aviso de planificación (M2f de PENDIENTE): viernes, sábado o domingo, si
// no se ha hecho el Momento de reflexión de la semana que viene, se avisa
// en Hoy. Lógica pura, separada de la consulta a base de datos para poder
// testearla sin Prisma.

// `jsDay`: el que da Date.getDay() -- 0 domingo ... 6 sábado.
export function isPlanningWindow(jsDay: number): boolean {
  return jsDay === 5 || jsDay === 6 || jsDay === 0;
}

export function shouldShowPlanningNudge(jsDay: number, nextWeekHasObjectives: boolean): boolean {
  return isPlanningWindow(jsDay) && !nextWeekHasObjectives;
}
