// src/components/dashboard/overview/LoanPortfolioCard.jsx

import { PieChart as PieChartIcon } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

import CardShell from "./CardShell";
import { formatCompactINR } from "./format";

const LoanPortfolioCard = ({ composition = [], totalLoans = 0, outstandingByVehicleType = [] }) => {
  const maxOutstanding = Math.max(1, ...outstandingByVehicleType.map((row) => row.amount));

  return (
    <CardShell
      icon={PieChartIcon}
      title="Loan Portfolio"
      subtitle="Portfolio composition and vehicle-type distribution"
      right={<span className="text-[9px] font-medium text-slate-400">As of Today</span>}
    >
      <div className="flex h-full flex-col gap-4">
        <div className="flex items-center gap-4">
          <div className="relative h-[104px] w-[104px] shrink-0">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={composition}
                  dataKey="count"
                  nameKey="label"
                  innerRadius={32}
                  outerRadius={48}
                  paddingAngle={2}
                  stroke="none"
                >
                  {composition.map((entry) => (
                    <Cell key={entry.key} fill={entry.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>

            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <p className="text-[17px] font-bold leading-none text-[#17221D]">{totalLoans}</p>

              <p className="mt-0.5 text-[8px] text-slate-400">Total Loans</p>
            </div>
          </div>

          <div className="min-w-0 flex-1 space-y-1.5">
            {composition.map((row) => (
              <div key={row.key} className="flex items-center justify-between gap-2 text-[10.5px]">
                <span className="flex items-center gap-1.5 text-slate-600">
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
                  {row.label}
                </span>

                <span className="shrink-0 font-semibold text-[#17221D]">
                  {row.count} ({row.pct}%)
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="min-w-0 flex-1 border-t border-slate-100 pt-3">
          <p className="mb-2 text-[9.5px] font-medium text-slate-400">
            Outstanding Amount by Vehicle Type
          </p>

          <div className="space-y-2">
            {outstandingByVehicleType.length === 0 && (
              <p className="text-[10px] text-slate-400">No outstanding balances yet.</p>
            )}

            {outstandingByVehicleType.map((row) => (
              <div key={row.type} className="flex items-center gap-2">
                <span className="w-16 shrink-0 truncate text-[10px] text-slate-600">{row.type}</span>

                <div className="h-2 min-w-0 flex-1 rounded-full bg-[#EAF5EF]">
                  <div
                    className="h-2 rounded-full bg-[#0B6B43]"
                    style={{ width: `${(row.amount / maxOutstanding) * 100}%` }}
                  />
                </div>

                <span className="w-14 shrink-0 text-right text-[10px] font-semibold text-[#17221D]">
                  {formatCompactINR(row.amount)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </CardShell>
  );
};

export default LoanPortfolioCard;
