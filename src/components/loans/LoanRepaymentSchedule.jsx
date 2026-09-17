// src/components/loans/LoanRepaymentSchedule.jsx

import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  AlertTriangle,
  IndianRupee,
} from "lucide-react";

import {
  formatDate,
  money,
} from "../../utils/loan/loanHelpers";

import {
  getScheduleAmount,
  getSchedulePaidAmount,
  getScheduleRemainingAmount,
  getScheduleDisplayStatus,
} from "../../services/repaymentStorage";

/* =========================================================
   MAIN
========================================================= */

const LoanRepaymentSchedule = ({
  loan,
}) => {
  const schedule =
    Array.isArray(
      loan?.repaymentSchedule
    )
      ? loan.repaymentSchedule
      : [];

  const summary =
    calculateSummary(schedule);

  return (
    <section className="w-full">

      {/* =====================================================
          HEADER
      ===================================================== */}

      <div
        className="
          overflow-hidden
          rounded-2xl
          border
          border-[#D8EBDD]
          bg-white
        "
      >

        {/* HEADER */}

        <div
          className="
            flex
            flex-col
            gap-3
            border-b
            border-[#D8EBDD]
            bg-gradient-to-r
            from-[#F0FAF4]
            via-[#F8FCF9]
            to-white
            px-4
            py-4
            sm:flex-row
            sm:items-center
            sm:justify-between
            sm:px-5
          "
        >

          <div
            className="
              flex
              min-w-0
              items-center
              gap-3
            "
          >

            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                border
                border-[#CFE5D8]
                bg-[#EAF5EF]
                text-[#0B5D3B]
              "
            >
              <CalendarDays
                size={18}
                strokeWidth={2.2}
              />
            </div>

            <div className="min-w-0">

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                "
              >
                <h3
                  className="
                    text-[13px]
                    font-extrabold
                    text-[#17221D]
                    sm:text-[14px]
                  "
                >
                  Repayment Schedule
                </h3>

                {schedule.length > 0 && (
                  <span
                    className="
                      rounded-full
                      bg-[#EAF5EF]
                      px-2
                      py-0.5
                      text-[8px]
                      font-extrabold
                      text-[#0B5D3B]
                    "
                  >
                    {schedule.length} installments
                  </span>
                )}
              </div>

              <p
                className="
                  mt-0.5
                  text-[9px]
                  font-medium
                  text-[#7C8D84]
                  sm:text-[10px]
                "
              >
                Complete installment and payment tracking
              </p>

            </div>
          </div>

          {/* HEADER STATUS */}

          <div
            className="
              flex
              flex-wrap
              items-center
              gap-2
            "
          >

            <MiniStatus
              icon={CheckCircle2}
              label="Paid"
              value={summary.paidCount}
              tone="green"
            />

            <MiniStatus
              icon={AlertTriangle}
              label="Overdue"
              value={summary.overdueCount}
              tone="red"
            />

            <MiniStatus
              icon={IndianRupee}
              label="Outstanding"
              value={`₹${money(
                summary.remaining
              )}`}
              tone="purple"
            />

          </div>
        </div>

        {/* ===================================================
            SUMMARY
        ================================================== */}

        <div
          className="
            grid
            grid-cols-1
            gap-2
            border-b
            border-slate-100
            bg-white
            p-3
            sm:grid-cols-3
            sm:p-4
          "
        >

          <SummaryCard
            label="Scheduled"
            value={`₹${money(
              summary.totalEmi
            )}`}
            tone="neutral"
          />

          <SummaryCard
            label="Paid"
            value={`₹${money(
              summary.paid
            )}`}
            tone="green"
          />

          <SummaryCard
            label="Remaining"
            value={`₹${money(
              summary.remaining
            )}`}
            tone="purple"
          />

        </div>

        {/* ===================================================
            TABLE
        ================================================== */}

        <div
          className="
            w-full
            overflow-x-auto
            overscroll-x-contain
          "
        >

          <table
            className="
              w-full
              min-w-[760px]
              border-collapse
            "
          >

            <thead
              className="
                sticky
                top-0
                z-10
                bg-[#F7FBF8]
              "
            >

              <tr
                className="
                  border-b
                  border-[#DDEBE1]
                "
              >

                <TableHeader width="52px">
                  #
                </TableHeader>

                <TableHeader width="170px">
                  Due Date
                </TableHeader>

                <TableHeader
                  width="125px"
                  align="right"
                >
                  EMI
                </TableHeader>

                <TableHeader
                  width="125px"
                  align="right"
                >
                  Principal
                </TableHeader>

                <TableHeader
                  width="115px"
                  align="right"
                >
                  Interest
                </TableHeader>

                <TableHeader
                  width="115px"
                  align="right"
                >
                  Paid
                </TableHeader>

                <TableHeader
                  width="125px"
                  align="right"
                >
                  Balance
                </TableHeader>

                <TableHeader width="125px">
                  Status
                </TableHeader>

              </tr>

            </thead>

            <tbody>

              {schedule.length === 0 ? (
                <EmptyState />
              ) : (
                schedule.map(
                  (
                    row,
                    index
                  ) => (
                    <RepaymentRow
                      key={
                        row?.id ||
                        `${loan?.loanNumber || "loan"}-${index}`
                      }
                      row={row}
                      index={index}
                    />
                  )
                )
              )}

            </tbody>

          </table>

        </div>

      </div>

    </section>
  );
};

/* =========================================================
   REPAYMENT ROW
========================================================= */

const RepaymentRow = ({
  row,
  index,
}) => {
  const displayStatus =
    getScheduleDisplayStatus(
      row
    );

  const principal =
    Number(
      row?.principal ||
        row?.principalAmount ||
        row?.principalComponent ||
        0
    );

  const interest =
    Number(
      row?.interest ||
        row?.interestAmount ||
        row?.interestComponent ||
        0
    );

  const emi =
    getScheduleAmount(
      row
    );

  const paid =
    getSchedulePaidAmount(
      row
    );

  const balance =
    getScheduleRemainingAmount(
      row
    );

  const normalizedStatus =
    String(
      displayStatus || ""
    )
      .trim()
      .toLowerCase();

  const isPaid =
    normalizedStatus ===
      "paid" ||
    normalizedStatus ===
      "completed";

  const isPartial =
    normalizedStatus ===
    "partially paid";

  const isOverdue =
    normalizedStatus ===
    "overdue";

  const statusConfig =
    isPaid
      ? {
          label: "Paid",
          bg: "bg-[#EAF8F0]",
          border:
            "border-[#CBE8D7]",
          text:
            "text-[#0B6B43]",
          icon:
            CheckCircle2,
        }
      : isOverdue
      ? {
          label: "Overdue",
          bg: "bg-[#FFF0F0]",
          border:
            "border-[#FFD2D2]",
          text:
            "text-[#D92D3A]",
          icon:
            AlertTriangle,
        }
      : isPartial
      ? {
          label: "Partially Paid",
          bg: "bg-[#FFF7E8]",
          border:
            "border-[#FFE1A8]",
          text:
            "text-[#C17A08]",
          icon:
            Clock3,
        }
      : {
          label: "Pending",
          bg: "bg-[#EEF5FF]",
          border:
            "border-[#D1E2FF]",
          text:
            "text-[#3974C9]",
          icon:
            Clock3,
        };

  const StatusIcon =
    statusConfig.icon;

  return (
    <tr
      className={`
        border-b
        border-slate-100
        transition-colors
        duration-150
        ${
          isPaid
            ? "bg-[#FBFEFC]"
            : isOverdue
            ? "bg-[#FFF9F9]"
            : "bg-white"
        }
        hover:bg-[#F7FBF8]
      `}
    >

      {/* ===================================================
          NUMBER
      ================================================== */}

      <td
        className="
          px-3
          py-3.5
          align-middle
        "
      >

        <span
          className="
            inline-flex
            h-7
            min-w-7
            items-center
            justify-center
            rounded-lg
            bg-[#F2F7F4]
            px-1.5
            text-[10px]
            font-extrabold
            text-[#587064]
          "
        >
          {String(
            row?.installmentNumber ||
              row?.installmentNo ||
              index + 1
          ).padStart(2, "0")}
        </span>

      </td>

      {/* ===================================================
          DATE
      ================================================== */}

      <td
        className="
          px-3
          py-3.5
          align-middle
        "
      >

        <div
          className="
            flex
            min-w-0
            items-center
            gap-2
          "
        >

          <div
            className={`
              flex
              h-7
              w-7
              shrink-0
              items-center
              justify-center
              rounded-lg
              ${
                isOverdue
                  ? "bg-red-50 text-red-600"
                  : "bg-[#EAF5EF] text-[#0B5D3B]"
              }
            `}
          >
            <CalendarDays
              size={13}
              strokeWidth={2}
            />
          </div>

          <div className="min-w-0">

            <p
              className={`
                whitespace-nowrap
                text-[11px]
                font-bold
                ${
                  isOverdue
                    ? "text-red-600"
                    : "text-[#17221D]"
                }
              `}
            >
              {formatDate(
                row?.dueDate
              )}
            </p>

            <p
              className="
                mt-0.5
                whitespace-nowrap
                text-[8px]
                font-medium
                text-slate-400
              "
            >
              Installment{" "}
              {row?.installmentNumber ||
                row?.installmentNo ||
                index + 1}
            </p>

          </div>

        </div>

      </td>

      {/* ===================================================
          EMI
      ================================================== */}

      <td
        className="
          px-3
          py-3.5
          text-right
          align-middle
        "
      >

        <span
          className="
            whitespace-nowrap
            text-[11px]
            font-extrabold
            text-[#17221D]
          "
        >
          ₹
          {money(emi)}
        </span>

      </td>

      {/* ===================================================
          PRINCIPAL
      ================================================== */}

      <td
        className="
          px-3
          py-3.5
          text-right
          align-middle
        "
      >

        <span
          className="
            whitespace-nowrap
            text-[10px]
            font-semibold
            text-slate-700
          "
        >
          ₹
          {money(principal)}
        </span>

      </td>

      {/* ===================================================
          INTEREST
      ================================================== */}

      <td
        className="
          px-3
          py-3.5
          text-right
          align-middle
        "
      >

        <span
          className="
            whitespace-nowrap
            text-[10px]
            font-semibold
            text-slate-700
          "
        >
          ₹
          {money(interest)}
        </span>

      </td>

      {/* ===================================================
          PAID
      ================================================== */}

      <td
        className="
          px-3
          py-3.5
          text-right
          align-middle
        "
      >

        <span
          className={`
            whitespace-nowrap
            text-[10px]
            font-bold
            ${
              paid > 0
                ? "text-[#0B6B43]"
                : "text-slate-400"
            }
          `}
        >
          ₹
          {money(paid)}
        </span>

      </td>

      {/* ===================================================
          BALANCE
      ================================================== */}

      <td
        className="
          px-3
          py-3.5
          text-right
          align-middle
        "
      >

        <span
          className={`
            whitespace-nowrap
            text-[10px]
            font-extrabold
            ${
              balance > 0
                ? "text-[#17221D]"
                : "text-[#0B6B43]"
            }
          `}
        >
          ₹
          {money(balance)}
        </span>

      </td>

      {/* ===================================================
          STATUS
      ================================================== */}

      <td
        className="
          px-3
          py-3.5
          align-middle
        "
      >

        <span
          className={`
            inline-flex
            items-center
            gap-1.5
            whitespace-nowrap
            rounded-full
            border
            px-2.5
            py-1.5
            text-[9px]
            font-extrabold
            ${statusConfig.bg}
            ${statusConfig.border}
            ${statusConfig.text}
          `}
        >

          <StatusIcon
            size={11}
            strokeWidth={2.3}
          />

          {statusConfig.label}

        </span>

      </td>

    </tr>
  );
};

/* =========================================================
   SUMMARY CARD
========================================================= */

const SummaryCard = ({
  label,
  value,
  tone = "neutral",
}) => {

  const config = {
    neutral: {
      wrapper:
        "border-slate-200 bg-[#F8FAF9]",
      label:
        "text-slate-400",
      value:
        "text-[#17221D]",
    },

    green: {
      wrapper:
        "border-[#CFE8D9] bg-[#F0FAF4]",
      label:
        "text-[#0B6B43]/60",
      value:
        "text-[#0B6B43]",
    },

    purple: {
      wrapper:
        "border-[#E0D8FF] bg-[#F7F4FF]",
      label:
        "text-[#7969C8]",
      value:
        "text-[#6345DF]",
    },
  };

  const current =
    config[tone] ||
    config.neutral;

  return (
    <div
      className={`
        rounded-xl
        border
        px-4
        py-3
        ${current.wrapper}
      `}
    >

      <p
        className={`
          text-[8px]
          font-bold
          uppercase
          tracking-[0.08em]
          ${current.label}
        `}
      >
        {label}
      </p>

      <p
        className={`
          mt-1
          text-[16px]
          font-extrabold
          tracking-tight
          ${current.value}
        `}
      >
        {value}
      </p>

    </div>
  );
};

/* =========================================================
   MINI STATUS
========================================================= */

const MiniStatus = ({
  icon: Icon,
  label,
  value,
  tone,
}) => {

  const styles = {
    green: {
      wrapper:
        "border-[#CFE8D9] bg-[#F0FAF4]",
      icon:
        "text-[#0B6B43]",
      text:
        "text-[#0B6B43]",
    },

    red: {
      wrapper:
        "border-red-100 bg-red-50",
      icon:
        "text-red-600",
      text:
        "text-red-700",
    },

    purple: {
      wrapper:
        "border-purple-100 bg-purple-50",
      icon:
        "text-purple-600",
      text:
        "text-purple-700",
    },
  };

  const current =
    styles[tone] ||
    styles.green;

  return (
    <div
      className={`
        inline-flex
        items-center
        gap-1.5
        rounded-full
        border
        px-2.5
        py-1.5
        ${current.wrapper}
      `}
    >

      <Icon
        size={11}
        className={current.icon}
      />

      <span
        className="
          text-[8px]
          font-bold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </span>

      <span
        className={`
          text-[9px]
          font-extrabold
          ${current.text}
        `}
      >
        {value}
      </span>

    </div>
  );
};

/* =========================================================
   EMPTY
========================================================= */

const EmptyState = () => {
  return (
    <tr>

      <td
        colSpan={8}
        className="
          px-6
          py-14
          text-center
        "
      >

        <div
          className="
            mx-auto
            flex
            h-12
            w-12
            items-center
            justify-center
            rounded-xl
            bg-[#EAF5EF]
            text-[#0B6B43]
          "
        >
          <CalendarDays
            size={20}
          />
        </div>

        <p
          className="
            mt-3
            text-[12px]
            font-extrabold
            text-[#17221D]
          "
        >
          No repayment schedule
        </p>

        <p
          className="
            mt-1
            text-[9px]
            font-medium
            text-slate-400
          "
        >
          No repayment entries are available for this loan.
        </p>

      </td>

    </tr>
  );
};

/* =========================================================
   TABLE HEADER
========================================================= */

const TableHeader = ({
  children,
  align = "left",
  width,
}) => {
  return (
    <th
      style={{
        width,
        minWidth: width,
      }}
      className={`
        whitespace-nowrap
        border-b
        border-[#DDEBE1]
        px-3
        py-3
        text-[9px]
        font-extrabold
        uppercase
        tracking-[0.05em]
        text-[#789087]
        ${
          align === "right"
            ? "text-right"
            : "text-left"
        }
      `}
    >
      {children}
    </th>
  );
};

/* =========================================================
   SUMMARY CALCULATION
   ONLY READS EXISTING DATA
========================================================= */

const calculateSummary = (
  schedule
) => {
  let totalEmi = 0;
  let paid = 0;
  let remaining = 0;
  let paidCount = 0;
  let overdueCount = 0;

  schedule.forEach(
    (row) => {

      const emi =
        getScheduleAmount(
          row
        );

      const paidAmount =
        getSchedulePaidAmount(
          row
        );

      const remainingAmount =
        getScheduleRemainingAmount(
          row
        );

      totalEmi +=
        Number(
          emi || 0
        );

      paid +=
        Number(
          paidAmount || 0
        );

      remaining +=
        Number(
          remainingAmount || 0
        );

      const status =
        String(
          getScheduleDisplayStatus(
            row
          ) || ""
        )
          .trim()
          .toLowerCase();

      if (
        status === "paid" ||
        status === "completed"
      ) {
        paidCount += 1;
      }

      if (
        status === "overdue"
      ) {
        overdueCount += 1;
      }
    }
  );

  return {
    totalEmi,
    paid,
    remaining,
    paidCount,
    overdueCount,
  };
};

export default LoanRepaymentSchedule;