// src/components/dashboard/overview/CustomerBaseCard.jsx

import { Users } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

import CardShell from "./CardShell";

const CustomerBaseCard = ({ total = 0, newThisMonth = 0, activeBorrowers = 0, newGrowthPct = 0, activeGrowthPct = 0 }) => {
  const data = [
    { key: "active", value: activeBorrowers, color: "#0B6B43" },
    { key: "rest", value: Math.max(total - activeBorrowers, 0), color: "#DCEFE4" },
  ];

  return (
    <CardShell icon={Users} title="Customer Base" subtitle="Active and new customer overview">
      <div className="flex h-full items-center gap-4">
        <div className="relative h-[92px] w-[92px] shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} dataKey="value" innerRadius={30} outerRadius={44} startAngle={90} endAngle={-270} stroke="none">
                {data.map((entry) => (
                  <Cell key={entry.key} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>

          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
            <p className="text-[16px] font-bold leading-none text-[#17221D]">{total}</p>
            <p className="mt-0.5 text-[8px] text-slate-400">Total</p>
          </div>
        </div>

        <div className="min-w-0 flex-1 space-y-2.5">
          <div>
            <p className="text-[9.5px] font-medium text-slate-400">New Customers</p>

            <p className="mt-0.5 flex items-baseline gap-1.5 text-[16px] font-bold text-[#17221D]">
              {newThisMonth}
              <span className="text-[9.5px] font-semibold text-[#0B6B43]">+{newGrowthPct}%</span>
            </p>
          </div>

          <div>
            <p className="text-[9.5px] font-medium text-slate-400">Active Borrowers</p>

            <p className="mt-0.5 flex items-baseline gap-1.5 text-[16px] font-bold text-[#17221D]">
              {activeBorrowers}
              <span className="text-[9.5px] font-semibold text-[#0B6B43]">+{activeGrowthPct}%</span>
            </p>
          </div>
        </div>
      </div>
    </CardShell>
  );
};

export default CustomerBaseCard;
