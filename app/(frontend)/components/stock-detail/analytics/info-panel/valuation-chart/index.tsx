"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ChartDatum, ValuationMetricTab } from "../types";

type ValuationChartProps = {
  data: ChartDatum[];
  metric: ValuationMetricTab;
};

export default function ValuationChart({ data, metric }: ValuationChartProps) {
  const dataKey = metric.toLowerCase();
  const color = metric === "PER" ? "#e48ada" : "#a9f3de";
  const stroke = metric === "PER" ? "#cf54c7" : "#5ed6bb";

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer height="100%" width="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="#e4e4e7" />
          <XAxis
            dataKey="label"
            tick={{ fill: "#71717a", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
          />

          <YAxis
            width={36}
            tick={{ fill: "#71717a", fontSize: 10 }}
            tickFormatter={(value) => `${Number(value).toFixed(0)}배`}
            tickLine={false}
            axisLine={false}
          />

          <Tooltip
            cursor={{ fill: "rgba(212, 212, 216, 0.2)" }}
            formatter={(value) => [`${Number(value).toFixed(2)}배`, metric]}
            labelStyle={{ color: "#18181b", fontWeight: 600 }}
          />

          <Legend iconType="square" wrapperStyle={{ fontSize: 12 }} />

          <Bar
            name={metric}
            dataKey={dataKey}
            fill={color}
            stroke={stroke}
            strokeWidth={2}
            radius={[2, 2, 0, 0]}
            barSize={32}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
