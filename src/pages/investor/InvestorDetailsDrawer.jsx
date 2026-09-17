import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getInvestorTransactions } from "../../services/investorStorage";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const dateLabel = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? String(value)
    : date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
};

const percentageLabel = (value) =>
  `${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}%`;

const DetailMetric = ({ label, value, accent = false }) => (
  <div className="rounded-xl border border-slate-200 bg-white p-3">
    <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
      {label}
    </p>
    <p
      className={`mt-2 truncate text-lg font-extrabold ${
        accent ? "text-[#0B6B43]" : "text-[#17221D]"
      }`}
    >
      {value}
    </p>
  </div>
);

const InfoItem = ({ label, value }) => {
  if (!value) return null;

  return (
    <div>
      <p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="mt-1 truncate text-xs font-bold text-[#17221D]">{value}</p>
    </div>
  );
};

const InvestorDetailsDrawer = ({ investor, onClose }) => {
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    let cancelled = false;

    getInvestorTransactions(investor.id).then((rows) => {
      if (!cancelled) {
        setTransactions(
          rows.filter((transaction) => transaction.type === "Investment")
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [investor.id]);
  const invested = investor.investment?.totalInvested || 0;
  const ownership = investor.ownershipPercentage || 0;
  const status = investor.status || "Active";

  return (
    <div className="fixed inset-0 z-[110] flex justify-end bg-slate-950/40">
      <section className="flex h-full w-full max-w-2xl flex-col overflow-hidden bg-white shadow-2xl">
        <header className="sticky top-0 z-10 shrink-0 border-b border-slate-100 bg-white px-5 py-4 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-[#0B6B43]">
                Investor Details
              </p>
              <h2 className="mt-1 truncate text-xl font-extrabold text-[#17221D]">
                {investor.name}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-slate-500">
                <span>{investor.id}</span>
                <span className="h-1 w-1 rounded-full bg-slate-300" />
                <span className="rounded-full bg-[#EAF5EF] px-2 py-0.5 font-bold text-[#0B6B43]">
                  {status}
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close investor details"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            >
              <X size={17} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          <section>
            <div className="grid gap-3 sm:grid-cols-3">
              <DetailMetric label="Total Invested" value={money(invested)} accent />
              <DetailMetric label="Ownership" value={percentageLabel(ownership)} accent />
              <DetailMetric label="Status" value={status} />
            </div>
          </section>

          <section className="mt-6">
            <h3 className="text-sm font-extrabold text-[#17221D]">
              Investor Information
            </h3>
            <div className="mt-3 grid gap-x-5 gap-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:grid-cols-2">
              <InfoItem label="Investor Name" value={investor.name} />
              <InfoItem label="Investor ID" value={investor.id} />
              <InfoItem
                label="Investment Date"
                value={dateLabel(investor.investment?.investmentDate)}
              />
              <InfoItem label="Status" value={status} />
              <InfoItem label="Total Invested" value={money(invested)} />
              <InfoItem label="Ownership %" value={percentageLabel(ownership)} />
            </div>
          </section>

          <section className="mt-6 rounded-xl border border-[#B9DCC6] bg-[#F6FBF8] p-4">
            <p className="text-[9px] font-bold uppercase tracking-[0.14em] text-[#0B6B43]">
              Investment Position
            </p>
            <div className="mt-3 flex items-end justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold text-slate-500">Invested</p>
                <p className="mt-1 text-2xl font-extrabold text-[#0B6B43]">
                  {money(invested)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-semibold text-slate-500">Ownership</p>
                <p className="mt-1 text-lg font-extrabold text-[#17221D]">
                  {percentageLabel(ownership)}
                </p>
              </div>
            </div>
          </section>

          <section className="mt-6">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-extrabold text-[#17221D]">
                Investment History
              </h3>
              <span className="text-[10px] font-semibold text-slate-400">
                {transactions.length} {transactions.length === 1 ? "entry" : "entries"}
              </span>
            </div>
            {transactions.length === 0 ? (
              <p className="mt-3 rounded-xl border border-dashed border-slate-200 px-4 py-5 text-center text-xs text-slate-500">
                No investment activity recorded.
              </p>
            ) : (
              <div className="mt-3 divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between gap-4 px-4 py-3"
                  >
                    <div>
                      <p className="text-xs font-bold text-[#17221D]">
                        Investment Added
                      </p>
                      <p className="mt-0.5 text-[10px] text-slate-500">
                        {dateLabel(transaction.date)}
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-[#0B6B43]">
                      {money(transaction.amount)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </div>
  );
};

export default InvestorDetailsDrawer;
