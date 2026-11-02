"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const ORANGE = "#ea580c";
const SLATE = "#94a3b8";
const GREEN = "#16a34a";
const SKY = "#0284c7";

export type BurndownRow = { date: string; ideal: number; actual: number | null };

export function BurndownChart({ data, height = 280 }: { data: BurndownRow[]; height?: number }) {
  return (
    <div style={{ height }} role="img" aria-label="Burndown chart: remaining hours per day against the ideal line">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="date" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.slice(5)} />
          <YAxis tick={{ fontSize: 11 }} width={40} />
          <Tooltip />
          <Legend />
          <Line type="linear" dataKey="ideal" name="Ideal" stroke={SLATE} strokeDasharray="5 4" dot={false} isAnimationActive={false} />
          <Line type="stepAfter" dataKey="actual" name="Remaining hours" stroke={ORANGE} strokeWidth={2} dot={{ r: 3 }} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export type BarSeries = { key: string; name: string; color?: string };

const PALETTE = [ORANGE, SKY, GREEN, SLATE];

/** Grouped bars: one group per `label`, one bar per series. */
export function GroupedBars({ data, series, height = 280, unit = "" }: { data: Record<string, string | number | null>[]; series: BarSeries[]; height?: number; unit?: string }) {
  return (
    <div style={{ height }} role="img" aria-label="Bar chart">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="label" tick={{ fontSize: 11 }} interval={0} />
          <YAxis tick={{ fontSize: 11 }} width={40} unit={unit} />
          <Tooltip />
          <Legend />
          {series.map((s, i) => (
            <Bar key={s.key} dataKey={s.key} name={s.name} fill={s.color ?? PALETTE[i % PALETTE.length]} radius={[3, 3, 0, 0]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
