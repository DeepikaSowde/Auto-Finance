const LoanCustomerSection = ({
  loan,
}) => {
  const customer =
    loan?.customer || {};

  const personal =
    customer?.personal || {};

  return (
    <Section title="Customer">

      <div
        className="
          grid
          grid-cols-1
          gap-2.5
          md:grid-cols-2
        "
      >
        <Info
          label="Customer Name"
          value={
            loan?.customerName ||
            personal.name
          }
        />

        <Info
          label="Customer ID"
          value={
            loan?.customerNumber ||
            customer?.customerNumber
          }
        />

        <Info
          label="Mobile"
          value={
            loan?.mobileNumber ||
            personal.mobileNumber
          }
        />

        <Info
          label="KYC Status"
          value={
            customer?.kyc?.status ||
            "Not recorded"
          }
        />

        <Info
          label="Address"
          value={
            personal.address ||
            personal.area
          }
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

const Info = ({
  label,
  value,
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
      className="
        mt-0.5
        text-[10px]
        font-medium
        text-slate-700
      "
    >
      {value || "—"}
    </p>
  </div>
);

export default LoanCustomerSection;