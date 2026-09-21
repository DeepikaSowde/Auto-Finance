// src/components/dashboard/overview/KpiStrip.jsx

import {
  CircleDollarSign,
  CalendarClock,
  TrendingUp,
  AlertTriangle,
  Percent,
  HandCoins,
  WalletCards,
} from "lucide-react";

import { formatINR, formatPct } from "./format";

const TONES = {
  green: { bg: "#EAF5EF", fg: "#0B5D3B" },
  amber: { bg: "#FBF4DD", fg: "#B86D00" },
  slate: { bg: "#EEF2EF", fg: "#253252" },
  red: { bg: "#FDE2E2", fg: "#D92D3A" },
  blue: { bg: "#E1ECFD", fg: "#4779D8" },
};

const Tile = ({ icon: Icon, tone = "green", label, value, note }) => {
  const colors = TONES[tone] || TONES.green;

  return (
    <div className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3.5 py-3">
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg"
          style={{ background: colors.bg }}
        >
          <Icon size={16} strokeWidth={2} style={{ color: colors.fg }} />
        </div>

        <div className="min-w-0">
          <p className="truncate text-[9.5px] font-medium text-slate-400">{label}</p>

          <p className="mt-0.5 truncate text-[15px] font-semibold leading-none tracking-tight text-[#17221D]">
            {value}
          </p>

          {note && <p className="mt-1 truncate text-[9px] text-slate-400">{note}</p>}
        </div>
      </div>
    </div>
  );
};

const KpiStrip = ({
  monthCollected = 0,
  monthDue = 0,
  totalOutstanding = 0,
  overdueAmount = 0,
  overduePctOfPortfolio = 0,
  collectionRate = 0,
  activeLoans = 0,
  cashPosition = 0,
  periodLabel = "This Month",
}) => {
  return (
    <div className="flex flex-wrap gap-3">
      <Tile
        icon={CircleDollarSign}
        tone="green"
        label={`Collected (${periodLabel})`}
        value={formatINR(monthCollected)}
      />

      <Tile
        icon={CalendarClock}
        tone="amber"
        label={`Due (${periodLabel})`}
        value={formatINR(monthDue)}
      />

      <Tile
        icon={TrendingUp}
        tone="slate"
        label="Outstanding Principal"
        value={formatINR(totalOutstanding, { decimals: 2 })}
      />

      <Tile
        icon={AlertTriangle}
        tone="red"
        label="Overdue Amount"
        value={formatINR(overdueAmount)}
        note={`${formatPct(overduePctOfPortfolio)} of portfolio`}
      />

      <Tile
        icon={Percent}
        tone="green"
        label="Collection Rate"
        value={formatPct(collectionRate)}
      />

      <Tile
        icon={HandCoins}
        tone="green"
        label="Active Loans"
        value={Number(activeLoans || 0).toLocaleString("en-IN")}
      />

      <Tile
        icon={WalletCards}
        tone="blue"
        label="Cash Balance"
        value={formatINR(cashPosition)}
      />
    </div>
  );
};

export default KpiStrip;
