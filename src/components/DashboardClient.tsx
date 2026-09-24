'use client';

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { text } from '@/i18n/es';

interface Stats {
  completionByArea: { areaId: string; areaName: string; areaColorIndex: number; done: number; total: number; rate: number }[];
  trend: { isoWeek: string; total: number; done: number; rate: number }[];
  habitAdherence: { habitId: string; name: string; done: number; total: number; rate: number }[];
  streak: number;
  completionByLevel: { level: string; label: string; done: number; total: number; rate: number }[];
}

const AREA_COLOR_VARS = [
  'rgb(var(--color-area-1))',
  'rgb(var(--color-area-2))',
  'rgb(var(--color-area-3))',
  'rgb(var(--color-area-4))',
  'rgb(var(--color-area-5))',
  'rgb(var(--color-area-6))',
  'rgb(var(--color-area-7))',
  'rgb(var(--color-area-8))',
];

function areaColorVar(colorIndex: number) {
  return AREA_COLOR_VARS[((colorIndex % AREA_COLOR_VARS.length) + AREA_COLOR_VARS.length) % AREA_COLOR_VARS.length];
}

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
    area: a.areaName,
    key: a.areaId,
    color: areaColorVar(a.areaColorIndex),
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
        <h1 className="text-2xl font-semibold">{text.dashboard.title}</h1>
        <p className="text-sm text-base-muted">{text.dashboard.subtitle}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs text-base-muted">{text.dashboard.habitStreak}</p>
          <p className="mt-1 text-3xl font-semibold text-accent">{stats.streak}</p>
          <p className="text-xs text-base-muted">{text.dashboard.habitStreakSuffix}</p>
        </div>
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs text-base-muted">{text.dashboard.overallCompletion}</p>
          <p className="mt-1 text-3xl font-semibold">
            {trendData.length ? `${trendData[trendData.length - 1].rate}%` : '—'}
          </p>
        </div>
        <div className="rounded-card border border-base-border bg-base-surface p-4">
          <p className="text-xs text-base-muted">{text.dashboard.activeHabits}</p>
          <p className="mt-1 text-3xl font-semibold">{stats.habitAdherence.length}</p>
        </div>
      </div>

      <ChartCard title={text.dashboard.completionByArea}>
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
                formatter={(value: number, _name, item) => [`${value}% (${item.payload.done}/${item.payload.total})`, text.dashboard.tooltipCompliance]}
                contentStyle={{ background: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))', borderRadius: 8, fontSize: 12 }}
              />
              <Bar dataKey="rate" radius={[4, 4, 0, 0]}>
                {areaData.map((d) => (
                  <Bar key={d.key} dataKey="rate" fill={d.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title={text.dashboard.completionTrend}>
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
                formatter={(value: number) => [`${value}%`, text.dashboard.tooltipCompliance]}
                contentStyle={{ background: 'rgb(var(--color-surface))', border: '1px solid rgb(var(--color-border))', borderRadius: 8, fontSize: 12 }}
              />
              <Line type="monotone" dataKey="rate" stroke="rgb(var(--color-accent))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      <ChartCard title={text.dashboard.completionByLevel}>
        {stats.completionByLevel.every((l) => l.total === 0) ? (
          <p className="text-sm text-base-muted">{text.dashboard.noTasksInPeriod}</p>
        ) : (
          <div className="space-y-3">
            {stats.completionByLevel.map((l) => (
              <div key={l.level}>
                <div className="mb-1 flex justify-between text-xs">
                  <span>{l.label}</span>
                  <span className="text-base-muted">
                    {pct(l.rate)} ({l.done}/{l.total})
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-base-border">
                  <div className="h-full rounded-full bg-accent" style={{ width: pct(l.rate) }} />
                </div>
              </div>
            ))}
          </div>
        )}
      </ChartCard>

      <ChartCard title={text.dashboard.habitAdherence}>
        {stats.habitAdherence.length === 0 ? (
          <p className="text-sm text-base-muted">{text.dashboard.noActiveHabits}</p>
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
