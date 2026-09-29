import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ArrowLeft,
  FileCheck2,
} from "lucide-react";
import {
  checkReLoanEligibility,
  findCustomerAndLoan,
  getReLoanRules,
} from "../../services/reloanStorage";
import { can } from "../../config/permissions";

const money = (value) =>
  `₹${Number(value || 0).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
  })}`;

const ReLoanEligibility = () => {
  const navigate = useNavigate();
  const { loanId } = useParams();
  const [match, setMatch] = useState(null);

  useEffect(() => {
    let cancelled = false;

    findCustomerAndLoan(loanId).then((found) => {
      if (!cancelled) {
        setMatch(found);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [loanId]);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!match) {
      setResult(null);
      return undefined;
    }

    let cancelled = false;

    getReLoanRules().then((rules) => {
      if (!cancelled) {
        setResult(
          checkReLoanEligibility({
            customer: match.customer,
            loan: match.loan,
            vehicle: match.vehicle,
            rules,
          })
        );
      }
    });

    return () => {
      cancelled = true;
    };
  }, [match]);

  if (!match || !result) {
    return (
      <div className="m-5 rounded-xl border border-red-100 bg-red-50 p-6">
        <p className="text-sm font-bold text-red-700">Loan not found</p>
        <button
          type="button"
          onClick={() => navigate("/loan")}
          className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-700"
        >
          <ArrowLeft size={14} /> Back to Loans
        </button>
      </div>
    );
  }

  const statusLabel =
    result.status === "ELIGIBLE"
      ? "RE-LOAN ELIGIBLE"
      : result.status === "PENDING_VERIFICATION"
      ? "PENDING VERIFICATION"
      : "RE-LOAN NOT ELIGIBLE";
  const statusClasses =
    result.status === "ELIGIBLE"
      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
      : result.status === "PENDING_VERIFICATION"
      ? "border-amber-200 bg-amber-50 text-amber-700"
      : "border-red-200 bg-red-50 text-red-700";
  const summary = result.financialSummary;

  const startReLoan = async () => {
    const fresh = await findCustomerAndLoan(loanId);
    const freshResult = fresh
      ? checkReLoanEligibility({
          customer: fresh.customer,
          loan: fresh.loan,
          vehicle: fresh.vehicle,
          rules: await getReLoanRules(),
        })
      : null;
    if (!freshResult?.eligible) {
      return;
    }
    navigate(
      `/customers/onboarding?source=reloan&customerId=${encodeURIComponent(
        fresh.customer?.customer?.id || ""
      )}&previousLoanId=${encodeURIComponent(loanId)}`
    );
  };

  return (
    <div className="min-h-full bg-[#F6F8F7] p-4 lg:p-6">
      <div className="mx-auto max-w-6xl space-y-4">
        <button
          type="button"
          onClick={() => navigate("/loan")}
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-[#0B5D3B]"
        >
          <ArrowLeft size={14} /> Back to Loan
        </button>

        <header>
          <p className="text-[9px] font-bold uppercase tracking-wide text-[#0B6B43]">Eligibility Review</p>
          <h1 className="mt-1 text-2xl font-extrabold text-[#17221D]">Re-loan Eligibility</h1>
          <p className="mt-1 text-xs text-slate-500">Review the customer's eligibility before creating a new loan.</p>
        </header>

        <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 sm:grid-cols-3">
          <Summary label="Customer" value={match.customer?.customer?.personal?.name || "—"} />
          <Summary label="Customer ID" value={match.customer?.customer?.customerNumber || match.customer?.customer?.id || "—"} />
          <Summary label="Previous Loan" value={match.loan?.loanNumber || "—"} />
          <Summary label="Loan Status" value={match.loan?.status || "—"} />
          <Summary label="Vehicle" value={match.vehicle?.registrationNumber || match.vehicle?.vehicleId || "—"} />
          <Summary label="Vehicle Status" value={match.vehicle?.status || "Active"} />
        </section>

        <section className={`rounded-xl border p-5 ${statusClasses}`}>
          <div className="flex items-start gap-3">
            {result.status === "ELIGIBLE" ? <CheckCircle2 size={24} /> : result.status === "PENDING_VERIFICATION" ? <AlertTriangle size={24} /> : <XCircle size={24} />}
            <div>
              <h2 className="text-lg font-extrabold">{statusLabel}</h2>
              <p className="mt-1 text-xs">{result.status === "ELIGIBLE" ? "Customer meets all current re-loan eligibility requirements." : "Customer does not currently meet all re-loan requirements."}</p>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-4 py-3">
            <h2 className="text-sm font-extrabold text-[#17221D]">Eligibility Breakdown</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {result.checks.map((check) => (
              <div key={check.id} className="grid gap-2 px-4 py-3 sm:grid-cols-[1.3fr_.7fr_1fr_1fr_2fr] sm:items-center">
                <p className="text-xs font-bold text-[#17221D]">{check.label}</p>
                <Status status={check.status} />
                <p className="text-xs text-slate-600">{typeof check.currentValue === "number" && check.id === "overdueAmount" ? money(check.currentValue) : check.currentValue}</p>
                <p className="text-xs text-slate-400">{typeof check.requiredValue === "number" && check.id === "overdueAmount" ? money(check.requiredValue) : check.requiredValue}</p>
                <p className="text-[11px] text-slate-500">{check.message}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-4">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-extrabold text-[#17221D]"><FileCheck2 size={16} className="text-[#0B6B43]" /> Previous Loan Financial Summary</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Summary label="Original Loan" value={money(summary.originalLoanAmount)} />
            <Summary label="Amount Paid" value={money(summary.amountPaid)} />
            <Summary label="Principal Outstanding" value={money(summary.principalOutstanding)} />
            <Summary label="Interest Outstanding" value={money(summary.interestOutstanding)} />
            <Summary label="Current Overdue" value={money(summary.currentOverdue)} />
            <Summary label="Penalty" value={money(summary.penalty)} />
            <Summary label="Total Outstanding" value={money(summary.totalOutstanding)} />
            <Summary label="Installments Paid" value={`${summary.installmentsPaid}/${summary.totalInstallments}`} />
          </div>
        </section>

        <div className="flex flex-wrap justify-end gap-2">
          {result.eligible && can("reloan", "add") ? (
            <button type="button" onClick={startReLoan} className="rounded-lg bg-[#0B6B43] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#095B3B]">Start New Loan</button>
          ) : (
            <button type="button" onClick={() => navigate("/loan")} className="rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-xs font-extrabold text-slate-600">Back to Loan</button>
          )}
        </div>
      </div>
    </div>
  );
};

const Summary = ({ label, value }) => <div><p className="text-[9px] font-semibold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 text-xs font-bold text-[#17221D]">{value}</p></div>;
const Status = ({ status }) => <span className={`inline-flex w-fit rounded-full px-2 py-1 text-[9px] font-extrabold ${status === "pass" ? "bg-emerald-50 text-emerald-700" : status === "pending" ? "bg-amber-50 text-amber-700" : "bg-red-50 text-red-700"}`}>{status === "pass" ? "PASS" : status === "pending" ? "PENDING" : "FAIL"}</span>;

export default ReLoanEligibility;
