// src/components/dashboard/overview/NeedsAttentionCard.jsx

import { AlertOctagon, PhoneCall, HandCoins, ChevronRight } from "lucide-react";

import CardShell from "./CardShell";
import { formatCompactINR } from "./format";

const Row = ({ icon: Icon, color, bg, label, count, amount, onClick }) => (
  <button
    type="button"
    onClick={onClick}
    className="flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-left transition hover:bg-[#F6FBF8]"
  >
    <span className="flex min-w-0 items-center gap-2.5">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg" style={{ background: bg }}>
        <Icon size={14} strokeWidth={2} style={{ color }} />
      </span>

      <span className="min-w-0">
        <span className="block text-[11px] font-medium text-[#17221D]">{label}</span>
        <span className="block text-[9px] text-slate-400">{formatCompactINR(amount)}</span>
      </span>
    </span>

    <span className="flex shrink-0 items-center gap-1">
      <span className="text-[13px] font-bold" style={{ color }}>
        {count}
      </span>

      <ChevronRight size={13} className="text-slate-300" />
    </span>
  </button>
);

const NeedsAttentionCard = ({
  overdueCount = 0,
  overdueAmount = 0,
  followUpCount = 0,
  ptpCount = 0,
  ptpAmount = 0,
  onNavigate = () => {},
}) => {
  return (
    <CardShell icon={AlertOctagon} title="Needs Attention" subtitle="Immediate action items">
      <div className="flex h-full flex-col justify-center gap-0.5">
        <Row
          icon={AlertOctagon}
          color="#D92D3A"
          bg="#FDE2E2"
          label="Overdue"
          count={overdueCount}
          amount={overdueAmount}
          onClick={() => onNavigate("/loan-management")}
        />

        <Row
          icon={PhoneCall}
          color="#B86D00"
          bg="#FBF4DD"
          label="Follow-ups"
          count={followUpCount}
          amount={0}
          onClick={() => onNavigate("/reminders")}
        />

        <Row
          icon={HandCoins}
          color="#6D4AFF"
          bg="#F1EDFF"
          label="PTP Due"
          count={ptpCount}
          amount={ptpAmount}
          onClick={() => onNavigate("/loan-management")}
        />
      </div>
    </CardShell>
  );
};

export default NeedsAttentionCard;
