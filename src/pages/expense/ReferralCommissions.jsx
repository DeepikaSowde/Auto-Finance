// src/pages/expense/ReferralCommissions.jsx
//
// Referral commissions owed to agents / dealers. Marking one paid also
// books a matching expense (handled server-side).

import { useEffect, useMemo, useState } from "react";
import { Clock3, CheckCircle2, Users, Layers, Plus, Search, X, Download } from "lucide-react";

import { getReferrals, addReferral, markReferralPaid, deleteReferral } from "../../services/referralStorage";
import { can } from "../../config/permissions";
import useLoans from "../../hooks/loans/useLoans";
import { getCustomerName } from "../../utils/loan/loanHelpers";
import { useToast } from "../../context/ToastContext";

const PAYMENT_MODES = ["Cash", "Bank Transfer", "UPI", "Cheque"];
const PAGE_SIZE = 10;

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const todayISO = () => new Date().toISOString().slice(0, 10);

const formatDate = (value) => {
  if (!value) return "—";

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

const initials = (name) =>
  String(name || "?")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");

const inputClass =
  "mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#9CCEB1]";

const Modal = ({ title, onClose, children }) => (
  <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-3">
    <section className="w-full max-w-lg rounded-2xl bg-white shadow-2xl">
      <header className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
        <h2 className="text-lg font-extrabold text-[#17221D]">{title}</h2>

        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50">
          <X size={17} />
        </button>
      </header>

      <div className="max-h-[75vh] overflow-y-auto p-5">{children}</div>
    </section>
  </div>
);

const StatCard = ({ icon: Icon, label, value, hint, tone }) => (
  <div className={`rounded-xl border p-4 ${tone.card}`}>
    <div className="flex items-center gap-3">
      <span className={`flex h-9 w-9 items-center justify-center rounded-full ${tone.icon}`}>
        <Icon size={17} />
      </span>

      <div>
        <p className="text-[11px] font-semibold text-slate-500">{label}</p>
        <p className="text-xl font-extrabold text-[#17221D]">{value}</p>
        <p className="text-[10px] text-slate-400">{hint}</p>
      </div>
    </div>
  </div>
);

/* =========================================================
   ADD FORM
========================================================= */

const AddReferralForm = ({ loans, onSubmit, onCancel, saving }) => {
  const [form, setForm] = useState({
    agentName: "",
    agentType: "Agent",
    loanNumber: "",
    customerName: "",
    amount: "",
    commissionDate: todayISO(),
    remarks: "",
  });

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const handleLoan = (loanNumber) => {
    const loan = loans.find((item) => (item.loanNumber || item.id) === loanNumber);

    setForm((current) => ({
      ...current,
      loanNumber,
      customerName: loan ? getCustomerName(loan) : current.customerName,
    }));
  };

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit(form);
      }}
      className="space-y-4"
    >
      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-bold text-slate-600">
          Agent / Partner
          <input
            required
            value={form.agentName}
            onChange={(event) => update("agentName", event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="text-xs font-bold text-slate-600">
          Type
          <select value={form.agentType} onChange={(event) => update("agentType", event.target.value)} className={inputClass}>
            <option>Agent</option>
            <option>Dealer</option>
          </select>
        </label>
      </div>

      <label className="block text-xs font-bold text-slate-600">
        Loan
        <select value={form.loanNumber} onChange={(event) => handleLoan(event.target.value)} className={inputClass}>
          <option value="">Select loan (optional)</option>
          {loans.map((loan) => {
            const number = loan.loanNumber || loan.id;

            return (
              <option key={number} value={number}>
                {number} — {getCustomerName(loan)}
              </option>
            );
          })}
        </select>
      </label>

      <label className="block text-xs font-bold text-slate-600">
        Customer
        <input value={form.customerName} onChange={(event) => update("customerName", event.target.value)} className={inputClass} />
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="text-xs font-bold text-slate-600">
          Commission Amount
          <input
            type="number"
            min="1"
            step="0.01"
            required
            value={form.amount}
            onChange={(event) => update("amount", event.target.value)}
            className={inputClass}
          />
        </label>

        <label className="text-xs font-bold text-slate-600">
          Date
          <input
            type="date"
            required
            value={form.commissionDate}
            onChange={(event) => update("commissionDate", event.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      <label className="block text-xs font-bold text-slate-600">
        Remarks
        <textarea
          rows={2}
          value={form.remarks}
          onChange={(event) => update("remarks", event.target.value)}
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-[#9CCEB1]"
        />
      </label>

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={onCancel} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">
          Cancel
        </button>

        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-[#0B5D3B] px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save Commission"}
        </button>
      </div>
    </form>
  );
};

/* =========================================================
   MAIN
========================================================= */

const ReferralCommissions = () => {
  const toast = useToast();
  const { loans } = useLoans();

  const [referrals, setReferrals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("All Agents");
  const [statusFilter, setStatusFilter] = useState("All Status");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [page, setPage] = useState(1);

  const [addOpen, setAddOpen] = useState(false);
  const [paying, setPaying] = useState(null);
  const [payMode, setPayMode] = useState("Cash");
  const [payDate, setPayDate] = useState(todayISO());

  const load = async () => {
    setReferrals(await getReferrals());
    setLoading(false);
  };

  useEffect(() => {
    getReferrals().then((rows) => {
      setReferrals(rows);
      setLoading(false);
    });
  }, []);

  const agents = useMemo(
    () => [...new Set(referrals.map((item) => item.agentName))].sort(),
    [referrals]
  );

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();

    return referrals.filter((item) => {
      if (agentFilter !== "All Agents" && item.agentName !== agentFilter) return false;
      if (statusFilter !== "All Status" && item.status !== statusFilter) return false;
      if (fromDate && item.commissionDate < fromDate) return false;
      if (toDate && item.commissionDate > toDate) return false;

      return (
        !term ||
        [item.agentName, item.customerName, item.loanNumber, item.id].some((field) =>
          String(field || "").toLowerCase().includes(term)
        )
      );
    });
  }, [referrals, search, agentFilter, statusFilter, fromDate, toDate]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const yearKey = String(now.getFullYear());

    const sum = (rows) => rows.reduce((total, item) => total + Number(item.amount || 0), 0);

    return {
      pending: sum(referrals.filter((item) => item.status === "Pending")),
      paidThisMonth: sum(
        referrals.filter((item) => item.status === "Paid" && item.paidDate.startsWith(monthKey))
      ),
      agents: new Set(referrals.map((item) => item.agentName)).size,
      ytd: sum(referrals.filter((item) => item.commissionDate.startsWith(yearKey))),
    };
  }, [referrals]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount);
  const visible = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const reset = () => {
    setSearch("");
    setAgentFilter("All Agents");
    setStatusFilter("All Status");
    setFromDate("");
    setToDate("");
    setPage(1);
  };

  const handleAdd = async (form) => {
    setSaving(true);

    try {
      await addReferral(form);
      toast.success("Referral commission added.");
      setAddOpen(false);
      await load();
    } catch (error) {
      toast.error(error.message || "Couldn't save this commission.");
    } finally {
      setSaving(false);
    }
  };

  const handlePay = async () => {
    try {
      await markReferralPaid(paying.id, { paymentMode: payMode, paidDate: payDate });
      toast.success("Commission marked as paid.");
      setPaying(null);
      await load();
    } catch (error) {
      toast.error(error.message || "Couldn't mark as paid.");
    }
  };

  const handleDelete = async (item) => {
    if (!window.confirm(`Delete commission ${item.id}?`)) return;

    try {
      await deleteReferral(item.id);
      toast.success("Commission deleted.");
      await load();
    } catch (error) {
      toast.error(error.message || "Couldn't delete this commission.");
    }
  };

  const exportCsv = () => {
    const header = ["Date", "Agent", "Type", "Customer", "Loan No", "Amount", "Status", "Paid Date", "Payment Mode"];
    const rows = filtered.map((item) => [
      item.commissionDate,
      item.agentName,
      item.agentType,
      item.customerName,
      item.loanNumber,
      item.amount,
      item.status,
      item.paidDate,
      item.paymentMode,
    ]);

    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv" }));
    const link = document.createElement("a");

    link.href = url;
    link.download = "referral-commissions.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const resetPageOn = (setter) => (event) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <div className="px-4 pb-8 sm:px-6 lg:px-8">
      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          icon={Clock3}
          label="Pending Commissions"
          value={money(stats.pending)}
          hint="To be paid to agents / partners"
          tone={{ card: "border-orange-100 bg-orange-50/50", icon: "bg-orange-100 text-orange-500" }}
        />
        <StatCard
          icon={CheckCircle2}
          label="Paid This Month"
          value={money(stats.paidThisMonth)}
          hint="Total commission paid"
          tone={{ card: "border-emerald-100 bg-emerald-50/50", icon: "bg-emerald-100 text-emerald-600" }}
        />
        <StatCard
          icon={Users}
          label="Total Agents"
          value={stats.agents}
          hint="Active referral partners"
          tone={{ card: "border-blue-100 bg-blue-50/50", icon: "bg-blue-100 text-blue-600" }}
        />
        <StatCard
          icon={Layers}
          label="Total Commissions (YTD)"
          value={money(stats.ytd)}
          hint="This calendar year"
          tone={{ card: "border-violet-100 bg-violet-50/50", icon: "bg-violet-100 text-violet-600" }}
        />
      </section>

      <section className="mt-5 rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 p-4">
          <div className="relative min-w-[200px] flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={resetPageOn(setSearch)}
              placeholder="Search agent, customer, loan no..."
              className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-[#9CCEB1]"
            />
          </div>

          <select
            value={agentFilter}
            onChange={resetPageOn(setAgentFilter)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
          >
            <option>All Agents</option>
            {agents.map((agent) => (
              <option key={agent}>{agent}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={resetPageOn(setStatusFilter)}
            className="h-9 rounded-lg border border-slate-200 bg-white px-3 text-xs"
          >
            <option>All Status</option>
            <option>Pending</option>
            <option>Paid</option>
          </select>

          <input
            type="date"
            value={fromDate}
            onChange={resetPageOn(setFromDate)}
            className="h-9 rounded-lg border border-slate-200 px-2 text-xs"
            aria-label="From date"
          />
          <input
            type="date"
            value={toDate}
            onChange={resetPageOn(setToDate)}
            className="h-9 rounded-lg border border-slate-200 px-2 text-xs"
            aria-label="To date"
          />

          <button type="button" onClick={reset} className="px-2 text-xs font-bold text-[#0B5D3B]">
            Reset
          </button>

          <button
            type="button"
            onClick={exportCsv}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-xs font-bold text-slate-600"
          >
            <Download size={14} /> Export
          </button>

{can("expense", "add") && (
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#0B5D3B] px-4 text-xs font-bold text-white hover:bg-[#084A30]"
          >
            <Plus size={14} /> Add Commission
          </button>
)}
        </div>

        {loading ? (
          <div className="p-10 text-center text-xs text-slate-400">Loading...</div>
        ) : visible.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm font-bold text-[#17221D]">No referral commissions found</p>
            <p className="mt-1 text-xs text-slate-400">Add a commission or adjust the filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-400">
                <tr>
                  {["Date", "Agent / Partner", "Customer", "Loan No.", "Commission Amount", "Status", "Paid Date", "Payment Mode", "Actions"].map(
                    (header) => (
                      <th key={header} className="whitespace-nowrap px-4 py-3">
                        {header}
                      </th>
                    )
                  )}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {visible.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50/60">
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(item.commissionDate)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#E3F1EA] text-[10px] font-extrabold text-[#0B5D3B]">
                          {initials(item.agentName)}
                        </span>
                        <div>
                          <p className="font-bold text-[#17221D]">{item.agentName}</p>
                          <p className="text-[10px] text-slate-400">{item.agentType}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-slate-700">{item.customerName || "—"}</td>
                    <td className="px-4 py-3 text-slate-700">{item.loanNumber || "—"}</td>
                    <td className="px-4 py-3 font-bold text-[#17221D]">{money(item.amount)}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-[10px] font-bold ${
                          item.status === "Paid" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-600"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-slate-600">{formatDate(item.paidDate)}</td>
                    <td className="px-4 py-3 text-slate-600">{item.paymentMode || "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <div className="flex items-center gap-2">
                        {item.status === "Pending" ? (
                          can("expense", "approve") ? (
                          <button
                            type="button"
                            onClick={() => {
                              setPaying(item);
                              setPayMode("Cash");
                              setPayDate(todayISO());
                            }}
                            className="rounded-lg bg-[#0B5D3B] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#084A30]"
                          >
                            Mark as Paid
                          </button>
                          ) : (
                            <span className="text-[10px] font-semibold text-amber-600">Pending</span>
                          )
                        ) : (
                          <span className="text-[10px] text-slate-400">{item.expenseId}</span>
                        )}

{can("expense", "delete") && (
                        <button
                          type="button"
                          onClick={() => handleDelete(item)}
                          className="text-[11px] font-bold text-rose-500 hover:underline"
                        >
                          Delete
                        </button>
)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3 text-[11px] text-slate-400">
          <span>
            Showing {filtered.length === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1} –{" "}
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} of {filtered.length} records
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 disabled:opacity-40"
            >
              ‹
            </button>
            <span className="rounded-lg bg-[#0B5D3B] px-2.5 py-1 font-bold text-white">{currentPage}</span>
            <button
              type="button"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(currentPage + 1)}
              className="rounded-lg border border-slate-200 px-2.5 py-1 disabled:opacity-40"
            >
              ›
            </button>
          </div>
        </div>
      </section>

      {addOpen && (
        <Modal title="Add Referral Commission" onClose={() => setAddOpen(false)}>
          <AddReferralForm loans={loans} onSubmit={handleAdd} onCancel={() => setAddOpen(false)} saving={saving} />
        </Modal>
      )}

      {paying && (
        <Modal title="Mark Commission as Paid" onClose={() => setPaying(null)}>
          <p className="text-xs text-slate-500">
            {paying.agentName} · {money(paying.amount)} · {paying.loanNumber || paying.id}
          </p>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <label className="text-xs font-bold text-slate-600">
              Payment Mode
              <select value={payMode} onChange={(event) => setPayMode(event.target.value)} className={inputClass}>
                {PAYMENT_MODES.map((mode) => (
                  <option key={mode}>{mode}</option>
                ))}
              </select>
            </label>

            <label className="text-xs font-bold text-slate-600">
              Paid Date
              <input type="date" value={payDate} onChange={(event) => setPayDate(event.target.value)} className={inputClass} />
            </label>
          </div>

          <p className="mt-3 text-[11px] text-slate-400">
            A matching expense will be recorded under “Referral Commission”.
          </p>

          <div className="mt-5 flex justify-end gap-2">
            <button type="button" onClick={() => setPaying(null)} className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-bold text-slate-600">
              Cancel
            </button>
            <button type="button" onClick={handlePay} className="rounded-lg bg-[#0B5D3B] px-4 py-2 text-xs font-bold text-white">
              Confirm Payment
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default ReferralCommissions;
