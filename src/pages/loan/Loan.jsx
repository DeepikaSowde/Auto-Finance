// src/pages/loan/Loan.jsx

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import { createPortal } from "react-dom";

import {
  Search,
  FileText,
  CalendarClock,
  TrendingUp,
  CarFront,
  Activity,
  MoreHorizontal,
  RotateCcw,
  ChevronDown,
  MoreVertical,
  Eye,
  IndianRupee,
  CheckCircle2,
  CalendarDays,
  AlertTriangle,
  WalletCards,
  ReceiptText,
  SlidersHorizontal,
} from "lucide-react";

import useDashboardData from "../../hooks/dashboard/useDashboardData";
import useLoanFilters from "../../hooks/loans/seLoanFilters";

import LoanDetailsDrawer from "../../components/loans/LoanDetailsDrawer";
import LoanActionMenu from "../../components/loans/LoanActionMenu";

import {
  getSchedulePaidAmount,
} from "../../services/repaymentStorage";

import {
  getCustomerId,
  getCustomerMobile,
  getCustomerName,
  getEmi,
  getLoanOutstanding,
  getRegistration,
  getVehicleName,
} from "../../utils/loan/loanHelpers";

/* =========================================================
   MAIN
========================================================= */

const LoanPage = () => {
  const {
    loans = [],
    approvedCollections = [],
  } = useDashboardData();

  const [selectedLoan, setSelectedLoan] =
    useState(null);

  const [openMenuId, setOpenMenuId] =
    useState(null);

  const [menuPosition, setMenuPosition] =
    useState({
      top: 0,
      left: 0,
    });

  const [activeTab, setActiveTab] =
    useState("all");

  const [filtersOpen, setFiltersOpen] =
    useState(false);

  const [currentPage, setCurrentPage] =
    useState(1);

  const rowsPerPage = 7;

  /* =======================================================
     DISPLAY COPY
     Existing repayment/payment calculations preserved.
  ====================================================== */

  const displayLoans = useMemo(() => {
    if (!Array.isArray(loans)) {
      return [];
    }

    return loans.map((loan) => {
      const status =
        normalizeStatus(
          loan?.status
        );

      const isClosedLike = [
        "foreclosed",
        "closed",
        "paid",
        "paid_off",
        "paid off",
        "settled",
      ].includes(status);

      if (isClosedLike) {
        return {
          ...loan,

          paymentHistory:
            Array.isArray(
              loan?.paymentHistory
            )
              ? loan.paymentHistory
              : [],

          repaymentSchedule:
            Array.isArray(
              loan?.repaymentSchedule
            )
              ? loan.repaymentSchedule
              : [],
        };
      }

      const schedule =
        Array.isArray(
          loan?.repaymentSchedule
        )
          ? loan.repaymentSchedule
          : [];

      const repaymentSchedule =
        schedule.map((row) => {
          const scheduledAmount =
            getRowAmount(row);

          const approvedAmount =
            getApprovedAmountForRow(
              loan,
              row,
              approvedCollections
            );

          const storedPaidAmount =
            getSchedulePaidAmount(row);

          const paidAmount =
            Math.max(
              storedPaidAmount,
              approvedAmount
            );

          const remainingAmount =
            Math.max(
              scheduledAmount -
                paidAmount,
              0
            );

          const originalStatus =
            normalizeStatus(
              row?.status
            );

          let displayStatus =
            originalStatus;

          if (
            remainingAmount <= 0 &&
            scheduledAmount > 0
          ) {
            displayStatus = "paid";
          } else if (
            paidAmount > 0 &&
            remainingAmount > 0
          ) {
            displayStatus =
              "partially paid";
          } else if (
            isDateOverdue(
              row?.dueDate
            ) &&
            isOpenStatus(
              originalStatus
            )
          ) {
            displayStatus =
              "overdue";
          }

          return {
            ...row,
            approvedAmount,
            paidAmount,
            remainingAmount,
            balance:
              remainingAmount,
            status:
              displayStatus,
          };
        });

      return {
        ...loan,

        repaymentSchedule,
        paymentHistory:
          buildDisplayPaymentHistory(
            loan,
            approvedCollections
          ),
      };
    });
  }, [
    loans,
    approvedCollections,
  ]);

  /* =======================================================
     FILTERS
  ====================================================== */

  const {
    filteredLoans,

    search,
    setSearch,

    statusFilter,
    setStatusFilter,

    loanTypeFilter,
    setLoanTypeFilter,

    dueFilter,
    setDueFilter,

    dateFilter,
    setDateFilter,

    sortBy,
    setSortBy,
  } = useLoanFilters(
    displayLoans
  );

  /* =======================================================
     TABS
  ====================================================== */

  const tabs = useMemo(() => {
    return [
      {
        key: "all",
        label: "All Loans",
        loans: filteredLoans,
      },

      {
        key: "today",
        label: "Due Today",
        loans:
          filteredLoans.filter(
            hasRemainingDueToday
          ),
      },

      {
        key: "overdue",
        label: "Overdue",
        loans:
          filteredLoans.filter(
            hasRemainingOverdue
          ),
      },

      {
        key: "upcoming",
        label: "Upcoming",
        loans:
          filteredLoans.filter(
            hasUpcomingRemainingDue
          ),
      },

      {
        key: "paid",
        label: "Paid Today",
        loans:
          filteredLoans.filter(
            isPaidToday
          ),
      },
    ];
  }, [
    filteredLoans,
  ]);

  const activeTabData =
    tabs.find(
      (tab) =>
        tab.key === activeTab
    ) ||
    tabs[0];

  /* =======================================================
     PAGINATION
  ====================================================== */

  useEffect(() => {
    setCurrentPage(1);
  }, [
    activeTab,
    search,
    statusFilter,
    loanTypeFilter,
    dueFilter,
    dateFilter,
    sortBy,
  ]);

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        activeTabData.loans.length /
          rowsPerPage
      )
    );

  useEffect(() => {
    if (
      currentPage >
      totalPages
    ) {
      setCurrentPage(
        totalPages
      );
    }
  }, [
    currentPage,
    totalPages,
  ]);

  const startIndex =
    activeTabData.loans.length ===
    0
      ? 0
      : (currentPage - 1) *
        rowsPerPage;

  const endIndex =
    Math.min(
      startIndex +
        rowsPerPage,
      activeTabData.loans.length
    );

  const paginatedLoans =
    activeTabData.loans.slice(
      startIndex,
      endIndex
    );

  /* =======================================================
     KEEP DRAWER DATA FRESH
  ====================================================== */

  useEffect(() => {
    if (!selectedLoan) {
      return;
    }

    const selectedKey =
      selectedLoan?.id ||
      selectedLoan?.loanNumber;

    const latest =
      displayLoans.find(
        (loan) =>
          String(
            loan?.id ||
              loan?.loanNumber
          ) ===
          String(
            selectedKey
          )
      );

    if (latest) {
      setSelectedLoan(
        latest
      );
    } else {
      setSelectedLoan(
        null
      );
    }
  }, [
    displayLoans,
  ]);

  /* =======================================================
     CLOSE ACTION MENU
  ====================================================== */

  useEffect(() => {
    const handleDocumentClick =
      () => {
        setOpenMenuId(
          null
        );
      };

    const handleScroll =
      () => {
        setOpenMenuId(
          null
        );
      };

    document.addEventListener(
      "click",
      handleDocumentClick
    );

    window.addEventListener(
      "scroll",
      handleScroll,
      true
    );

    return () => {
      document.removeEventListener(
        "click",
        handleDocumentClick
      );

      window.removeEventListener(
        "scroll",
        handleScroll,
        true
      );
    };
  }, []);

  /* =======================================================
     KPI
  ====================================================== */

  const kpis = useMemo(() => {
    let totalOutstanding = 0;
    let todayDueAmount = 0;
    let todayDueCount = 0;
    let overdueAmount = 0;
    let overdueCount = 0;
    let activeCount = 0;

    displayLoans.forEach(
      (loan) => {
        const masterStatus =
          normalizeStatus(
            loan?.status
          );

        if (
          masterStatus ===
          "active"
        ) {
          activeCount += 1;
        }

        totalOutstanding +=
          getLoanOutstanding(
            loan
          );

        const remainingSchedule =
          getRemainingSchedule(
            loan
          );

        remainingSchedule.forEach(
          (row) => {
            const remaining =
              getRemainingAmount(
                row
              );

            const dueDate =
              parseLocalDate(
                row?.dueDate
              );

            if (
              !dueDate ||
              remaining <= 0
            ) {
              return;
            }

            if (
              isToday(
                dueDate
              )
            ) {
              todayDueAmount +=
                remaining;

              todayDueCount +=
                1;
            }

            if (
              isBeforeToday(
                dueDate
              )
            ) {
              overdueAmount +=
                remaining;

              overdueCount +=
                1;
            }
          }
        );
      }
    );

    return [
      {
        icon: WalletCards,
        label: "Total Loans",
        value:
          displayLoans.length.toLocaleString(
            "en-IN"
          ),
        note: "All loan accounts",
        tone: "neutral",
      },

      {
        icon: CheckCircle2,
        label: "Active Loans",
        value:
          activeCount.toLocaleString(
            "en-IN"
          ),
        note: "Currently servicing",
        tone: "green",
      },

      {
        icon: IndianRupee,
        label: "Total Outstanding",
        value:
          formatMoney(
            totalOutstanding
          ),
        note:
          "Principal + accrued interest",
        tone: "green",
      },

      {
        icon: CalendarDays,
        label: "Today's Due",
        value:
          formatMoney(
            todayDueAmount
          ),
        note:
          `${todayDueCount.toLocaleString(
            "en-IN"
          )} EMI${
            todayDueCount ===
            1
              ? ""
              : "s"
          } due today`,
        tone: "neutral",
      },

      {
        icon: AlertTriangle,
        label: "Overdue",
        value:
          formatMoney(
            overdueAmount
          ),
        note:
          `${overdueCount.toLocaleString(
            "en-IN"
          )} overdue account${
            overdueCount ===
            1
              ? ""
              : "s"
          }`,
        tone: "danger",
      },
    ];
  }, [
    displayLoans,
  ]);

  /* =======================================================
     RESET
  ====================================================== */

  const resetFilters = () => {
    setSearch("");
    setStatusFilter(
      "All Status"
    );
    setLoanTypeFilter(
      "All Loan Types"
    );
    setDueFilter(
      "All Due Status"
    );
    setDateFilter("");
    setSortBy("recent");
  };

  /* =======================================================
     RECORD PAYMENT
  ====================================================== */

  const handleRecordPayment =
    (loan) => {
      window.dispatchEvent(
        new CustomEvent(
          "auto-finance:record-payment",
          {
            detail: {
              loan,
            },
          }
        )
      );
    };

  return (
    <div
      className="
        min-h-full
        w-full
        min-w-0
        max-w-full
        overflow-x-hidden
        bg-[#F7FAF8]
        px-3
        py-3
        sm:px-4
        sm:py-4
        lg:px-5
        lg:py-5
      "
    >
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="mb-4">
        <div className="flex flex-wrap items-center gap-2">
          <h1
            className="
              text-[23px]
              font-bold
              tracking-tight
              text-[#17221D]
              sm:text-[25px]
            "
          >
            Loans
          </h1>

          <span
            className="
              inline-flex
              items-center
              rounded-full
              border
              border-[#CFE8D9]
              bg-[#EAF5EF]
              px-2.5
              py-1
              text-[9px]
              font-extrabold
              text-[#0B5D3B]
            "
          >
            Portfolio &amp; Collection
          </span>
        </div>

        <p
          className="
            mt-1
            max-w-full
            text-[11px]
            font-medium
            leading-relaxed
            text-[#577092]
            sm:text-[12px]
          "
        >
          Manage loans, repayments and
          collection activity in one place.
        </p>
      </header>

      {/* =====================================================
          KPI CARDS
      ====================================================== */}

      <section
        className="
          grid
          grid-cols-1
          gap-2.5
          sm:grid-cols-2
          xl:grid-cols-5
        "
      >
        {kpis.map(
          (card) => (
            <ManagementKpiCard
              key={
                card.label
              }
              {...card}
            />
          )
        )}
      </section>

      {/* =====================================================
          FILTERS
      ====================================================== */}

      <section className="mt-3 min-w-0">
        <div
          className="
            mb-2
            flex
            justify-end
            lg:hidden
          "
        >
          <button
            type="button"
            onClick={() =>
              setFiltersOpen(
                (value) =>
                  !value
              )
            }
            className="
              inline-flex
              h-9
              items-center
              gap-1.5
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              text-[10px]
              font-extrabold
              text-slate-600
              shadow-sm
              transition
              hover:border-[#A8D0BD]
              hover:bg-[#F6FBF8]
              hover:text-[#0B5D3B]
            "
          >
            <SlidersHorizontal
              size={13}
            />

            {filtersOpen
              ? "Hide Filters"
              : "Filters"}
          </button>
        </div>

        <div
          className={`
            ${
              filtersOpen
                ? "block"
                : "hidden"
            }
            lg:block
          `}
        >
          <LoanFilterBar
            search={search}
            setSearch={setSearch}
            statusFilter={
              statusFilter
            }
            setStatusFilter={
              setStatusFilter
            }
            loanTypeFilter={
              loanTypeFilter
            }
            setLoanTypeFilter={
              setLoanTypeFilter
            }
            dueFilter={dueFilter}
            setDueFilter={setDueFilter}
            dateFilter={
              dateFilter
            }
            setDateFilter={
              setDateFilter
            }
            sortBy={sortBy}
            setSortBy={setSortBy}
            onReset={
              resetFilters
            }
          />
        </div>
      </section>

      {/* =====================================================
          RESPONSIVE TABS
      ====================================================== */}

      <section
        className="
          mt-4
          w-full
          min-w-0
          overflow-x-auto
          overflow-y-hidden
          overscroll-x-contain
          border-b
          border-slate-200
          pb-2
          touch-pan-x
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        <div
          className="
            flex
            w-max
            min-w-full
            items-center
            gap-2
            pr-1
            sm:gap-2.5
          "
        >
          {tabs.map(
            (tab) => {
              const TabIcon =
                tab.key ===
                "all"
                  ? FileText
                  : tab.key ===
                    "today"
                  ? CalendarClock
                  : tab.key ===
                    "overdue"
                  ? AlertTriangle
                  : tab.key ===
                    "upcoming"
                  ? TrendingUp
                  : CheckCircle2;

              const active =
                activeTab ===
                tab.key;

              const colors = {
                all: {
                  active:
                    "border-[#0B5D3B] bg-[#EAF5EF] text-[#0B5D3B]",
                  icon:
                    "bg-white text-[#0B5D3B]",
                  count:
                    "bg-white text-[#0B5D3B]",
                },

                today: {
                  active:
                    "border-[#3B82F6] bg-[#EFF6FF] text-[#2563EB]",
                  icon:
                    "bg-white text-[#2563EB]",
                  count:
                    "bg-white text-[#2563EB]",
                },

                overdue: {
                  active:
                    "border-[#EF4444] bg-[#FEF2F2] text-[#DC2626]",
                  icon:
                    "bg-white text-[#DC2626]",
                  count:
                    "bg-white text-[#DC2626]",
                },

                upcoming: {
                  active:
                    "border-[#8B5CF6] bg-[#F5F3FF] text-[#7C3AED]",
                  icon:
                    "bg-white text-[#7C3AED]",
                  count:
                    "bg-white text-[#7C3AED]",
                },

                paid: {
                  active:
                    "border-[#059669] bg-[#ECFDF5] text-[#047857]",
                  icon:
                    "bg-white text-[#047857]",
                  count:
                    "bg-white text-[#047857]",
                },
              };

              const color =
                colors[
                  tab.key
                ] ||
                colors.all;

              return (
                <button
                  key={
                    tab.key
                  }
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      tab.key
                    )
                  }
                  className={`
                    inline-flex
                    min-h-[42px]
                    shrink-0
                    items-center
                    gap-2
                    rounded-xl
                    border
                    px-3
                    py-2
                    text-[10px]
                    font-extrabold
                    shadow-sm
                    transition-all
                    duration-150
                    sm:px-3.5
                    sm:py-2.5
                    sm:text-[11px]

                    ${
                      active
                        ? `${color.active} shadow-sm`
                        : `
                          border-slate-200
                          bg-white
                          text-slate-500
                          hover:border-slate-300
                          hover:bg-slate-50
                          hover:text-[#17221D]
                        `
                    }
                  `}
                >
                  <span
                    className={`
                      flex
                      h-6
                      w-6
                      shrink-0
                      items-center
                      justify-center
                      rounded-md
                      ${
                        active
                          ? color.icon
                          : "bg-slate-100 text-slate-500"
                      }
                    `}
                  >
                    <TabIcon
                      size={13}
                      strokeWidth={
                        2.3
                      }
                    />
                  </span>

                  <span className="whitespace-nowrap">
                    {tab.label}
                  </span>

                  <span
                    className={`
                      inline-flex
                      min-w-[24px]
                      items-center
                      justify-center
                      rounded-full
                      px-1.5
                      py-0.5
                      text-[9px]
                      font-extrabold
                      ${
                        active
                          ? color.count
                          : "bg-slate-100 text-slate-500"
                      }
                    `}
                  >
                    {
                      tab.loans
                        .length
                    }
                  </span>
                </button>
              );
            }
          )}
        </div>
      </section>

      {/* =====================================================
          TABLE
      ====================================================== */}

      <section
        className="
          mt-3
          min-w-0
          overflow-hidden
          rounded-xl
          border
          border-slate-200
          bg-white
          shadow-sm
        "
      >
        {/* TABLE HEADER */}

        <div
          className="
            flex
            min-w-0
            items-center
            justify-between
            gap-3
            border-b
            border-slate-100
            px-3
            py-3
            sm:px-3.5
          "
        >
          <div
            className="
              flex
              min-w-0
              flex-1
              items-center
              gap-2.5
            "
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
                text-[#0B5D3B]
              "
            >
              <ReceiptText
                size={16}
              />
            </div>

            <div className="min-w-0">
              <h2
                className="
                  truncate
                  text-[12px]
                  font-extrabold
                  text-[#17221D]
                  sm:text-[13px]
                "
              >
                Loan Accounts
              </h2>

              <p
                className="
                  mt-0.5
                  hidden
                  truncate
                  text-[9px]
                  font-medium
                  text-slate-400
                  sm:block
                "
              >
                View and manage all loan
                accounts with key details
                and status.
              </p>
            </div>
          </div>

          <span
            className="
              shrink-0
              rounded-full
              border
              border-slate-200
              bg-slate-50
              px-2
              py-1
              text-[8px]
              font-extrabold
              text-slate-500
              sm:px-2.5
            "
          >
            {activeTabData.loans.length.toLocaleString(
              "en-IN"
            )}{" "}
            records
          </span>
        </div>

        {paginatedLoans.length ===
        0 ? (
          <EmptyLoanState />
        ) : (
          /*
           * IMPORTANT:
           * This is the ONLY horizontal-scroll area.
           * The page itself will not horizontally scroll.
           */
          <div
            className="
              w-full
              min-w-0
              overflow-x-auto
              overflow-y-hidden
              overscroll-x-contain
              touch-pan-x
              [scrollbar-width:thin]
            "
          >
            <table
              className="
                w-full
                min-w-[1080px]
                table-fixed
                border-collapse
              "
            >
              <colgroup>
                <col className="w-[22%]" />
                <col className="w-[14%]" />
                <col className="w-[10%]" />
                <col className="w-[10%]" />
                <col className="w-[13%]" />
                <col className="w-[11%]" />
                <col className="w-[8%]" />
                <col className="w-[12%]" />
              </colgroup>

              <thead
                className="
                  bg-gradient-to-r
                  from-[#F1F8F4]
                  via-[#F8FBF9]
                  to-[#F3F8F5]
                "
              >
                <tr
                  className="
                    border-b
                    border-[#DCE9E0]
                  "
                >
                  <TableHeader
                    icon={FileText}
                    tone="green"
                  >
                    Loan / Customer
                  </TableHeader>

                  <TableHeader
                    icon={CarFront}
                    tone="blue"
                  >
                    Vehicle
                  </TableHeader>

                  <TableHeader
                    align="right"
                    tone="green"
                  >
                    Loan Amount
                  </TableHeader>

                  <TableHeader
                    align="right"
                    tone="purple"
                  >
                    EMI Amount
                  </TableHeader>

                  <TableHeader
                    icon={CalendarClock}
                    tone="blue"
                  >
                    Next Due
                  </TableHeader>

                  <TableHeader
                    icon={WalletCards}
                    tone="green"
                    align="right"
                  >
                    Outstanding
                  </TableHeader>

                  <TableHeader
                    icon={Activity}
                    tone="amber"
                  >
                    Status
                  </TableHeader>

                  <TableHeader
                    icon={
                      MoreHorizontal
                    }
                    tone="slate"
                    align="center"
                    sticky
                  >
                    Actions
                  </TableHeader>
                </tr>
              </thead>

              <tbody>
                {paginatedLoans.map(
                  (loan) => (
                    <LoanMergedRow
                      key={
                        loan?.id ||
                        loan?.loanNumber
                      }
                      loan={loan}
                      selected={sameLoan(
                        selectedLoan,
                        loan
                      )}
                      openMenuId={
                        openMenuId
                      }
                      setOpenMenuId={
                        setOpenMenuId
                      }
                      menuPosition={
                        menuPosition
                      }
                      setMenuPosition={
                        setMenuPosition
                      }
                      onView={() =>
                        setSelectedLoan(
                          loan
                        )
                      }
                      onRecordPayment={
                        handleRecordPayment
                      }
                    />
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <LoanPagination
          currentPage={
            currentPage
          }
          totalPages={
            totalPages
          }
          totalItems={
            activeTabData
              .loans.length
          }
          startIndex={
            startIndex
          }
          endIndex={
            endIndex
          }
          onPrevious={() =>
            setCurrentPage(
              (page) =>
                Math.max(
                  page - 1,
                  1
                )
            )
          }
          onNext={() =>
            setCurrentPage(
              (page) =>
                Math.min(
                  page + 1,
                  totalPages
                )
            )
          }
          onPageChange={
            setCurrentPage
          }
        />
      </section>

      {/* =====================================================
          DRAWER
      ====================================================== */}

      {selectedLoan && (
        <LoanDetailsDrawer
          loan={
            selectedLoan
          }
          onClose={() =>
            setSelectedLoan(
              null
            )
          }
        />
      )}
    </div>
  );
};

/* =========================================================
   KPI CARD
========================================================= */

const ManagementKpiCard = ({
  icon: Icon,
  label,
  value,
  note,
  tone = "neutral",
}) => {
  const styles = {
    green: {
      iconBg:
        "bg-[#EAF5EF]",
      iconText:
        "text-[#0B5D3B]",
      valueText:
        "text-[#0B5D3B]",
      border:
        "border-[#DCEDE3]",
    },

    neutral: {
      iconBg:
        "bg-slate-50",
      iconText:
        "text-slate-600",
      valueText:
        "text-[#17221D]",
      border:
        "border-slate-200",
    },

    danger: {
      iconBg:
        "bg-red-50",
      iconText:
        "text-red-700",
      valueText:
        "text-red-700",
      border:
        "border-red-100",
    },
  };

  const style =
    styles[tone] ||
    styles.neutral;

  return (
    <div
      className={`
        rounded-xl
        border
        bg-white
        px-3
        py-3
        shadow-sm
        transition
        hover:-translate-y-0.5
        hover:shadow-md
        sm:px-3.5
        ${style.border}
      `}
    >
      <div
        className="
          flex
          items-start
          justify-between
          gap-2.5
          sm:gap-3
        "
      >
        <div className="min-w-0 flex-1">
          <p
            className="
              truncate
              text-[9px]
              font-extrabold
              uppercase
              tracking-[0.05em]
              text-slate-400
            "
          >
            {label}
          </p>

          <p
            className={`
              mt-1
              truncate
              text-[19px]
              font-bold
              leading-none
              tracking-tight
              sm:text-[20px]
              ${style.valueText}
            `}
          >
            {value}
          </p>

          <p
            className="
              mt-1.5
              truncate
              text-[9px]
              font-medium
              text-slate-400
            "
          >
            {note}
          </p>
        </div>

        <div
          className={`
            flex
            h-9
            w-9
            shrink-0
            items-center
            justify-center
            rounded-lg
            ${style.iconBg}
          `}
        >
          <Icon
            size={17}
            strokeWidth={2.1}
            className={
              style.iconText
            }
          />
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   FILTER BAR
========================================================= */

const LoanFilterBar = ({
  search,
  setSearch,
  statusFilter,
  setStatusFilter,
  loanTypeFilter,
  setLoanTypeFilter,
  dueFilter,
  setDueFilter,
  dateFilter,
  setDateFilter,
  sortBy,
  setSortBy,
  onReset,
}) => {
  return (
    <div
      className="
        rounded-xl
        border
        border-slate-200
        bg-white
        p-2.5
        shadow-sm
      "
    >
      <div
        className="
          grid
          grid-cols-1
          gap-2
          md:grid-cols-2
          xl:flex
          xl:items-center
        "
      >
        {/* SEARCH */}

        <div
          className="
            relative
            min-w-0
            xl:flex-1
          "
        >
          <Search
            size={15}
            strokeWidth={2}
            className="
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-slate-400
            "
          />

          <input
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Search customer, loan number, vehicle..."
            className="
              h-10
              w-full
              rounded-lg
              border
              border-slate-200
              bg-white
              pl-9
              pr-3
              text-[10px]
              font-medium
              text-[#17221D]
              outline-none
              transition
              placeholder:text-slate-400
              focus:border-[#0B5D3B]
              focus:ring-2
              focus:ring-[#0B5D3B]/10
              sm:text-[11px]
            "
          />
        </div>

        {/* STATUS */}

        <div className="min-w-0">
          <FilterSelect
            value={
              statusFilter
            }
            setValue={
              setStatusFilter
            }
            options={[
              "All Status",
              "Active",
              "Pending",
              "Overdue",
              "Closed",
              "Seized",
              "Foreclosed",
              "Written Off",
            ]}
          />
        </div>

        {/* LOAN TYPE */}

        <div className="min-w-0">
          <FilterSelect
            value={
              loanTypeFilter
            }
            setValue={
              setLoanTypeFilter
            }
            options={[
              "All Loan Types",
              "Flat",
              "Reducing",
            ]}
          />
        </div>

        {/* DUE */}

        <div className="min-w-0">
          <FilterSelect
            value={dueFilter}
            setValue={
              setDueFilter
            }
            options={[
              "All Due Status",
              "Due",
              "Overdue",
              "Completed",
            ]}
          />
        </div>

        {/* DATE */}

        <div className="min-w-0">
          <input
            type="date"
            value={
              dateFilter
            }
            onChange={(event) =>
              setDateFilter(
                event.target.value
              )
            }
            className="
              h-10
              w-full
              min-w-0
              rounded-lg
              border
              border-slate-200
              bg-white
              px-2.5
              text-[10px]
              font-medium
              text-slate-600
              outline-none
              transition
              focus:border-[#0B5D3B]
              focus:ring-2
              focus:ring-[#0B5D3B]/10
              sm:text-[11px]
              xl:w-[135px]
            "
            aria-label="Filter by due date"
          />
        </div>

        {/* SORT */}

        <div className="min-w-0">
          <FilterSelect
            value={sortBy}
            setValue={setSortBy}
            options={[
              "recent",
              "dueSoon",
              "amountHigh",
              "outstandingHigh",
              "customer",
            ]}
            labels={[
              "Sort: Recent",
              "Sort: Due Soon",
              "Sort: Amount High",
              "Sort: Outstanding High",
              "Sort: Customer",
            ]}
          />
        </div>

        {/* RESET */}

        <button
          type="button"
          onClick={onReset}
          className="
            inline-flex
            h-10
            w-full
            shrink-0
            items-center
            justify-center
            gap-1.5
            rounded-lg
            border
            border-slate-200
            bg-white
            px-3
            text-[10px]
            font-extrabold
            text-slate-500
            transition
            hover:border-slate-300
            hover:bg-slate-50
            hover:text-[#17221D]
            sm:text-[11px]
            md:w-auto
            xl:w-auto
          "
        >
          <RotateCcw
            size={12}
            strokeWidth={2}
          />

          Reset
        </button>
      </div>
    </div>
  );
};

/* =========================================================
   FILTER SELECT
========================================================= */

const FilterSelect = ({
  value,
  setValue,
  options = [],
  labels = [],
}) => {
  return (
    <div
      className="
        relative
        w-full
        min-w-0
      "
    >
      <select
        value={value}
        onChange={(event) =>
          setValue(
            event.target.value
          )
        }
        className="
          h-10
          w-full
          min-w-0
          appearance-none
          rounded-lg
          border
          border-slate-200
          bg-white
          px-2.5
          pr-7
          text-[10px]
          font-semibold
          text-slate-600
          outline-none
          transition
          focus:border-[#0B5D3B]
          focus:ring-2
          focus:ring-[#0B5D3B]/10
          sm:text-[11px]
          xl:min-w-[120px]
        "
      >
        {options.map(
          (
            option,
            index
          ) => (
            <option
              key={
                option
              }
              value={
                option
              }
            >
              {labels[
                index
              ] ||
                option}
            </option>
          )
        )}
      </select>

      <ChevronDown
        size={12}
        className="
          pointer-events-none
          absolute
          right-2.5
          top-1/2
          -translate-y-1/2
          text-slate-400
        "
      />
    </div>
  );
};

/* =========================================================
   ROW
========================================================= */

const LoanMergedRow = ({
  loan,
  selected,
  openMenuId,
  setOpenMenuId,
  menuPosition,
  setMenuPosition,
  onView,
  onRecordPayment,
}) => {
  const loanId =
    loan?.id ||
    loan?.loanNumber;

  const customerName =
    getCustomerName(
      loan
    );

  const customerId =
    getCustomerId(
      loan
    );

  const customerMobile =
    getCustomerMobile(
      loan
    );

  const vehicleName =
    getVehicleName(
      loan
    );

  const registration =
    getRegistration(
      loan
    );

  const emi =
    getEmi(loan);

  const outstanding =
    getLoanOutstanding(
      loan
    );

  const nextDue =
    getNextDueDisplay(
      loan
    );

  const dueStatus =
    getDisplayDueStatus(
      loan
    );

  const status =
    getManagementStatus(
      loan,
      dueStatus
    );

const handleMenuToggle = (event) => {
  event.stopPropagation();

  const rect =
    event.currentTarget.getBoundingClientRect();

  const gap = 6;

  /*
   * Responsive menu sizing.
   * Keep enough space on mobile/tablet while
   * preserving the existing desktop menu size.
   */
  const menuWidth = Math.min(
    230,
    window.innerWidth - 16
  );

  const menuHeight = Math.min(
    300,
    window.innerHeight - 16
  );

  let left =
    rect.right -
    menuWidth;

  let top =
    rect.bottom +
    gap;

  /*
   * Horizontal viewport protection.
   */
  left = Math.max(
    8,
    Math.min(
      left,
      window.innerWidth -
        menuWidth -
        8
    )
  );

  /*
   * If there is not enough room below,
   * open above the button.
   */
  if (
    top +
      menuHeight >
    window.innerHeight -
      8
  ) {
    top =
      rect.top -
      menuHeight -
      gap;
  }

  /*
   * Final vertical protection.
   */
  top = Math.max(
    8,
    Math.min(
      top,
      window.innerHeight -
        menuHeight -
        8
    )
  );

  setMenuPosition({
    top,
    left,
  });

  setOpenMenuId(
    (current) =>
      current === loanId
        ? null
        : loanId
  );
};

  return (
    <tr
      onClick={
        onView
      }
      className={`
        cursor-pointer
        border-b
        border-slate-100
        transition-colors
        hover:bg-[#FAFCFB]

        ${
          selected
            ? "bg-[#F2F8F4]"
            : "bg-white"
        }
      `}
    >
      {/* LOAN / CUSTOMER */}

      <td
        className="
          px-2
          py-3
          align-middle
          sm:px-3
        "
      >
        <p
          className="
            truncate
            text-[10px]
            font-extrabold
            text-[#17221D]
            sm:text-[11px]
          "
        >
          {loan?.loanNumber ||
            "—"}
        </p>

        <p
          className="
            mt-0.5
            truncate
            text-[10px]
            font-bold
            text-[#17221D]
            sm:text-[11px]
          "
        >
          {customerName}
        </p>

        <p
          className="
            mt-0.5
            truncate
            text-[8px]
            font-medium
            text-slate-400
            sm:text-[9px]
          "
        >
          {customerId}

          {customerMobile
            ? ` • ${customerMobile}`
            : ""}
        </p>
      </td>

      {/* VEHICLE */}

      <td
        className="
          px-2
          py-3
          align-middle
          sm:px-3
        "
      >
        <p
          className="
            truncate
            text-[10px]
            font-extrabold
            text-slate-700
            sm:text-[11px]
          "
        >
          {registration}
        </p>

        <p
          className="
            mt-0.5
            truncate
            text-[8px]
            font-medium
            text-slate-400
            sm:text-[9px]
          "
        >
          {vehicleName}
        </p>
      </td>

      {/* LOAN AMOUNT */}

      <td
        className="
          px-1.5
          py-3
          text-right
          align-middle
          sm:px-2
        "
      >
        <span
          className="
            whitespace-nowrap
            text-[10px]
            font-bold
            text-slate-700
            sm:text-[11px]
          "
        >
          ₹
          {formatNumber(
            loan?.loanAmount
          )}
        </span>
      </td>

      {/* EMI */}

      <td
        className="
          px-1.5
          py-3
          text-right
          align-middle
          sm:px-2
        "
      >
        <span
          className="
            whitespace-nowrap
            text-[10px]
            font-extrabold
            text-[#0B5D3B]
            sm:text-[11px]
          "
        >
          ₹
          {formatNumber(
            emi
          )}
        </span>
      </td>

      {/* NEXT DUE */}

      <td
        className="
          px-2
          py-3
          align-middle
          sm:px-3
        "
      >
        <div className="min-w-0">
          <p
            className={`
              truncate
              text-[10px]
              font-extrabold
              sm:text-[11px]

              ${
                dueStatus ===
                "Overdue"
                  ? "text-red-600"
                  : dueStatus ===
                    "Due"
                  ? "text-amber-600"
                  : "text-[#17221D]"
              }
            `}
          >
            {formatDate(
              nextDue?.dueDate
            )}
          </p>

          <p
            className={`
              mt-0.5
              truncate
              text-[8px]
              font-bold
              sm:text-[9px]

              ${
                dueStatus ===
                "Overdue"
                  ? "text-red-400"
                  : dueStatus ===
                    "Due"
                  ? "text-amber-500"
                  : "text-slate-400"
              }
            `}
          >
            {getDueMessage(
              nextDue?.dueDate,
              dueStatus
            )}
          </p>
        </div>
      </td>

      {/* OUTSTANDING */}

      <td
        className="
          px-1.5
          py-3
          text-right
          align-middle
          sm:px-2
        "
      >
        <span
          className="
            whitespace-nowrap
            text-[10px]
            font-extrabold
            text-[#17221D]
            sm:text-[11px]
          "
        >
          ₹
          {formatNumber(
            outstanding
          )}
        </span>
      </td>

      {/* STATUS */}

      <td
        className="
          px-1.5
          py-3
          align-middle
          sm:px-2
        "
      >
        <StatusBadge
          status={status}
        />
      </td>

      {/* ACTIONS */}

      <td
        className="
          sticky
          right-0
          z-20
          w-[130px]
          min-w-[130px]
          border-l
          border-slate-100
          bg-white
          px-1
          py-2.5
          align-middle
          shadow-[-8px_0_14px_rgba(15,23,42,0.04)]
        "
      >
        <div
          className="
            flex
            items-center
            justify-center
            gap-1
          "
        >
          {/* VIEW */}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onView?.();
            }}
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-md
              border
              border-slate-200
              bg-white
              text-slate-600
              transition
              hover:border-[#0B5D3B]
              hover:bg-[#F4FAF6]
              hover:text-[#0B5D3B]
            "
            title="View Loan"
            aria-label="View Loan"
          >
            <Eye
              size={14}
            />
          </button>

          {/* RECORD PAYMENT */}

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              onRecordPayment?.(
                loan
              );
            }}
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-md
              border
              border-[#8AC5A5]
              bg-[#F4FAF6]
              text-[#0B5D3B]
              transition
              hover:bg-[#EAF5EF]
            "
            title="Record Payment"
            aria-label="Record Payment"
          >
            <IndianRupee
              size={13}
            />
          </button>

          {/* MORE */}

          <button
            type="button"
            onClick={
              handleMenuToggle
            }
            className={`
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-md
              border
              bg-white
              transition

              ${
                openMenuId ===
                loanId
                  ? "border-[#0B5D3B] bg-[#EAF5EF] text-[#0B5D3B] shadow-sm"
                  : "border-slate-200 text-slate-500 hover:border-[#A8D0BD] hover:bg-[#F6FBF8] hover:text-[#0B5D3B]"
              }
            `}
            title="More Actions"
            aria-label="More Actions"
            aria-expanded={
              openMenuId ===
              loanId
            }
          >
            <MoreVertical
              size={16}
              strokeWidth={2.5}
            />
          </button>

       {openMenuId === loanId &&
  typeof document !== "undefined" &&
  createPortal(
    <LoanActionMenu
      loan={loan}
      position={menuPosition}
      onClose={() =>
        setOpenMenuId(null)
      }
      onView={() => {
        setOpenMenuId(null);
        onView?.();
      }}
    />,
    document.body
  )}
        </div>
      </td>
    </tr>
  );
};

/* =========================================================
   STATUS BADGE
========================================================= */

const StatusBadge = ({
  status,
}) => {
  const map = {
    Active:
      "border-[#CFE8D9] bg-[#EAF5EF] text-[#0B5D3B]",

    Pending:
      "border-amber-200 bg-amber-50 text-amber-700",

    Due:
      "border-amber-200 bg-amber-50 text-amber-700",

    "Due Today":
      "border-amber-200 bg-amber-50 text-amber-700",

    "Due Tomorrow":
      "border-amber-200 bg-amber-50 text-amber-700",

    Overdue:
      "border-red-200 bg-red-50 text-red-700",

    Paid:
      "border-emerald-200 bg-emerald-50 text-emerald-700",

    Foreclosed:
      "border-violet-200 bg-violet-50 text-violet-700",
  };

  return (
    <span
      className={`
        inline-flex
        max-w-full
        items-center
        justify-center
        whitespace-nowrap
        rounded-full
        border
        px-2
        py-1.5
        text-[8px]
        font-extrabold
        sm:text-[9px]
        ${
          map[status] ||
          "border-slate-200 bg-slate-100 text-slate-600"
        }
      `}
    >
      <span className="truncate">
        {status}
      </span>
    </span>
  );
};

/* =========================================================
   PAGINATION
========================================================= */

const LoanPagination = ({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPrevious,
  onNext,
  onPageChange,
}) => {
  const pages =
    Array.from(
      {
        length:
          totalPages,
      },
      (_, index) =>
        index + 1
    );

  return (
    <div
      className="
        flex
        flex-col
        items-center
        justify-between
        gap-2
        border-t
        border-slate-100
        px-3
        py-2.5
        sm:flex-row
      "
    >
      <p
        className="
          text-center
          text-[9px]
          font-medium
          text-slate-400
          sm:text-left
        "
      >
        Showing{" "}
        <span className="font-extrabold text-slate-600">
          {totalItems ===
          0
            ? 0
            : startIndex +
              1}
        </span>{" "}
        to{" "}
        <span className="font-extrabold text-slate-600">
          {endIndex}
        </span>{" "}
        of{" "}
        <span className="font-extrabold text-slate-600">
          {totalItems}
        </span>{" "}
        loans
      </p>

      <div
        className="
          flex
          max-w-full
          items-center
          gap-1
          overflow-x-auto
          [scrollbar-width:none]
          [&::-webkit-scrollbar]:hidden
        "
      >
        <button
          type="button"
          onClick={
            onPrevious
          }
          disabled={
            currentPage ===
            1
          }
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-md
            border
            border-slate-200
            text-slate-500
            transition
            hover:border-[#A8D0BD]
            hover:bg-[#F6FBF8]
            hover:text-[#0B5D3B]
            disabled:opacity-40
          "
        >
          ‹
        </button>

        {pages.map(
          (page) => (
            <button
              key={page}
              type="button"
              onClick={() =>
                onPageChange(
                  page
                )
              }
              className={`
                flex
                h-8
                min-w-8
                shrink-0
                items-center
                justify-center
                rounded-md
                px-1.5
                text-[9px]
                font-extrabold

                ${
                  currentPage ===
                  page
                    ? "bg-[#0B5D3B] text-white shadow-sm"
                    : "border border-slate-200 text-slate-500 hover:border-[#A8D0BD] hover:bg-[#F6FBF8] hover:text-[#0B5D3B]"
                }
              `}
            >
              {page}
            </button>
          )
        )}

        <button
          type="button"
          onClick={onNext}
          disabled={
            currentPage ===
            totalPages
          }
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-md
            border
            border-slate-200
            text-slate-500
            transition
            hover:border-[#A8D0BD]
            hover:bg-[#F6FBF8]
            hover:text-[#0B5D3B]
            disabled:opacity-40
          "
        >
          ›
        </button>
      </div>
    </div>
  );
};

/* =========================================================
   EMPTY
========================================================= */

const EmptyLoanState = () => (
  <div
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
        h-10
        w-10
        items-center
        justify-center
        rounded-full
        bg-slate-50
        text-slate-400
      "
    >
      <ReceiptText
        size={18}
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
      No loans found
    </p>

    <p
      className="
        mt-1
        text-[10px]
        font-medium
        text-slate-400
      "
    >
      Loans matching the
      current filters will
      appear here.
    </p>
  </div>
);

/* =========================================================
   TABLE HEADER
========================================================= */

const TableHeader = ({
  children,
  icon: Icon,
  align = "left",
  tone = "slate",
  sticky = false,
}) => {
  const styles = {
    green: {
      bg:
        "bg-[#EAF5EF]",
      icon:
        "text-[#0B5D3B]",
    },

    blue: {
      bg:
        "bg-blue-50",
      icon:
        "text-blue-600",
    },

    purple: {
      bg:
        "bg-purple-50",
      icon:
        "text-purple-600",
    },

    amber: {
      bg:
        "bg-amber-50",
      icon:
        "text-amber-600",
    },

    slate: {
      bg:
        "bg-slate-100",
      icon:
        "text-slate-600",
    },
  };

  const style =
    styles[tone] ||
    styles.slate;

  return (
    <th
      className={`
        px-1.5
        py-3
        text-[8px]
        font-extrabold
        uppercase
        tracking-[0.04em]
        text-slate-500
        sm:px-2

        ${
          align ===
          "right"
            ? "text-right"
            : align ===
              "center"
            ? "text-center"
            : "text-left"
        }

        ${
          sticky
            ? "sticky right-0 z-30 border-l border-[#DCE9E0] bg-[#F6FAF7] shadow-[-8px_0_14px_rgba(15,23,42,0.04)]"
            : ""
        }
      `}
    >
      <div
        className={`
          flex
          min-w-0
          items-center
          gap-1

          ${
            align ===
            "right"
              ? "justify-end"
              : align ===
                "center"
              ? "justify-center"
              : "justify-start"
          }
        `}
      >
        {Icon && (
          <span
            className={`
              flex
              h-5
              w-5
              shrink-0
              items-center
              justify-center
              rounded-md
              ${style.bg}
            `}
          >
            <Icon
              size={11}
              strokeWidth={
                2.3
              }
              className={
                style.icon
              }
            />
          </span>
        )}

        <span className="truncate whitespace-nowrap">
          {children}
        </span>
      </div>
    </th>
  );
};

/* =========================================================
   HELPERS
========================================================= */

const normalizeStatus =
  (value) =>
    String(
      value || ""
    )
      .trim()
      .toLowerCase()
      .replace(
        /[-_]+/g,
        " "
      );

const sameLoan = (
  a,
  b
) => {
  if (!a || !b) {
    return false;
  }

  return (
    String(
      a?.id ||
        a?.loanNumber
    ) ===
    String(
      b?.id ||
        b?.loanNumber
    )
  );
};

const isOpenStatus =
  (value) =>
    [
      "pending",
      "due",
      "overdue",
      "partially paid",
      "partial",
    ].includes(
      normalizeStatus(
        value
      )
    );

const getRowAmount =
  (row) =>
    Number(
      row?.paymentAmount ??
        row?.emiAmount ??
        row?.amount ??
        0
    );

const isDateOverdue =
  (value) => {
    const date =
      parseLocalDate(
        value
      );

    if (!date) {
      return false;
    }

    return (
      getDayStart(
        date
      ).getTime() <
      getTodayStart().getTime()
    );
  };

const getRemainingAmount =
  (row) =>
    Math.max(
      Number(
        row?.remainingAmount ??
          row?.balance ??
          row?.paymentAmount ??
          row?.emiAmount ??
          row?.amount ??
          0
      ),
      0
    );

const getRemainingSchedule =
  (loan) => {
    const status =
      normalizeStatus(
        loan?.status
      );

    if (
      [
        "foreclosed",
        "closed",
        "paid",
        "paid off",
        "paid_off",
        "settled",
      ].includes(status)
    ) {
      return [];
    }

    const schedule =
      Array.isArray(
        loan?.repaymentSchedule
      )
        ? loan.repaymentSchedule
        : [];

    return schedule.filter(
      (row) =>
        getRemainingAmount(
          row
        ) > 0
    );
  };

const getNextDueDisplay =
  (loan) => {
    const rows =
      getRemainingSchedule(
        loan
      );

    if (!rows.length) {
      return null;
    }

    return [
      ...rows,
    ].sort(
      (a, b) => {
        const aDate =
          parseLocalDate(
            a?.dueDate
          );

        const bDate =
          parseLocalDate(
            b?.dueDate
          );

        return (
          (
            aDate?.getTime() ??
            Number.MAX_SAFE_INTEGER
          ) -
          (
            bDate?.getTime() ??
            Number.MAX_SAFE_INTEGER
          )
        );
      }
    )[0];
  };

const getDisplayDueStatus =
  (loan) => {
    const remaining =
      getRemainingSchedule(
        loan
      );

    if (
      !remaining.length
    ) {
      return "Completed";
    }

    if (
      remaining.some(
        (row) =>
          isBeforeToday(
            row?.dueDate
          )
      )
    ) {
      return "Overdue";
    }

    return "Due";
  };

const getManagementStatus =
  (
    loan,
    dueStatus
  ) => {
    const rawStatus =
      normalizeStatus(
        loan?.status
      );

    if (
      rawStatus ===
      "foreclosed"
    ) {
      return "Foreclosed";
    }

    if (
      rawStatus ===
        "closed" ||
      rawStatus ===
        "paid" ||
      rawStatus ===
        "paid off" ||
      rawStatus ===
        "settled"
    ) {
      return "Paid";
    }

    if (
      dueStatus ===
      "Overdue"
    ) {
      return "Overdue";
    }

    if (
      dueStatus ===
      "Completed"
    ) {
      return "Paid";
    }

    if (
      dueStatus ===
      "Due"
    ) {
      const nextDue =
        getNextDueDisplay(
          loan
        );

      const dueDate =
        parseLocalDate(
          nextDue?.dueDate
        );

      if (!dueDate) {
        return "Due";
      }

      const today =
        getTodayStart();

      const dueStart =
        getDayStart(
          dueDate
        );

      const diffDays =
        Math.round(
          (
            dueStart.getTime() -
            today.getTime()
          ) /
            (
              1000 *
              60 *
              60 *
              24
            )
        );

      if (
        diffDays ===
        0
      ) {
        return "Due Today";
      }

      if (
        diffDays ===
        1
      ) {
        return "Due Tomorrow";
      }

      if (
        diffDays > 1
      ) {
        return `Due in ${diffDays} days`;
      }

      return "Due";
    }

    return (
      loan?.status ||
      "Active"
    );
  };

const hasRemainingDueToday =
  (loan) =>
    getRemainingSchedule(
      loan
    ).some((row) =>
      isToday(
        row?.dueDate
      )
    );

const hasRemainingOverdue =
  (loan) =>
    getRemainingSchedule(
      loan
    ).some((row) =>
      isBeforeToday(
        row?.dueDate
      )
    );

const hasUpcomingRemainingDue =
  (loan) => {
    const today =
      getTodayStart();

    const end =
      new Date(
        today
      );

    end.setDate(
      end.getDate() +
        7
    );

    return getRemainingSchedule(
      loan
    ).some(
      (row) => {
        const date =
          getDayStart(
            row?.dueDate
          );

        return (
          date &&
          date >
            today &&
          date <= end
        );
      }
    );
  };

const isPaidToday =
  (loan) => {
    const today =
      getTodayStart();

    const history =
      Array.isArray(
        loan?.paymentHistory
      )
        ? loan.paymentHistory
        : [];

    return history.some(
      (payment) => {
        const date =
          parseLocalDate(
            payment?.date ||
              payment?.paidAt ||
              payment?.paymentDate
          );

        return (
          date &&
          getDayStart(
            date
          ).getTime() ===
            today.getTime()
        );
      }
    );
  };

const getDueMessage =
  (
    dueDate,
    dueStatus
  ) => {
    if (
      dueStatus ===
      "Completed"
    ) {
      return "No upcoming payment";
    }

    if (!dueDate) {
      return "Payment due";
    }

    const date =
      getDayStart(
        dueDate
      );

    const today =
      getTodayStart();

    if (
      !date ||
      !today
    ) {
      return "Payment due";
    }

    const difference =
      differenceInDays(
        today,
        date
      );

    if (
      difference < 0
    ) {
      const days =
        Math.abs(
          difference
        );

      return `${days} day${
        days === 1
          ? ""
          : "s"
      } overdue`;
    }

    if (
      difference ===
      0
    ) {
      return "Due today";
    }

    if (
      difference ===
      1
    ) {
      return "Due tomorrow";
    }

    return `Due in ${difference} days`;
  };

const isToday =
  (value) => {
    const date =
      parseLocalDate(
        value
      );

    return date
      ? getDayStart(
          date
        ).getTime() ===
          getTodayStart().getTime()
      : false;
  };

const isBeforeToday =
  (value) => {
    const date =
      parseLocalDate(
        value
      );

    return date
      ? getDayStart(
          date
        ).getTime() <
          getTodayStart().getTime()
      : false;
  };

const differenceInDays =
  (from, to) =>
    Math.floor(
      (
        to.getTime() -
        from.getTime()
      ) /
        86400000
    );

const getTodayStart =
  () => {
    const date =
      new Date();

    date.setHours(
      0,
      0,
      0,
      0
    );

    return date;
  };

const getDayStart =
  (value) => {
    const date =
      value instanceof Date
        ? new Date(value)
        : parseLocalDate(
            value
          );

    if (!date) {
      return null;
    }

    date.setHours(
      0,
      0,
      0,
      0
    );

    return date;
  };

const parseLocalDate =
  (value) => {
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

const getLocalDateKey =
  (value) => {
    const date =
      parseLocalDate(
        value
      );

    if (!date) {
      return "";
    }

    return [
      date.getFullYear(),

      String(
        date.getMonth() +
          1
      ).padStart(
        2,
        "0"
      ),

      String(
        date.getDate()
      ).padStart(
        2,
        "0"
      ),
    ].join(
      "-"
    );
  };

const getApprovedAmountForRow =
  (
    loan,
    row,
    approvedCollections = []
  ) => {
    const loanId =
      loan?.id ||
      loan?.loanNumber ||
      "";

    const scheduleId =
      row?.id ||
      "";

    const dueDate =
      getLocalDateKey(
        row?.dueDate
      );

    return approvedCollections
      .filter(
        (collection) => {
          const collectionLoanId =
            collection?.loanId ||
            collection?.loanNumber ||
            "";

          const collectionScheduleId =
            collection?.scheduleId ||
            "";

          const collectionDueDate =
            getLocalDateKey(
              collection?.dueDate
            );

          if (
            scheduleId &&
            collectionScheduleId
          ) {
            return (
              String(
                collectionScheduleId
              ) ===
              String(
                scheduleId
              )
            );
          }

          return (
            String(
              collectionLoanId
            ) ===
              String(
                loanId
              ) &&
            collectionDueDate ===
              dueDate
          );
        }
      )
      .reduce(
        (
          total,
          collection
        ) =>
          total +
          Number(
            collection?.amount ||
              0
          ),
        0
      );
  };

const buildDisplayPaymentHistory =
  (
    loan,
    approvedCollections = []
  ) => {
    const existingHistory =
      Array.isArray(
        loan?.paymentHistory
      )
        ? loan.paymentHistory
        : [];

    const loanId =
      loan?.id ||
      loan?.loanNumber ||
      "";

    const relatedApproved =
      approvedCollections.filter(
        (collection) => {
          const collectionLoanId =
            collection?.loanId ||
            collection?.loanNumber ||
            "";

          return (
            String(
              collectionLoanId
            ) ===
            String(
              loanId
            )
          );
        }
      );

    const newEntries =
      relatedApproved
        .filter(
          (collection) =>
            !existingHistory.some(
              (payment) =>
                String(
                  payment?.collectionId ||
                    ""
                ) ===
                String(
                  collection?.id ||
                    ""
                )
            )
        )
        .map(
          (collection) => {
            const date =
              collection?.approvedAt ||
              collection?.collectedDate ||
              collection?.collectionDate ||
              collection?.submittedAt ||
              "";

            return {
              id:
                `collection-${collection.id}`,

              collectionId:
                collection.id,

              amount:
                Number(
                  collection?.amount ||
                    0
                ),

              date,

              paidAt:
                date,

              paymentDate:
                date,

              paymentMode:
                collection?.paymentMode ||
                "",

              mode:
                collection?.paymentMode ||
                "",

              remarks:
                collection?.remarks ||
                "Approved collection",

              source:
                "collection",
            };
          }
        );

    return [
      ...existingHistory,
      ...newEntries,
    ].sort(
      (a, b) => {
        const aDate =
          parseLocalDate(
            a?.date ||
              a?.paidAt ||
              a?.paymentDate
          );

        const bDate =
          parseLocalDate(
            b?.date ||
              b?.paidAt ||
              b?.paymentDate
          );

        return (
          (
            bDate?.getTime() ||
            0
          ) -
          (
            aDate?.getTime() ||
            0
          )
        );
      }
    );
  };

const formatMoney =
  (value) =>
    `₹${Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        maximumFractionDigits:
          2,
      }
    )}`;

const formatNumber =
  (value) =>
    Number(
      value || 0
    ).toLocaleString(
      "en-IN",
      {
        maximumFractionDigits:
          2,
      }
    );

const formatDate =
  (value) => {
    const date =
      parseLocalDate(
        value
      );

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

export default LoanPage;