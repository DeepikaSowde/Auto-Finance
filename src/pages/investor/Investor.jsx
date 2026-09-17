import { useEffect, useMemo, useState } from "react";
import { Plus, Search, UserRound, X } from "lucide-react";
import {
  addInvestorInvestment,
  createInvestor,
  getFundingSummary,
  getInvestorSummaries,
  getInvestorTransactions,
} from "../../services/investorStorage";
import InvestorDetailsDrawer from "./InvestorDetailsDrawer";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

const dateLabel = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const emptyForm = () => ({
  name: "",
  mobileNumber: "",
  email: "",
  address: "",
  city: "",
  state: "",
  pincode: "",
  investorType: "Individual",
  pan: "",
  bankDetails: { accountName: "", accountNumber: "", ifsc: "" },
  investment: {
    initialAmount: "",
    investmentDate: new Date().toISOString().slice(0, 10),
    referenceNumber: "",
    investmentMode: "Bank Transfer",
  },
  remarks: "",
});

const Investor = () => {
  const [investors, setInvestors] = useState([]);
  const [summary, setSummary] = useState({
    totalInvestors: 0,
    totalInvestment: 0,
    distributedToLoans: 0,
    availableInvestmentBalance: 0,
  });
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);
  const [error, setError] = useState("");
  const [investmentForm, setInvestmentForm] = useState({ amount: "", date: new Date().toISOString().slice(0, 10), reference: "" });

  const reload = async () => {
    const [loadedInvestors, loadedSummary] = await Promise.all([
      getInvestorSummaries(),
      getFundingSummary(),
    ]);

    setInvestors(loadedInvestors);
    setSummary(loadedSummary);
  };

  useEffect(() => {
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

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return investors.filter((investor) =>
      !query || `${investor.name} ${investor.id} ${investor.mobileNumber}`.toLowerCase().includes(query)
    );
  }, [investors, search]);

  const updateForm = (path, value) => {
    setForm((current) => {
      if (path.startsWith("investment.")) {
        return { ...current, investment: { ...current.investment, [path.slice(11)]: value } };
      }
      if (path.startsWith("bankDetails.")) {
        return { ...current, bankDetails: { ...current.bankDetails, [path.slice(12)]: value } };
      }
      return { ...current, [path]: value };
    });
  };

  const submitInvestor = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await createInvestor(form);
      setForm(emptyForm());
      setShowForm(false);
      await reload();
    } catch (submitError) {
      setError(submitError.message || "Unable to add investor.");
    }
  };

  const submitAdditionalInvestment = async (event) => {
    event.preventDefault();
    setError("");
    try {
      await addInvestorInvestment({ investorId: selected.id, ...investmentForm });
      setInvestmentForm({ amount: "", date: new Date().toISOString().slice(0, 10), reference: "" });
      await reload();
      setSelected((await getInvestorSummaries()).find((item) => item.id === selected.id));
    } catch (submitError) {
      setError(submitError.message || "Unable to record investment.");
    }
  };

  return (
    <div className="min-h-full bg-[#F6F8F7] p-4 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-[#0B6B43]">Operations & Accounts</p>
            <h1 className="mt-1 text-2xl font-extrabold text-[#17221D]">Investor Management</h1>
            <p className="mt-1 text-xs text-slate-500">Manage investor capital used for loan funding.</p>
          </div>
          <button type="button" onClick={() => { setError(""); setShowForm(true); }} className="inline-flex items-center justify-center gap-2 rounded-lg bg-[#0B6B43] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#095B3B]"><Plus size={15} /> Add Investor</button>
        </header>

        {investors.length === 0 ? (
          <section className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF5EF] text-[#0B6B43]"><UserRound size={22} /></div>
            <h2 className="mt-4 text-lg font-extrabold text-[#17221D]">No investors added yet.</h2>
            <p className="mt-1 text-xs text-slate-500">Add an investor to begin funding new loan disbursements.</p>
            <button type="button" onClick={() => setShowForm(true)} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#0B6B43] px-4 py-2.5 text-xs font-extrabold text-white"><Plus size={15} /> Add Investor</button>
          </section>
        ) : (
          <>
            <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Metric label="Total Investors" value={summary.totalInvestors} />
              <Metric label="Total Investment" value={money(summary.totalInvestment)} />
              <Metric label="Distributed to Loans" value={money(summary.distributedToLoans)} />
              <Metric label="Available Balance" value={money(summary.availableInvestmentBalance)} prominent />
            </section>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between"><h2 className="text-[15px] font-extrabold text-[#17221D]">Investors</h2><div className="relative w-full sm:max-w-xs"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search investors..." className="h-9 w-full rounded-lg border border-slate-200 pl-9 pr-3 text-xs outline-none focus:border-[#9CCEB1]" /></div></div>
              <div className="max-h-[520px] overflow-y-auto"><div className="hidden grid-cols-[minmax(180px,1fr)_160px_120px_80px_80px] gap-3 border-b border-slate-100 bg-slate-50 px-4 py-2 text-[9px] font-bold uppercase tracking-wide text-slate-400 sm:grid"><span>Investor</span><span>Investment Amount</span><span>Ownership %</span><span>Status</span><span>Action</span></div>{filtered.map((investor) => <InvestorRow key={investor.id} investor={investor} totalInvestment={summary.totalInvestment} onView={(ownershipPercentage) => { setError(""); setSelected({ ...investor, ownershipPercentage }); }} />)}</div>
            </section>
          </>
        )}
      </div>

            {showForm && <InvestorModal form={form} error={error} updateForm={updateForm} onSubmit={submitInvestor} onClose={() => setShowForm(false)} />}
          {selected && <InvestorDetailsDrawer investor={selected} onClose={() => setSelected(null)} />}
    </div>
  );
};

const Metric = ({ label, value, prominent }) => <div className={`rounded-xl border p-4 ${prominent ? "border-[#B9DCC6] bg-[#EAF5EF]" : "border-slate-200 bg-white"}`}><p className="text-[9px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className={`mt-2 text-lg font-extrabold ${prominent ? "text-[#0B6B43]" : "text-[#17221D]"}`}>{value}</p></div>;
const InvestorRow = ({ investor, totalInvestment, onView }) => {
  const amount = Number(investor.investment?.totalInvested || 0);
  const ownership = totalInvestment > 0 ? (amount / totalInvestment) * 100 : 0;

  return <div className="border-b border-[#EEF2EF] px-4 py-3 hover:bg-[#F7FBF8]"><div className="grid items-center gap-3 sm:grid-cols-[minmax(180px,1fr)_160px_120px_80px_80px]"><div><p className="text-xs font-bold text-[#17221D]">{investor.name}</p><p className="text-[10px] text-slate-500">{investor.id} · {dateLabel(investor.investment?.investmentDate)}</p></div><span className="text-xs font-bold text-[#17221D]">{money(amount)}</span><span className="text-xs font-bold text-[#0B6B43]">{ownership.toLocaleString("en-IN", { maximumFractionDigits: 2 })}%</span><span className="text-[10px] font-bold text-emerald-700">{investor.status}</span><button type="button" onClick={() => onView(ownership)} className="w-fit rounded-md border border-slate-200 px-2.5 py-1.5 text-[10px] font-bold text-slate-600 hover:bg-white">View</button></div></div>;
};

const Field = ({ label, required, value, onChange, type = "text", options }) => <label className="block"><span className="text-[10px] font-bold text-slate-600">{label}{required ? " *" : ""}</span>{options ? <select required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-xs outline-none focus:border-[#9CCEB1]">{options.map((option) => <option key={option}>{option}</option>)}</select> : <input required={required} type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 h-9 w-full rounded-lg border border-slate-200 px-2.5 text-xs outline-none focus:border-[#9CCEB1]" />}</label>;

const InvestorModal = ({ form, error, updateForm, onSubmit, onClose }) => <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/40 p-3"><form onSubmit={onSubmit} className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"><div className="sticky top-0 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4"><div><h2 className="text-lg font-extrabold text-[#17221D]">Add Investor</h2><p className="text-[11px] text-slate-500">Create a capital source for loan disbursement.</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"><X size={18} /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><Field label="Investor Name" required value={form.name} onChange={(value) => updateForm("name", value)} /><Field label="Mobile Number" required value={form.mobileNumber} onChange={(value) => updateForm("mobileNumber", value)} /><Field label="Email" value={form.email} onChange={(value) => updateForm("email", value)} /><Field label="Investor Type" value={form.investorType} onChange={(value) => updateForm("investorType", value)} options={["Individual", "Company", "Institution", "Other"]} /><Field label="Address" value={form.address} onChange={(value) => updateForm("address", value)} /><Field label="City" value={form.city} onChange={(value) => updateForm("city", value)} /><Field label="State" value={form.state} onChange={(value) => updateForm("state", value)} /><Field label="Pincode" value={form.pincode} onChange={(value) => updateForm("pincode", value)} /><Field label="PAN" value={form.pan} onChange={(value) => updateForm("pan", value)} /><Field label="Bank Account Name" value={form.bankDetails.accountName} onChange={(value) => updateForm("bankDetails.accountName", value)} /><Field label="Bank Account Number" value={form.bankDetails.accountNumber} onChange={(value) => updateForm("bankDetails.accountNumber", value)} /><Field label="IFSC Code" value={form.bankDetails.ifsc} onChange={(value) => updateForm("bankDetails.ifsc", value)} /><div className="sm:col-span-2"><h3 className="mb-2 text-xs font-extrabold uppercase tracking-wide text-[#0B6B43]">Investment Information</h3><div className="grid gap-3 sm:grid-cols-2"><Field label="Initial Investment Amount" required type="number" value={form.investment.initialAmount} onChange={(value) => updateForm("investment.initialAmount", value)} /><Field label="Investment Date" required type="date" value={form.investment.investmentDate} onChange={(value) => updateForm("investment.investmentDate", value)} /><Field label="Reference / Transaction ID" value={form.investment.referenceNumber} onChange={(value) => updateForm("investment.referenceNumber", value)} /><Field label="Investment Mode" value={form.investment.investmentMode} onChange={(value) => updateForm("investment.investmentMode", value)} options={["Bank Transfer", "Cash", "Cheque", "Other"]} /></div></div><label className="sm:col-span-2"><span className="text-[10px] font-bold text-slate-600">Remarks</span><textarea value={form.remarks} onChange={(event) => updateForm("remarks", event.target.value)} className="mt-1 min-h-20 w-full rounded-lg border border-slate-200 p-2.5 text-xs outline-none focus:border-[#9CCEB1]" /></label>{error && <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">{error}</p>}</div><div className="flex justify-end gap-2 border-t border-slate-100 px-5 py-3"><button type="button" onClick={onClose} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600">Cancel</button><button type="submit" className="rounded-lg bg-[#0B6B43] px-4 py-2 text-xs font-extrabold text-white">Create Investor</button></div></form></div>;

const InvestorDetails = ({ investor, error, investmentForm, setInvestmentForm, onAddInvestment, onClose }) => {
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
  const fundedLoans = [];
  return <div className="fixed inset-0 z-[110] flex justify-end bg-slate-950/40"><section className="h-full w-full max-w-2xl overflow-y-auto bg-white shadow-2xl"><div className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 py-4"><div><p className="text-[9px] font-bold uppercase tracking-wide text-[#0B6B43]">Investor Details</p><h2 className="mt-1 text-lg font-extrabold text-[#17221D]">{investor.name}</h2><p className="text-[10px] text-slate-500">{investor.id} · {investor.status}</p></div><button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-50"><X size={18} /></button></div><div className="space-y-5 p-5"><div className="grid grid-cols-3 gap-2"><Metric label="Total Invested" value={money(investor.investment.totalInvested)} /><Metric label="Allocated" value={money(investor.investment.allocatedAmount)} /><Metric label="Available" value={money(investor.investment.availableBalance)} prominent /></div><form onSubmit={onAddInvestment} className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="mb-2 text-xs font-extrabold text-[#17221D]">Add Investment</p><div className="grid gap-2 sm:grid-cols-3"><input required type="number" min="0.01" placeholder="Amount" value={investmentForm.amount} onChange={(event) => setInvestmentForm({ ...investmentForm, amount: event.target.value })} className="h-9 rounded-lg border border-slate-200 px-2 text-xs" /><input required type="date" value={investmentForm.date} onChange={(event) => setInvestmentForm({ ...investmentForm, date: event.target.value })} className="h-9 rounded-lg border border-slate-200 px-2 text-xs" /><button type="submit" className="rounded-lg bg-[#0B6B43] px-3 text-xs font-extrabold text-white">Record Investment</button></div>{error && <p className="mt-2 text-xs font-semibold text-red-700">{error}</p>}</form><DetailsTable title="Funded Loans" headers={["Loan", "Customer", "Allocated", "Date", "Status"]}>{fundedLoans.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="px-3 py-2 text-xs font-bold">{item.loanNumber}</td><td className="px-3 py-2 text-xs">{loanRecord(item.loanNumber)?.customer?.personal?.name || "—"}</td><td className="px-3 py-2 text-xs font-bold">{money(item.amount)}</td><td className="px-3 py-2 text-xs">{dateLabel(item.date)}</td><td className="px-3 py-2 text-xs">{loanRecord(item.loanNumber)?.loan?.status || "—"}</td></tr>)}</DetailsTable><DetailsTable title="Funding Transactions" headers={["Date", "Type", "Amount", "Reference"]}>{transactions.map((item) => <tr key={item.id} className="border-b border-slate-100"><td className="px-3 py-2 text-xs">{dateLabel(item.date)}</td><td className="px-3 py-2 text-xs font-bold">{item.type}</td><td className="px-3 py-2 text-xs font-bold">{money(item.amount)}</td><td className="px-3 py-2 text-xs">{item.reference || item.loanNumber || "—"}</td></tr>)}</DetailsTable></div></section></div>;
};

const DetailsTable = ({ title, headers, children }) => <section><h3 className="mb-2 text-sm font-extrabold text-[#17221D]">{title}</h3><div className="overflow-hidden rounded-xl border border-slate-200"><table className="w-full text-left"><thead className="bg-slate-50 text-[9px] font-bold uppercase tracking-wide text-slate-400"><tr>{headers.map((header) => <th key={header} className="px-3 py-2">{header}</th>)}</tr></thead><tbody>{children}</tbody></table></div></section>;

export default Investor;
