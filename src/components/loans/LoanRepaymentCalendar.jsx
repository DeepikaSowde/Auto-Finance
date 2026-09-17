// src/components/loans/LoanRepaymentCalendar.jsx

import {
  useMemo,
  useState,
} from "react";

import {
  X,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Bell,
  IndianRupee,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import { DayPicker } from "react-day-picker";

import {
  getOutstandingAmount,
} from "../../services/customerStorage";

const LoanRepaymentCalendar = ({
  loan,
  onClose,
  embedded = false,
}) => {
  const navigate =
    useNavigate();

  const schedule =
    Array.isArray(
      loan?.repaymentSchedule
    )
      ? loan.repaymentSchedule
      : [];

  const customerName =
    loan?.customerName ||
    loan?.customer?.personal?.name ||
    "Customer";

  const customerId =
    loan?.customerId ||
    loan?.customer?.id ||
    loan?.customer?.customerId ||
    "";

  const loanId =
    loan?.id ||
    "";

  const loanNumber =
    loan?.loanNumber || "—";

  const [
    selectedDate,
    setSelectedDate,
  ] = useState(null);

  /* =====================================================
     OPEN REMINDER MODULE
  ====================================================== */

  const openReminder = () => {
    const params =
      new URLSearchParams();

    if (loanId) {
      params.set(
        "loanId",
        String(loanId)
      );
    }

    if (loanNumber) {
      params.set(
        "loanNumber",
        String(loanNumber)
      );
    }

    if (customerId) {
      params.set(
        "customerId",
        String(customerId)
      );
    }

    if (customerName) {
      params.set(
        "customerName",
        String(customerName)
      );
    }

    navigate(
      `/reminders?${params.toString()}`
    );
  };

  /* =====================================================
     REPAYMENT EVENTS
  ====================================================== */

  const repaymentEvents = useMemo(() => {
    return schedule
      .map((row, index) => {
        const date = parseLocalDate(
          row?.dueDate
        );

        if (!date) {
          return null;
        }

        return {
          id:
            row?.id ||
            `${loanNumber}-${index}`,

          date,

          status: normalizeStatus(
            row?.status,
            date,
          ),

          amount: Number(
            row?.remainingAmount ??
              row?.paymentAmount ??
              row?.emiAmount ??
              row?.amount ??
              0
          ),

          principal: Number(
            row?.remainingPrincipal ??
              row?.principal ??
              row?.principalAmount ??
              row?.principalComponent ??
              0
          ),

          interest: Number(
            row?.remainingInterest ??
              row?.interest ??
              row?.interestAmount ??
              row?.interestComponent ??
              0
          ),

          installment:
            row?.installmentNumber ??
            row?.installmentNo ??
            index + 1,
        };
      })
      .filter(Boolean);
  }, [
    schedule,
    loanNumber,
  ]);

  /* =====================================================
     EVENT MAP
  ====================================================== */

  const eventMap = useMemo(() => {
    const map = new Map();

    repaymentEvents.forEach((event) => {
      map.set(
        getDateKey(event.date),
        event
      );
    });

    return map;
  }, [repaymentEvents]);

  const selectedEvent =
    selectedDate
      ? eventMap.get(
          getDateKey(selectedDate)
        )
      : null;

  /* =====================================================
     REAL TOTALS
  ====================================================== */

  const totalOutstanding =
    getOutstandingAmount(loan);

  const paidCount =
    repaymentEvents.filter(
      (event) =>
        event.status === "paid"
    ).length;

  const pendingCount =
    repaymentEvents.filter(
      (event) =>
        event.status === "upcoming"
    ).length;

  const overdueCount =
    repaymentEvents.filter(
      (event) =>
        event.status === "overdue"
    ).length;

  const partiallyPaidCount =
    repaymentEvents.filter(
      (event) =>
        event.status ===
        "partially-paid"
    ).length;

  const totalInstallments =
    repaymentEvents.length;

  const totalEmi =
    repaymentEvents.reduce(
      (sum, event) =>
        sum + event.amount,
      0
    );

  const defaultMonth =
    repaymentEvents[0]?.date ||
    new Date();

  return (
<div
  className={`
    ${
      embedded
        ? "absolute inset-0 z-[80] flex items-center justify-center bg-slate-950/25 p-2 sm:p-3"
        : "fixed inset-0 z-[500] flex items-center justify-center bg-slate-950/45 p-3 backdrop-blur-[3px] sm:p-4"
    }
  `}
  onClick={onClose}
>
      {/* =================================================
          SINGLE CENTERED POPUP
      ================================================== */}

      <div
  className={
    embedded
      ? `
          flex
          h-full
          w-full
          max-h-full
          max-w-full
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-[0_20px_60px_rgba(15,23,42,0.18)]
        `
      : `
          flex
          w-full
          max-w-[1180px]
          max-h-[92vh]
          flex-col
          overflow-hidden
          rounded-[22px]
          border
          border-slate-200
          bg-white
          shadow-[0_30px_100px_rgba(15,23,42,0.25)]
        `
  }
  onClick={(event) =>
    event.stopPropagation()
  }
>
        {/* =================================================
            HEADER
        ================================================== */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-slate-100
            px-5
            py-3.5
            sm:px-6
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex
                h-11
                w-11
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-[#EEEAFE]
              "
            >
              <CalendarDays
                size={20}
                strokeWidth={2.1}
                className="text-[#6D4AFF]"
              />
            </div>

            <div className="min-w-0">
              <h2
                className="
                  truncate
                  text-[17px]
                  font-bold
                  text-[#243253]
                "
              >
                Repayment Calendar
              </h2>

              <p
                className="
                  mt-0.5
                  truncate
                  text-[10px]
                  font-medium
                  text-[#8792AA]
                "
              >
                {loanNumber}
                {" • "}
                {customerName}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              text-slate-400
              transition
              hover:bg-slate-50
              hover:text-slate-700
            "
            aria-label="Close repayment calendar"
          >
            <X size={18} />
          </button>
        </div>

        {/* =================================================
            LEGEND
        ================================================== */}

        <div
          className="
            flex
            shrink-0
            flex-wrap
            items-center
            gap-2
            border-b
            border-slate-100
            px-5
            py-2.5
            sm:px-6
          "
        >
          <Legend
            dot="bg-[#6D4AFF]"
            label="Upcoming"
          />

          <Legend
            dot="bg-[#3B82F6]"
            label="Due Today"
          />

          <Legend
            dot="bg-[#D92D3A]"
            label="Overdue"
          />

          <Legend
            dot="bg-[#36C69B]"
            label="Paid"
          />

          <Legend
            dot="bg-[#FF9C42]"
            label="Partially Paid"
          />
        </div>

        {/* =================================================
            MAIN CONTENT
        ================================================== */}

        <div
          className="
            grid
            min-h-0
            grid-cols-[255px_minmax(0,1fr)]
            gap-4
            px-5
            py-3
          "
        >
          {/* =================================================
              LEFT COLUMN
          ================================================== */}

          <div className="min-w-0 space-y-3">
            <LoanSummary
              loan={loan}
              customerName={customerName}
              loanNumber={loanNumber}
            />

            <QuickStats
              total={totalInstallments}
              paid={paidCount}
              pending={pendingCount}
              overdue={overdueCount}
              partiallyPaid={
                partiallyPaidCount
              }
              outstanding={
                totalOutstanding
              }
              totalEmi={totalEmi}
            />
          </div>

          {/* =================================================
              RIGHT COLUMN
          ================================================== */}

          <section
            className="
              min-w-0
              self-start
              h-fit
              rounded-xl
              border
              border-slate-200
              bg-white
              p-2.5
              sm:p-3
            "
          >
            <div className="calendar-shell">
              <DayPicker
                mode="single"
                selected={selectedDate}
                onSelect={
                  setSelectedDate
                }
                defaultMonth={
                  defaultMonth
                }
                showOutsideDays
                fixedWeeks
                components={{
                  Chevron: ({
                    orientation,
                  }) =>
                    orientation ===
                    "left" ? (
                      <ChevronLeft
                        size={15}
                      />
                    ) : (
                      <ChevronRight
                        size={15}
                      />
                    ),

                  DayButton: ({
                    day,
                    modifiers,
                    ...buttonProps
                  }) => {
                    const event =
                      eventMap.get(
                        getDateKey(
                          day.date
                        )
                      );

                    return (
                      <button
                        {...buttonProps}
                        type="button"
                        className={`
                          calendar-day-button
                          repayment-day-button
                          ${
                            modifiers.today
                              ? "is-today"
                              : ""
                          }
                          ${
                            modifiers.outside
                              ? "is-outside"
                              : ""
                          }
                        `}
                        style={{
                          width:
                            "100%",
                          maxWidth:
                            "100%",
                          minWidth: 0,
                        }}
                      >
                        <span className="calendar-date-number">
                          {day.date.getDate()}
                        </span>

                        {event && (
                          <span
                            className={`
                              repayment-card
                              repayment-${event.status}
                            `}
                          >
                            <span className="repayment-amount">
                              ₹
                              {money(
                                event.amount
                              )}
                            </span>

                            <span className="repayment-status-row">
                              <span>
                                {getStatusLabel(
                                  event.status
                                )}
                              </span>

                              <span
                                className={`
                                  repayment-dot
                                  dot-${event.status}
                                `}
                              />
                            </span>
                          </span>
                        )}
                      </button>
                    );
                  },
                }}
                classNames={{
                  months:
                    "calendar-months",
                  month:
                    "calendar-month",
                  month_caption:
                    "calendar-caption",
                  caption_label:
                    "calendar-caption-label",
                  nav:
                    "calendar-nav",
                  button_previous:
                    "calendar-nav-button",
                  button_next:
                    "calendar-nav-button",
                  month_grid:
                    "calendar-grid",
                  weekdays:
                    "calendar-weekdays",
                  weekday:
                    "calendar-weekday",
                  week:
                    "calendar-week",
                  day:
                    "calendar-day",
                  day_button:
                    "calendar-day-button",
                  today:
                    "calendar-today",
                  outside:
                    "calendar-outside",
                  selected:
                    "calendar-selected",
                }}
                formatters={{
                  formatWeekdayName: (
                    date
                  ) =>
                    date.toLocaleDateString(
                      "en-US",
                      {
                        weekday:
                          "short",
                      }
                    ),
                }}
                footer={
                  <div className="calendar-footer-area">
                    {selectedEvent ? (
                      <SelectedPayment
                        event={
                          selectedEvent
                        }
                      />
                    ) : (
                      <div className="calendar-helper">
                        Select a repayment date to see payment details.
                      </div>
                    )}

                    {/* =================================================
                        PAYMENT REMINDER
                    ================================================== */}

                    <div className="calendar-reminder">
                      <div className="calendar-reminder-content">
                        <div className="calendar-reminder-icon">
                          <Bell
                            size={18}
                            strokeWidth={1.8}
                          />
                        </div>

                        <div className="calendar-reminder-text-content">
                          <p className="calendar-reminder-title">
                            Payment Reminder
                          </p>

                          <p className="calendar-reminder-text">
                            Set a reminder for this customer&apos;s loan payment and follow-up schedule.
                          </p>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="calendar-reminder-button"
                        onClick={
                          openReminder
                        }
                      >
                        <Bell
                          size={12}
                          strokeWidth={2}
                        />

                        Set Payment Reminder
                      </button>
                    </div>
                  </div>
                }
              />
            </div>
          </section>
        </div>
      </div>

      {/* =================================================
          CALENDAR CSS
      ================================================== */}

      <style>{`
        /* =====================================================
           CALENDAR SHELL
        ====================================================== */

        .calendar-shell {
          width: 100%;
          max-width: 900px;
          margin: 0 auto;
          overflow: hidden;
        }

        .calendar-months,
        .calendar-month {
          width: 100%;
        }

        /* =====================================================
           MONTH HEADER
        ====================================================== */

        .calendar-caption {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 1px 2px 8px;
        }

        .calendar-caption-label {
          font-size: 16px;
          line-height: 1;
          font-weight: 800;
          color: #243253;
        }

        .calendar-nav {
          display: flex;
          align-items: center;
          gap: 5px;
        }

        .calendar-nav-button {
          width: 31px;
          height: 31px;

          display: flex;
          align-items: center;
          justify-content: center;

          border: 1px solid #E4E8EF;
          border-radius: 8px;

          background: #FFFFFF;
          color: #71809B;

          cursor: pointer;

          transition:
            background 150ms ease,
            border-color 150ms ease,
            color 150ms ease;
        }

        .calendar-nav-button:hover {
          background: #F7F4FF;
          border-color: #D7CCFF;
          color: #6D4AFF;
        }

        /* =====================================================
           CALENDAR GRID
        ====================================================== */

        .calendar-grid {
          width: 100%;

          border-collapse: separate;
          border-spacing: 0;

          border: 1px solid #E5E9F0;
          border-radius: 11px;

          overflow: hidden;

          table-layout: fixed;
        }

        /* =====================================================
           WEEKDAY HEADER
        ====================================================== */

        .calendar-weekdays {
          background: #FBFCFE;
        }

        .calendar-weekday {
          height: 31px;

          padding: 0 2px;

          font-size: 8px;
          line-height: 1;

          font-weight: 800;

          color: #7D8BA5;

          text-align: center;
          text-transform: uppercase;

          white-space: nowrap;

          border-bottom: 1px solid #E5E9F0;
        }

        /* =====================================================
           WEEK
        ====================================================== */

        .calendar-week {
          background: #FFFFFF;
        }

        /* =====================================================
           DAY CELL
        ====================================================== */

        .calendar-day {
          position: relative;

          width: 14.285%;
          height: 54px;

          padding: 0;

          border-right: 1px solid #EEF1F5;
          border-bottom: 1px solid #EEF1F5;

          vertical-align: top;
        }

        .calendar-week:last-child .calendar-day {
          border-bottom: 0;
        }

        .calendar-day:last-child {
          border-right: 0;
        }

        /* =====================================================
           DAY BUTTON
        ====================================================== */

        .calendar-day-button {
          display: flex;
          flex-direction: column;
          align-items: stretch;

          width: 100%;
          height: 100%;

          min-height: 56px;

          padding: 3px 2px;

          border: 0;

          background: transparent;

          text-align: center;

          cursor: pointer;

          box-sizing: border-box;
        }

        .calendar-day-button:hover {
          background: #FAFBFD;
        }

        /* =====================================================
           DATE NUMBER
        ====================================================== */

        .calendar-date-number {
          display: block;

          width: 100%;

          margin: 0;

          font-size: 10px;
          line-height: 1;

          font-weight: 900;

          color: #243253;

          text-align: center;
        }

        .calendar-outside .calendar-date-number {
          color: #C7CED9;
        }

        .calendar-today {
          background: #F8F5FF !important;
        }

        .calendar-selected {
          background: #F1EDFF !important;
        }

        /* =====================================================
           REPAYMENT CARD
        ====================================================== */

        .repayment-card {
          display: flex;
          flex-direction: column;

          align-items: center;
          justify-content: center;

          width: 100%;

          box-sizing: border-box;

          margin: 4px 0 0;

          padding: 5px 3px;

          min-height: 31px;

          gap: 2px;

          border-radius: 7px;

          border: 1px solid transparent;

          overflow: visible;

          text-align: center;
        }

        .repayment-due-today {
          background: #FFF8E1;
          border-color: #FFE8A3;
          color: #B7791F;
        }

        .repayment-upcoming {
          background: #F1EDFF;
          border-color: #DCD2FF;
          color: #6243DB;
        }

        .repayment-overdue {
          background: #FFF0F1;
          border-color: #FFD4D8;
          color: #D92D3A;
        }

        .repayment-paid {
          background: #EAFBF5;
          border-color: #CDEFE2;
          color: #159A78;
        }

        .repayment-partially-paid {
          background: #FFF4E8;
          border-color: #FFE0BB;
          color: #D67819;
        }

        /* =====================================================
           REPAYMENT AMOUNT
        ====================================================== */

        .repayment-amount {
          display: block;

          width: 100%;

          margin: 0;

          font-size: 9.5px;
          line-height: 1.1;

          font-weight: 900;

          letter-spacing: -0.01em;

          color: inherit;

          text-align: center;

          white-space: nowrap;

          overflow: visible;

          text-overflow: clip;
        }

        /* =====================================================
           STATUS ROW
        ====================================================== */

        .repayment-status-row {
          display: flex;

          align-items: center;
          justify-content: center;

          width: 100%;

          gap: 4px;

          margin: 0;

          font-size: 7px;
          line-height: 1;

          font-weight: 800;

          color: inherit;

          text-align: center;

          white-space: nowrap;

          overflow: visible;
        }

        .repayment-status-row > span:first-child {
          display: block;

          min-width: max-content;

          overflow: visible;

          white-space: nowrap;

          text-overflow: clip;
        }

        /* =====================================================
           STATUS DOT
        ====================================================== */

        .repayment-dot {
          width: 5px;
          height: 5px;

          flex-shrink: 0;

          border-radius: 999px;
        }

        .dot-upcoming {
          background: #6D4AFF;
        }

        .dot-due-today {
          background: #3B82F6;
        }

        .dot-overdue {
          background: #EF4444;
        }

        .dot-paid {
          background: #36C69B;
        }

        .dot-partially-paid {
          background: #FF9C42;
        }

        /* =====================================================
           CALENDAR HELPER
        ====================================================== */

        .calendar-helper {
          margin-top: 6px;

          border-radius: 7px;

          background: #F8FAFD;

          padding: 6px 8px;

          font-size: 8px;

          color: #8A95AA;

          text-align: center;
        }

        /* =====================================================
           SELECTED PAYMENT
        ====================================================== */

        .selected-payment {
          margin-top: 6px;

          display: grid;

          grid-template-columns:
            repeat(3, minmax(0, 1fr));

          gap: 5px;

          border-radius: 7px;

          background: #F8FAFD;

          padding: 6px;
        }

        .selected-payment-item {
          min-width: 0;
          text-align: center;
        }

        .selected-payment-item p:first-child {
          margin: 0 0 2px;

          font-size: 7px;
          line-height: 1;

          color: #8A95AA;
        }

        .selected-payment-item p:last-child {
          margin: 0;

          font-size: 9px;
          line-height: 1.1;

          font-weight: 700;

          color: #253252;

          white-space: nowrap;

          overflow: hidden;

          text-overflow: ellipsis;
        }

        /* =====================================================
           FOOTER AREA
        ====================================================== */

        .calendar-footer-area {
          width: 100%;

          margin-top: 5px;
        }

        /* =====================================================
           PAYMENT REMINDER
        ====================================================== */

        .calendar-reminder {
          width: 100%;

          min-height: 68px;

          margin-top: 7px;

          padding: 11px 16px;

          display: flex;
          align-items: center;
          justify-content: space-between;

          box-sizing: border-box;

          border: 1px solid #E9E5FF;

          border-radius: 10px;

          background: linear-gradient(
            90deg,
            #F8F6FF 0%,
            #FCFBFF 100%
          );
        }

        .calendar-reminder-content {
          display: flex;

          align-items: center;

          flex: 1;

          min-width: 0;

          gap: 10px;
        }

        .calendar-reminder-icon {
          width: 42px;
          height: 42px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 9px;

          background: #EEEAFE;

          color: #6D4AFF;
        }

        .calendar-reminder-text-content {
          display: flex;

          flex-direction: column;

          justify-content: center;

          min-width: 0;

          gap: 4px;
        }

        .calendar-reminder-title {
          margin: 0 !important;
          padding: 0 !important;

          font-size: 14px !important;
          line-height: 1.2 !important;

          font-weight: 800 !important;

          color: #243253 !important;
        }

        .calendar-reminder-text {
          margin: 0 !important;
          padding: 0 !important;

          font-size: 11px !important;
          line-height: 1.3 !important;

          font-weight: 500 !important;

          color: #8792AA !important;
        }

        .calendar-reminder-button {
          height: 36px;

          margin-left: 16px;
          padding: 0 16px;

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;

          border: none;
          border-radius: 8px;

          background: #7252F5;
          color: #FFFFFF;

          font-size: 11px !important;
          line-height: 1 !important;

          font-weight: 700 !important;

          white-space: nowrap;

          cursor: pointer;

          transition:
            background 150ms ease,
            transform 150ms ease;
        }

        .calendar-reminder-button:hover {
          background: #6345DF;
          transform: translateY(-1px);
        }

        .calendar-reminder-button svg {
          width: 15px !important;
          height: 15px !important;

          flex-shrink: 0;
        }

        /* =====================================================
           LEFT LOAN SUMMARY
        ====================================================== */

        .loan-summary-panel {
          overflow: hidden;

          border: 1px solid #DDD5FF;

          border-radius: 14px;

          background:
            linear-gradient(
              145deg,
              #F0ECFF 0%,
              #F8F6FF 55%,
              #FFFFFF 100%
            );

          box-shadow:
            0 4px 14px rgba(109, 74, 255, 0.05);
        }

        .loan-summary-header {
          padding: 11px 14px;

          background:
            linear-gradient(
              90deg,
              #7050F3 0%,
              #8060F7 50%,
              #8B6AFF 100%
            );

          color: #FFFFFF;
        }

        .loan-summary-title {
          margin: 0;

          font-size: 11px;

          line-height: 1.1;

          font-weight: 800;
        }

        .loan-summary-body {
          padding: 13px 14px;
        }

        .loan-summary-label {
          margin: 0;

          font-size: 8px;

          line-height: 1.1;

          font-weight: 600;

          color: #8490A8;
        }

        .loan-summary-value {
          margin: 2px 0 0;

          font-size: 10px;

          line-height: 1.2;

          font-weight: 800;

          color: #253252;
        }

        /* =====================================================
           DESKTOP
        ====================================================== */

        @media (min-width: 1200px) {
          .calendar-day {
            height: 56px;
          }

          .calendar-day-button {
            min-height: 56px;
          }

          .repayment-card {
            min-height: 31px;
          }

          .repayment-amount {
            font-size: 9.5px;
          }

          .repayment-status-row {
            font-size: 7px;
          }
        }

        /* =====================================================
           TABLET
        ====================================================== */

        @media (max-width: 900px) {
          .calendar-weekday {
            font-size: 7px;
          }

          .calendar-day {
            height: 52px;
          }

          .calendar-day-button {
            min-height: 52px;
            padding: 3px 2px;
          }

          .calendar-date-number {
            font-size: 9px;
          }

          .repayment-card {
            min-height: 29px;
            margin-top: 3px;
            padding: 4px 3px;
            gap: 2px;
          }

          .repayment-amount {
            font-size: 8.5px;
          }

          .repayment-status-row {
            font-size: 6.5px;
          }
        }

        /* =====================================================
           MOBILE
        ====================================================== */

        @media (max-width: 700px) {
          .calendar-reminder {
            min-height: 58px;
            padding: 8px 10px;
          }

          .calendar-reminder-content {
            gap: 8px;
          }

          .calendar-reminder-icon {
            width: 32px;
            height: 32px;
          }

          .calendar-reminder-icon svg {
            width: 15px;
            height: 15px;
          }

          .calendar-reminder-title {
            font-size: 9px !important;
          }

          .calendar-reminder-text {
            font-size: 7px !important;
          }

          .calendar-reminder-button {
            height: 27px;
            margin-left: 7px;
            padding: 0 8px;
            gap: 4px;
            font-size: 7px !important;
          }

          .calendar-reminder-button svg {
            width: 11px !important;
            height: 11px !important;
          }

          .repayment-day-button .repayment-card {
            width: 100%;
            max-width: none;
            box-sizing: border-box;
          }

          .repayment-day-button .repayment-amount {
            width: 100%;
            font-size: 9.5px;
            font-weight: 900;
            white-space: nowrap;
            overflow: visible;
            text-overflow: clip;
          }

          .repayment-day-button .repayment-status-row {
            width: 100%;
            justify-content: center;
            font-size: 7px;
            font-weight: 800;
            white-space: nowrap;
            overflow: visible;
          }

          .repayment-day-button
          .repayment-status-row
          > span:first-child {
            min-width: max-content;
            overflow: visible;
            white-space: nowrap;
            text-overflow: clip;
          }
        }
      `}</style>
    </div>
  );
};

/* =========================================================
   LOAN SUMMARY
========================================================= */

const LoanSummary = ({
  loan,
  customerName,
  loanNumber,
}) => {
  return (
    <section className="loan-summary-panel">
      <div className="loan-summary-header">
        <div className="flex items-center gap-2">
          <IndianRupee
            size={14}
            strokeWidth={2.2}
          />

          <p className="loan-summary-title">
            Loan Summary
          </p>
        </div>
      </div>

      <div className="loan-summary-body">
        <div className="space-y-2.5">
          <SummaryField
            label="Loan ID"
            value={loanNumber}
          />

          <SummaryField
            label="Borrower"
            value={customerName}
          />

          <SummaryField
            label="Loan Amount"
            value={`₹${money(
              loan?.loanAmount
            )}`}
          />

          <SummaryField
            label="EMI Amount"
            value={`₹${money(
              getEmi(loan)
            )}`}
          />

          <SummaryField
            label="Tenure"
            value={getTenure(loan)}
          />

          <SummaryField
            label="Start Date"
            value={formatDate(
              loan?.startDate ||
                loan?.loanStartDate ||
                loan?.start ||
                loan?.createdAt
            )}
          />
        </div>

        <button
          type="button"
          className="
            mt-3
            flex
            w-full
            items-center
            justify-center
            rounded-lg
            border
            border-[#D7CFFF]
            bg-white
            px-3
            py-2
            text-[9px]
            font-semibold
            text-[#6D4AFF]
            transition
            hover:bg-[#F8F5FF]
          "
        >
          View Loan Details
        </button>
      </div>
    </section>
  );
};

/* =========================================================
   QUICK STATS
========================================================= */

const QuickStats = ({
  total,
  paid,
  pending,
  overdue,
  partiallyPaid,
  outstanding,
  totalEmi,
}) => {
  return (
    <section
      className="
        rounded-xl
        border
        border-slate-200
        bg-white
        px-3.5
        py-3.5
      "
    >
      <h3 className="text-[10px] font-bold text-[#253252]">
        Quick Stats
      </h3>

      <div className="mt-3 space-y-2.5">
        <StatRow
          label="Total Installments"
          value={total}
          badge="bg-[#EEF0FF] text-[#6970D7]"
        />

        <StatRow
          label="Paid"
          value={paid}
          badge="bg-[#EAFBF5] text-[#159A78]"
        />

        <StatRow
          label="Pending"
          value={pending}
          badge="bg-[#EEF4FF] text-[#4E7DEB]"
        />

        <StatRow
          label="Overdue"
          value={overdue}
          badge="bg-[#FFF0F1] text-[#E04B58]"
        />

        <StatRow
          label="Partially Paid"
          value={partiallyPaid}
          badge="bg-[#FFF4E8] text-[#D67819]"
        />
      </div>

      <div
        className="
          mt-3
          rounded-lg
          bg-[#F2EEFF]
          px-3
          py-2.5
        "
      >
        <p className="text-[8px] font-semibold text-[#6D4AFF]">
          Total Outstanding
        </p>

        <p className="mt-0.5 text-[13px] font-bold text-[#6D4AFF]">
          ₹{money(outstanding)}
        </p>
      </div>

      <div
        className="
          mt-2
          rounded-lg
          bg-slate-50
          px-3
          py-2
        "
      >
        <p className="text-[8px] font-medium text-slate-400">
          Total Scheduled EMI
        </p>

        <p className="mt-0.5 text-[11px] font-bold text-[#253252]">
          ₹{money(totalEmi)}
        </p>
      </div>
    </section>
  );
};

/* =========================================================
   SUMMARY FIELD
========================================================= */

const SummaryField = ({
  label,
  value,
}) => {
  return (
    <div className="min-w-0">
      <p className="loan-summary-label">
        {label}
      </p>

      <p className="loan-summary-value truncate">
        {value}
      </p>
    </div>
  );
};

/* =========================================================
   STAT ROW
========================================================= */

const StatRow = ({
  label,
  value,
  badge,
}) => {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[9px] font-semibold text-[#71809B]">
        {label}
      </span>

      <span
        className={`
          min-w-6
          rounded-md
          px-1.5
          py-1
          text-center
          text-[8px]
          font-bold
          ${badge}
        `}
      >
        {value}
      </span>
    </div>
  );
};

/* =========================================================
   SELECTED PAYMENT
========================================================= */

const SelectedPayment = ({
  event,
}) => {
  return (
    <div className="selected-payment">
      <div className="selected-payment-item">
        <p>EMI</p>
        <p>
          ₹{money(event.amount)}
        </p>
      </div>

      <div className="selected-payment-item">
        <p>Principal</p>
        <p>
          ₹{money(event.principal)}
        </p>
      </div>

      <div className="selected-payment-item">
        <p>Interest</p>
        <p>
          ₹{money(event.interest)}
        </p>
      </div>
    </div>
  );
};

/* =========================================================
   LEGEND
========================================================= */

const Legend = ({
  dot,
  label,
}) => {
  return (
    <div
      className="
        flex
        items-center
        gap-2
        rounded-full
        bg-[#FAFBFE]
        px-3
        py-1.5
      "
    >
      <span
        className={`
          h-2.5
          w-2.5
          shrink-0
          rounded-full
          ${dot}
        `}
      />

      <span className="text-[9px] font-semibold text-[#71809B]">
        {label}
      </span>
    </div>
  );
};

/* =========================================================
   STATUS
========================================================= */

const normalizeStatus = (
  status,
  dueDate
) => {
  const value = String(
    status || ""
  )
    .trim()
    .toLowerCase();

  /* PAID */

  if (
    value === "paid" ||
    value === "completed" ||
    value === "closed" ||
    value === "settled"
  ) {
    return "paid";
  }

  /* PARTIALLY PAID */

  if (
    value === "partially paid" ||
    value === "partially-paid" ||
    value === "partial"
  ) {
    if (
      isDateBeforeToday(
        dueDate
      )
    ) {
      return "overdue";
    }

    return "partially-paid";
  }

  /* OVERDUE */

  if (
    value === "overdue" ||
    (
      isDateBeforeToday(
        dueDate
      ) &&
      (
        value === "pending" ||
        value === "due" ||
        value === "due today"
      )
    )
  ) {
    return "overdue";
  }

  /* DUE TODAY */

  if (
    (
      value === "pending" ||
      value === "due" ||
      value === "due today"
    ) &&
    isDateToday(
      dueDate
    )
  ) {
    return "due-today";
  }

  /* UPCOMING */

  return "upcoming";
};

const isDateBeforeToday = (
  date
) => {
  if (
    !date ||
    Number.isNaN(
      date.getTime()
    )
  ) {
    return false;
  }

  const due =
    new Date(date);

  due.setHours(
    0,
    0,
    0,
    0
  );

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  return (
    due.getTime() <
    today.getTime()
  );
};

const isDateToday = (
  date
) => {
  if (
    !date ||
    Number.isNaN(
      date.getTime()
    )
  ) {
    return false;
  }

  const due =
    new Date(date);

  const today =
    new Date();

  due.setHours(
    0,
    0,
    0,
    0
  );

  today.setHours(
    0,
    0,
    0,
    0
  );

  return (
    due.getTime() ===
    today.getTime()
  );
};

const getStatusLabel = (
  status
) => {
  switch (status) {
    case "paid":
      return "Paid";

    case "overdue":
      return "Overdue";

    case "partially-paid":
      return "Partially Paid";

    case "due-today":
      return "Due Today";

    default:
      return "Upcoming";
  }
};

/* =========================================================
   DATE HELPERS
========================================================= */

const parseLocalDate = (
  value
) => {
  if (!value) {
    return null;
  }

  if (
    value instanceof Date
  ) {
    const date =
      new Date(value);

    return Number.isNaN(
      date.getTime()
    )
      ? null
      : date;
  }

  const raw =
    String(value);

  const match =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (match) {
    const [
      ,
      year,
      month,
      day,
    ] = match;

    return new Date(
      Number(year),
      Number(month) - 1,
      Number(day)
    );
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
};

const getDateKey = (
  date
) => {
  if (!date) {
    return "";
  }

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getDate()
    ).padStart(2, "0"),
  ].join("-");
};

const formatDate = (
  value
) => {
  const date =
    parseLocalDate(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

/* =========================================================
   LOAN HELPERS
========================================================= */

const getEmi = (
  loan
) => {
  if (
    loan?.repayment?.method ===
    "Principal"
  ) {
    return (
      loan?.repaymentSchedule?.[0]
        ?.paymentAmount ??
      loan?.calculation
        ?.paymentAmount ??
      loan?.emiAmount ??
      0
    );
  }

  return (
    loan?.calculation
      ?.emiAmount ??
    loan?.emiAmount ??
    0
  );
};

const getTenure = (
  loan
) => {
  const repayment =
    loan?.repayment || {};

  const tenure =
    repayment?.tenure ??
    repayment?.numberOfPayments ??
    loan?.calculation
      ?.numberOfPayments ??
    loan?.tenure ??
    "";

  const unit =
    repayment?.tenureUnit ||
    loan?.tenureUnit ||
    "Months";

  return tenure
    ? `${tenure} ${unit}`
    : "—";
};

const money = (
  value
) => {
  return Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  );
};

export default LoanRepaymentCalendar;