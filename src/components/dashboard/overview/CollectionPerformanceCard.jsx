// src/components/dashboard/overview/CollectionPerformanceCard.jsx

import { TrendingUp } from "lucide-react";

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

import CardShell from "./CardShell";
import { formatCompactINR, formatINR, formatPct } from "./format";

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-[11px] shadow-md">
      <p className="mb-1 font-semibold text-[#17221D]">{label}</p>

      {payload.map((entry) => (
        <p key={entry.dataKey} style={{ color: entry.color }}>
          {entry.name}: {formatINR(entry.value)}
        </p>
      ))}
    </div>
  );
};

const CollectionPerformanceCard = ({ weeklyTrend = [], monthCollected = 0, monthDue = 0, collectionRate = 0, periodLabel = "This Month" }) => {
  return (
    <CardShell
      icon={TrendingUp}
      title="Collection Performance"
      subtitle="Collection trend and due payment"
      right={<span className="text-[9px] font-medium text-slate-400">{periodLabel}</span>}
    >
      <div className="flex h-full flex-col gap-3 lg:flex-row">
        <div className="min-w-0 flex-1">
          <div className="mb-1 flex items-center gap-4 text-[10px]">
            <span className="flex items-center gap-1.5 font-medium text-[#0B6B43]">
              <span className="h-2 w-2 rounded-full bg-[#0B6B43]" /> Collected {formatCompactINR(monthCollected)}
            </span>

            <span className="flex items-center gap-1.5 font-medium text-[#B86D00]">
              <span className="h-2 w-2 rounded-full bg-[#B86D00]" /> Due {formatCompactINR(monthDue)}
            </span>
          </div>

          <div className="h-[180px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyTrend} barGap={4} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="#EAF5EF" />

                <XAxis
                  dataKey="week"
                  tick={{ fontSize: 9, fill: "#94A3B8" }}
                  axisLine={{ stroke: "#DCEFE4" }}
                  tickLine={false}
                />

                <YAxis
                  tick={{ fontSize: 9, fill: "#94A3B8" }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(value) => formatCompactINR(value)}
                  width={44}
                />

                <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F6FBF8" }} />

                <Bar dataKey="collected" name="Collected" fill="#0B6B43" radius={[4, 4, 0, 0]} maxBarSize={16} />

                <Bar dataKey="due" name="Due" fill="#F0C978" radius={[4, 4, 0, 0]} maxBarSize={16} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="flex w-full shrink-0 flex-col items-center justify-center gap-1 rounded-xl bg-[#F6FBF8] px-4 py-3 lg:w-[110px]">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r="30" fill="none" stroke="#DCEFE4" strokeWidth="8" />

            <circle
              cx="36"
              cy="36"
              r="30"
              fill="none"
              stroke="#0B6B43"
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={`${(Math.min(collectionRate, 100) / 100) * 188.5} 188.5`}
              transform="rotate(-90 36 36)"
            />
          </svg>

          <p className="-mt-11 text-[15px] font-bold text-[#0B6B43]">{formatPct(collectionRate)}</p>

          <p className="mt-11 text-center text-[9px] font-medium text-slate-500">Collection rate</p>
        </div>
      </div>
    </CardShell>
  );
};

export default CollectionPerformanceCard;
