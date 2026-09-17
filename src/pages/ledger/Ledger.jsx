import { useEffect, useMemo, useState } from "react";
import { Download, Filter, Search, X } from "lucide-react";
import {
  formatLedgerDate,
  formatLedgerMoney,
  getLedgerRange,
  getLedgerTransactions,
  getPreviousLedgerRange,
  isInRange,
  sumLedger,
} from "../../services/ledgerService";

const PERIODS = [["today", "Today"], ["this-month", "This Month"], ["last-month", "Last Month"], ["last-6-months", "Last 6 Months"], ["this-year", "This Year"], ["custom", "Custom Range"]];
const initialFilters = { type: "all", paymentMode: "all", incomeCategory: "all", expenseCategory: "all", minAmount: "", maxAmount: "", startDate: "", endDate: "", status: "all" };
const money = formatLedgerMoney;

const Ledger = () => {
  const [transactions, setTransactions] = useState([]);
  const [period, setPeriod] = useState("this-month");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [draftStart, setDraftStart] = useState("");
  const [draftEnd, setDraftEnd] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [search, setSearch] = useState("");
  const [filters, setFilters] = useState(initialFilters);
  const [draftFilters, setDraftFilters] = useState(initialFilters);
  const [showFilters, setShowFilters] = useState(false);
  const [showCustomRange, setShowCustomRange] = useState(false);
  const [selected, setSelected] = useState(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  useEffect(() => {
    const reload = async () =>
      setTransactions(await getLedgerTransactions());

    reload();

    window.addEventListener("auto-finance:data-updated", reload);
    window.addEventListener("fleetopz:data-updated", reload);
    window.addEventListener("storage", reload);
    return () => {
      window.removeEventListener("auto-finance:data-updated", reload);
      window.removeEventListener("fleetopz:data-updated", reload);
      window.removeEventListener("storage", reload);
    };
  }, []);

  const range = useMemo(() => getLedgerRange(period, customStart, customEnd), [period, customStart, customEnd]);
  const previousRange = useMemo(() => getPreviousLedgerRange(range), [range]);
  const categories = useMemo(() => ({
    income: [...new Set(transactions.filter((item) => item.kind === "income").map((item) => item.category).filter(Boolean))],
    expense: [...new Set(transactions.filter((item) => item.kind === "expense").map((item) => item.category).filter(Boolean))],
    modes: [...new Set(transactions.map((item) => item.paymentMode).filter(Boolean))],
    statuses: [...new Set(transactions.map((item) => item.status).filter(Boolean))],
  }), [transactions]);
  const periodTransactions = useMemo(() => transactions.filter((item) => isInRange(item, range)), [transactions, range]);

  const matchesFilters = (item) => {
    const query = search.trim().toLowerCase();
    const haystack = [item.customerName, item.customerId, item.loanNumber, item.category, item.reference, item.description, item.paymentMode].filter(Boolean).join(" ").toLowerCase();
    const amount = Number(item.amount || 0);
    return (!query || haystack.includes(query)) && (filters.type === "all" || item.kind === filters.type) && (filters.paymentMode === "all" || item.paymentMode === filters.paymentMode) && (filters.incomeCategory === "all" || item.category === filters.incomeCategory || item.kind !== "income") && (filters.expenseCategory === "all" || item.category === filters.expenseCategory || item.kind !== "expense") && (!filters.minAmount || amount >= Number(filters.minAmount)) && (!filters.maxAmount || amount <= Number(filters.maxAmount)) && (!filters.startDate || item.dateKey >= filters.startDate) && (!filters.endDate || item.dateKey <= filters.endDate) && (filters.status === "all" || item.status === filters.status);
  };

  const chartTransactions = useMemo(() => periodTransactions.filter(matchesFilters), [periodTransactions, search, filters]);
  const visibleTransactions = useMemo(() => chartTransactions.filter((item) => activeTab === "all" || item.kind === activeTab), [chartTransactions, activeTab]);
  const previousTransactions = useMemo(() => transactions.filter((item) => isInRange(item, previousRange)), [transactions, previousRange]);
  const summary = useMemo(() => sumLedger(visibleTransactions), [visibleTransactions]);
  const chartSummary = useMemo(() => sumLedger(chartTransactions), [chartTransactions]);
  const previousSummary = useMemo(() => sumLedger(previousTransactions), [previousTransactions]);

  useEffect(() => setPage(1), [search, activeTab, filters, period, customStart, customEnd]);
  const totalPages = Math.max(1, Math.ceil(visibleTransactions.length / pageSize));
  const pageRows = visibleTransactions.slice((page - 1) * pageSize, page * pageSize);

  const chartData = useMemo(() => aggregateChart(chartTransactions, period, range), [chartTransactions, period, range]);
  const chartMax = Math.max(1, ...chartData.flatMap((item) => [item.income, item.expense]));
  const highestIncome = [...chartData].sort((a, b) => b.income - a.income)[0];
  const highestExpense = [...chartData].sort((a, b) => b.expense - a.expense)[0];
  const activeFilterCount = Object.values(filters).filter((value) => value && value !== "all").length;
  const comparison = (current, previous) => previous > 0 ? `${current >= previous ? "+" : ""}${(((current - previous) / previous) * 100).toFixed(1)}% vs previous` : "No comparison data";

  const exportCsv = () => {
    const headers = ["Date", "Type", "Source / Category", "Customer", "Customer ID", "Loan Number", "Reference", "Description", "Payment Mode", "Income", "Expense", "Status"];
    const rows = visibleTransactions.map((item) => [item.dateKey, item.type, item.source || item.category, item.customerName, item.customerId, item.loanNumber, item.reference, item.description, item.paymentMode, item.kind === "income" ? item.amount : "", item.kind === "expense" ? item.amount : "", item.status]);
    const csv = [headers, ...rows].map((row) => row.map((value) => `"${String(value ?? "").replaceAll('"', '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `ledger-${period}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const applyCustomRange = () => {
    if (!draftStart || !draftEnd || draftStart > draftEnd) return;
    setCustomStart(draftStart); setCustomEnd(draftEnd); setPeriod("custom"); setShowCustomRange(false);
  };

  return <div className="min-h-full bg-[#F6F8F7] p-4 lg:p-6"><div className="mx-auto max-w-7xl space-y-4">
    <header className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between"><div><p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#0B6B43]">Operations & Accounts</p><h1 className="mt-1 text-2xl font-extrabold text-[#17221D]">Ledger</h1><p className="mt-1 text-xs text-slate-500">Track income and expenses across your Auto Finance business.</p></div><div className="flex flex-wrap items-center gap-2"><div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-white p-1">{PERIODS.map(([id, label]) => <button key={id} type="button" onClick={() => id === "custom" ? (setDraftStart(customStart), setDraftEnd(customEnd), setShowCustomRange(true)) : setPeriod(id)} className={`rounded-lg px-2.5 py-1.5 text-[10px] font-bold ${period === id ? "bg-[#0B6B43] text-white" : "text-slate-500 hover:bg-slate-50"}`}>{label}</button>)}</div><button type="button" onClick={() => { setDraftFilters(filters); setShowFilters(true); }} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-bold text-slate-600"><Filter size={13} /> Filter{activeFilterCount ? ` (${activeFilterCount})` : ""}</button><button type="button" onClick={exportCsv} className="inline-flex items-center gap-1.5 rounded-lg bg-[#0B6B43] px-3 py-2 text-[10px] font-extrabold text-white"><Download size={13} /> Export</button></div></header>
    <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Summary label="Total Income" value={money(summary.income)} note={comparison(summary.income, previousSummary.income)} tone="income" /><Summary label="Total Expense" value={money(summary.expense)} note={comparison(summary.expense, previousSummary.expense)} tone="expense" /><Summary label="Net Cash Flow" value={money(summary.income - summary.expense)} note="Income minus expense" tone="net" /><Summary label="Transactions" value={summary.transactions} note={`${visibleTransactions.length} matching records`} /></section>
    <section className="grid gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(280px,0.8fr)]"><Chart data={chartData} max={chartMax} /><Insights summary={chartSummary} previousSummary={previousSummary} highestIncome={highestIncome} highestExpense={highestExpense} range={range} /></section>
    <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"><div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between"><div><h2 className="text-[15px] font-extrabold text-[#17221D]">Transactions</h2><p className="mt-1 text-[10px] text-slate-400">{formatRange(range)}</p></div><div className="flex flex-col gap-2 sm:flex-row"><div className="relative"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer, loan, category..." className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-[#9CCEB1] sm:w-64" /></div><div className="flex rounded-lg border border-slate-200 p-0.5">{[["all", "All Transactions"], ["income", "Income"], ["expense", "Expense"]].map(([id, label]) => <button key={id} type="button" onClick={() => setActiveTab(id)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-bold ${activeTab === id ? "bg-[#EAF5EF] text-[#0B6B43]" : "text-slate-500"}`}>{label}</button>)}</div></div></div><TransactionRows rows={pageRows} onSelect={setSelected} />{visibleTransactions.length > 0 && totalPages > 1 && <Pagination total={visibleTransactions.length} page={page} pageSize={pageSize} totalPages={totalPages} onPageChange={setPage} />}</section>
  </div>{showCustomRange && <CustomRange start={draftStart} end={draftEnd} setStart={setDraftStart} setEnd={setDraftEnd} onApply={applyCustomRange} onClear={() => { setDraftStart(""); setDraftEnd(""); setCustomStart(""); setCustomEnd(""); setPeriod("this-month"); setShowCustomRange(false); }} onClose={() => setShowCustomRange(false)} />}{showFilters && <Filters draft={draftFilters} setDraft={setDraftFilters} categories={categories} onApply={() => { setFilters(draftFilters); setShowFilters(false); }} onClear={() => { setFilters(initialFilters); setDraftFilters(initialFilters); setShowFilters(false); }} onClose={() => setShowFilters(false)} />}{selected && <Details transaction={selected} onClose={() => setSelected(null)} />}</div>;
};

const aggregateChart = (items, period, range) => {
  const days = Math.max(1, Math.round((range.end - range.start) / 86400000) + 1);
  const grouping = period === "today" ? "hour" : period === "last-6-months" || period === "this-year" ? "month" : period === "custom" ? (days <= 31 ? "day" : days <= 180 ? "week" : "month") : (days > 180 ? "month" : days > 31 ? "week" : "day");
  const map = new Map();
  items.forEach((item) => {
    const date = new Date(item.date);
    if (Number.isNaN(date.getTime())) return;
    let key = item.dateKey;
    if (grouping === "hour" && String(item.date).includes("T")) key = `${item.dateKey} ${String(date.getHours()).padStart(2, "0")}:00`;
    if (grouping === "month") key = key.slice(0, 7);
    if (grouping === "week") { const week = new Date(date); week.setDate(date.getDate() - date.getDay()); key = week.toISOString().slice(0, 10); }
    const value = map.get(key) || { key, income: 0, expense: 0 };
    value[item.kind] += item.amount;
    map.set(key, value);
  });
  return [...map.values()].sort((a, b) => a.key.localeCompare(b.key));
};

const axisMoney = (value) => { const amount = Number(value || 0); if (amount >= 10000000) return `₹${(amount / 10000000).toFixed(1)}Cr`; if (amount >= 100000) return `₹${(amount / 100000).toFixed(1)}L`; if (amount >= 1000) return `₹${(amount / 1000).toFixed(1)}K`; return `₹${Math.round(amount)}`; };
const Summary = ({ label, value, note, tone }) => <div className="rounded-xl border border-slate-200 bg-white p-4"><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-2 text-xl font-extrabold ${tone === "income" || tone === "net" ? "text-[#0B6B43]" : tone === "expense" ? "text-orange-700" : "text-[#17221D]"}`}>{value}</p><p className="mt-1 text-[10px] text-slate-400">{note}</p></div>;
const Chart = ({ data, max }) => <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex flex-wrap items-center justify-between gap-2"><div><h2 className="text-[15px] font-extrabold text-[#17221D]">Income vs Expense Trend</h2><p className="mt-1 text-[10px] text-slate-400">Actual ledger activity by period</p></div><div className="flex gap-3 text-[10px] font-bold"><span className="text-[#0B6B43]">● Income</span><span className="text-orange-600">● Expense</span></div></div>{data.length === 0 ? <div className="flex h-64 items-center justify-center text-center text-xs text-slate-400"><div><p className="font-bold text-slate-500">No financial activity for this period</p><p className="mt-1 text-[10px]">Income and expense activity will appear here when transactions are recorded.</p></div></div> : <div className="mt-5 grid grid-cols-[42px_minmax(0,1fr)] gap-2"><div className="relative h-64">{[max, max * .75, max * .5, max * .25, 0].map((value, index) => <span key={index} className="absolute right-0 text-[8px] text-slate-400" style={{ top: `${index * 25}%`, transform: index === 4 ? "translateY(-100%)" : "translateY(-50%)" }}>{axisMoney(value)}</span>)}</div><div className="relative h-64 min-w-0 border-b border-l border-slate-200"><div className="absolute inset-0 flex flex-col justify-between">{[1, 2, 3, 4, 5].map((line) => <span key={line} className="border-t border-dashed border-slate-100" />)}</div><div className="relative z-10 flex h-full items-end gap-1 px-1 sm:gap-2 sm:px-2">{data.map((item) => <div key={item.key} className="group relative flex h-full min-w-[26px] flex-1 items-end justify-center gap-0.5" title={`${item.key}: Income ${money(item.income)}, Expense ${money(item.expense)}, Net ${money(item.income - item.expense)}`}><div className="w-2.5 rounded-t bg-[#4BA878] sm:w-3" style={{ height: `${item.income ? Math.max(3, item.income / max * 100) : 0}%` }} /><div className="w-2.5 rounded-t bg-orange-400 sm:w-3" style={{ height: `${item.expense ? Math.max(3, item.expense / max * 100) : 0}%` }} /><span className="absolute -bottom-5 max-w-14 truncate text-[8px] text-slate-400">{item.key.includes(" ") ? item.key.slice(-5) : item.key.slice(5)}</span></div>)}</div></div></div>}</section>;
const Insights = ({ summary, previousSummary, highestIncome, highestExpense, range }) => <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><h2 className="text-[15px] font-extrabold text-[#17221D]">Period Insights</h2><div className="mt-4 space-y-3 text-xs"><Line label="Selected period" value={formatRange(range)} /><Line label="Previous period" value="Equivalent previous period" /><Line label="Income" value={money(summary.income)} /><Line label="Expense" value={money(summary.expense)} /><Line label="Net cash flow" value={money(summary.income - summary.expense)} strong /></div><div className="mt-5 border-t border-slate-100 pt-4"><p className="text-[10px] font-bold uppercase tracking-wide text-[#0B6B43]">Cash Flow Insights</p><ul className="mt-2 space-y-2 text-[11px] text-slate-500">{highestIncome?.income > 0 && <li>Highest income: {money(highestIncome.income)} on {highestIncome.key}</li>}{highestExpense?.expense > 0 && <li>Highest expense: {money(highestExpense.expense)} on {highestExpense.key}</li>}{previousSummary.transactions > 0 && <li>Income {summary.income >= previousSummary.income ? "increased" : "decreased"} versus the previous period.</li>}{summary.transactions === 0 && <li>No financial activity for this period.</li>}</ul></div></section>;
const Line = ({ label, value, strong }) => <div className="flex items-center justify-between gap-3"><span className="text-slate-400">{label}</span><span className={strong ? "font-extrabold text-[#0B6B43]" : "font-bold text-[#17221D]"}>{value}</span></div>;
const formatRange = ({ start, end }) => `${start.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })} - ${end.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`;

const TransactionRows = ({ rows, onSelect }) => rows.length === 0 ? <div className="p-10 text-center"><p className="text-sm font-bold text-[#17221D]">No transactions found</p><p className="mt-1 text-xs text-slate-400">Income and expense transactions for the selected period will appear here.</p></div> : <><div className="hidden overflow-x-auto lg:block"><table className="w-full text-left"><thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-400"><tr>{["Date", "Type", "Source / Category", "Reference / Loan No.", "Description", "Payment Mode", "Income (+)", "Expense (-)", "Details"].map((header) => <th key={header} className="whitespace-nowrap px-4 py-2.5">{header}</th>)}</tr></thead><tbody>{rows.map((item) => <tr key={`${item.kind}-${item.id}`} className="border-b border-slate-100 hover:bg-[#F7FBF8]"><td className="whitespace-nowrap px-4 py-3 text-[10px] text-slate-500">{formatLedgerDate(item.date)}</td><td className="px-4 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-bold ${item.kind === "income" ? "bg-emerald-50 text-emerald-700" : "bg-orange-50 text-orange-700"}`}>{item.type}</span></td><td className="px-4 py-3 text-xs font-bold text-[#17221D]">{item.source || item.category || "—"}</td><td className="px-4 py-3 text-[10px] text-slate-500">{item.reference || item.loanNumber || "—"}</td><td className="max-w-48 px-4 py-3 text-[10px] text-slate-500">{item.description || "—"}</td><td className="px-4 py-3 text-[10px] text-slate-500">{item.paymentMode || "—"}</td><td className="px-4 py-3 text-xs font-bold text-[#0B6B43]">{item.kind === "income" ? money(item.amount) : "—"}</td><td className="px-4 py-3 text-xs font-bold text-orange-700">{item.kind === "expense" ? money(item.amount) : "—"}</td><td className="px-4 py-3"><button type="button" onClick={() => onSelect(item)} className="whitespace-nowrap text-[10px] font-extrabold text-[#0B6B43]">View Details</button></td></tr>)}</tbody></table></div><div className="divide-y divide-slate-100 lg:hidden">{rows.map((item) => <div key={`${item.kind}-${item.id}`} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold text-[#17221D]">{item.source || item.category || "—"}</p><p className="mt-1 text-[10px] text-slate-500">{formatLedgerDate(item.date)} · {item.type}</p>{item.customerName && <p className="mt-1 text-[10px] text-slate-500">{item.customerName}{item.loanNumber ? ` · ${item.loanNumber}` : ""}</p>}</div><p className={`text-sm font-extrabold ${item.kind === "income" ? "text-[#0B6B43]" : "text-orange-700"}`}>{item.kind === "income" ? "+" : "-"}{money(item.amount)}</p></div><button type="button" onClick={() => onSelect(item)} className="mt-3 text-[10px] font-extrabold text-[#0B6B43]">View Details</button></div>)}</div></>;
const Pagination = ({ total, page, pageSize, totalPages, onPageChange }) => { if (totalPages <= 1 || total === 0) return null; const first = (page - 1) * pageSize + 1; const last = Math.min(page * pageSize, total); return <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-[10px] text-slate-500">Showing {first}–{last} of {total} transactions</p><div className="flex items-center justify-end gap-1"><button type="button" disabled={page === 1} onClick={() => onPageChange(page - 1)} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 disabled:opacity-40">Previous</button>{Array.from({ length: totalPages }, (_, index) => index + 1).map((number) => <button key={number} type="button" onClick={() => onPageChange(number)} className={`h-7 min-w-7 rounded-md border px-2 text-[10px] font-bold ${page === number ? "border-[#0B6B43] bg-[#0B6B43] text-white" : "border-slate-200 bg-white text-slate-600"}`}>{number}</button>)}<button type="button" disabled={page === totalPages} onClick={() => onPageChange(page + 1)} className="rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 disabled:opacity-40">Next</button></div></div>; };

const CustomRange = ({ start, end, setStart, setEnd, onApply, onClear, onClose }) => <Modal title="Custom Range" onClose={onClose}><div className="grid gap-3 sm:grid-cols-2"><label className="text-xs font-bold text-slate-600">Start Date<input type="date" value={start} onChange={(event) => setStart(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs" /></label><label className="text-xs font-bold text-slate-600">End Date<input type="date" min={start || undefined} value={end} onChange={(event) => setEnd(event.target.value)} className="mt-1 h-10 w-full rounded-lg border border-slate-200 px-3 text-xs" /></label></div><Actions clear={onClear} apply={onApply} disabled={!start || !end || start > end} /></Modal>;
const Filters = ({ draft, setDraft, categories, onApply, onClear, onClose }) => <Modal title="Ledger Filters" onClose={onClose}><div className="grid gap-3 sm:grid-cols-2">{[["type", "Transaction Type", [["all", "All"], ["income", "Income"], ["expense", "Expense"]]], ["paymentMode", "Payment Mode", [["all", "All"], ...categories.modes.map((item) => [item, item])]], ["incomeCategory", "Income Category", [["all", "All"], ...categories.income.map((item) => [item, item])]], ["expenseCategory", "Expense Category", [["all", "All"], ...categories.expense.map((item) => [item, item])]], ["status", "Status", [["all", "All"], ...categories.statuses.map((item) => [item, item])]]].map(([key, label, options]) => <label key={key} className="text-xs font-bold text-slate-600">{label}<select value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs">{options.map(([value, text]) => <option key={value} value={value}>{text}</option>)}</select></label>)}{[["minAmount", "Min Amount"], ["maxAmount", "Max Amount"], ["startDate", "Date From"], ["endDate", "Date To"]].map(([key, label]) => <label key={key} className="text-xs font-bold text-slate-600">{label}<input type={key.includes("Date") ? "date" : key.includes("Amount") ? "number" : "text"} value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2 text-xs" /></label>)}</div><Actions clear={onClear} apply={onApply} /></Modal>;
const Modal = ({ title, onClose, children }) => <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/40 p-3"><section className="w-full max-w-xl rounded-2xl bg-white shadow-2xl"><header className="flex items-center justify-between border-b border-slate-100 px-5 py-4"><h2 className="text-lg font-extrabold text-[#17221D]">{title}</h2><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400"><X size={17} /></button></header><div className="p-5">{children}</div></section></div>;
const Actions = ({ clear, apply, disabled }) => <div className="mt-5 flex justify-end gap-2"><button type="button" onClick={clear} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Clear</button><button type="button" onClick={apply} disabled={disabled} className="rounded-lg bg-[#0B6B43] px-4 py-2 text-xs font-extrabold text-white disabled:opacity-50">Apply</button></div>;
const Details = ({ transaction, onClose }) => { const values = transaction.kind === "income" ? [["Transaction ID / Receipt", transaction.reference], ["Payment Date", formatLedgerDate(transaction.date)], ["Payment Type", transaction.paymentType], ["Total Payment", money(transaction.total)], ["Payment Mode", transaction.paymentMode], ["Status", transaction.status], ["Customer Name", transaction.customerName], ["Customer ID", transaction.customerId], ["Mobile", transaction.mobile], ["Loan Number", transaction.loanNumber], ["Loan Amount", transaction.loanAmount ? money(transaction.loanAmount) : ""], ["Installment Number", transaction.installment], ["Due Date", transaction.dueDate ? formatLedgerDate(transaction.dueDate) : ""], ["Principal", transaction.breakdown?.principal ? money(transaction.breakdown.principal) : ""], ["Interest", transaction.breakdown?.interest ? money(transaction.breakdown.interest) : ""], ["Penalty", transaction.breakdown?.penalty ? money(transaction.breakdown.penalty) : ""], ["Advance", transaction.breakdown?.advance ? money(transaction.breakdown.advance) : ""], ["Excess", transaction.breakdown?.excess ? money(transaction.breakdown.excess) : ""], ["Collected By", transaction.collectedBy], ["Remarks", transaction.remarks]] : [["Expense ID / Reference", transaction.reference], ["Expense Date", formatLedgerDate(transaction.date)], ["Expense Category", transaction.category], ["Amount", money(transaction.amount)], ["Payment Mode", transaction.paymentMode], ["Status", transaction.status], ["Description", transaction.description], ["Vendor / Payee", transaction.vendor], ["Recorded By", transaction.collectedBy], ["Remarks", transaction.remarks]]; return <div className="fixed inset-0 z-[110] flex justify-end bg-slate-950/40"><section className="flex h-full w-full max-w-xl flex-col bg-white shadow-2xl"><header className="flex items-start justify-between border-b border-slate-100 px-5 py-4"><div><p className={`text-[9px] font-bold uppercase tracking-wide ${transaction.kind === "income" ? "text-[#0B6B43]" : "text-orange-700"}`}>{transaction.type}</p><h2 className="mt-1 text-xl font-extrabold text-[#17221D]">{money(transaction.amount)}</h2><p className="mt-1 text-[10px] text-slate-500">{transaction.status || "—"}</p></div><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 p-2 text-slate-500"><X size={17} /></button></header><div className="min-h-0 flex-1 overflow-y-auto p-5"><h3 className="text-sm font-extrabold text-[#17221D]">{transaction.kind === "income" ? "Payment Information" : "Expense Information"}</h3><div className="mt-3 grid gap-x-5 gap-y-3 sm:grid-cols-2">{values.filter(([, value]) => value !== "" && value !== null && value !== undefined).map(([label, value]) => <div key={label}><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-xs font-bold text-[#17221D]">{value}</p></div>)}</div></div></section></div>; };

export default Ledger;
