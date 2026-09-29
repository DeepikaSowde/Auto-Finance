// src/pages/expense/ExpenseControl.jsx

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  Plus,
  Search,
  RotateCcw,
  Receipt,
  IndianRupee,
  Clock3,
  Eye,
  Pencil,
  X,
  FileText,
  Fuel,
  Car,
  Building2,
  UserRound,
  CalendarDays,
  BarChart3,
  Filter,
  TrendingUp,
} from "lucide-react";

import {
  getExpenses,
  addExpense,
  updateExpense,
  deleteExpense,
  getExpenseHistory,
  getExpenseHistorySummary,
  getMonthlyExpenseSummary,
} from "../../services/expenseStorage";

import { can } from "../../config/permissions";

/* =========================================================
   MAIN
========================================================= */

/*
 * Seeded so the history panel renders before the first fetch resolves.
 */
const EMPTY_EXPENSE_SUMMARY = {
  totalAmount: 0,
  totalRecords: 0,
  paidAmount: 0,
  paidCount: 0,
  pendingAmount: 0,
  pendingCount: 0,
  averageExpense: 0,
  byCategory: [],
  byMonth: [],
  highestExpense: null,
};

const ExpenseControl = () => {
  const [
    expenses,
    setExpenses,
  ] = useState([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    categoryFilter,
    setCategoryFilter,
  ] = useState(
    "All Categories"
  );

  const [
    statusFilter,
    setStatusFilter,
  ] = useState(
    "All Status"
  );

  const [
    dateFilter,
    setDateFilter,
  ] = useState("");

  /* =======================================================
     HISTORY VIEW
  ======================================================= */

  const [
    historyOpen,
    setHistoryOpen,
  ] = useState(false);

  const [
    historyPeriod,
    setHistoryPeriod,
  ] = useState(
    "This Month"
  );

  const [
    historyStartDate,
    setHistoryStartDate,
  ] = useState("");

  const [
    historyEndDate,
    setHistoryEndDate,
  ] = useState("");

  const [
    historySearch,
    setHistorySearch,
  ] = useState("");

  /* =======================================================
     MODALS
  ======================================================= */

  const [
    showAddModal,
    setShowAddModal,
  ] = useState(false);

  const [
    selectedExpense,
    setSelectedExpense,
  ] = useState(null);

  const [
    editingExpense,
    setEditingExpense,
  ] = useState(null);

  /* =======================================================
     LOAD / SYNC
  ======================================================= */

  useEffect(() => {
    const reloadExpenses =
      async () => {
        setExpenses(
          await getExpenses()
        );
      };

    reloadExpenses();

    window.addEventListener(
      "auto-finance:data-updated",
      reloadExpenses
    );

    window.addEventListener(
      "fleetopz:data-updated",
      reloadExpenses
    );

    window.addEventListener(
      "storage",
      reloadExpenses
    );

    return () => {
      window.removeEventListener(
        "auto-finance:data-updated",
        reloadExpenses
      );

      window.removeEventListener(
        "fleetopz:data-updated",
        reloadExpenses
      );

      window.removeEventListener(
        "storage",
        reloadExpenses
      );
    };
  }, []);

  /* =======================================================
     DATE
  ======================================================= */

  const today =
    useMemo(
      () =>
        getTodayDateKey(),
      []
    );

  const currentMonth =
    today.slice(
      0,
      7
    );

  /* =======================================================
     STATUS
  ======================================================= */

  const paidExpenses =
    useMemo(() => {
      return expenses.filter(
        (expense) =>
          normalize(
            expense?.status
          ) ===
          "paid"
      );
    }, [
      expenses,
    ]);

  const pendingExpenseRecords =
    useMemo(() => {
      return expenses.filter(
        (expense) =>
          normalize(
            expense?.status
          ) ===
          "pending"
      );
    }, [
      expenses,
    ]);

  /* =======================================================
     TOTAL EXPENSE
  ======================================================= */

  const totalExpenses =
    useMemo(() => {
      return paidExpenses.reduce(
        (
          sum,
          expense
        ) =>
          sum +
          toNumber(
            expense?.amount
          ),
        0
      );
    }, [
      paidExpenses,
    ]);

  /* =======================================================
     TODAY
  ======================================================= */

  const todayExpenses =
    useMemo(() => {
      return paidExpenses
        .filter(
          (expense) =>
            getDateKey(
              expense?.date
            ) ===
            today
        )
        .reduce(
          (
            sum,
            expense
          ) =>
            sum +
            toNumber(
              expense?.amount
            ),
          0
        );
    }, [
      paidExpenses,
      today,
    ]);

  /* =======================================================
     THIS MONTH
  ======================================================= */

  const monthExpenses =
    useMemo(() => {
      return paidExpenses
        .filter(
          (expense) =>
            getDateKey(
              expense?.date
            ).startsWith(
              currentMonth
            )
        )
        .reduce(
          (
            sum,
            expense
          ) =>
            sum +
            toNumber(
              expense?.amount
            ),
          0
        );
    }, [
      paidExpenses,
      currentMonth,
    ]);

  /* =======================================================
     PENDING
  ======================================================= */

  const pendingExpenses =
    pendingExpenseRecords.length;

  const pendingExpenseAmount =
    useMemo(() => {
      return pendingExpenseRecords.reduce(
        (
          sum,
          expense
        ) =>
          sum +
          toNumber(
            expense?.amount
          ),
        0
      );
    }, [
      pendingExpenseRecords,
    ]);

  /* =======================================================
     FILTERED DATA
  ======================================================= */

  const filteredExpenses =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return expenses
        .filter(
          (expense) => {
            const searchableText =
              [
                expense?.id,
                expense?.category,
                expense?.subCategory,
                expense?.description,
                expense?.paidBy,
                expense?.vendor,
                expense?.reference,
                expense?.paymentMode,
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            const matchesSearch =
              !query ||
              searchableText.includes(
                query
              );

            const matchesCategory =
              categoryFilter ===
                "All Categories" ||
              expense?.category ===
                categoryFilter;

            const matchesStatus =
              statusFilter ===
                "All Status" ||
              expense?.status ===
                statusFilter;

            const matchesDate =
              !dateFilter ||
              getDateKey(
                expense?.date
              ) ===
                dateFilter;

            return (
              matchesSearch &&
              matchesCategory &&
              matchesStatus &&
              matchesDate
            );
          }
        )
        .sort(
          (
            a,
            b
          ) =>
            new Date(
              b?.date ||
                b?.createdAt ||
                0
            ).getTime() -
            new Date(
              a?.date ||
                a?.createdAt ||
                0
            ).getTime()
        );
    }, [
      expenses,
      search,
      categoryFilter,
      statusFilter,
      dateFilter,
    ]);

  /* =======================================================
     HISTORY RANGE
  ======================================================= */

  const historyRange =
    useMemo(() => {
      const current =
        new Date();

      if (
        historyPeriod ===
        "This Month"
      ) {
        const start =
          new Date(
            current.getFullYear(),
            current.getMonth(),
            1
          );

        const end =
          new Date(
            current.getFullYear(),
            current.getMonth() + 1,
            0
          );

        return {
          startDate:
            formatDateInput(
              start
            ),
          endDate:
            formatDateInput(
              end
            ),
        };
      }

      if (
        historyPeriod ===
        "Last Month"
      ) {
        const start =
          new Date(
            current.getFullYear(),
            current.getMonth() -
              1,
            1
          );

        const end =
          new Date(
            current.getFullYear(),
            current.getMonth(),
            0
          );

        return {
          startDate:
            formatDateInput(
              start
            ),
          endDate:
            formatDateInput(
              end
            ),
        };
      }

      if (
        historyPeriod ===
        "Last 30 Days"
      ) {
        const start =
          new Date(
            current
          );

        start.setDate(
          start.getDate() -
            29
        );

        return {
          startDate:
            formatDateInput(
              start
            ),
          endDate:
            formatDateInput(
              current
            ),
        };
      }

      if (
        historyPeriod ===
        "All Time"
      ) {
        return {
          startDate: "",
          endDate: "",
        };
      }

      if (
        historyPeriod ===
        "Custom"
      ) {
        return {
          startDate:
            historyStartDate,
          endDate:
            historyEndDate,
        };
      }

      return {
        startDate: "",
        endDate: "",
      };
    }, [
      historyPeriod,
      historyStartDate,
      historyEndDate,
    ]);

  /* =======================================================
     HISTORY RECORDS
  ======================================================= */

  const [historyRecords, setHistoryRecords] =
    useState([]);

  const [historySummary, setHistorySummary] =
    useState(EMPTY_EXPENSE_SUMMARY);

  useEffect(() => {
    let cancelled = false;

    const query = {
      startDate: historyRange.startDate,
      endDate: historyRange.endDate,
      status: "Paid",
      search: historySearch,
    };

    Promise.all([
      getExpenseHistory(query),
      getExpenseHistorySummary(query),
    ]).then(([records, summary]) => {
      if (cancelled) {
        return;
      }

      setHistoryRecords(records);
      setHistorySummary(summary);
    });

    return () => {
      cancelled = true;
    };
  }, [historyRange, historySearch]);

  /* =======================================================
     RESET FILTERS
  ======================================================= */

  const resetFilters =
    () => {
      setSearch("");

      setCategoryFilter(
        "All Categories"
      );

      setStatusFilter(
        "All Status"
      );

      setDateFilter("");
    };

  /* =======================================================
     SAVE
  ======================================================= */

  const handleSaveExpense =
    async (
      expense
    ) => {
      if (
        editingExpense
      ) {
        await updateExpense(
          editingExpense.id,
          expense
        );
      } else {
        await addExpense(
          expense
        );
      }

      setExpenses(
        await getExpenses()
      );

      setShowAddModal(
        false
      );

      setEditingExpense(
        null
      );
    };

  /* =======================================================
     EDIT
  ======================================================= */

  const handleEditExpense =
    (
      expense
    ) => {
      setSelectedExpense(
        null
      );

      setEditingExpense(
        expense
      );

      setShowAddModal(
        true
      );
    };

  /* =======================================================
     DELETE
  ======================================================= */

  const handleDeleteExpense =
    async (
      expenseId
    ) => {
      await deleteExpense(
        expenseId
      );

      setExpenses(
        await getExpenses()
      );

      setSelectedExpense(
        null
      );
    };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="
        min-h-full
        bg-[#F6F8F7]
        px-3
        py-3
        sm:px-4
        sm:py-4
        lg:px-5
        lg:py-5
      "
    >

      {/* =================================================
          HEADER
      ================================================== */}

      <div
        className="
          mb-4
          flex
          flex-col
          gap-3
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div>
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <h1
              className="
                text-[21px]
                font-extrabold
                tracking-tight
                text-[#17221D]
              "
            >
              Expense Control
            </h1>

            <span
              className="
                rounded-full
                bg-[#EAF5EF]
                px-2
                py-1
                text-[7px]
                font-bold
                uppercase
                tracking-wide
                text-[#0B5D3B]
              "
            >
              Admin
            </span>
          </div>

          <p
            className="
              mt-1
              text-[10px]
              font-medium
              text-slate-400
            "
          >
            Track, manage and review
            historical business expenses.
          </p>
        </div>

        <div
          className="
            flex
            flex-wrap
            items-center
            gap-2
          "
        >
          <button
            type="button"
            onClick={() =>
              setHistoryOpen(
                (previous) =>
                  !previous
              )
            }
            className="
              inline-flex
              h-9
              items-center
              justify-center
              gap-1.5
              rounded-lg
              border
              border-[#D8E9DF]
              bg-[#F6FBF8]
              px-3
              text-[9px]
              font-bold
              text-[#0B5D3B]
              transition
              hover:bg-[#EAF5EF]
            "
          >
            <BarChart3
              size={13}
            />

            {historyOpen
              ? "Hide Expense Data"
              : "View Expense Data"}
          </button>

          {can("expense", "add") && (
          <button
            type="button"
            onClick={() => {
              setEditingExpense(
                null
              );

              setShowAddModal(
                true
              );
            }}
            className="
              inline-flex
              h-9
              items-center
              justify-center
              gap-2
              rounded-lg
              bg-[#0B6B43]
              px-4
              text-[9px]
              font-bold
              text-white
              shadow-[0_5px_15px_rgba(11,107,67,0.18)]
              transition
              hover:bg-[#095B3B]
            "
          >
            <Plus
              size={14}
            />

            Add Expense
          </button>
          )}
        </div>
      </div>

      {/* =================================================
          HISTORY
      ================================================== */}

      {historyOpen && (
        <section
          className="
            mb-4
            overflow-hidden
            rounded-2xl
            border
            border-[#D8E9DF]
            bg-white
            shadow-sm
          "
        >
          {/* HEADER */}

          <div
            className="
              border-b
              border-slate-100
              bg-[#F6FBF8]
              px-4
              py-3.5
            "
          >
            <div
              className="
                flex
                flex-col
                gap-3
                lg:flex-row
                lg:items-center
                lg:justify-between
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
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
                    text-[#0B5D3B]
                  "
                >
                  <BarChart3
                    size={14}
                  />
                </div>

                <div>
                  <h2
                    className="
                      text-[12px]
                      font-extrabold
                      text-[#17221D]
                    "
                  >
                    View Expense Data
                  </h2>

                  <p
                    className="
                      mt-0.5
                      text-[8px]
                      text-slate-400
                    "
                  >
                    Historical expense data
                    across the selected date range.
                  </p>
                </div>
              </div>

              <div
                className="
                  flex
                  flex-wrap
                  items-center
                  gap-2
                "
              >
                {[
                  "This Month",
                  "Last Month",
                  "Last 30 Days",
                  "All Time",
                  "Custom",
                ].map(
                  (
                    option
                  ) => (
                    <button
                      key={
                        option
                      }
                      type="button"
                      onClick={() =>
                        setHistoryPeriod(
                          option
                        )
                      }
                      className={`
                        inline-flex
                        h-8
                        items-center
                        rounded-lg
                        px-2.5
                        text-[8px]
                        font-bold
                        transition

                        ${
                          historyPeriod ===
                          option
                            ? "bg-[#0B5D3B] text-white"
                            : "border border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                        }
                      `}
                    >
                      {
                        option
                      }
                    </button>
                  )
                )}
              </div>
            </div>

            {/* FILTERS */}

            <div
              className="
                mt-3
                grid
                grid-cols-1
                gap-2
                md:grid-cols-3
              "
            >
              <div
                className="
                  relative
                "
              >
                <Search
                  size={12}
                  className="
                    pointer-events-none
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-slate-400
                  "
                />

                <input
                  value={
                    historySearch
                  }
                  onChange={(
                    event
                  ) =>
                    setHistorySearch(
                      event.target.value
                    )
                  }
                  placeholder="
                    Search expense / vendor /
                    category / employee
                  "
                  className="
                    h-9
                    w-full
                    rounded-lg
                    border
                    border-slate-200
                    bg-white
                    pl-8
                    pr-3
                    text-[9px]
                    font-semibold
                    text-[#17221D]
                    outline-none
                    focus:border-[#9CCEB1]
                    focus:ring-1
                    focus:ring-[#DCEFE4]
                  "
                />
              </div>

              <select
                value={
                  categoryFilter ===
                  "All Categories"
                    ? "All Categories"
                    : categoryFilter
                }
                onChange={(
                  event
                ) =>
                  setCategoryFilter(
                    event.target.value
                  )
                }
                className="
                  h-9
                  rounded-lg
                  border
                  border-slate-200
                  bg-white
                  px-3
                  text-[9px]
                  font-semibold
                  text-slate-600
                  outline-none
                "
              >
                <option>
                  All Categories
                </option>

                <option>
                  Fuel
                </option>

                <option>
                  Vehicle Maintenance
                </option>

                <option>
                  Insurance
                </option>

                <option>
                  Registration / RC
                </option>

                <option>
                  Collection Expense
                </option>

                <option>
                  Office Expense
                </option>

                <option>
                  Legal Expense
                </option>

                <option>
                  Miscellaneous
                </option>
              </select>

              {historyPeriod ===
                "Custom" && (
                <>
                  <div
                    className="
                      grid
                      grid-cols-2
                      gap-2
                    "
                  >
                    <label>
                      <span
                        className="
                          mb-1
                          block
                          text-[7px]
                          font-bold
                          uppercase
                          tracking-wide
                          text-slate-400
                        "
                      >
                        From
                      </span>

                      <div
                        className="
                          relative
                        "
                      >
                        <CalendarDays
                          size={11}
                          className="
                            pointer-events-none
                            absolute
                            left-3
                            top-1/2
                            -translate-y-1/2
                            text-slate-400
                          "
                        />

                        <input
                          type="date"
                          value={
                            historyStartDate
                          }
                          onChange={(
                            event
                          ) =>
                            setHistoryStartDate(
                              event.target.value
                            )
                          }
                          className="
                            h-9
                            w-full
                            rounded-lg
                            border
                            border-slate-200
                            bg-white
                            pl-8
                            pr-2
                            text-[8px]
                            font-semibold
                            text-slate-600
                            outline-none
                          "
                        />
                      </div>
                    </label>

                    <label>
                      <span
                        className="
                          mb-1
                          block
                          text-[7px]
                          font-bold
                          uppercase
                          tracking-wide
                          text-slate-400
                        "
                      >
                        To
                      </span>

                      <div
                        className="
                          relative
                        "
                      >
                        <CalendarDays
                          size={11}
                          className="
                            pointer-events-none
                            absolute
                            left-3
                            top-1/2
                            -translate-y-1/2
                            text-slate-400
                          "
                        />

                        <input
                          type="date"
                          value={
                            historyEndDate
                          }
                          onChange={(
                            event
                          ) =>
                            setHistoryEndDate(
                              event.target.value
                            )
                          }
                          className="
                            h-9
                            w-full
                            rounded-lg
                            border
                            border-slate-200
                            bg-white
                            pl-8
                            pr-2
                            text-[8px]
                            font-semibold
                            text-slate-600
                            outline-none
                          "
                        />
                      </div>
                    </label>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* SUMMARY CARDS */}

          <div
            className="
              grid
              grid-cols-1
              gap-2
              p-3
              sm:grid-cols-2
              lg:grid-cols-4
            "
          >
            <ExpenseHistoryMetric
              label="Total Expense"
              value={formatMoney(
                historySummary.totalAmount
              )}
              note={`${historySummary.totalRecords} records`}
              tone="green"
            />

            <ExpenseHistoryMetric
              label="Paid Expense"
              value={formatMoney(
                historySummary.paidAmount
              )}
              note={`${historySummary.paidCount} paid records`}
              tone="blue"
            />

            <ExpenseHistoryMetric
              label="Pending Expense"
              value={formatMoney(
                historySummary.pendingAmount
              )}
              note={`${historySummary.pendingCount} pending records`}
              tone="amber"
            />

            <ExpenseHistoryMetric
              label="Average Expense"
              value={formatMoney(
                historySummary.averageExpense
              )}
              note="Per recorded expense"
              tone="purple"
            />
          </div>

          {/* CATEGORY + MONTHLY */}

          <div
            className="
              grid
              grid-cols-1
              gap-3
              px-3
              pb-3
              lg:grid-cols-2
            "
          >
            {/* CATEGORY */}

            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-slate-200
              "
            >
              <div
                className="
                  flex
                  items-center
                  justify-between
                  border-b
                  border-slate-100
                  bg-slate-50
                  px-3
                  py-2.5
                "
              >
                <div>
                  <p
                    className="
                      text-[9px]
                      font-extrabold
                      text-[#17221D]
                    "
                  >
                    Category-wise Expense
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-[7px]
                      text-slate-400
                    "
                  >
                    Total expense by category.
                  </p>
                </div>

                <Filter
                  size={12}
                  className="text-slate-400"
                />
              </div>

              {historySummary
                .byCategory
                .length ===
              0 ? (
                <EmptyHistory />
              ) : (
                <div
                  className="
                    max-h-[280px]
                    overflow-y-auto
                  "
                >
                  {historySummary.byCategory.map(
                    (
                      category
                    ) => (
                      <div
                        key={
                          category.category
                        }
                        className="
                          flex
                          items-center
                          justify-between
                          gap-3
                          border-b
                          border-slate-100
                          px-3
                          py-2.5
                          last:border-b-0
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
                            className="
                              flex
                              h-7
                              w-7
                              shrink-0
                              items-center
                              justify-center
                              rounded-lg
                              bg-[#EAF5EF]
                              text-[#0B6B43]
                            "
                          >
                            <Receipt
                              size={12}
                            />
                          </div>

                          <div className="min-w-0">
                            <p
                              className="
                                truncate
                                text-[9px]
                                font-bold
                                text-[#253252]
                              "
                            >
                              {
                                category.category
                              }
                            </p>

                            <p
                              className="
                                mt-0.5
                                text-[7px]
                                text-slate-400
                              "
                            >
                              {
                                category.count
                              }{" "}
                              record
                              {category.count ===
                              1
                                ? ""
                                : "s"}
                            </p>
                          </div>
                        </div>

                        <p
                          className="
                            shrink-0
                            text-[10px]
                            font-extrabold
                            text-[#0B5D3B]
                          "
                        >
                          {formatMoney(
                            category.amount
                          )}
                        </p>
                      </div>
                    )
                  )}
                </div>
              )}
            </div>

            {/* MONTH */}

            <div
              className="
                overflow-hidden
                rounded-xl
                border
                border-slate-200
              "
            >
              <div
                className="
                  border-b
                  border-slate-100
                  bg-slate-50
                  px-3
                  py-2.5
                "
              >
                <p
                  className="
                    text-[9px]
                    font-extrabold
                    text-[#17221D]
                  "
                >
                  Monthly Expense
                </p>

                <p
                  className="
                    mt-0.5
                    text-[7px]
                    text-slate-400
                  "
                >
                  Month-wise historical totals.
                </p>
              </div>

              <MonthlyExpenseList
                data={
                  historySummary.byMonth
                }
              />
            </div>
          </div>

          {/* HISTORY RECORDS */}

          <div
            className="
              mx-3
              mb-3
              overflow-hidden
              rounded-xl
              border
              border-slate-200
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                border-b
                border-slate-100
                bg-slate-50
                px-3
                py-2.5
              "
            >
              <div>
                <p
                  className="
                    text-[9px]
                    font-extrabold
                    text-[#17221D]
                  "
                >
                  Expense History
                </p>

                <p
                  className="
                    mt-0.5
                    text-[7px]
                    text-slate-400
                  "
                >
                  Historical expense records
                  from the selected range.
                </p>
              </div>

              <span
                className="
                  rounded-full
                  bg-[#EAF5EF]
                  px-2
                  py-1
                  text-[7px]
                  font-bold
                  text-[#0B5D3B]
                "
              >
                {
                  historyRecords.length
                } records
              </span>
            </div>

            {historyRecords.length ===
            0 ? (
              <EmptyHistory />
            ) : (
              <div
                className="
                  max-h-[330px]
                  overflow-y-auto
                "
              >
                {historyRecords
                  .slice(
                    0,
                    100
                  )
                  .map(
                    (
                      expense
                    ) => (
                      <div
                        key={
                          expense.id
                        }
                        className="
                          border-b
                          border-slate-100
                          px-3
                          py-2.5
                          last:border-b-0
                        "
                      >
                        <div
                          className="
                            flex
                            items-start
                            justify-between
                            gap-3
                          "
                        >
                          <div className="min-w-0">
                            <div
                              className="
                                flex
                                flex-wrap
                                items-center
                                gap-2
                              "
                            >
                              <p
                                className="
                                  truncate
                                  text-[9px]
                                  font-bold
                                  text-[#253252]
                                "
                              >
                                {
                                  expense.description ||
                                  expense.category ||
                                  "Expense"
                                }
                              </p>

                              <span
                                className="
                                  rounded-full
                                  bg-[#EAF5EF]
                                  px-2
                                  py-0.5
                                  text-[6px]
                                  font-bold
                                  text-[#0B5D3B]
                                "
                              >
                                {
                                  expense.category
                                }
                              </span>
                            </div>

                            <p
                              className="
                                mt-1
                                text-[7px]
                                text-slate-400
                              "
                            >
                              {
                                expense.id
                              }{" "}
                              •{" "}
                              {
                                expense.vendor ||
                                "No vendor"
                              }{" "}
                              •{" "}
                              {
                                formatDisplayDate(
                                  expense.date
                                )
                              }
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
                                text-[10px]
                                font-extrabold
                                text-[#0B5D3B]
                              "
                            >
                              {formatMoney(
                                expense.amount
                              )}
                            </p>

                            <p
                              className="
                                mt-0.5
                                text-[7px]
                                text-slate-400
                              "
                            >
                              {
                                expense.status
                              }
                            </p>
                          </div>
                        </div>
                      </div>
                    )
                  )}
              </div>
            )}
          </div>
        </section>
      )}

      {/* =================================================
          KPI CARDS
      ================================================== */}

      <div
        className="
          grid
          grid-cols-1
          gap-2.5
          sm:grid-cols-2
          lg:grid-cols-4
        "
      >
        <ExpenseMetric
          icon={
            Receipt
          }
          label="Total Expenses"
          value={formatMoney(
            totalExpenses
          )}
          note="All paid expenses"
          tone="green"
        />

        <ExpenseMetric
          icon={
            IndianRupee
          }
          label="This Month"
          value={formatMoney(
            monthExpenses
          )}
          note="Paid expenses"
          tone="blue"
        />

        <ExpenseMetric
          icon={
            Clock3
          }
          label="Today's Expenses"
          value={formatMoney(
            todayExpenses
          )}
          note="Paid expenses"
          tone="amber"
        />

        <PendingExpenseMetric
          count={
            pendingExpenses
          }
          amount={
            pendingExpenseAmount
          }
        />
      </div>

      {/* =================================================
          FILTER BAR
      ================================================== */}

      <div
        className="
          mt-3
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
            flex
            flex-col
            gap-2
            xl:flex-row
            xl:items-center
          "
        >
          {/* SEARCH */}

          <div
            className="
              relative
              min-w-0
              flex-1
            "
          >
            <Search
              size={13}
              className="
                pointer-events-none
                absolute
                left-3
                top-1/2
                -translate-y-1/2
                text-slate-400
              "
            />

            <input
              value={
                search
              }
              onChange={(
                event
              ) =>
                setSearch(
                  event.target.value
                )
              }
              placeholder="Search expense, vendor, category..."
              className="
                h-9
                w-full
                rounded-lg
                border
                border-slate-200
                bg-white
                pl-8
                pr-3
                text-[10px]
                font-medium
                text-[#253252]
                outline-none
                transition
                focus:border-[#9CCEB1]
                focus:ring-1
                focus:ring-[#DCEFE4]
              "
            />
          </div>

          {/* CATEGORY */}

          <select
            value={
              categoryFilter
            }
            onChange={(
              event
            ) =>
              setCategoryFilter(
                event.target.value
              )
            }
            className="
              h-9
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              text-[9px]
              font-semibold
              text-slate-600
              outline-none
            "
          >
            <option>
              All Categories
            </option>

            <option>
              Fuel
            </option>

            <option>
              Vehicle Maintenance
            </option>

            <option>
              Insurance
            </option>

            <option>
              Registration / RC
            </option>

            <option>
              Collection Expense
            </option>

            <option>
              Office Expense
            </option>

            <option>
              Legal Expense
            </option>

            <option>
              Miscellaneous
            </option>
          </select>

          {/* STATUS */}

          <select
            value={
              statusFilter
            }
            onChange={(
              event
            ) =>
              setStatusFilter(
                event.target.value
              )
            }
            className="
              h-9
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              text-[9px]
              font-semibold
              text-slate-600
              outline-none
            "
          >
            <option>
              All Status
            </option>

            <option>
              Paid
            </option>

            <option>
              Pending
            </option>
          </select>

          {/* DATE */}

          <input
            type="date"
            value={
              dateFilter
            }
            onChange={(
              event
            ) =>
              setDateFilter(
                event.target.value
              )
            }
            className="
              h-9
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              text-[9px]
              font-semibold
              text-slate-600
              outline-none
            "
          />

          {/* RESET */}

          <button
            type="button"
            onClick={
              resetFilters
            }
            className="
              inline-flex
              h-9
              shrink-0
              items-center
              justify-center
              gap-1.5
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              text-[9px]
              font-bold
              text-slate-500
              transition
              hover:border-[#B9DCCA]
              hover:bg-[#F4FAF6]
              hover:text-[#0B6B43]
            "
          >
            <RotateCcw
              size={11}
            />

            Reset
          </button>
        </div>
      </div>

      {/* =================================================
          TABLE
      ================================================== */}

      <div
        className="
          mt-3
          overflow-hidden
          rounded-xl
          border
          border-slate-200
          bg-white
          shadow-sm
        "
      >
        <div
          className="
            flex
            items-center
            justify-between
            gap-3
            border-b
            border-slate-100
            px-4
            py-3
          "
        >
          <div>
            <h2
              className="
                text-[12px]
                font-extrabold
                text-[#17221D]
              "
            >
              All Expenses
            </h2>

            <p
              className="
                mt-0.5
                text-[8px]
                text-slate-400
              "
            >
              {
                filteredExpenses.length
              }{" "}
              records
            </p>
          </div>

          <span
            className="
              rounded-full
              bg-[#EAF5EF]
              px-2.5
              py-1
              text-[8px]
              font-bold
              text-[#0B5D3B]
            "
          >
            {formatMoney(
              filteredExpenses
                .filter(
                  (
                    expense
                  ) =>
                    normalize(
                      expense?.status
                    ) ===
                    "paid"
                )
                .reduce(
                  (
                    sum,
                    expense
                  ) =>
                    sum +
                    toNumber(
                      expense?.amount
                    ),
                  0
                )
            )}
          </span>
        </div>

        {filteredExpenses.length ===
        0 ? (
          <EmptyExpenses />
        ) : (
          <div className="overflow-x-auto">
            <table
              className="
                w-full
                min-w-[900px]
                border-collapse
              "
            >
              <thead className="bg-[#F8FAF9]">
                <tr>
                  <TableHeader>
                    Expense ID
                  </TableHeader>

                  <TableHeader>
                    Date
                  </TableHeader>

                  <TableHeader>
                    Category
                  </TableHeader>

                  <TableHeader>
                    Description
                  </TableHeader>

                  <TableHeader>
                    Amount
                  </TableHeader>

                  <TableHeader>
                    Paid By
                  </TableHeader>

                  <TableHeader>
                    Status
                  </TableHeader>

                  <TableHeader align="center">
                    Action
                  </TableHeader>
                </tr>
              </thead>

              <tbody>
                {filteredExpenses.map(
                  (
                    expense
                  ) => (
                    <ExpenseRow
                      key={
                        expense.id
                      }
                      expense={
                        expense
                      }
                      onView={() =>
                        setSelectedExpense(
                          expense
                        )
                      }
                      onEdit={() =>
                        handleEditExpense(
                          expense
                        )
                      }
                    />
                  )
                )}
              </tbody>
            </table>
          </div>
        )}

        <div
          className="
            flex
            items-center
            justify-between
            border-t
            border-slate-100
            px-4
            py-3
          "
        >
          <p
            className="
              text-[8px]
              font-medium
              text-slate-400
            "
          >
            Showing{" "}
            <span className="font-bold text-slate-600">
              {
                filteredExpenses.length
              }
            </span>{" "}
            of{" "}
            <span className="font-bold text-slate-600">
              {
                expenses.length
              }
            </span>{" "}
            expenses
          </p>
        </div>
      </div>

      {/* =================================================
          ADD / EDIT
      ================================================== */}

      {showAddModal && (
        <ExpenseModal
          expense={
            editingExpense
          }
          onClose={() => {
            setShowAddModal(
              false
            );

            setEditingExpense(
              null
            );
          }}
          onSave={
            handleSaveExpense
          }
        />
      )}

      {/* =================================================
          VIEW
      ================================================== */}

      {selectedExpense && (
        <ExpenseViewModal
          expense={
            selectedExpense
          }
          onClose={() =>
            setSelectedExpense(
              null
            )
          }
          onEdit={() =>
            handleEditExpense(
              selectedExpense
            )
          }
          onDelete={() =>
            handleDeleteExpense(
              selectedExpense.id
            )
          }
        />
      )}
    </div>
  );
};

/* =========================================================
   HISTORY METRIC
========================================================= */

const ExpenseHistoryMetric = ({
  label,
  value,
  note,
  tone = "green",
}) => {
  const styles = {
    green:
      "bg-[#F1FAF4] text-[#0B6B43]",

    blue:
      "bg-[#F1F6FE] text-blue-600",

    amber:
      "bg-[#FFF8E8] text-amber-700",

    purple:
      "bg-purple-50 text-purple-700",
  };

  return (
    <div
      className="
        rounded-xl
        border
        border-slate-200
        bg-white
        px-3
        py-3
      "
    >
      <p
        className="
          text-[7px]
          font-bold
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
          inline-block
          rounded-md
          px-2
          py-1
          text-[14px]
          font-extrabold
          ${
            styles[tone] ||
            styles.green
          }
        `}
      >
        {value}
      </p>

      <p
        className="
          mt-1
          text-[7px]
          font-medium
          text-slate-400
        "
      >
        {note}
      </p>
    </div>
  );
};

/* =========================================================
   MONTHLY LIST
========================================================= */

const MonthlyExpenseList = ({
  data,
}) => {
  if (
    !Array.isArray(
      data
    ) ||
    data.length === 0
  ) {
    return (
      <EmptyHistory />
    );
  }

  return (
    <div
      className="
        max-h-[280px]
        overflow-y-auto
      "
    >
      {data.map(
        (item) => (
          <div
            key={
              item.month
            }
            className="
              flex
              items-center
              justify-between
              gap-3
              border-b
              border-slate-100
              px-3
              py-2.5
              last:border-b-0
            "
          >
            <div>
              <p
                className="
                  text-[9px]
                  font-bold
                  text-[#253252]
                "
              >
                {formatMonthLabel(
                  item.month
                )}
              </p>

              <p
                className="
                  mt-0.5
                  text-[7px]
                  text-slate-400
                "
              >
                {
                  item.count
                }{" "}
                expense
                {
                  item.count ===
                  1
                    ? ""
                    : "s"
                }
              </p>
            </div>

            <p
              className="
                text-[10px]
                font-extrabold
                text-[#0B5D3B]
              "
            >
              {formatMoney(
                item.total
              )}
            </p>
          </div>
        )
      )}
    </div>
  );
};

/* =========================================================
   KPI
========================================================= */

const ExpenseMetric = ({
  icon: Icon,
  label,
  value,
  note,
  tone = "green",
}) => {
  const styles = {
    green: {
      bg: "bg-[#F1FAF4]",
      icon:
        "bg-[#DDF1E5] text-[#0B6B43]",
      value:
        "text-[#0B6B43]",
    },

    blue: {
      bg: "bg-[#F1F6FE]",
      icon:
        "bg-[#E1ECFD] text-[#4779D8]",
      value:
        "text-[#4779D8]",
    },

    amber: {
      bg: "bg-[#FFF8ED]",
      icon:
        "bg-[#FFF0CE] text-[#D88B12]",
      value:
        "text-[#B86D00]",
    },

    red: {
      bg: "bg-[#FFF4F4]",
      icon:
        "bg-[#FDE2E2] text-[#D92D3A]",
      value:
        "text-[#D92D3A]",
    },
  };

  const current =
    styles[tone] ||
    styles.green;

  return (
    <div
      className={`
        rounded-xl
        border
        border-slate-200
        ${current.bg}
        px-3.5
        py-3
        shadow-sm
      `}
    >
      <div
        className="
          flex
          items-start
          justify-between
          gap-3
        "
      >
        <div className="min-w-0">
          <p
            className="
              truncate
              text-[8px]
              font-bold
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
              text-[20px]
              font-extrabold
              tracking-tight
              ${current.value}
            `}
          >
            {value}
          </p>

          <p
            className="
              mt-1
              text-[8px]
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
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            ${current.icon}
          `}
        >
          <Icon
            size={15}
            strokeWidth={
              2.2
            }
          />
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   PENDING
========================================================= */

const PendingExpenseMetric = ({
  count,
  amount,
}) => {
  return (
    <div
      className="
        rounded-xl
        border
        border-[#F3D7A6]
        bg-[#FFF8ED]
        px-3.5
        py-3
        shadow-sm
      "
    >
      <div
        className="
          flex
          items-start
          justify-between
          gap-3
        "
      >
        <div className="min-w-0">
          <p
            className="
              truncate
              text-[8px]
              font-bold
              uppercase
              tracking-[0.05em]
              text-[#A76A12]
            "
          >
            Pending Expenses
          </p>

          <div
            className="
              mt-1
              flex
              items-baseline
              gap-2
            "
          >
            <p
              className="
                text-[20px]
                font-extrabold
                tracking-tight
                text-[#B86D00]
              "
            >
              {count}
            </p>

            <p
              className="
                truncate
                text-[11px]
                font-extrabold
                text-[#C27808]
              "
            >
              {formatMoney(
                amount
              )}
            </p>
          </div>

          <p
            className="
              mt-1
              text-[8px]
              font-medium
              text-[#B98A4A]
            "
          >
            Not included in paid total
          </p>
        </div>

        <div
          className="
            flex
            h-8
            w-8
            shrink-0
            items-center
            justify-center
            rounded-lg
            bg-[#FFF0CE]
            text-[#D88B12]
          "
        >
          <Clock3
            size={15}
          />
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   TABLE ROW
========================================================= */

const ExpenseRow = ({
  expense,
  onView,
  onEdit,
}) => {
  const icon =
    getExpenseIcon(
      expense?.category
    );

  return (
    <tr
      className="
        border-b
        border-slate-100
        transition
        hover:bg-[#FAFCFB]
      "
    >
      <td className="px-4 py-3">
        <p
          className="
            text-[10px]
            font-bold
            text-[#0B6B43]
          "
        >
          {expense?.id}
        </p>
      </td>

      <td className="px-4 py-3">
        <p
          className="
            text-[10px]
            font-semibold
            text-[#253252]
          "
        >
          {formatDisplayDate(
            expense?.date
          )}
        </p>
      </td>

      <td className="px-4 py-3">
        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          <span
            className="
              flex
              h-7
              w-7
              items-center
              justify-center
              rounded-md
              bg-[#EAF5EF]
              text-[#0B6B43]
            "
          >
            {icon}
          </span>

          <div>
            <p
              className="
                text-[9px]
                font-bold
                text-[#253252]
              "
            >
              {
                expense?.category
              }
            </p>

            <p
              className="
                mt-0.5
                text-[8px]
                text-slate-400
              "
            >
              {
                expense?.subCategory ||
                "—"
              }
            </p>
          </div>
        </div>
      </td>

      <td className="max-w-[230px] px-4 py-3">
        <p
          className="
            truncate
            text-[9px]
            font-semibold
            text-[#253252]
          "
        >
          {
            expense?.description ||
            "—"
          }
        </p>

        <p
          className="
            mt-0.5
            truncate
            text-[8px]
            text-slate-400
          "
        >
          {
            expense?.vendor ||
            "No vendor"
          }
        </p>
      </td>

      <td className="px-4 py-3">
        <p
          className="
            text-[11px]
            font-extrabold
            text-[#17221D]
          "
        >
          ₹
          {formatAmount(
            expense?.amount
          )}
        </p>
      </td>

      <td className="px-4 py-3">
        <p
          className="
            text-[9px]
            font-semibold
            text-[#253252]
          "
        >
          {
            expense?.paidBy ||
            "—"
          }
        </p>

        <p
          className="
            mt-0.5
            text-[8px]
            text-slate-400
          "
        >
          {
            expense?.paymentMode ||
            "—"
          }
        </p>
      </td>

      <td className="px-4 py-3">
        <ExpenseStatus
          status={
            expense?.status
          }
        />
      </td>

      <td className="px-4 py-3">
        <div
          className="
            flex
            items-center
            justify-center
            gap-1.5
          "
        >
          <IconButton
            icon={Eye}
            title="View"
            onClick={
              onView
            }
          />

          <IconButton
            icon={
              Pencil
            }
            title="Edit"
            onClick={
              onEdit
            }
          />
        </div>
      </td>
    </tr>
  );
};

/* =========================================================
   ADD / EDIT MODAL
========================================================= */

const ExpenseModal = ({
  expense,
  onClose,
  onSave,
}) => {
  const [
    form,
    setForm,
  ] = useState(
    () => ({
      date:
        expense?.date ||
        getTodayDateKey(),

      category:
        expense?.category ||
        "Fuel",

      subCategory:
        expense?.subCategory ||
        "",

      amount:
        expense?.amount ??
        "",

      paymentMode:
        expense?.paymentMode ||
        "Cash",

      paidBy:
        expense?.paidBy ||
        "",

      vendor:
        expense?.vendor ||
        "",

      description:
        expense?.description ||
        "",

      reference:
        expense?.reference ||
        "",

      status:
        expense?.status ||
        "Paid",
    })
  );

  const update =
    (
      key,
      value
    ) => {
      setForm(
        (current) => ({
          ...current,
          [key]:
            value,
        })
      );
    };

  const submit =
    (
      event
    ) => {
      event.preventDefault();

      onSave({
        ...form,

        amount:
          Number(
            form.amount ||
              0
          ),
      });
    };

  return (
    <div
      className="
        fixed
        inset-0
        z-[600]
        flex
        items-center
        justify-center
        bg-slate-950/45
        p-4
        backdrop-blur-[3px]
      "
      onClick={
        onClose
      }
    >
      <div
        className="
          w-full
          max-w-[560px]
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-[0_25px_90px_rgba(15,23,42,0.28)]
        "
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-slate-100
            px-5
            py-3.5
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
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                bg-[#EAF5EF]
                text-[#0B6B43]
              "
            >
              <Receipt
                size={15}
              />
            </div>

            <div>
              <h2
                className="
                  text-[13px]
                  font-extrabold
                  text-[#17221D]
                "
              >
                {expense
                  ? "Edit Expense"
                  : "Add Expense"}
              </h2>

              <p
                className="
                  mt-0.5
                  text-[8px]
                  text-slate-400
                "
              >
                {expense
                  ? `${expense.id} details`
                  : "Create a new expense record"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              text-slate-400
              hover:bg-slate-50
            "
          >
            <X
              size={16}
            />
          </button>
        </div>

        <form
          onSubmit={
            submit
          }
          className="p-5"
        >
          <div
            className="
              grid
              grid-cols-1
              gap-3
              sm:grid-cols-2
            "
          >
            <FormField
              label="Expense Date"
            >
              <input
                type="date"
                value={
                  form.date
                }
                onChange={(
                  event
                ) =>
                  update(
                    "date",
                    event.target.value
                  )
                }
                required
                className={
                  inputClass
                }
              />
            </FormField>

            <FormField
              label="Category"
            >
              <select
                value={
                  form.category
                }
                onChange={(
                  event
                ) =>
                  update(
                    "category",
                    event.target.value
                  )
                }
                className={
                  inputClass
                }
              >
                <option>
                  Fuel
                </option>

                <option>
                  Vehicle Maintenance
                </option>

                <option>
                  Insurance
                </option>

                <option>
                  Registration / RC
                </option>

                <option>
                  Collection Expense
                </option>

                <option>
                  Office Expense
                </option>

                <option>
                  Legal Expense
                </option>

                <option>
                  Miscellaneous
                </option>
              </select>
            </FormField>

            <FormField
              label="Sub Category"
            >
              <input
                value={
                  form.subCategory
                }
                onChange={(
                  event
                ) =>
                  update(
                    "subCategory",
                    event.target.value
                  )
                }
                placeholder="Enter sub category"
                className={
                  inputClass
                }
              />
            </FormField>

            <FormField
              label="Amount"
            >
              <div className="relative">
                <span
                  className="
                    absolute
                    left-3
                    top-1/2
                    -translate-y-1/2
                    text-[11px]
                    font-bold
                    text-slate-400
                  "
                >
                  ₹
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={
                    form.amount
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "amount",
                      event.target.value
                    )
                  }
                  required
                  className={`${inputClass} pl-7`}
                  placeholder="0.00"
                />
              </div>
            </FormField>

            <FormField
              label="Payment Mode"
            >
              <select
                value={
                  form.paymentMode
                }
                onChange={(
                  event
                ) =>
                  update(
                    "paymentMode",
                    event.target.value
                  )
                }
                className={
                  inputClass
                }
              >
                <option>
                  Cash
                </option>

                <option>
                  Bank
                </option>

                <option>
                  UPI
                </option>

                <option>
                  Card
                </option>
              </select>
            </FormField>

            <FormField
              label="Paid By"
            >
              <input
                value={
                  form.paidBy
                }
                onChange={(
                  event
                ) =>
                  update(
                    "paidBy",
                    event.target.value
                  )
                }
                placeholder="Employee / branch"
                className={
                  inputClass
                }
              />
            </FormField>

            <FormField
              label="Vendor"
            >
              <input
                value={
                  form.vendor
                }
                onChange={(
                  event
                ) =>
                  update(
                    "vendor",
                    event.target.value
                  )
                }
                placeholder="Vendor name"
                className={
                  inputClass
                }
              />
            </FormField>

            <FormField
              label="Reference / Invoice No."
            >
              <input
                value={
                  form.reference
                }
                onChange={(
                  event
                ) =>
                  update(
                    "reference",
                    event.target.value
                  )
                }
                placeholder="Reference number"
                className={
                  inputClass
                }
              />
            </FormField>

            <div className="sm:col-span-2">
              <FormField
                label="Description"
              >
                <textarea
                  value={
                    form.description
                  }
                  onChange={(
                    event
                  ) =>
                    update(
                      "description",
                      event.target.value
                    )
                  }
                  rows={
                    3
                  }
                  placeholder="Enter expense description"
                  className={`
                    ${inputClass}
                    h-auto
                    min-h-[78px]
                    resize-none
                    py-2.5
                  `}
                />
              </FormField>
            </div>

            <FormField
              label="Status"
            >
              <select
                value={
                  form.status
                }
                onChange={(
                  event
                ) =>
                  update(
                    "status",
                    event.target.value
                  )
                }
                className={
                  inputClass
                }
              >
                <option>
                  Paid
                </option>

                <option>
                  Pending
                </option>
              </select>
            </FormField>
          </div>

          <div
            className="
              mt-5
              flex
              items-center
              justify-end
              gap-2
              border-t
              border-slate-100
              pt-4
            "
          >
            <button
              type="button"
              onClick={
                onClose
              }
              className="
                h-9
                rounded-lg
                border
                border-slate-200
                px-4
                text-[9px]
                font-bold
                text-slate-500
                hover:bg-slate-50
              "
            >
              Cancel
            </button>

            <button
              type="submit"
              className="
                h-9
                rounded-lg
                bg-[#0B6B43]
                px-4
                text-[9px]
                font-bold
                text-white
                shadow-sm
                transition
                hover:bg-[#095B3B]
              "
            >
              {expense
                ? "Update Expense"
                : "Save Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   VIEW MODAL
========================================================= */

const ExpenseViewModal = ({
  expense,
  onClose,
  onEdit,
  onDelete,
}) => {
  return (
    <div
      className="
        fixed
        inset-0
        z-[600]
        flex
        items-center
        justify-center
        bg-slate-950/45
        p-4
        backdrop-blur-[3px]
      "
      onClick={
        onClose
      }
    >
      <div
        className="
          w-full
          max-w-[520px]
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-[0_25px_90px_rgba(15,23,42,0.28)]
        "
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div
          className="
            flex
            items-center
            justify-between
            border-b
            border-slate-100
            px-5
            py-3.5
          "
        >
          <div>
            <p
              className="
                text-[8px]
                font-bold
                uppercase
                tracking-[0.05em]
                text-slate-400
              "
            >
              Expense
            </p>

            <h2
              className="
                mt-0.5
                text-[16px]
                font-extrabold
                text-[#17221D]
              "
            >
              {expense?.id}
            </h2>
          </div>

          <button
            type="button"
            onClick={
              onClose
            }
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              text-slate-400
              hover:bg-slate-50
            "
          >
            <X
              size={16}
            />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div
            className="
              rounded-xl
              bg-[#F2FAF5]
              px-4
              py-3
            "
          >
            <p
              className="
                text-[8px]
                font-bold
                uppercase
                tracking-wide
                text-[#0B6B43]
              "
            >
              Amount
            </p>

            <p
              className="
                mt-1
                text-[24px]
                font-extrabold
                text-[#0B6B43]
              "
            >
              ₹
              {formatAmount(
                expense?.amount
              )}
            </p>
          </div>

          <div
            className="
              grid
              grid-cols-2
              gap-x-6
              gap-y-4
            "
          >
            <InfoItem
              label="Date"
              value={formatDisplayDate(
                expense?.date
              )}
            />

            <InfoItem
              label="Category"
              value={
                expense?.category
              }
            />

            <InfoItem
              label="Sub Category"
              value={
                expense?.subCategory
              }
            />

            <InfoItem
              label="Status"
              value={
                expense?.status
              }
            />

            <InfoItem
              label="Payment Mode"
              value={
                expense?.paymentMode
              }
            />

            <InfoItem
              label="Paid By"
              value={
                expense?.paidBy
              }
            />

            <InfoItem
              label="Vendor"
              value={
                expense?.vendor
              }
            />

            <InfoItem
              label="Reference"
              value={
                expense?.reference
              }
            />

            <div className="col-span-2">
              <InfoItem
                label="Description"
                value={
                  expense?.description
                }
              />
            </div>
          </div>
        </div>

        <div
          className="
            flex
            items-center
            justify-between
            border-t
            border-slate-100
            px-5
            py-3.5
          "
        >
          {can("expense", "delete") ? (
          <button
            type="button"
            onClick={
              onDelete
            }
            className="
              text-[9px]
              font-bold
              text-red-500
              hover:text-red-700
            "
          >
            Delete Expense
          </button>
          ) : (
            <span />
          )}

          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <button
              type="button"
              onClick={
                onClose
              }
              className="
                h-8
                rounded-lg
                border
                border-slate-200
                px-3
                text-[9px]
                font-bold
                text-slate-500
              "
            >
              Close
            </button>

            {can("expense", "edit") && (
            <button
              type="button"
              onClick={
                onEdit
              }
              className="
                inline-flex
                h-8
                items-center
                gap-1.5
                rounded-lg
                bg-[#0B6B43]
                px-3
                text-[9px]
                font-bold
                text-white
                hover:bg-[#095B3B]
              "
            >
              <Pencil
                size={11}
              />

              Edit
            </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   INFO
========================================================= */

const InfoItem = ({
  label,
  value,
}) => {
  return (
    <div className="min-w-0">
      <p
        className="
          text-[8px]
          font-bold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </p>

      <p
        className="
          mt-1
          break-words
          text-[10px]
          font-bold
          text-[#253252]
        "
      >
        {value ||
          "—"}
      </p>
    </div>
  );
};

/* =========================================================
   FORM FIELD
========================================================= */

const FormField = ({
  label,
  children,
}) => {
  return (
    <label className="block">
      <span
        className="
          mb-1.5
          block
          text-[8px]
          font-bold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </span>

      {children}
    </label>
  );
};

const inputClass = `
  h-9
  w-full
  rounded-lg
  border
  border-slate-200
  bg-white
  px-3
  text-[10px]
  font-semibold
  text-[#253252]
  outline-none
  transition
  focus:border-[#9CCEB1]
  focus:ring-1
  focus:ring-[#DCEFE4]
`;

/* =========================================================
   STATUS
========================================================= */

const ExpenseStatus = ({
  status,
}) => {
  const normalized =
    normalize(
      status
    );

  const isPaid =
    normalized ===
    "paid";

  return (
    <span
      className={`
        inline-flex
        rounded-full
        px-2
        py-1
        text-[7px]
        font-extrabold

        ${
          isPaid
            ? "bg-[#EAF5EF] text-[#0B6B43]"
            : "bg-[#FFF4DE] text-[#B86D00]"
        }
      `}
    >
      {isPaid
        ? "Paid"
        : "Pending"}
    </span>
  );
};

/* =========================================================
   ICON BUTTON
========================================================= */

const IconButton = ({
  icon: Icon,
  title,
  onClick,
}) => {
  return (
    <button
      type="button"
      title={title}
      onClick={
        onClick
      }
      className="
        flex
        h-7
        w-7
        items-center
        justify-center
        rounded-md
        border
        border-slate-200
        bg-white
        text-slate-500
        transition
        hover:border-[#B8DAC7]
        hover:bg-[#F3FAF6]
        hover:text-[#0B6B43]
      "
    >
      <Icon
        size={12}
      />
    </button>
  );
};

/* =========================================================
   EMPTY
========================================================= */

const EmptyExpenses = () => {
  return (
    <div className="px-5 py-12 text-center">
      <div
        className="
          mx-auto
          flex
          h-10
          w-10
          items-center
          justify-center
          rounded-xl
          bg-slate-50
          text-slate-400
        "
      >
        <Receipt
          size={17}
        />
      </div>

      <p
        className="
          mt-3
          text-[11px]
          font-bold
          text-[#17221D]
        "
      >
        No expenses found
      </p>

      <p
        className="
          mt-1
          text-[8px]
          text-slate-400
        "
      >
        Add an expense to see it here.
      </p>
    </div>
  );
};

/* =========================================================
   EMPTY HISTORY
========================================================= */

const EmptyHistory = () => {
  return (
    <div
      className="
        px-3
        py-8
        text-center
      "
    >
      <TrendingUp
        size={16}
        className="
          mx-auto
          text-slate-300
        "
      />

      <p
        className="
          mt-2
          text-[8px]
          text-slate-400
        "
      >
        No expense data for this range.
      </p>
    </div>
  );
};

/* =========================================================
   TABLE HEADER
========================================================= */

const TableHeader = ({
  children,
  align = "left",
}) => {
  return (
    <th
      className={`
        whitespace-nowrap
        border-b
        border-slate-200
        px-4
        py-2.5
        text-[8px]
        font-bold
        uppercase
        tracking-[0.05em]
        text-slate-400

        ${
          align ===
          "center"
            ? "text-center"
            : "text-left"
        }
      `}
    >
      {children}
    </th>
  );
};

/* =========================================================
   CATEGORY ICON
========================================================= */

const getExpenseIcon = (
  category
) => {
  switch (
    category
  ) {
    case "Fuel":
      return (
        <Fuel
          size={13}
        />
      );

    case "Vehicle Maintenance":
      return (
        <Car
          size={13}
        />
      );

    case "Office Expense":
      return (
        <Building2
          size={13}
        />
      );

    case "Collection Expense":
      return (
        <UserRound
          size={13}
        />
      );

    case "Insurance":
      return (
        <FileText
          size={13}
        />
      );

    default:
      return (
        <Receipt
          size={13}
        />
      );
  }
};

/* =========================================================
   HELPERS
========================================================= */

const normalize = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase();
};

const toNumber = (
  value
) => {
  const number =
    Number(value);

  return Number.isFinite(
    number
  )
    ? number
    : 0;
};

const getDateKey = (
  value
) => {
  if (!value) {
    return "";
  }

  const raw =
    String(value);

  const match =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "";
  }

  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1
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
  ].join("-");
};

const getTodayDateKey =
  () => {
    const date =
      new Date();

    return getDateKey(
      date
    );
  };

const formatMoney = (
  value
) => {
  return `₹${Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      maximumFractionDigits: 2,
    }
  )}`;
};

const formatAmount = (
  value
) => {
  return Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }
  );
};

const formatDisplayDate = (
  value
) => {
  if (!value) {
    return "—";
  }

  const raw =
    String(value);

  const match =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  const date =
    match
      ? new Date(
          Number(
            match[1]
          ),
          Number(
            match[2]
          ) - 1,
          Number(
            match[3]
          )
        )
      : new Date(
          value
        );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
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

const formatDateInput = (
  value
) => {
  if (
    !value ||
    Number.isNaN(
      value.getTime()
    )
  ) {
    return "";
  }

  return [
    value.getFullYear(),
    String(
      value.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),
    String(
      value.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
};

const formatMonthLabel =
  (
    value
  ) => {
    if (!value) {
      return "—";
    }

    const match =
      String(
        value
      ).match(
        /^(\d{4})-(\d{2})$/
      );

    if (!match) {
      return value;
    }

    const date =
      new Date(
        Number(
          match[1]
        ),
        Number(
          match[2]
        ) - 1,
        1
      );

    return date.toLocaleDateString(
      "en-IN",
      {
        month:
          "long",
        year:
          "numeric",
      }
    );
  };

export default ExpenseControl;