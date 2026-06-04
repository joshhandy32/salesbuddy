"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { CalendarRange } from "lucide-react";
import { ChartTooltip } from "./ChartTooltip";

export default function HomeChart({ weekly }: { weekly: number[] }) {
  const data = weekly.map((v, i) => ({ name: `WK${i + 1}`, completes: v }));
  const total = weekly.reduce((a, b) => a + b, 0);

  if (total === 0) {
    return (
      <div className="flex h-44 flex-col items-center justify-center gap-2 text-center">
        <CalendarRange size={36} strokeWidth={1.5} className="text-line" />
        <p className="text-[13px] text-muted">No completes logged yet this month.</p>
      </div>
    );
  }

  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0ede9" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fontSize: 10, fill: "#8d8a86", letterSpacing: "0.5px" }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#8d8a86" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={28}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "rgba(235,115,96,0.06)" }} />
          <Bar dataKey="completes" fill="#eb7360" radius={[4, 4, 0, 0]} maxBarSize={44} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
