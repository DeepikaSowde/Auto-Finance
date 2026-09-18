// src/components/dashboard/overview/RepaymentHealthCard.jsx

import { HeartPulse } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";

import CardShell from "./CardShell";
import { formatCompactINR, formatINR, formatPct } from "./format";

const StatPill = ({ label, value, color }) => (
  <div>
    <p className="text-[9px] font-medium text-slate-400">{label}</p>
    <p className="mt-0.5 text-[13px] font-bold" style={{ color }}>
      {value}
    </p>
  </div>
);

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

const RepaymentHealthCard = ({ weeklyTrend = [], monthDue = 0, monthCollected = 0, overdueAmount = 0, ptpAmount = 0 }) => {
  const collectedPct = monthDue > 0 ? Math.min(100, (monthCollected / monthDue) * 100) : 0;
  const overduePct = monthDue > 0 ? Math.min(100, (overdueAmount / monthDue) * 100) : 0;

  return (
    <CardShell icon={HeartPulse} title="Repayment Health" subtitle="Due vs collected and repayment status">
      <div className="flex h-full flex-col gap-3">
        <div className="grid grid-cols-4 gap-2">
          <StatPill label="Due" value={formatCompactINR(monthDue)} color="#B86D00" />
          <StatPill label="Collected" value={formatCompactINR(monthCollected)} color="#0B6B43" />
          <StatPill label="Overdue" value={formatCompactINR(overdueAmount)} color="#D92D3A" />
          <StatPill label="PTP" value={formatCompactINR(ptpAmount)} color="#6D4AFF" />
        </div>

        <div className="h-[110px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={weeklyTrend} barGap={3} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
              <XAxis
                dataKey="week"
                tick={{ fontSize: 9, fill: "#94A3B8" }}
                axisLine={{ stroke: "#DCEFE4" }}
                tickLine={false}
              />

              <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F6FBF8" }} />

              <Bar dataKey="collected" name="Collected" stackId="a" fill="#0B6B43" maxBarSize={20} />
              <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#D92D3A" maxBarSize={20} />
              <Bar
                dataKey="due"
                name="Due"
                fill="#EAF5EF"
                radius={[4, 4, 0, 0]}
                maxBarSize={20}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="flex items-center gap-4 border-t border-slate-100 pt-2.5 text-[10px]">
          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-[#0B6B43]" /> Collected {formatPct(collectedPct)}
          </span>

          <span className="flex items-center gap-1.5 text-slate-500">
            <span className="h-2 w-2 rounded-full bg-[#D92D3A]" /> Overdue {formatPct(overduePct)}
          </span>
        </div>
      </div>
    </CardShell>
  );
};

export default RepaymentHealthCard;
