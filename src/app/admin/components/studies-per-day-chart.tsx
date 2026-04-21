"use client";

import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

interface StudiesPerDayChartProps {
  data: { date: string; count: number }[];
}

function formatDate(dateStr: string): string {
  const [, month, day] = dateStr.split("-");
  return `${day}/${month}`;
}

export function StudiesPerDayChart({ data }: StudiesPerDayChartProps) {
  const chartData = data.map((d) => ({
    ...d,
    label: formatDate(d.date),
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <ComposedChart data={chartData}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11 }}
          interval="preserveStartEnd"
        />
        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            fontSize: 13,
          }}
          labelFormatter={(label) => `Data: ${label}`}
          formatter={(value) => [String(value), "Gerações"]}
        />
        <Bar
          dataKey="count"
          fill="oklch(0.45 0.065 250)"
          radius={[4, 4, 0, 0]}
          opacity={0.6}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="oklch(0.45 0.065 250)"
          strokeWidth={2}
          dot={false}
        />
      </ComposedChart>
    </ResponsiveContainer>
  );
}
