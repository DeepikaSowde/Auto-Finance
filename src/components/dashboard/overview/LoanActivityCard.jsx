// src/components/dashboard/overview/LoanActivityCard.jsx
//
// Real-data replacement for a fabricated "application pipeline" (this app
// has no Applications / Under Review / Approved / Rejected workflow) —
// shows new vs. re-loan activity for the current month instead.

import { FileStack, FilePlus2, RefreshCcw } from "lucide-react";

import CardShell from "./CardShell";

const LoanActivityCard = ({ newLoans = 0, reLoans = 0, periodLabel = "This Month" }) => {
  const total = newLoans + reLoans;
  const newPct = total > 0 ? Math.round((newLoans / total) * 100) : 0;
  const rePct = total > 0 ? 100 - newPct : 0;

  return (
    <CardShell
      icon={FileStack}
      title="Loan Activity"
      subtitle="New disbursements in range"
      right={<span className="text-[9px] font-medium text-slate-400">{periodLabel}</span>}
    >
      <div className="flex h-full flex-col justify-center gap-4">
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-[#EAF5EF]">
          <div className="h-full bg-[#0B6B43]" style={{ width: `${newPct}%` }} />
          <div className="h-full bg-[#6D4AFF]" style={{ width: `${rePct}%` }} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#F6FBF8] px-3.5 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#0B5D3B]/10">
                <FilePlus2 size={14} strokeWidth={2} className="text-[#0B6B43]" />
              </div>

              <p className="text-[9.5px] font-medium text-slate-500">New Loans</p>
            </div>

            <p className="mt-2 text-[21px] font-semibold leading-none text-[#0B6B43]">{newLoans}</p>

            <p className="mt-1 text-[9px] text-slate-400">{newPct}% of this month's activity</p>
          </div>

          <div className="rounded-xl bg-[#F1EDFF] px-3.5 py-3">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#6D4AFF]/10">
                <RefreshCcw size={14} strokeWidth={2} className="text-[#6D4AFF]" />
              </div>

              <p className="text-[9.5px] font-medium text-slate-500">Re-loans</p>
            </div>

            <p className="mt-2 text-[21px] font-semibold leading-none text-[#6D4AFF]">{reLoans}</p>

            <p className="mt-1 text-[9px] text-slate-400">{rePct}% of this month's activity</p>
          </div>
        </div>
      </div>
    </CardShell>
  );
};

export default LoanActivityCard;
