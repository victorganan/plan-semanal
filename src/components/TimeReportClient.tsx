'use client';

import { useState } from 'react';
import clsx from 'clsx';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { formatDurationMinutes } from '@/types';
import type { TimeReportScope } from '@/lib/time-report';

interface Props {
  week: TimeReportScope;
  all: TimeReportScope;
}

function pctLabel(pct: number): string {
  const rounded = Math.round(pct);
  return `${rounded > 0 ? '+' : ''}${rounded}%`;
}

function deviationClass(pct: number): string {
  if (pct > 15) return 'text-priority-high';
  if (pct < -15) return 'text-priority-low';
  return 'text-base-muted';
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export function TimeReportClient({ week, all }: Props) {
  const [scope, setScope] = useState<'week' | 'all'>('week');
  const data = scope === 'week' ? week : all;

  const globalDeviationPct =
    data.totalEstimatedMinutes > 0
      ? ((data.totalExecutedMinutes - data.totalEstimatedMinutes) / data.totalEstimatedMinutes) * 100
      : 0;

  const areaData = data.byArea.map((a) => ({
    area: a.areaName,
    key: a.areaId,
    estimadoMin: a.estimatedMinutes,
    ejecutadoMin: a.executedMinutes,
    estimadoH: Math.round((a.estimatedMinutes / 60) * 10) / 10,
    ejecutadoH: Math.round((a.executedMinutes / 60) * 10) / 10,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 rounded-full border border-base-border bg-base-surface p-1 text-sm">
        <button
          onClick={() => setScope('week')}
          className={clsx(
            'rounded-full px-3 py-1.5 font-medium transition',
            scope === 'week' ? 'bg-accent text-white' : 'text-base-muted hover:bg-base-border/40'
          )}
        >
          Esta semana
        </button>
        <button
          onClick={() => setScope('all')}
          className={clsx(
            'rounded-full px-3 py-1.5 font-medium transition',
            scope === 'all' ? 'bg-accent text-white' : 'text-base-muted hover:bg-base-border/40'
          )}
        >
          Todo
        </button>
      </div>

      {data.estimatedTaskCount === 0 ? (
        <div className="rounded-card border border-base-border bg-base-surface p-4 text-sm text-base-muted">
          Todavía no hay tareas con duración estimada y tiempo ejecutado que comparar
          {scope === 'week' ? ' esta semana' : ''}. Pon una duración estimada a una tarea y registra tiempo con el
          Pomodoro o el cronómetro de su ficha.
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="rounded-card border border-base-border bg-base-surface p-4">
              <p className="text-xs text-base-muted">Estimado</p>
              <p className="mt-1 text-2xl font-semibold">{formatDurationMinutes(data.totalEstimatedMinutes)}</p>
              <p className="text-xs text-base-muted">{data.estimatedTaskCount} tareas con estimación</p>
            </div>
            <div className="rounded-card border border-base-border bg-base-surface p-4">
              <p className="text-xs text-base-muted">Ejecutado (de esas mismas tareas)</p>
              <p className="mt-1 text-2xl font-semibold">{formatDurationMinutes(data.totalExecutedMinutes)}</p>
              <p className={clsx('text-xs font-medium', deviationClass(globalDeviationPct))}>
                {pctLabel(globalDeviationPct)} frente a lo estimado
              </p>
            </div>
            <div className="rounded-card border border-base-border bg-base-surface p-4">
              <p className="text-xs text-base-muted">Tiempo total ejecutado</p>
              <p className="mt-1 text-2xl font-semibold text-accent">{formatDurationMinutes(data.totalExecutedMinutesAll)}</p>
              <p className="text-xs text-base-muted">incluye tareas sin estimación previa</p>
            </div>
          </div>

          {areaData.length > 0 ? (
            <ChartCard title="Estimado vs. ejecutado por área (horas)">
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={areaData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid vertical={false} stroke="rgb(var(--color-border))" />
                    <XAxis dataKey="area" tick={{ fill: 'rgb(var(--color-muted))', fontSize: 12 }} axisLine={{ stroke: 'rgb(var(--color-border))' }} tickLine={false} />
                    <YAxis
                      tickFormatter={(v) => `${v}h`}
                      tick={{ fill: 'rgb(var(--color-muted))', fontSize: 12 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      formatter={(value: number, name) => [`${value}h`, name]}
                      contentStyle={{ background: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))', borderRadius: 8, fontSize: 12 }}
                    />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="estimadoH" name="Estimado" fill="rgb(var(--color-border))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="ejecutadoH" name="Ejecutado" fill="rgb(var(--color-accent))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartCard>
          ) : null}

          <ChartCard title="Tareas con mayor desviación">
            <div className="space-y-2">
              {data.mostDeviatedTasks.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-3 border-t border-base-border pt-2 text-sm first:border-t-0 first:pt-0">
                  <div className="min-w-0">
                    <p className="truncate">{t.text}</p>
                    <p className="text-xs text-base-muted">
                      {t.areaName ?? 'Sin área'} · {formatDurationMinutes(t.estimatedMinutes)} estimado ·{' '}
                      {formatDurationMinutes(t.executedMinutes)} ejecutado
                    </p>
                  </div>
                  <span className={clsx('shrink-0 text-sm font-semibold', deviationClass(t.deviationPct))}>
                    {pctLabel(t.deviationPct)}
                  </span>
                </div>
              ))}
            </div>
          </ChartCard>
        </>
      )}
    </div>
  );
}
