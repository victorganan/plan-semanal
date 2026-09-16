'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { AREA_LABELS } from '@/types';

interface Stats {
  completionByArea: { area: string; done: number; total: number; rate: number }[];
  trend: { isoWeek: string; total: number; done: number; rate: number }[];
  habitAdherence: { habitId: string; name: string; done: number; total: number; rate: number }[];
  streak: number;
}

const AREA_COLORS: Record<string, string> = {
  SERVILIA: 'rgb(var(--color-servilia))',
  GESTIONA: 'rgb(var(--color-gestiona))',
  PERSONAL: 'rgb(var(--color-personal))',
};

function pct(rate: number) {
  return `${Math.round(rate * 100)}%`;
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-card border border-base-border bg-base-surface p-4">
      <h3 className="mb-4 text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

export function DashboardClient({ stats }: { stats: Stats }) {
  const areaData = stats.completionByArea.map((a) => ({
    area: AREA_LABELS[a.area],
    key: a.area,
    rate: Math.round(a.rate * 100),
    done: a.done,
    total: a.total,
  }));

  const trendData = stats.trend.map((t) => ({
    week: t.isoWeek.slice(6),
    rate: Math.round(t.rate * 100),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="text-sm text-base-muted">Productividad de las últimas semanas.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs text-base-muted">Racha de hábitos</p>
          <p className="mt-1 text-3xl font-semibold text-accent">{stats.streak}</p>
          <p className="text-xs text-base-muted">días consecutivos con todos los hábitos cumplidos</p>
        </div>
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs text-base-muted">Cumplimiento general (última semana)</p>
          <p className="mt-1 text-3xl font-semibold">
            {trendData.length ? `${trendData[trendData.length - 1].rate}%` : '—'}
          </p>
        </div>
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs text-base-muted">Hábitos activos</p>
          <p className="mt-1 text-3xl font-semibold">{stats.habitAdherence.length}</p>
        </div>
      </div>

      <ChartCard title="Cumplimiento por área">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={areaData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgb(var(--color-border))" />
              <XAxis dataKey="area" tick={{ fill: 'rgb(var(--color-muted))', fontSize: 12 }} axisLine={{ stroke: 'rgb(var(--color-border))' }} tickLine={false} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: 'rgb(var(--color-muted))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number, _name, item) => [`${value}% (${item.payload.done}/${item.payload.total})`, 'Cumplimiento']}
                contentStyle={{ background: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {areaData.map((d) => (
                  <Bar key={d.key} dataKey="rate" fill={AREA_COLORS[d.key]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Tendencia de cumplimiento (semanas)">
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trendData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid vertical={false} stroke="rgb(var(--color-border))" />
              <XAxis dataKey="week" tick={{ fill: 'rgb(var(--color-muted))', fontSize: 12 }} axisLine={{ stroke: 'rgb(var(--color-border))' }} tickLine={false} />
              <YAxis
                domain={[0, 100]}
                tickFormatter={(v) => `${v}%`}
                tick={{ fill: 'rgb(var(--color-muted))', fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value: number) => [`${value}%`, 'Cumplimiento']}
                contentStyle={{ background: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))', borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="rate" stroke="rgb(var(--color-accent))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title="Adherencia a hábitos">
        {stats.habitAdherence.length === 0 ? (
          <p className="text-sm text-base-muted">Sin hábitos activos todavía.</p>
        ) : (
          <div className="space-y-3">
            {stats.habitAdherence.map((h) => (
              <div key={h.habitId}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{h.name}</span>
                  <span className="text-base-muted">
                    {pct(h.rate)} ({h.done}/{h.total})
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-base-border">
                  <div className="h-full rounded-full bg-accent" style={{ width: pct(h.rate) }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>
    </div>
  );
}
