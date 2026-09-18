// src/pages/dashboard/Dashboard.jsx

import {
  Bell,
  ClipboardList,
  PhoneCall,
  Plus,
  UserPlus,
  WalletCards,
  X,
  LogIn,
  ReceiptText,
  HandCoins,
} from "lucide-react";

import {
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import useDashboardData from "../../hooks/dashboard/useDashboardData";
import useDashboardMetrics from "../../hooks/dashboard/useDashboardMetrics";

import DashboardHeader from "../../components/dashboard/DashboardHeader";
import KpiStrip from "../../components/dashboard/overview/KpiStrip";
import CollectionPerformanceCard from "../../components/dashboard/overview/CollectionPerformanceCard";
import LoanPortfolioCard from "../../components/dashboard/overview/LoanPortfolioCard";
import RepaymentHealthCard from "../../components/dashboard/overview/RepaymentHealthCard";
import LoanActivityCard from "../../components/dashboard/overview/LoanActivityCard";
import CustomerBaseCard from "../../components/dashboard/overview/CustomerBaseCard";
import MoneyMovementCard from "../../components/dashboard/overview/MoneyMovementCard";
import NeedsAttentionCard from "../../components/dashboard/overview/NeedsAttentionCard";
import PortfolioRiskCard from "../../components/dashboard/overview/PortfolioRiskCard";

/* =========================================================
   DASHBOARD
========================================================= */

const Dashboard = () => {
  const navigate = useNavigate();

  const [
    quickActionsOpen,
    setQuickActionsOpen,
  ] = useState(false);

  const {
    loading,
    loans,
    customers,
    collections,
    expenses,

    totalCustomers,
    totalLoans,

    activeLoans,
    closedLoans,

    overdueLoanCount,
    overdueAmount,

    totalOutstanding,

    newLoansToday,

    emiDueCount,
    emiDueAmount,

    pendingLoans,

    followUpQueue,
    recentActions,

    collectionVsDue,
    cashBankUpi,
    cashPosition,
    pendingActions,

    ptpDue,

    /* =====================================================
       EXPENSE DATA
    ====================================================== */

    totalExpenseAmount,
    todayExpenseAmount,
    currentMonthExpenseAmount,
    pendingExpenseCount,

    /* =====================================================
       COLLECTION DATA
    ====================================================== */

    overduePayments,
    overdueCollectionTodayAmount,
    todayScheduledDueAmount,
  } = useDashboardData();

  const metrics = useDashboardMetrics({
    loans,
    customers,
    collections,
    expenses,
    activeLoans,
    closedLoans,
    overdueLoanCount,
    overdueAmount,
    totalCustomers,
    followUpQueue,
    ptpDue,
  });

  const overduePctOfPortfolio =
    totalOutstanding > 0 ? Math.min(100, (overdueAmount / totalOutstanding) * 100) : 0;

  /* =========================================================
     TODAY'S FOLLOW-UP
  ========================================================= */

  const todayFollowUps = Array.isArray(
    followUpQueue
  )
    ? followUpQueue
        .filter(
          ({
            scheduleRow,
          }) =>
            isDueToday(
              scheduleRow?.dueDate
            )
        )
        .slice(
          0,
          3
        )
    : [];

  /* =========================================================
     RECENT ATTENTION
  ========================================================= */

  const recentAttention =
    Array.isArray(
      recentActions
    )
      ? recentActions
          .filter(
            (action) =>
              action?.type ===
                "overdue" ||
              action?.type ===
                "loan_created" ||
              action?.type ===
                "customer_created"
          )
          .slice(
            0,
            3
          )
      : [];

  /* =========================================================
     LOGOUT
  ========================================================= */

  const handleLogout = () => {
    localStorage.removeItem(
      "auto_finance_auth"
    );

    navigate(
      "/login",
      {
        replace: true,
      }
    );
  };

  /* =========================================================
     NAVIGATION HELPERS
  ========================================================= */

  /*
   * View Due
   *
   * Takes Admin to Loan Management where the
   * due / overdue loan work can be reviewed.
   */
  const handleViewDue = () => {
    setQuickActionsOpen(false);

    navigate(
      "/loan-management"
    );
  };

  /*
   * View Follow-up
   *
   * Takes Admin to the dedicated Reminder module.
   */
  

  /*
   * Today's Follow-up → View All
   *
   * Always opens the Reminder module, not Loan.
   */
  const handleViewAllFollowUps = () => {
    setQuickActionsOpen(false);

    navigate(
      "/reminders"
    );
  };

  /* =========================================================
     LOADING
  ========================================================= */

  if (loading) {
    return (
      <div
        className="
          flex
          min-h-full
          items-center
          justify-center
          bg-[#F7F9F8]
          px-4
        "
      >
        <div className="text-center">
          <div
            className="
              mx-auto
              flex
              h-11
              w-11
              items-center
              justify-center
              rounded-full
              bg-[#EAF5EF]
            "
          >
            <div
              className="
                h-5
                w-5
                animate-spin
                rounded-full
                border-2
                border-slate-200
                border-t-[#0B5D3B]
              "
            />
          </div>

          <p
            className="
              mt-2
              text-sm
              font-medium
              text-slate-500
            "
          >
            Loading dashboard...
          </p>
        </div>
      </div>
    );
  }

  /* =========================================================
     MAIN
  ========================================================= */

  return (
    <div
      className="
        relative
        flex
        min-h-screen
        w-full
        max-w-full
        flex-col
        overflow-x-hidden
        bg-[#F7F9F8]
        pt-14
        lg:pt-0
      "
    >
      {/* =================================================
          HEADER
      ================================================== */}

      <DashboardHeader
        customerCount={
          totalCustomers
        }
        loanCount={
          totalLoans
        }
        onLogout={
          handleLogout
        }
      />

      {/* =================================================
          CONTENT
      ================================================== */}

      <main
        className="
          min-h-0
          min-w-0
          w-full
          max-w-full
          flex-1
          overflow-y-auto
          overflow-x-hidden
          px-3
          py-3
          sm:px-4
          lg:px-5
        "
      >
        <div
          className="
            flex
            w-full
            max-w-full
            flex-col
            gap-3
            pb-6
          "
        >
          {/* =================================================
              KPI STRIP
          ================================================== */}

          <KpiStrip
            monthCollected={metrics.monthCollected}
            monthDue={metrics.monthDue}
            totalOutstanding={totalOutstanding}
            overdueAmount={overdueAmount}
            overduePctOfPortfolio={overduePctOfPortfolio}
            collectionRate={metrics.collectionRate}
            activeLoans={activeLoans}
            cashPosition={cashPosition}
          />

          {/* =================================================
              COLLECTION PERFORMANCE + LOAN PORTFOLIO
          ================================================== */}

          <div className="grid grid-cols-1 gap-3 xl:grid-cols-5">
            <div className="xl:col-span-3">
              <CollectionPerformanceCard
                weeklyTrend={metrics.weeklyTrend}
                monthCollected={metrics.monthCollected}
                monthDue={metrics.monthDue}
                collectionRate={metrics.collectionRate}
              />
            </div>

            <div className="xl:col-span-2">
              <LoanPortfolioCard
                composition={metrics.portfolioComposition}
                totalLoans={metrics.totalLoansForComposition}
                outstandingByVehicleType={metrics.outstandingByVehicleType}
              />
            </div>
          </div>

          {/* =================================================
              REPAYMENT HEALTH + LOAN ACTIVITY + CUSTOMER BASE
          ================================================== */}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <RepaymentHealthCard
              weeklyTrend={metrics.weeklyTrend}
              monthDue={metrics.monthDue}
              monthCollected={metrics.monthCollected}
              overdueAmount={overdueAmount}
              ptpAmount={ptpDue?.amount || 0}
            />

            <LoanActivityCard
              newLoans={metrics.loanActivityThisMonth.newLoans}
              reLoans={metrics.loanActivityThisMonth.reLoans}
            />

            <CustomerBaseCard
              total={metrics.customerBase.total}
              newThisMonth={metrics.customerBase.newThisMonth}
              activeBorrowers={metrics.customerBase.activeBorrowers}
              newGrowthPct={metrics.customerBase.newGrowthPct}
              activeGrowthPct={metrics.customerBase.activeGrowthPct}
            />
          </div>

          {/* =================================================
              MONEY MOVEMENT + NEEDS ATTENTION + PORTFOLIO RISK
          ================================================== */}

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <MoneyMovementCard
              cash={cashBankUpi?.cash || 0}
              bank={cashBankUpi?.bank || 0}
              upi={cashBankUpi?.upi || 0}
              dailyExpenseTrend={metrics.dailyExpenseTrend}
              monthExpenseTotal={metrics.monthExpenseTotal}
            />

            <NeedsAttentionCard
              overdueCount={metrics.needsAttention.overdueCount}
              overdueAmount={metrics.needsAttention.overdueAmount}
              followUpCount={metrics.needsAttention.followUpCount}
              ptpCount={metrics.needsAttention.ptpCount}
              ptpAmount={metrics.needsAttention.ptpAmount}
              onNavigate={navigate}
            />

            <PortfolioRiskCard
              overdueAmount={overdueAmount}
              overduePctOfPortfolio={overduePctOfPortfolio}
              agingBuckets={metrics.agingBuckets}
            />
          </div>
        </div>
      </main>

      {/* =================================================
          FLOATING QUICK ACTION
      ================================================== */}

      <div
        className="
          pointer-events-none
          fixed
          bottom-5
          right-4
          z-50
          sm:right-5

          lg:absolute
          lg:bottom-auto
          lg:right-5
          lg:top-1/2
          lg:-translate-y-1/2
        "
      >
        {/* =================================================
            QUICK ACTION POPOVER
        ================================================== */}

        {quickActionsOpen && (
          <div
            className="
              pointer-events-auto
              absolute
              bottom-16
              right-0
              w-[330px]
              max-w-[calc(100vw-24px)]
              max-h-[calc(100vh-140px)]
              overflow-y-auto
              overflow-x-hidden
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-2xl
              ring-1
              ring-black/5
              lg:max-h-[70vh]
            "
          >
            {/* =================================================
                HEADER
            ================================================== */}

            <div
              className="
                border-b
                border-slate-100
                px-4
                py-3
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2.5
                "
              >
                <div
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-lg
                    bg-[#EAF5EF]
                  "
                >
                  <ClipboardList
                    size={16}
                    strokeWidth={2}
                    className="text-[#0B5D3B]"
                  />
                </div>

                <div>
                  <p
                    className="
                      text-[11px]
                      font-semibold
                      text-[#17221D]
                    "
                  >
                    Quick Actions
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-[8px]
                      text-slate-400
                    "
                  >
                    Finance operations &
                    attention
                  </p>
                </div>
              </div>
            </div>

            {/* =================================================
                PRIMARY ACTIONS
            ================================================== */}

            <div
              className="
                grid
                grid-cols-2
                gap-2
                p-3
              "
            >
              <QuickActionButton
                icon={
                  UserPlus
                }
                label="Add Customer"
                onClick={() => {
                  setQuickActionsOpen(
                    false
                  );

                  navigate(
                    "/customers/onboarding"
                  );
                }}
              />

              <QuickActionButton
                icon={
                  WalletCards
                }
                label="Create New Loan"
                onClick={() => {
                  setQuickActionsOpen(
                    false
                  );

                  navigate(
                    "/customers/onboarding"
                  );
                }}
              />

              <QuickActionButton
                icon={
                  WalletCards
                }
                label="Record Payment"
                disabled
              />

              {/* =================================================
                  VIEW DUE
              ================================================== */}

              <QuickActionButton
                icon={
                  HandCoins
                }
                label="View Due"
                onClick={
                  handleViewDue
                }
              />

              {/* =================================================
                  VIEW FOLLOW-UP
              ================================================== */}

          
            </div>

            {/* =================================================
                TODAY'S FOLLOW-UP
            ================================================== */}

            <div
              className="
                border-t
                border-slate-100
                px-3
                py-3
              "
            >
              <div
                className="
                  mb-2
                  flex
                  items-center
                  justify-between
                "
              >
                <div
                  className="
                    flex
                    items-center
                    gap-2
                  "
                >
                 

                  <p
                    className="
                      text-[9px]
                      font-semibold
                      text-[#17221D]
                    "
                  >
                    Today&apos;s
                    Follow-up
                  </p>
                </div>

                <button
                  type="button"
                  onClick={
                    handleViewAllFollowUps
                  }
                  className="
                    text-[8px]
                    font-semibold
                    text-[#0B5D3B]
                    hover:underline
                  "
                >
                  View All
                </button>
              </div>

              {todayFollowUps.length ===
              0 ? (
                <p
                  className="
                    rounded-lg
                    bg-slate-50
                    px-3
                    py-2
                    text-[8px]
                    text-slate-400
                  "
                >
                  No follow-ups today
                </p>
              ) : (
                <div
                  className="
                    space-y-1.5
                  "
                >
                  {todayFollowUps.map(
                    ({
                      loan,
                      scheduleRow,
                    }) => (
                      <button
                        key={`${loan?.id || loan?.loanNumber}-${scheduleRow?.dueDate}`}
                        type="button"
                        onClick={() => {
                          setQuickActionsOpen(
                            false
                          );

                          navigate(
                            `/reminders?loanId=${encodeURIComponent(
                              loan?.id ||
                                ""
                            )}&loanNumber=${encodeURIComponent(
                              loan?.loanNumber ||
                                ""
                            )}&customerId=${encodeURIComponent(
                              loan?.customerId ||
                                loan?.customer?.id ||
                                ""
                            )}&customerName=${encodeURIComponent(
                              getCustomerName(
                                loan
                              )
                            )}`
                          );
                        }}
                        className="
                          flex
                          w-full
                          items-center
                          justify-between
                          gap-2
                          rounded-lg
                          bg-slate-50
                          px-3
                          py-2
                          text-left
                          transition
                          hover:bg-[#F0F8F3]
                        "
                      >
                        <div className="min-w-0">
                          <p
                            className="
                              truncate
                              text-[9px]
                              font-semibold
                              text-[#17221D]
                            "
                          >
                            {getCustomerName(
                              loan
                            )}
                          </p>

                          <p
                            className="
                              mt-0.5
                              text-[8px]
                              text-slate-400
                            "
                          >
                            {loan?.loanNumber ||
                              "Loan"}
                          </p>
                        </div>

                        <div
                          className="
                            shrink-0
                            text-right
                          "
                        >
                          <p
                            className="
                              text-[9px]
                              font-semibold
                              text-[#17221D]
                            "
                          >
                            ₹
                            {getPaymentAmount(
                              scheduleRow
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </p>

                          <p
                            className={`
                              mt-0.5
                              text-[7px]
                              font-semibold
                              ${
                                String(
                                  scheduleRow?.status ||
                                    ""
                                )
                                  .trim()
                                  .toLowerCase() ===
                                "overdue"
                                  ? "text-red-700"
                                  : "text-[#0B5D3B]"
                              }
                            `}
                          >
                            {scheduleRow?.status ||
                              "Pending"}
                          </p>
                        </div>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>

            {/* =================================================
                RECENT ACTIVITIES
            ================================================== */}

            <div
              className="
                border-t
                border-slate-100
                px-3
                py-3
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  gap-3
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
                      h-9
                      w-9
                      shrink-0
                      items-center
                      justify-center
                      rounded-lg
                      bg-[#EAF5EF]
                    "
                  >
                    <Bell
                      size={18}
                      strokeWidth={2}
                      className="text-[#0B5D3B]"
                    />
                  </div>

                  <div className="min-w-0">
                    <p
                      className="
                        text-[11px]
                        font-semibold
                        text-[#17221D]
                      "
                    >
                      Recent Activities
                    </p>

                    <p
                      className="
                        mt-0.5
                        text-[9px]
                        text-slate-400
                      "
                    >
                      Recent customer & loan
                      activity
                    </p>
                  </div>
                </div>

                <div
                  className="
                    flex
                    shrink-0
                    items-center
                    gap-3
                  "
                >
                  <span
                    className="
                      inline-flex
                      min-w-[30px]
                      items-center
                      justify-center
                      rounded-full
                      bg-[#EAF5EF]
                      px-2
                      py-1
                      text-[12px]
                      font-bold
                      text-[#0B5D3B]
                    "
                  >
                    {
                      recentAttention.length
                    }
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setQuickActionsOpen(
                        false
                      );

                      navigate(
                        "/activities"
                      );
                    }}
                    className="
                      text-[9px]
                      font-semibold
                      text-[#0B5D3B]
                      transition
                      hover:text-[#084A30]
                      hover:underline
                    "
                  >
                    View All
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =================================================
            FLOATING BUTTON
        ================================================== */}

        <div
          className="
            pointer-events-auto
            relative
          "
        >
          {!quickActionsOpen && (
            <span
              className="
                absolute
                inset-0
                animate-ping
                rounded-full
                bg-[#0B5D3B]/20
              "
            />
          )}

          <button
            type="button"
            onClick={() =>
              setQuickActionsOpen(
                (previous) =>
                  !previous
              )
            }
            className="
              relative
              flex
              h-12
              w-12
              items-center
              justify-center
              rounded-full
              bg-[#0B5D3B]
              text-white
              shadow-lg
              ring-4
              ring-white
              transition
              duration-200
              hover:scale-105
              hover:bg-[#084A30]
            "
            aria-label={
              quickActionsOpen
                ? "Close quick actions"
                : "Open quick actions"
            }
          >
            {quickActionsOpen ? (
              <X
                size={20}
                strokeWidth={2}
              />
            ) : (
              <Plus
                size={21}
                strokeWidth={2.3}
              />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   QUICK ACTION BUTTON
========================================================= */

const QuickActionButton = ({
  icon: Icon,
  label,
  onClick,
  disabled = false,
}) => {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`
        flex
        items-center
        gap-2
        rounded-xl
        border
        border-slate-200
        px-2.5
        py-2.5
        text-left
        transition
        duration-150

        ${
          disabled
            ? "cursor-not-allowed opacity-45"
            : "hover:border-[#CFE5D8] hover:bg-[#F6FBF8]"
        }
      `}
    >
      <div
        className="
          flex
          h-8
          w-8
          shrink-0
          items-center
          justify-center
          rounded-lg
          bg-[#EAF5EF]
        "
      >
        <Icon
          size={15}
          strokeWidth={2}
          className="text-[#0B5D3B]"
        />
      </div>

      <span
        className="
          min-w-0
          truncate
          text-[9px]
          font-semibold
          text-[#17221D]
        "
      >
        {label}
      </span>
    </button>
  );
};

/* =========================================================
   DATE
========================================================= */

const isDueToday = (
  value
) => {
  if (!value) {
    return false;
  }

  const dueDate =
    parseLocalDate(
      value
    );

  if (!dueDate) {
    return false;
  }

  const today =
    new Date();

  return (
    dueDate.getFullYear() ===
      today.getFullYear() &&
    dueDate.getMonth() ===
      today.getMonth() &&
    dueDate.getDate() ===
      today.getDate()
  );
};

/* =========================================================
   LOCAL DATE PARSER
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
    return new Date(
      Number(
        match[1]
      ),
      Number(
        match[2]
      ) - 1,
      Number(
        match[3]
      )
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

/* =========================================================
   CUSTOMER NAME
========================================================= */

const getCustomerName = (
  loan
) => {
  return (
    loan?.customer?.personal?.name ||
    loan?.customer?.customerName ||
    loan?.customerName ||
    "Customer"
  );
};

/* =========================================================
   PAYMENT AMOUNT
========================================================= */

const getPaymentAmount = (
  scheduleRow
) => {
  return Number(
    scheduleRow?.remainingAmount ??
      scheduleRow?.paymentAmount ??
      scheduleRow?.emiAmount ??
      scheduleRow?.amount ??
      0
  );
};

export default Dashboard;