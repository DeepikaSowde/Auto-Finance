import {
  formatDate,
  money,
  getNextDue,
  getTenure,
  getEmi,
  getLoanOutstanding,
} from "../../utils/loan/loanHelpers";

const LoanOverview = ({
  loan,
}) => {
  const nextDue =
    getNextDue(loan);

  const calculation =
    loan?.calculation || {};

  return (
    <Section title="Loan Overview">

      <div
        className="
          grid
          grid-cols-2
          gap-2.5
          md:grid-cols-3
          lg:grid-cols-4
        "
      >
        <Metric
          label="Sanctioned Amount"
          value={`₹${money(
            loan?.sanctionedAmount ??
              loan?.loanAmount
          )}`}
        />

        <Metric
          label="Disbursed Amount"
          value={`₹${money(
            loan?.disbursedAmount ??
              loan?.loanAmount
          )}`}
        />

        <Metric
          label="Down Payment"
          value={`₹${money(
            loan?.downPayment
          )}`}
        />

        <Metric
          label="Interest Rate"
          value={
            loan?.interest?.rate
              ? `${loan.interest.rate}%`
              : "—"
          }
        />

        <Metric
          label="Tenure"
          value={getTenure(loan)}
        />

        <Metric
          label="EMI Amount"
          value={`₹${money(
            getEmi(loan)
          )}`}
        />

        <Metric
          label="Total Payable"
          value={`₹${money(
            calculation.totalDue
          )}`}
          green
        />

        <Metric
          label="Outstanding"
          value={`₹${money(
            getLoanOutstanding(loan)
          )}`}
          green
        />

        <Metric
          label="Next Due Date"
          value={formatDate(
            nextDue?.dueDate
          )}
        />
      </div>
    </Section>
  );
};

const Section = ({
  title,
  children,
}) => (
  <section>
    <h3
      className="
        mb-2.5
        text-[12px]
        font-semibold
        text-[#17221D]
      "
    >
      {title}
    </h3>

    {children}
  </section>
);

const Metric = ({
  label,
  value,
  green = false,
}) => (
  <div
    className="
      rounded-xl
      border
      border-slate-200
      bg-white/80
      px-3
      py-2.5
      shadow-sm
    "
  >
    <p
      className="
        text-[9px]
        uppercase
        tracking-wide
        text-slate-400
      "
    >
      {label}
    </p>

    <p
      className={`
        mt-1
        text-[11px]
        font-semibold
        ${
          green
            ? "text-[#0B5D3B]"
            : "text-[#17221D]"
        }
      `}
    >
      {value}
    </p>
  </div>
);

export default LoanOverview;