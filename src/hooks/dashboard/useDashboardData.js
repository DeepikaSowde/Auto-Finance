// src/hooks/dashboard/useDashboardData.js

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  getCustomers,
  getLoans,
  getOutstandingAmount,
} from "../../services/customerStorage";

import {
  getExpenses,
} from "../../services/expenseStorage";

import {
  getCollections,
} from "../../services/collectionStorage";

/* =========================================================
   CONSTANTS
========================================================= */

const TERMINAL_LOAN_STATUSES = new Set([
  "closed",
  "foreclosed",
  "paid_off",
  "paid off",
  "settled",
]);

const TERMINAL_VEHICLE_STATUSES = new Set([
  "sold",
]);

/* =========================================================
   MAIN HOOK
========================================================= */

const useDashboardData = () => {
  const [customers, setCustomers] =
    useState([]);

  const [loans, setLoans] =
    useState([]);

  const [expenses, setExpenses] =
    useState([]);

  const [collections, setCollections] =
    useState([]);

  const [loading, setLoading] =
    useState(true);

  /* =======================================================
     LOAD
  ======================================================== */

  const loadDashboardData =
    useCallback(async () => {
      try {
        const [
          storedCustomers,
          storedLoans,
          storedCollections,
        ] = await Promise.all([
          getCustomers(),
          getLoans(),
          getCollections(),
        ]);

        const storedExpenses =
          getExpenses();

        setCustomers(
          Array.isArray(
            storedCustomers
          )
            ? storedCustomers
            : []
        );

        setLoans(
          Array.isArray(
            storedLoans
          )
            ? storedLoans
            : []
        );

        setExpenses(
          Array.isArray(
            storedExpenses
          )
            ? storedExpenses
            : []
        );

        setCollections(
          Array.isArray(
            storedCollections
          )
            ? storedCollections
            : []
        );
      } catch (error) {
        console.error(
          "Failed to load dashboard data:",
          error
        );

        setCustomers([]);
        setLoans([]);
        setExpenses([]);
        setCollections([]);
      } finally {
        setLoading(false);
      }
    }, []);

  /* =======================================================
     DATA UPDATE LISTENER
  ======================================================== */

  useEffect(() => {
    loadDashboardData();

    const handleUpdate = () => {
      loadDashboardData();
    };

    window.addEventListener(
      "auto-finance:data-updated",
      handleUpdate
    );

    window.addEventListener(
      "fleetopz:data-updated",
      handleUpdate
    );

    window.addEventListener(
      "storage",
      handleUpdate
    );

    return () => {
      window.removeEventListener(
        "auto-finance:data-updated",
        handleUpdate
      );

      window.removeEventListener(
        "fleetopz:data-updated",
        handleUpdate
      );

      window.removeEventListener(
        "storage",
        handleUpdate
      );
    };
  }, [loadDashboardData]);

  /* =======================================================
     STATUS HELPERS
  ======================================================== */

  const normalizeStatus =
    useCallback((value) => {
      return String(
        value || ""
      )
        .trim()
        .toLowerCase()
        .replace(/[-\s]+/g, "_");
    }, []);

  /*
   * IMPORTANT:
   *
   * A loan is terminal when:
   *
   * FORECLOSED
   * CLOSED
   * PAID_OFF
   * OR its vehicle has already been SOLD.
   *
   * This prevents sold/foreclosed accounts from appearing
   * anywhere in today's collection/due calculations.
   */

  const isTerminalLoan =
    useCallback(
      (loan) => {
        const loanStatus =
          normalizeStatus(
            loan?.status
          );

        const vehicleStatus =
          normalizeStatus(
            loan?.vehicle?.status
          );

        if (
          TERMINAL_LOAN_STATUSES.has(
            loanStatus
          )
        ) {
          return true;
        }

        if (
          TERMINAL_VEHICLE_STATUSES.has(
            vehicleStatus
          )
        ) {
          return true;
        }

        return false;
      },
      [normalizeStatus]
    );

  /*
   * Collection-eligible loans only.
   *
   * These are the loans that may generate:
   * - Today's Due
   * - Overdue
   * - Upcoming Due
   * - Follow-up
   */

  const collectionLoans =
    useMemo(() => {
      return loans.filter(
        (loan) =>
          !isTerminalLoan(
            loan
          )
      );
    }, [
      loans,
      isTerminalLoan,
    ]);

  /* =======================================================
     BASIC COUNTS
  ======================================================== */

  const totalCustomers =
    customers.length;

  const totalLoans =
    loans.length;

  const activeLoans =
    loans.filter(
      (loan) =>
        normalizeStatus(
          loan?.status
        ) === "active" &&
        !isTerminalLoan(
          loan
        )
    ).length;

  const closedLoans =
    loans.filter(
      (loan) =>
        normalizeStatus(
          loan?.status
        ) === "closed"
    ).length;

  const pendingLoans =
    loans.filter(
      (loan) =>
        normalizeStatus(
          loan?.status
        ) === "pending"
    ).length;

  const foreclosedLoans =
    loans.filter(
      (loan) =>
        normalizeStatus(
          loan?.status
        ) === "foreclosed" ||
        (
          normalizeStatus(
            loan?.vehicle?.status
          ) === "sold"
        )
    ).length;

  /* =======================================================
     OUTSTANDING
     
     IMPORTANT:
     Do not count SOLD / FORECLOSED / CLOSED accounts
     as active portfolio outstanding.
  ======================================================== */

  const totalOutstanding =
    useMemo(() => {
      return collectionLoans.reduce(
        (total, loan) =>
          total +
          Number(
            getOutstandingAmount(
              loan
            ) || 0
          ),
        0
      );
    }, [collectionLoans]);

  /* =======================================================
     DAILY DATE
  ======================================================== */

  const getTodayKey = () => {
    const now =
      new Date();

    return [
      now.getFullYear(),
      String(
        now.getMonth() + 1
      ).padStart(2, "0"),
      String(
        now.getDate()
      ).padStart(2, "0"),
    ].join("-");
  };

  const [
    todayKey,
    setTodayKey,
  ] = useState(
    getTodayKey()
  );

  useEffect(() => {
    const refreshDay =
      () => {
        const latestKey =
          getTodayKey();

        setTodayKey(
          (currentKey) =>
            currentKey ===
            latestKey
              ? currentKey
              : latestKey
        );
      };

    refreshDay();

    const interval =
      setInterval(
        refreshDay,
        60 * 1000
      );

    return () => {
      clearInterval(
        interval
      );
    };
  }, []);

  const todayStart =
    useMemo(() => {
      const [
        year,
        month,
        day,
      ] = todayKey
        .split("-")
        .map(Number);

      return new Date(
        year,
        month - 1,
        day,
        0,
        0,
        0,
        0
      );
    }, [todayKey]);

  const todayEnd =
    useMemo(() => {
      const [
        year,
        month,
        day,
      ] = todayKey
        .split("-")
        .map(Number);

      return new Date(
        year,
        month - 1,
        day,
        23,
        59,
        59,
        999
      );
    }, [todayKey]);

  /* =======================================================
     LOCAL DATE PARSER
  ======================================================== */

  const parseScheduleDate =
    useCallback(
      (value) => {
        if (!value) {
          return null;
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
      },
      []
    );

  const getDayStart =
    useCallback(
      (value) => {
        const date =
          value instanceof Date
            ? new Date(value)
            : parseScheduleDate(
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
      },
      [parseScheduleDate]
    );

  const getDateKey =
    useCallback(
      (value) => {
        const date =
          getDayStart(
            value
          );

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
      },
      [getDayStart]
    );

  /* =======================================================
     REPAYMENT HELPERS
  ======================================================== */

  const getSchedule =
    useCallback(
      (loan) => {
        /*
         * Terminal loans have no active schedule for
         * dashboard collection purposes.
         */
        if (
          isTerminalLoan(
            loan
          )
        ) {
          return [];
        }

        return Array.isArray(
          loan?.repaymentSchedule
        )
          ? loan.repaymentSchedule
          : [];
      },
      [isTerminalLoan]
    );

  const getRowAmount =
    useCallback(
      (row) => {
        return Number(
          row?.paymentAmount ??
            row?.emiAmount ??
            row?.amount ??
            0
        );
      },
      []
    );

  /* =======================================================
     TODAY'S SCHEDULED DUE
  ======================================================== */

  const todayScheduledDueAmount =
    useMemo(() => {
      return collectionLoans.reduce(
        (
          total,
          loan
        ) => {
          const schedule =
            getSchedule(
              loan
            );

          return (
            total +
            schedule.reduce(
              (
                sum,
                row
              ) => {
                const dueDate =
                  getDateKey(
                    row?.dueDate
                  );

                if (
                  dueDate !==
                  todayKey
                ) {
                  return sum;
                }

                const status =
                  normalizeStatus(
                    row?.status
                  );

                if (
                  [
                    "paid",
                    "completed",
                    "closed",
                    "settled",
                    "foreclosed",
                  ].includes(
                    status
                  )
                ) {
                  return sum;
                }

                return (
                  sum +
                  getRowAmount(
                    row
                  )
                );
              },
              0
            )
          );
        },
        0
      );
    }, [
      collectionLoans,
      getSchedule,
      getDateKey,
      getRowAmount,
      normalizeStatus,
      todayKey,
    ]);

  /* =======================================================
     PAYMENT STATUS
  ======================================================== */

  const normalizePaymentStatus =
    useCallback(
      (status) => {
        return String(
          status || ""
        )
          .trim()
          .toLowerCase();
      },
      []
    );

  const isCompletedPaymentStatus =
    useCallback(
      (status) => {
        const normalized =
          normalizePaymentStatus(
            status
          );

        return (
          normalized ===
            "paid" ||
          normalized ===
            "completed" ||
          normalized ===
            "closed" ||
          normalized ===
            "settled" ||
          normalized ===
            "foreclosed"
        );
      },
      [normalizePaymentStatus]
    );

  const isOpenPaymentStatus =
    useCallback(
      (status) => {
        const normalized =
          normalizePaymentStatus(
            status
          );

        return (
          normalized ===
            "pending" ||
          normalized ===
            "due" ||
          normalized ===
            "due today" ||
          normalized ===
            "overdue" ||
          normalized ===
            "partially paid" ||
          normalized ===
            "partially-paid" ||
          normalized ===
            "partial"
        );
      },
      [normalizePaymentStatus]
    );

  /* =======================================================
     APPROVED COLLECTIONS
  ======================================================== */

  const approvedCollections =
    useMemo(() => {
      return collections.filter(
        (collection) =>
          normalizePaymentStatus(
            collection?.status
          ) ===
          "approved"
      );
    }, [
      collections,
      normalizePaymentStatus,
    ]);

  /* =======================================================
     TODAY'S APPROVED COLLECTIONS
  ======================================================== */

  const todayApprovedCollections =
    useMemo(() => {
      return approvedCollections.filter(
        (collection) => {
          const collectedDate =
            getDateKey(
              collection?.collectedDate ||
                collection?.collectionDate ||
                collection?.submittedAt ||
                collection?.approvedAt
            );

          return (
            collectedDate ===
            todayKey
          );
        }
      );
    }, [
      approvedCollections,
      getDateKey,
      todayKey,
    ]);

  /* =======================================================
     PENDING COLLECTIONS
  ======================================================== */

  const pendingCollections =
    useMemo(() => {
      return collections.filter(
        (collection) =>
          normalizePaymentStatus(
            collection?.status
          ) ===
          "pending"
      );
    }, [
      collections,
      normalizePaymentStatus,
    ]);

  const pendingCollectionCount =
    pendingCollections.length;

  const pendingCollectionAmount =
    useMemo(() => {
      return pendingCollections.reduce(
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
    }, [
      pendingCollections,
    ]);

  /* =======================================================
     APPROVED COLLECTION TOTAL
  ======================================================== */

  const approvedCollectionAmount =
    useMemo(() => {
      return approvedCollections.reduce(
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
    }, [
      approvedCollections,
    ]);

  /* =======================================================
     APPROVED AMOUNT FOR ONE INSTALLMENT
  ======================================================== */

  const getApprovedAmountForRow =
    useCallback(
      (
        loan,
        row
      ) => {
        /*
         * Terminal loans should never participate
         * in collection calculation.
         */
        if (
          isTerminalLoan(
            loan
          )
        ) {
          return 0;
        }

        const loanId =
          loan?.id ||
          loan?.loanNumber ||
          "";

        const scheduleId =
          row?.id ||
          "";

        const dueDate =
          getDateKey(
            row?.dueDate
          );

        return approvedCollections
          .filter(
            (
              collection
            ) => {
              const collectionLoanId =
                collection?.loanId ||
                collection?.loanNumber ||
                "";

              const collectionScheduleId =
                collection?.scheduleId ||
                "";

              const collectionDueDate =
                getDateKey(
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
      },
      [
        approvedCollections,
        getDateKey,
        isTerminalLoan,
      ]
    );

  /* =======================================================
     NEW LOANS TODAY
  ======================================================== */

  const newLoansToday =
    useMemo(() => {
      return loans.filter(
        (loan) => {
          const createdAt =
            new Date(
              loan?.createdAt ||
                0
            );

          if (
            Number.isNaN(
              createdAt.getTime()
            )
          ) {
            return false;
          }

          return (
            createdAt >=
              todayStart &&
            createdAt <=
              todayEnd
          );
        }
      ).length;
    }, [
      loans,
      todayStart,
      todayEnd,
    ]);

  /* =======================================================
     OVERDUE RULE
  ======================================================== */

  const isOverdueScheduleRow =
    useCallback(
      (row) => {
        const status =
          normalizePaymentStatus(
            row?.status
          );

        if (
          isCompletedPaymentStatus(
            status
          )
        ) {
          return false;
        }

        const dueDate =
          getDayStart(
            row?.dueDate
          );

        if (!dueDate) {
          return false;
        }

        return (
          dueDate.getTime() <
          todayStart.getTime()
        );
      },
      [
        normalizePaymentStatus,
        isCompletedPaymentStatus,
        getDayStart,
        todayStart,
      ]
    );

  /* =======================================================
     TODAY'S EMI DUE
  ======================================================== */

  const dueToday =
    useMemo(() => {
      const rows = [];

      collectionLoans.forEach(
        (loan) => {
          const schedule =
            getSchedule(
              loan
            );

          schedule.forEach(
            (row) => {
              const status =
                normalizePaymentStatus(
                  row?.status
                );

              if (
                isCompletedPaymentStatus(
                  status
                )
              ) {
                return;
              }

              const dueDate =
                getDayStart(
                  row?.dueDate
                );

              if (!dueDate) {
                return;
              }

              if (
                getDateKey(
                  dueDate
                ) !==
                todayKey
              ) {
                return;
              }

              const scheduledAmount =
                getRowAmount(
                  row
                );

              const approvedAmount =
                getApprovedAmountForRow(
                  loan,
                  row
                );

              const remainingAmount =
                Math.max(
                  scheduledAmount -
                    approvedAmount,
                  0
                );

              if (
                remainingAmount <=
                0
              ) {
                return;
              }

              rows.push({
                loan,

                scheduleRow: {
                  ...row,

                  remainingAmount,
                },
              });
            }
          );
        }
      );

      return rows;
    }, [
      collectionLoans,
      getSchedule,
      normalizePaymentStatus,
      isCompletedPaymentStatus,
      getDayStart,
      getDateKey,
      getRowAmount,
      getApprovedAmountForRow,
      todayKey,
    ]);

  const emiDueCount =
    dueToday.length;

  const emiDueAmount =
    useMemo(() => {
      return dueToday.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item?.scheduleRow
              ?.remainingAmount ||
              0
          ),
        0
      );
    }, [
      dueToday,
    ]);

  /* =======================================================
     OVERDUE PAYMENTS
  ======================================================== */

  const overduePayments =
    useMemo(() => {
      const rows = [];

      collectionLoans.forEach(
        (loan) => {
          const schedule =
            getSchedule(
              loan
            );

          schedule.forEach(
            (row) => {
              const status =
                normalizePaymentStatus(
                  row?.status
                );

              if (
                isCompletedPaymentStatus(
                  status
                )
              ) {
                return;
              }

              const dueDate =
                getDayStart(
                  row?.dueDate
                );

              if (!dueDate) {
                return;
              }

              if (
                dueDate.getTime() >=
                todayStart.getTime()
              ) {
                return;
              }

              const scheduledAmount =
                getRowAmount(
                  row
                );

              const approvedAmount =
                getApprovedAmountForRow(
                  loan,
                  row
                );

              const remainingAmount =
                Math.max(
                  scheduledAmount -
                    approvedAmount,
                  0
                );

              if (
                remainingAmount <=
                0
              ) {
                return;
              }

              const overdueDays =
                Math.max(
                  1,
                  Math.floor(
                    (
                      todayStart.getTime() -
                      dueDate.getTime()
                    ) /
                      (
                        1000 *
                        60 *
                        60 *
                        24
                      )
                  )
                );

              rows.push({
                loan,

                scheduleRow: {
                  ...row,

                  remainingAmount,

                  overdueDays,
                },

                overdueDays,
              });
            }
          );
        }
      );

      return rows.sort(
        (a, b) => {
          const aDate =
            getDayStart(
              a?.scheduleRow
                ?.dueDate
            );

          const bDate =
            getDayStart(
              b?.scheduleRow
                ?.dueDate
            );

          return (
            (aDate?.getTime() ||
              0) -
            (bDate?.getTime() ||
              0)
          );
        }
      );
    }, [
      collectionLoans,
      getSchedule,
      normalizePaymentStatus,
      isCompletedPaymentStatus,
      getDayStart,
      getRowAmount,
      getApprovedAmountForRow,
      todayStart,
    ]);

  /* =======================================================
     UNIQUE OVERDUE LOANS
  ======================================================== */

  const overdueLoanIds =
    useMemo(() => {
      return new Set(
        overduePayments.map(
          ({
            loan,
          }) =>
            loan?.id ||
            loan?.loanNumber
        )
      );
    }, [
      overduePayments,
    ]);

  const overdueLoanCount =
    overdueLoanIds.size;

  /* =======================================================
     CURRENT OVERDUE AMOUNT
  ======================================================== */

  const overdueAmount =
    useMemo(() => {
      return overduePayments.reduce(
        (
          total,
          item
        ) =>
          total +
          Number(
            item?.scheduleRow
              ?.remainingAmount ||
              0
          ),
        0
      );
    }, [
      overduePayments,
    ]);

  /* =======================================================
     TODAY'S APPROVED COLLECTION
  ======================================================== */

  const todayCollectionAmount =
    useMemo(() => {
      return approvedCollections
        .filter(
          (collection) => {
            const collectedDate =
              getDateKey(
                collection?.collectedDate ||
                  collection?.collectionDate ||
                  collection?.submittedAt ||
                  collection?.approvedAt
              );

            return (
              collectedDate ===
              todayKey
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
    }, [
      approvedCollections,
      getDateKey,
      todayKey,
    ]);

  /* =======================================================
     TODAY NORMAL COLLECTION
  ======================================================== */

  const todayDueCollectionAmount =
    useMemo(() => {
      return approvedCollections
        .filter(
          (collection) => {
            const collectedDate =
              getDateKey(
                collection?.collectedDate ||
                  collection?.collectionDate ||
                  collection?.submittedAt ||
                  collection?.approvedAt
              );

            const dueDate =
              getDateKey(
                collection?.dueDate
              );

            return (
              collectedDate ===
                todayKey &&
              dueDate ===
                todayKey
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
    }, [
      approvedCollections,
      getDateKey,
      todayKey,
    ]);

  /* =======================================================
     OVERDUE COLLECTION MADE TODAY
  ======================================================== */

  const overdueCollectionTodayAmount =
    useMemo(() => {
      return approvedCollections
        .filter(
          (collection) => {
            const collectedDate =
              getDateKey(
                collection?.collectedDate ||
                  collection?.collectionDate ||
                  collection?.submittedAt ||
                  collection?.approvedAt
              );

            const dueDate =
              getDateKey(
                collection?.dueDate
              );

            if (
              !collectedDate ||
              !dueDate
            ) {
              return false;
            }

            return (
              collectedDate ===
                todayKey &&
              dueDate <
                collectedDate
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
    }, [
      approvedCollections,
      getDateKey,
      todayKey,
    ]);

  /* =======================================================
     ORIGINAL OVERDUE AMOUNT
  ======================================================== */

  const originalOverdueAmount =
    useMemo(() => {
      return (
        overdueAmount +
        overdueCollectionTodayAmount
      );
    }, [
      overdueAmount,
      overdueCollectionTodayAmount,
    ]);

  /* =======================================================
     TODAY COLLECTION ACCURACY
  ======================================================== */

  const todayCollectionAccuracy =
    useMemo(() => {
      if (
        todayScheduledDueAmount <=
        0
      ) {
        return 0;
      }

      return Math.min(
        100,
        (
          todayDueCollectionAmount /
          todayScheduledDueAmount
        ) * 100
      );
    }, [
      todayDueCollectionAmount,
      todayScheduledDueAmount,
    ]);

  /* =======================================================
     OVERDUE RECOVERY ACCURACY
  ======================================================== */

  const overdueCollectionAccuracy =
    useMemo(() => {
      if (
        originalOverdueAmount <=
        0
      ) {
        return 0;
      }

      return Math.min(
        100,
        (
          overdueCollectionTodayAmount /
          originalOverdueAmount
        ) * 100
      );
    }, [
      overdueCollectionTodayAmount,
      originalOverdueAmount,
    ]);

  /* =======================================================
     COLLECTION VS DUE
  ======================================================== */

  const collectionVsDue =
    useMemo(() => {
      return {
        today: {
          due:
            todayScheduledDueAmount,

          collected:
            todayDueCollectionAmount,

          accuracy:
            todayScheduledDueAmount >
            0
              ? Math.min(
                  100,
                  (
                    todayDueCollectionAmount /
                    todayScheduledDueAmount
                  ) * 100
                )
              : 0,
        },

        overdue: {
          due:
            originalOverdueAmount,

          collected:
            overdueCollectionTodayAmount,

          accuracy:
            overdueCollectionAccuracy,
        },
      };
    }, [
      todayScheduledDueAmount,
      todayDueCollectionAmount,
      originalOverdueAmount,
      overdueCollectionTodayAmount,
      overdueCollectionAccuracy,
    ]);

  /* =======================================================
     TODAY CASH / BANK / UPI
  ======================================================== */

  const cashBankUpi =
    useMemo(() => {
      return todayApprovedCollections.reduce(
        (
          totals,
          collection
        ) => {
          const mode =
            String(
              collection?.paymentMode ||
                ""
            )
              .trim()
              .toLowerCase();

          const amount =
            Number(
              collection?.amount ||
                0
            );

          if (
            mode === "cash"
          ) {
            totals.cash +=
              amount;
          }

          if (
            mode === "bank"
          ) {
            totals.bank +=
              amount;
          }

          if (
            mode === "upi"
          ) {
            totals.upi +=
              amount;
          }

          return totals;
        },
        {
          cash: 0,
          bank: 0,
          upi: 0,
        }
      );
    }, [
      todayApprovedCollections,
    ]);

  /* =======================================================
     CASH POSITION
  ======================================================== */

  const cashPosition =
    useMemo(() => {
      return (
        cashBankUpi.cash +
        cashBankUpi.bank +
        cashBankUpi.upi
      );
    }, [
      cashBankUpi,
    ]);

  /* =======================================================
     UPCOMING DUE
  ======================================================== */

  const upcomingDueLoans =
    useMemo(() => {
      const rows = [];

      collectionLoans.forEach(
        (loan) => {
          const schedule =
            getSchedule(
              loan
            );

          const futurePayments =
            schedule.filter(
              (row) => {
                const status =
                  normalizePaymentStatus(
                    row?.status
                  );

                if (
                  isCompletedPaymentStatus(
                    status
                  )
                ) {
                  return false;
                }

                const dueDate =
                  getDayStart(
                    row?.dueDate
                  );

                if (!dueDate) {
                  return false;
                }

                if (
                  dueDate.getTime() <=
                  todayStart.getTime()
                ) {
                  return false;
                }

                const scheduledAmount =
                  getRowAmount(
                    row
                  );

                const approvedAmount =
                  getApprovedAmountForRow(
                    loan,
                    row
                  );

                const remainingAmount =
                  Math.max(
                    scheduledAmount -
                      approvedAmount,
                    0
                  );

                return (
                  remainingAmount >
                  0
                );
              }
            );

          const nextPayment =
            futurePayments.sort(
              (a, b) => {
                const aDate =
                  getDayStart(
                    a?.dueDate
                  );

                const bDate =
                  getDayStart(
                    b?.dueDate
                  );

                return (
                  (aDate?.getTime() ||
                    0) -
                  (bDate?.getTime() ||
                    0)
                );
              }
            )[0];

          if (
            !nextPayment
          ) {
            return;
          }

          const remainingAmount =
            Math.max(
              getRowAmount(
                nextPayment
              ) -
                getApprovedAmountForRow(
                  loan,
                  nextPayment
                ),
              0
            );

          rows.push({
            loan,

            scheduleRow: {
              ...nextPayment,

              remainingAmount,
            },
          });
        }
      );

      return rows.sort(
        (a, b) => {
          const aDate =
            getDayStart(
              a?.scheduleRow
                ?.dueDate
            );

          const bDate =
            getDayStart(
              b?.scheduleRow
                ?.dueDate
            );

          return (
            (aDate?.getTime() ||
              0) -
            (bDate?.getTime() ||
              0)
          );
        }
      );
    }, [
      collectionLoans,
      getSchedule,
      normalizePaymentStatus,
      isCompletedPaymentStatus,
      getDayStart,
      getRowAmount,
      getApprovedAmountForRow,
      todayStart,
    ]);

  /* =======================================================
     OVERDUE + PENDING
  ======================================================== */

  const overduePendingCount =
    overdueLoanCount +
    pendingLoans;

  /* =======================================================
     CLOSED LOANS TODAY
  ======================================================== */

  const closedLoansToday =
    useMemo(() => {
      return loans.filter(
        (loan) => {
          const status =
            normalizePaymentStatus(
              loan?.status
            );

          if (
            status !==
              "closed" &&
            status !==
              "foreclosed"
          ) {
            return false;
          }

          const updatedAt =
            new Date(
              loan?.updatedAt ||
                loan?.createdAt ||
                0
            );

          if (
            Number.isNaN(
              updatedAt.getTime()
            )
          ) {
            return false;
          }

          return (
            updatedAt >=
              todayStart &&
            updatedAt <=
              todayEnd
          );
        }
      ).length;
    }, [
      loans,
      todayStart,
      todayEnd,
      normalizePaymentStatus,
    ]);

  /* =======================================================
     FOLLOW-UP QUEUE
  ======================================================== */

  const followUpQueue =
    useMemo(() => {
      const rows = [];

      overduePayments.forEach(
        ({
          loan,
          scheduleRow,
          overdueDays,
        }) => {
          rows.push({
            loan,

            scheduleRow,

            days:
              overdueDays,

            isOverdue:
              true,
          });
        }
      );

      dueToday.forEach(
        ({
          loan,
          scheduleRow,
        }) => {
          rows.push({
            loan,

            scheduleRow,

            days: 0,

            isOverdue:
              false,
          });
        }
      );

      return rows.sort(
        (a, b) => {
          if (
            a.isOverdue &&
            !b.isOverdue
          ) {
            return -1;
          }

          if (
            !a.isOverdue &&
            b.isOverdue
          ) {
            return 1;
          }

          if (
            a.isOverdue &&
            b.isOverdue
          ) {
            return (
              (b.days || 0) -
              (a.days || 0)
            );
          }

          const aDate =
            getDayStart(
              a?.scheduleRow
                ?.dueDate
            );

          const bDate =
            getDayStart(
              b?.scheduleRow
                ?.dueDate
            );

          return (
            (aDate?.getTime() ||
              0) -
            (bDate?.getTime() ||
              0)
          );
        }
      );
    }, [
      overduePayments,
      dueToday,
      getDayStart,
    ]);

  /* =======================================================
     RECENT LOANS
  ======================================================== */

  const recentLoans =
    useMemo(() => {
      return [...loans]
        .sort((a, b) => {
          const aDate =
            new Date(
              a?.updatedAt ||
                a?.createdAt ||
                0
            ).getTime();

          const bDate =
            new Date(
              b?.updatedAt ||
                b?.createdAt ||
                0
            ).getTime();

          return (
            bDate - aDate
          );
        })
        .slice(0, 5);
    }, [
      loans,
    ]);

  /* =======================================================
     RECENT CUSTOMERS
  ======================================================== */

  const recentCustomers =
    useMemo(() => {
      return [...customers]
        .sort((a, b) => {
          const aDate =
            new Date(
              a?.customer
                ?.updatedAt ||
                a?.customer
                  ?.createdAt ||
                0
            ).getTime();

          const bDate =
            new Date(
              b?.customer
                ?.updatedAt ||
                b?.customer
                  ?.createdAt ||
                0
            ).getTime();

          return (
            bDate - aDate
          );
        })
        .slice(0, 5);
    }, [
      customers,
    ]);

  /* =======================================================
     RECENT ACTIONS
  ======================================================== */

  const recentActions =
    useMemo(() => {
      const actions = [];

      customers.forEach(
        (customer) => {
          if (
            customer?.customer
              ?.createdAt
          ) {
            actions.push({
              id:
                `customer-created-${customer.customer.id}`,

              type:
                "customer_created",

              title:
                "Customer created",

              description:
                customer?.customer
                  ?.personal?.name ||
                customer?.customer
                  ?.customerNumber ||
                "Customer",

              timestamp:
                customer.customer
                  .createdAt,

              customer,
            });
          }
        }
      );

      loans.forEach(
        (loan) => {
          if (
            loan?.createdAt
          ) {
            actions.push({
              id:
                `loan-created-${loan.id || loan.loanNumber}`,

              type:
                "loan_created",

              title:
                "Loan created",

              description:
                loan?.loanNumber ||
                "Loan",

              timestamp:
                loan.createdAt,

              loan,
            });
          }
        }
      );

      /*
       * Only active collection loans can generate
       * overdue dashboard activities.
       */
      overduePayments.forEach(
        ({
          loan,
          scheduleRow,
        }) => {
          actions.push({
            id:
              `overdue-${loan?.id || loan?.loanNumber}-${scheduleRow?.dueDate}`,

            type:
              "overdue",

            title:
              "EMI overdue",

            description:
              loan?.loanNumber ||
              "Loan",

            timestamp:
              scheduleRow?.dueDate,

            loan,

            scheduleRow,
          });
        }
      );

      return actions
        .sort(
          (a, b) => {
            return (
              new Date(
                b.timestamp ||
                  0
              ).getTime() -
              new Date(
                a.timestamp ||
                  0
              ).getTime()
            );
          }
        )
        .slice(0, 10);
    }, [
      customers,
      loans,
      overduePayments,
    ]);

  /* =======================================================
     PENDING ACTIONS
  ======================================================== */

  const pendingActions =
    0;

  /* =======================================================
     PTP
  ======================================================== */

  const ptpDue =
    useMemo(
      () => ({
        count: 0,
        amount: 0,
      }),
      []
    );

  /* =======================================================
     EXPENSES
  ======================================================== */

  const isPaidExpense =
    useCallback(
      (expense) => {
        return (
          normalizePaymentStatus(
            expense?.status
          ) ===
          "paid"
        );
      },
      [normalizePaymentStatus]
    );

  const totalExpenseAmount =
    useMemo(() => {
      return expenses
        .filter(
          isPaidExpense
        )
        .reduce(
          (
            total,
            expense
          ) =>
            total +
            Number(
              expense?.amount ||
                0
            ),
          0
        );
    }, [
      expenses,
      isPaidExpense,
    ]);

  const todayExpenseAmount =
    useMemo(() => {
      return expenses
        .filter(
          (expense) => {
            if (
              !isPaidExpense(
                expense
              )
            ) {
              return false;
            }

            return (
              getDateKey(
                expense?.date
              ) ===
              todayKey
            );
          }
        )
        .reduce(
          (
            total,
            expense
          ) =>
            total +
            Number(
              expense?.amount ||
                0
            ),
          0
        );
    }, [
      expenses,
      isPaidExpense,
      getDateKey,
      todayKey,
    ]);

  const currentMonthExpenseAmount =
    useMemo(() => {
      const year =
        todayStart.getFullYear();

      const month =
        todayStart.getMonth();

      return expenses
        .filter(
          (expense) => {
            if (
              !isPaidExpense(
                expense
              )
            ) {
              return false;
            }

            const date =
              parseScheduleDate(
                expense?.date
              );

            if (!date) {
              return false;
            }

            return (
              date.getFullYear() ===
                year &&
              date.getMonth() ===
                month
            );
          }
        )
        .reduce(
          (
            total,
            expense
          ) =>
            total +
            Number(
              expense?.amount ||
                0
            ),
          0
        );
    }, [
      expenses,
      isPaidExpense,
      parseScheduleDate,
      todayStart,
    ]);

  const pendingExpenseRecords =
    useMemo(() => {
      return expenses.filter(
        (expense) =>
          normalizePaymentStatus(
            expense?.status
          ) ===
          "pending"
      );
    }, [
      expenses,
      normalizePaymentStatus,
    ]);

  const pendingExpenseCount =
    pendingExpenseRecords.length;

  const pendingExpenseAmount =
    useMemo(() => {
      return pendingExpenseRecords.reduce(
        (
          total,
          expense
        ) =>
          total +
          Number(
            expense?.amount ||
              0
          ),
        0
      );
    }, [
      pendingExpenseRecords,
    ]);

  /* =======================================================
     RETURN
  ======================================================== */

  return {
    loading,

    customers,
    loans,
    expenses,
    collections,

    /* Basic */
    totalCustomers,
    totalLoans,
    activeLoans,
    closedLoans,
    pendingLoans,
    foreclosedLoans,

    /* Outstanding */
    totalOutstanding,

    /* Loans */
    newLoansToday,

    dueToday,
    emiDueCount,
    emiDueAmount,

    todayScheduledDueAmount,

    overduePayments,
    overdueLoanCount,
    overdueAmount,

    overduePendingCount,

    upcomingDueLoans,

    closedLoansToday,

    followUpQueue,

    recentLoans,
    recentCustomers,
    recentActions,

    /* Financial Overview */
    collectionVsDue,
    cashBankUpi,
    cashPosition,
    pendingActions,

    /* Collection */
    approvedCollections,
    pendingCollections,

    approvedCollectionAmount,

    todayCollectionAmount,
    todayDueCollectionAmount,
    overdueCollectionTodayAmount,

    originalOverdueAmount,
    overdueCollectionAccuracy,
    todayCollectionAccuracy,

    pendingCollectionCount,
    pendingCollectionAmount,

    /* Expense */
    totalExpenseAmount,
    todayExpenseAmount,
    currentMonthExpenseAmount,

    pendingExpenseCount,
    pendingExpenseAmount,

    /* PTP */
    ptpDue,

    todayApprovedCollections,

    /* Useful for dashboard/components */
    collectionLoans,

    /* Reload */
    reloadDashboard:
      loadDashboardData,
  };
};

export default useDashboardData;