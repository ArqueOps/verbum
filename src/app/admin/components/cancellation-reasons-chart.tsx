"use client";

import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";

interface CancellationReasonsChartProps {
  data: { reason: string; count: number }[];
}

const COLORS = [
  "oklch(0.55 0.19 27)",
  "oklch(0.65 0.15 50)",
  "oklch(0.60 0.12 250)",
  "oklch(0.55 0.12 145)",
  "oklch(0.60 0.15 300)",
  "oklch(0.65 0.10 80)",
  "oklch(0.50 0.15 200)",
  "oklch(0.60 0.10 350)",
];

export function CancellationReasonsChart({
  data,
}: CancellationReasonsChartProps) {
  const hasData = data.some((d) => d.count > 0);

  if (!hasData) {
    return (
      <div className="flex h-[300px] items-center justify-center text-muted-foreground">
        Nenhum cancelamento registrado nos últimos 30 dias
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="reason"
          cx="50%"
          cy="50%"
          outerRadius={100}
          label={({ name, percent }) =>
            `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`
          }
          labelLine
        >
          {data.map((_, index) => (
            <Cell key={index} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "8px",
            fontSize: 13,
          }}
          formatter={(value) => [String(value), "Cancelamentos"]}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
