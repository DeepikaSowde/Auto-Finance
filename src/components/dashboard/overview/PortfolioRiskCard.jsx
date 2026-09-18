// src/components/dashboard/overview/PortfolioRiskCard.jsx

import { ShieldAlert } from "lucide-react";

import CardShell from "./CardShell";
import { formatCompactINR, formatPct } from "./format";

const BUCKET_COLORS = ["#F0C978", "#F5A25C", "#E87A4E", "#D92D3A"];

const PortfolioRiskCard = ({ overdueAmount = 0, overduePctOfPortfolio = 0, agingBuckets = [] }) => {
  const totalOverdue = agingBuckets.reduce((sum, bucket) => sum + bucket.amount, 0) || 1;

  return (
    <CardShell
      icon={ShieldAlert}
      title="Portfolio Risk"
      subtitle="Aging of overdue accounts"
      right={<span className="text-[9px] font-medium text-slate-400">As of Today</span>}
    >
      <div className="flex h-full flex-col gap-3">
        <div className="flex items-center justify-between rounded-lg bg-[#FDE2E2] px-3 py-2">
          <span className="text-[10.5px] font-medium text-[#8A1F28]">Overdue Amount</span>

          <span className="text-right">
            <span className="block text-[13px] font-bold text-[#D92D3A]">
              {formatCompactINR(overdueAmount)}
            </span>
            <span className="block text-[8.5px] text-[#B0454F]">
              {formatPct(overduePctOfPortfolio)} of portfolio
            </span>
          </span>
        </div>

        <div className="min-h-0 flex-1 space-y-2">
          {agingBuckets.map((bucket, index) => {
            const pct = Math.round((bucket.amount / totalOverdue) * 100);

            return (
              <div key={bucket.key} className="flex items-center gap-2">
                <span className="w-16 shrink-0 text-[9.5px] text-slate-500">{bucket.label}</span>

                <div className="h-2 min-w-0 flex-1 rounded-full bg-slate-100">
                  <div
                    className="h-2 rounded-full"
                    style={{ width: `${pct}%`, background: BUCKET_COLORS[index] }}
                  />
                </div>

                <span className="w-8 shrink-0 text-right text-[9.5px] font-medium text-slate-500">{pct}%</span>

                <span className="w-14 shrink-0 text-right text-[10px] font-semibold text-[#17221D]">
                  {formatCompactINR(bucket.amount)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </CardShell>
  );
};

export default PortfolioRiskCard;
