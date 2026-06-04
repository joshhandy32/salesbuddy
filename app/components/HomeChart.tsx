"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from "recharts";
import { CalendarRange } from "lucide-react";

type Point = { day: number; completes: number };

// Custom tooltip — white card, hairline border, ink value over a gray date.
function HomeTooltip({
  active,
  payload,
  monthShort,
}: {
  active?: boolean;
  payload?: { value: number; payload: Point }[];
  monthShort: string;
}) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const n = p.value;
  return (
    <div
      className="rounded-[6px] border border-[#e5e7eb] bg-white"
      style={{ padding: "8px 12px", boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }}
    >
      <div className="text-[12px] text-[#99a1af]">
        {monthShort} {p.payload.day}
      </div>
      <div className="text-[14px] font-semibold text-[#101828]">
        {n} {n === 1 ? "complete" : "completes"}
      </div>
    </div>
  );
}

export default function HomeChart({
  data,
  quota,
  total,
  monthShort,
}: {
  data: Point[];
  quota: number;
  total: number;
  monthShort: string;
}) {
  // No completes logged → in-chart empty state, never a blank rectangle.
  if (total === 0) {
    return (
      <div className="flex h-56 flex-col items-center justify-center gap-2 text-center">
        <CalendarRange size={40} strokeWidth={1.5} className="text-[#e5e7eb]" />
        <p className="text-[14px] font-medium text-[#6a7282]">No completes logged yet</p>
        <p className="text-[12px] text-[#99a1af]">
          Log a demo and mark it complete to start tracking.
        </p>
      </div>
    );
  }

  const yMax = Math.max(quota, ...data.map((d) => d.completes)) + 1;
  const tickStep = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
          <defs>
            <linearGradient id="homeCompletes" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#eb7360" stopOpacity={0.12} />
              <stop offset="100%" stopColor="#eb7360" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="#f0f0f0" strokeWidth={1} vertical={false} />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 11, fill: "#99a1af" }}
            axisLine={false}
            tickLine={false}
            interval={tickStep - 1}
            minTickGap={8}
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#99a1af" }}
            axisLine={false}
            tickLine={false}
            allowDecimals={false}
            width={32}
            domain={[0, yMax]}
          />
          <Tooltip
            content={<HomeTooltip monthShort={monthShort} />}
            cursor={{ stroke: "#eb7360", strokeOpacity: 0.25, strokeWidth: 1 }}
          />
          {quota > 0 && (
            <ReferenceLine
              y={quota}
              stroke="#6a7282"
              strokeDasharray="4 4"
              strokeWidth={1}
              label={{
                value: "Quota",
                position: "insideTopRight",
                fill: "#6a7282",
                fontSize: 11,
              }}
            />
          )}
          <Area
            type="monotone"
            dataKey="completes"
            stroke="#eb7360"
            strokeWidth={2}
            fill="url(#homeCompletes)"
            dot={false}
            activeDot={{ r: 4, fill: "#eb7360", stroke: "#fff", strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
