// src/components/dashboard/overview/MoneyMovementCard.jsx

import { Wallet } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, Tooltip } from "recharts";

import CardShell from "./CardShell";
import { formatCompactINR, formatINR } from "./format";

const ChartTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[10px] shadow-md">
      Day {label}: {formatINR(payload[0].value)}
    </div>
  );
};

const MoneyMovementCard = ({ cash = 0, bank = 0, upi = 0, dailyExpenseTrend = [], monthExpenseTotal = 0 }) => {
  return (
    <CardShell icon={Wallet} title="Money Movement" subtitle="Cash position and expense trend">
      <div className="flex h-full flex-col gap-3">
        <div className="grid grid-cols-3 gap-2">
          <div className="rounded-lg bg-[#F6FBF8] px-2.5 py-2 text-center">
            <p className="text-[8.5px] text-slate-400">Cash</p>
            <p className="mt-0.5 text-[11px] font-bold text-[#17221D]">{formatCompactINR(cash)}</p>
          </div>

          <div className="rounded-lg bg-[#F6FBF8] px-2.5 py-2 text-center">
            <p className="text-[8.5px] text-slate-400">Bank</p>
            <p className="mt-0.5 text-[11px] font-bold text-[#17221D]">{formatCompactINR(bank)}</p>
          </div>

          <div className="rounded-lg bg-[#F6FBF8] px-2.5 py-2 text-center">
            <p className="text-[8.5px] text-slate-400">UPI</p>
            <p className="mt-0.5 text-[11px] font-bold text-[#17221D]">{formatCompactINR(upi)}</p>
          </div>
        </div>

        <div className="min-h-0 flex-1 border-t border-slate-100 pt-2.5">
          <div className="mb-1 flex items-center justify-between">
            <p className="text-[9.5px] font-medium text-slate-400">Monthly Expenses</p>
            <p className="text-[10px] font-semibold text-[#6D4AFF]">{formatCompactINR(monthExpenseTotal)}</p>
          </div>

          <div className="h-[70px] w-full">
            {dailyExpenseTrend.length === 0 ? (
              <div className="flex h-full items-center justify-center text-[9.5px] text-slate-400">
                No expenses logged this month
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyExpenseTrend} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: "#F8F5FF" }} />

                  <Bar dataKey="amount" fill="#6D4AFF" radius={[3, 3, 0, 0]} maxBarSize={10} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </CardShell>
  );
};

export default MoneyMovementCard;
