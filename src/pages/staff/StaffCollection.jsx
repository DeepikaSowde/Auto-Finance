// src/pages/staff/StaffCollection.jsx

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  AlertCircle,
  ArrowDown,
  BadgeCheck,
  Calculator,
  CheckCircle2,
  Clock3,
  IndianRupee,
  LogOut,
  MapPin,
  Phone,
  Receipt,
  Search,
  ShieldAlert,
  UserRound,
  Wallet,
  X,
} from "lucide-react";

import {
  useNavigate,
} from "react-router-dom";

import {
  getLoans,
} from "../../services/customerStorage";

import {
  addCollection,
  getCollections,
} from "../../services/collectionStorage";

import {
  previewRepayment,
  getPenaltyConfig,
  getOutstandingPenaltySummary,
  getScheduleOutstanding,
  getRepaymentBuckets,
  getScheduleAmount,
  getSchedulePaidAmount,
  getScheduleRemainingAmount,
} from "../../services/repaymentStorage";

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
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
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

const getTodayKey = () => {
  const today =
    new Date();

  return [
    today.getFullYear(),
    String(
      today.getMonth() + 1
    ).padStart(2, "0"),
    String(
      today.getDate()
    ).padStart(2, "0"),
  ].join("-");
};

const getDateKey = (
  value
) => {
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
      date.getMonth() + 1
    ).padStart(2, "0"),
    String(
      date.getDate()
    ).padStart(2, "0"),
  ].join("-");
};

/* =========================================================
   BASIC HELPERS
========================================================= */

const normalize = (
  value
) =>
  String(
    value || ""
  )
    .trim()
    .toLowerCase();

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

const roundMoney = (
  value
) =>
  Math.round(
    (
      toNumber(value) +
      Number.EPSILON
    ) * 100
  ) / 100;

/* =========================================================
   SHARED LOAN / SCHEDULE HELPERS
========================================================= */

const getCustomerName = (
  loan
) => {
  return (
    loan?.customerName ||
    loan?.customer?.personal?.name ||
    loan?.customer?.name ||
    "Customer"
  );
};

const getCustomerId = (
  loan
) => {
  return (
    loan?.customerId ||
    loan?.customer?.id ||
    loan?.customer?.customerId ||
    loan?.customer?.customerNumber ||
    ""
  );
};

const getCustomerMobile = (
  loan
) => {
  return (
    loan?.mobileNumber ||
    loan?.customer?.personal?.mobileNumber ||
    loan?.mobile ||
    ""
  );
};

const getLoanId = (
  loan
) => {
  return (
    loan?.id ||
    loan?.loanNumber ||
    ""
  );
};

const getLoanNumber = (
  loan
) => {
  return (
    loan?.loanNumber ||
    "Loan"
  );
};

const getLoanAmount = (
  loan
) => {
  return roundMoney(
    loan?.loanAmount ??
      loan?.calculation?.principal ??
      0
  );
};

const getOriginalPaymentAmount = (
  row
) => {
  return roundMoney(
    row?.paymentAmount ??
      row?.emiAmount ??
      row?.amount ??
      0
  );
};

const getPaidAmount = (
  row
) => {
  return roundMoney(
    row?.paidAmount ??
      0
  );
};

const getOriginalPrincipal = (
  row
) => {
  return roundMoney(
    row?.principal ??
      row?.principalAmount ??
      0
  );
};

const getOriginalInterest = (
  row
) => {
  return roundMoney(
    row?.interest ??
      row?.interestAmount ??
      0
  );
};

const getRemainingInterest = (
  row
) => {
  const interest =
    getOriginalInterest(
      row
    );

  const paid =
    getPaidAmount(
      row
    );

  return roundMoney(
    Math.max(
      interest -
        Math.min(
          paid,
          interest
        ),
      0
    )
  );
};

const getRemainingPrincipal = (
  row
) => {
  const principal =
    getOriginalPrincipal(
      row
    );

  const interest =
    getOriginalInterest(
      row
    );

  const paid =
    getPaidAmount(
      row
    );

  const paidAfterInterest =
    Math.max(
      paid -
        interest,
      0
    );

  return roundMoney(
    Math.max(
      principal -
        paidAfterInterest,
      0
    )
  );
};

const formatMoney = (
  value
) =>
  `₹${Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;

const formatDisplayDate = (
  value
) => {
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

const formatDisplayDateTime = (
  value
) => {
  if (!value) {
    return "—";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return "—";
  }

  return date.toLocaleString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  );
};

/* =========================================================
   SAFE STORAGE
========================================================= */

const safeGetLoans = async () => {
  try {
    const result =
      await getLoans();

    return Array.isArray(
      result
    )
      ? result
      : [];
  } catch (error) {
    console.error(
      "Failed to load loans:",
      error
    );

    return [];
  }
};

const safeGetCollections = async () => {
  try {
    const result =
      await getCollections();

    return Array.isArray(
      result
    )
      ? result
      : [];
  } catch (error) {
    console.error(
      "Failed to load collections:",
      error
    );

    return [];
  }
};

/* =========================================================
   MAIN
========================================================= */

const StaffCollection = () => {
  const navigate =
    useNavigate();

  /* =======================================================
     STATE
  ====================================================== */

  const [
    loans,
    setLoans,
  ] = useState([]);

  const [
    collections,
    setCollections,
  ] = useState([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedPayment,
    setSelectedPayment,
  ] = useState(null);

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    paymentMode,
    setPaymentMode,
  ] = useState("Cash");

  const [
    location,
    setLocation,
  ] = useState("");

  const [
    remarks,
    setRemarks,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  /* =======================================================
     LOGOUT
  ====================================================== */

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

  /* =======================================================
     SYNC
  ====================================================== */

  useEffect(() => {
    const reloadData =
      async () => {
        const [loadedLoans, loadedCollections] =
          await Promise.all([
            safeGetLoans(),
            safeGetCollections(),
          ]);

        setLoans(loadedLoans);
        setCollections(loadedCollections);
      };

    reloadData();

    window.addEventListener(
      "auto-finance:data-updated",
      reloadData
    );

    window.addEventListener(
      "fleetopz:data-updated",
      reloadData
    );

    window.addEventListener(
      "storage",
      reloadData
    );

    return () => {
      window.removeEventListener(
        "auto-finance:data-updated",
        reloadData
      );

      window.removeEventListener(
        "fleetopz:data-updated",
        reloadData
      );

      window.removeEventListener(
        "storage",
        reloadData
      );
    };
  }, []);

  /* =======================================================
     LOAN HELPERS
  ====================================================== */

  const isCollectionEnabledLoan =
    (
      loan
    ) => {
      const status =
        normalize(
          loan?.status
        );

      return ![
        "closed",
        "foreclosed",
        "paid",
        "paid off",
        "paid_off",
        "settled",
      ].includes(
        status
      );
    };

  const getCustomerName =
    (
      loan
    ) =>
      loan?.customerName ||
      loan?.customer?.personal
        ?.name ||
      loan?.customer?.name ||
      "Customer";

  const getCustomerMobile =
    (
      loan
    ) =>
      loan?.mobileNumber ||
      loan?.customer?.personal
        ?.mobileNumber ||
      loan?.mobile ||
      "";

  const getCustomerId =
    (
      loan
    ) =>
      loan?.customerId ||
      loan?.customer?.id ||
      loan?.customer?.customerId ||
      loan?.customer?.customerNumber ||
      "";

  const getLoanId =
    (
      loan
    ) =>
      loan?.id ||
      loan?.loanNumber ||
      "";

  const getLoanNumber =
    (
      loan
    ) =>
      loan?.loanNumber ||
      "Loan";

  const getLoanAmount =
    (
      loan
    ) =>
      roundMoney(
        loan?.loanAmount ??
        loan?.calculation
          ?.principal ??
        0
      );

  const getInstallmentNumber =
    (
      row
    ) =>
      row?.installmentNumber ??
      row?.installmentNo ??
      "—";

  /* =======================================================
     STATUS HELPERS
  ====================================================== */

  const isBlockingCollection =
    (
      collection
    ) => {
      const status =
        normalize(
          collection?.status
        );

      return (
        status ===
        "pending"
      );
    };

  /* =======================================================
     SCHEDULE COMPONENTS
  ====================================================== */

  const getOriginalPaymentAmount =
    (
      row
    ) =>
      roundMoney(
        row?.paymentAmount ??
        row?.emiAmount ??
        row?.amount ??
        0
      );

  const getPaymentAmount =
    (
      row
    ) =>
      roundMoney(
        getScheduleRemainingAmount(
          row
        )
      );

  const getPaidAmount =
    (
      row
    ) =>
      roundMoney(
        getSchedulePaidAmount(
          row
        )
      );

  const getOriginalPrincipal =
    (
      row
    ) =>
      roundMoney(
        row?.principal ??
        row?.principalAmount ??
        0
      );

  const getOriginalInterest =
    (
      row
    ) =>
      roundMoney(
        row?.interest ??
        row?.interestAmount ??
        0
      );

  const getRemainingInterest =
    (
      row
    ) => {
      const interest =
        getOriginalInterest(
          row
        );

      const paid =
        getPaidAmount(
          row
        );

      return roundMoney(
        Math.max(
          interest -
            Math.min(
              paid,
              interest
            ),
          0
        )
      );
    };

  const getRemainingPrincipal =
    (
      row
    ) => {
      const principal =
        getOriginalPrincipal(
          row
        );

      const interest =
        getOriginalInterest(
          row
        );

      const paid =
        getPaidAmount(
          row
        );

      const paidAfterInterest =
        Math.max(
          paid -
            interest,
          0
        );

      return roundMoney(
        Math.max(
          principal -
            paidAfterInterest,
          0
        )
      );
    };

  const getPaymentComponentPreview =
    (
      row,
      paymentAmount
    ) => {
      const requested =
        roundMoney(
          paymentAmount
        );

      const remainingInterest =
        getRemainingInterest(
          row
        );

      const remainingPrincipal =
        getRemainingPrincipal(
          row
        );

      const interestPaid =
        roundMoney(
          Math.min(
            requested,
            remainingInterest
          )
        );

      const principalPaid =
        roundMoney(
          Math.min(
            Math.max(
              requested -
                interestPaid,
              0
            ),
            remainingPrincipal
          )
        );

      const remainder =
        roundMoney(
          Math.max(
            requested -
              interestPaid -
              principalPaid,
            0
          )
        );

      return {
        interestPaid,
        principalPaid,
        remainder,
        remainingInterest,
        remainingPrincipal,
      };
    };

  /* =======================================================
     PENALTY
  ====================================================== */

  const getPenaltyConfiguration =
    (
      loan
    ) =>
      getPenaltyConfig(
        loan
      );

  const getOverdueDays =
    (
      dueDate
    ) => {
      const due =
        parseLocalDate(
          dueDate
        );

      const today =
        parseLocalDate(
          getTodayKey()
        );

      if (
        !due ||
        !today
      ) {
        return 0;
      }

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

      if (
        due.getTime() >=
        today.getTime()
      ) {
        return 0;
      }

      return Math.max(
        0,
        Math.floor(
          (
            today.getTime() -
            due.getTime()
          ) /
          (
            1000 *
            60 *
            60 *
            24
          )
        )
      );
    };

  const calculateInstallmentPenalty =
    (
      loan,
      scheduleRow,
      remainingBase
    ) => {
      const config =
        getPenaltyConfiguration(
          loan
        );

      const dueDate =
        parseLocalDate(
          scheduleRow?.dueDate
        );

      const today =
        parseLocalDate(
          getTodayKey()
        );

      if (
        !dueDate ||
        !today ||
        remainingBase <= 0
      ) {
        return {
          penaltyAmount: 0,
          overdueDays: 0,
          graceDays:
            config.graceDays,
          penaltyDays: 0,
          penaltyType:
            config.type,
          penaltyRate:
            config.amount,
        };
      }

      dueDate.setHours(
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

      if (
        dueDate.getTime() >=
        today.getTime()
      ) {
        return {
          penaltyAmount: 0,
          overdueDays: 0,
          graceDays:
            config.graceDays,
          penaltyDays: 0,
          penaltyType:
            config.type,
          penaltyRate:
            config.amount,
        };
      }

      const overdueDays =
        Math.max(
          0,
          Math.floor(
            (
              today.getTime() -
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

      if (
        !config.enabled ||
        overdueDays <=
          config.graceDays
      ) {
        return {
          penaltyAmount: 0,
          overdueDays,
          graceDays:
            config.graceDays,
          penaltyDays: 0,
          penaltyType:
            config.type,
          penaltyRate:
            config.amount,
        };
      }

      const penaltyDays =
        Math.max(
          0,
          overdueDays -
            config.graceDays
        );

      let penaltyAmount =
        0;

      if (
        normalize(
          config.type
        ) ===
        "per day"
      ) {
        penaltyAmount =
          config.amount *
          penaltyDays;
      } else {
        penaltyAmount =
          config.amount;
      }

      if (
        config.maxAmount > 0
      ) {
        penaltyAmount =
          Math.min(
            penaltyAmount,
            config.maxAmount
          );
      }

      return {
        penaltyAmount:
          roundMoney(
            penaltyAmount
          ),
        overdueDays,
        graceDays:
          config.graceDays,
        penaltyDays,
        penaltyType:
          config.type,
        penaltyRate:
          config.amount,
      };
    };

  /* =======================================================
     COLLECTION MATCHING
  ====================================================== */

  const matchesLoan =
    (
      collection,
      loan
    ) => {
      const collectionLoanId =
        String(
          collection?.loanId ||
            ""
        );

      const collectionLoanNumber =
        String(
          collection?.loanNumber ||
            ""
        );

      const loanId =
        String(
          loan?.id ||
            ""
        );

      const loanNumber =
        String(
          loan?.loanNumber ||
            ""
        );

      return (
        (
          collectionLoanId &&
          loanId &&
          collectionLoanId ===
            loanId
        ) ||
        (
          collectionLoanNumber &&
          loanNumber &&
          collectionLoanNumber ===
            loanNumber
        )
      );
    };

  const matchesSchedule =
    (
      collection,
      scheduleRow
    ) => {
      if (
        collection?.scheduleId &&
        scheduleRow?.id
      ) {
        return (
          String(
            collection.scheduleId
          ) ===
          String(
            scheduleRow.id
          )
        );
      }

      const collectionDate =
        getDateKey(
          collection?.dueDate
        );

      const scheduleDate =
        getDateKey(
          scheduleRow?.dueDate
        );

      if (
        collectionDate &&
        scheduleDate
      ) {
        return (
          collectionDate ===
          scheduleDate
        );
      }

      return false;
    };

  const getAppliedCollectionAmount =
    (
      loan,
      scheduleRow
    ) =>
      roundMoney(
        collections
          .filter(
            (
              collection
            ) => {
              if (
                !isBlockingCollection(
                  collection
                )
              ) {
                return false;
              }

              if (
                !matchesLoan(
                  collection,
                  loan
                )
              ) {
                return false;
              }

              return matchesSchedule(
                collection,
                scheduleRow
              );
            }
          )
          .reduce(
            (
              total,
              collection
            ) =>
              total +
              toNumber(
                collection?.amount
              ),
            0
          )
      );

  /* =======================================================
     COLLECTIBLE ROWS
  ====================================================== */

  const collectibleRows =
    useMemo(() => {
      const today =
        parseLocalDate(
          getTodayKey()
        );

      if (!today) {
        return [];
      }

      today.setHours(
        0,
        0,
        0,
        0
      );

      const rows = [];

      loans.forEach(
        (
          loan
        ) => {
          if (
            !isCollectionEnabledLoan(
              loan
            )
          ) {
            return;
          }

          const schedule =
            Array.isArray(
              loan?.repaymentSchedule
            )
              ? loan.repaymentSchedule
              : [];

          schedule.forEach(
            (
              scheduleRow
            ) => {
              const dueDate =
                parseLocalDate(
                  scheduleRow?.dueDate
                );

              if (!dueDate) {
                return;
              }

              dueDate.setHours(
                0,
                0,
                0,
                0
              );

              if (
                dueDate.getTime() >
                today.getTime()
              ) {
                return;
              }

              const originalAmount =
                getOriginalPaymentAmount(
                  scheduleRow
                );

              const storedPaid =
                getPaidAmount(
                  scheduleRow
                );

              const storedRemaining =
                getPaymentAmount(
                  scheduleRow
                );

              if (
                originalAmount <= 0
              ) {
                return;
              }

              const appliedCollection =
                getAppliedCollectionAmount(
                  loan,
                  scheduleRow
                );

              const remainingBase =
                roundMoney(
                  Math.max(
                    storedRemaining -
                      appliedCollection,
                    0
                  )
                );

              const normalizedRemaining =
                remainingBase > 0
                  ? remainingBase
                  : appliedCollection <=
                      0 &&
                    storedPaid <= 0
                  ? roundMoney(
                      originalAmount
                    )
                  : 0;

              if (
                normalizedRemaining <=
                0
              ) {
                return;
              }

              const overdue =
                dueDate.getTime() <
                today.getTime();

              const overdueDays =
                overdue
                  ? getOverdueDays(
                      scheduleRow?.dueDate
                    )
                  : 0;

              const penalty =
                overdue
                  ? calculateInstallmentPenalty(
                      loan,
                      scheduleRow,
                      normalizedRemaining
                    )
                  : {
                      penaltyAmount: 0,
                      overdueDays: 0,
                      graceDays:
                        getPenaltyConfiguration(
                          loan
                        ).graceDays,
                      penaltyDays: 0,
                      penaltyType:
                        getPenaltyConfiguration(
                          loan
                        ).type,
                      penaltyRate:
                        getPenaltyConfiguration(
                          loan
                        ).amount,
                    };

              const remainingInterest =
                getRemainingInterest(
                  {
                    ...scheduleRow,
                    paidAmount:
                      storedPaid +
                      appliedCollection,
                  }
                );

              const remainingPrincipal =
                getRemainingPrincipal(
                  {
                    ...scheduleRow,
                    paidAmount:
                      storedPaid +
                      appliedCollection,
                  }
                );

              rows.push({
                loan,
                scheduleRow,
                originalAmount,
                storedPaid,
                appliedAmount:
                  appliedCollection,
                amount:
                  normalizedRemaining,
                principalAmount:
                  remainingPrincipal,
                interestAmount:
                  remainingInterest,
                paidAmount:
                  roundMoney(
                    storedPaid +
                      appliedCollection
                  ),
                overdue,
                overdueDays,
                penaltyAmount:
                  roundMoney(
                    penalty?.penaltyAmount
                  ),
                penaltyDays:
                  Number(
                    penalty?.penaltyDays ||
                      0
                  ),
                graceDays:
                  Number(
                    penalty?.graceDays ||
                      0
                  ),
                penaltyType:
                  penalty?.penaltyType ||
                  "Fixed",
                penaltyRate:
                  Number(
                    penalty?.penaltyRate ||
                      0
                  ),
                totalPayable:
                  roundMoney(
                    normalizedRemaining +
                      penalty?.penaltyAmount
                  ),
              });
            }
          );
        }
      );

      const groupedRows =
        new Map();

      rows.forEach(
        (row) => {
          const key =
            String(
              getLoanId(
                row.loan
              )
            );

          const existing =
            groupedRows.get(
              key
            );

          if (
            existing
          ) {
            existing.installments.push(
              row
            );

            if (
              row.overdue
            ) {
              existing.overdueInstallments.push(
                row
              );
            } else {
              existing.todayInstallments.push(
                row
              );
            }

            existing.totalPayable =
              roundMoney(
                existing.totalPayable +
                  row.totalPayable
              );

            existing.overdueTotal =
              roundMoney(
                existing.overdueTotal +
                  (
                    row.overdue
                      ? row.totalPayable
                      : 0
                  )
              );

            existing.todayTotal =
              roundMoney(
                existing.todayTotal +
                  (
                    row.overdue
                      ? 0
                      : row.totalPayable
                  )
              );

            return;
          }

          groupedRows.set(
            key,
            {
              ...row,
              installments: [
                row,
              ],
              overdueInstallments:
                row.overdue
                  ? [row]
                  : [],
              todayInstallments:
                row.overdue
                  ? []
                  : [row],
              totalPayable:
                row.totalPayable,
              overdueTotal:
                row.overdue
                  ? row.totalPayable
                  : 0,
              todayTotal:
                row.overdue
                  ? 0
                  : row.totalPayable,
            }
          );
        }
      );

      return Array.from(
        groupedRows.values()
      ).sort(
        (
          a,
          b
        ) => {
          if (
            a.overdue &&
            !b.overdue
          ) {
            return -1;
          }

          if (
            !a.overdue &&
            b.overdue
          ) {
            return 1;
          }

          const aDate =
            parseLocalDate(
              a?.installments?.[0]
                ?.scheduleRow?.dueDate
            );

          const bDate =
            parseLocalDate(
              b?.installments?.[0]
                ?.scheduleRow?.dueDate
            );

          return (
            (
              aDate?.getTime() ||
              0
            ) -
            (
              bDate?.getTime() ||
              0
            )
          );
        }
      );
    }, [
      loans,
      collections,
    ]);

  /* =======================================================
     SEARCHABLE LOANS
  ====================================================== */

  const searchableLoans =
    useMemo(
      () =>
        loans.filter(
          (
            loan
          ) =>
            isCollectionEnabledLoan(
              loan
            )
        ),
      [loans]
    );

  const searchResults =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      if (!query) {
        return [];
      }

      return searchableLoans
        .filter(
          (
            loan
          ) => {
            const searchable =
              [
                getCustomerId(
                  loan
                ),
                getCustomerName(
                  loan
                ),
                getCustomerMobile(
                  loan
                ),
                getLoanId(
                  loan
                ),
                getLoanNumber(
                  loan
                ),
              ]
                .filter(Boolean)
                .join(" ")
                .toLowerCase();

            return searchable.includes(
              query
            );
          }
        )
        .slice(
          0,
          8
        );
    }, [
      search,
      searchableLoans,
    ]);

  /* =======================================================
     LOAN FINANCIAL SUMMARY
  ====================================================== */

  const getLoanSummary =
    (
      loan
    ) => {
      const repaymentState =
        getRepaymentBuckets(
          loan
        );

      const outstanding =
        getScheduleOutstanding(
          loan
        );

      const overdueAmount =
        repaymentState.overdue.reduce(
          (
            total,
            row
          ) =>
            total +
            getScheduleRemainingAmount(
              row
            ),
          0
        );

      const currentDueAmount =
        repaymentState.currentDue.reduce(
          (
            total,
            row
          ) =>
            total +
            getScheduleRemainingAmount(
              row
            ),
          0
        );

      const futureAmount =
        repaymentState.future.reduce(
          (
            total,
            row
          ) =>
            total +
            getScheduleRemainingAmount(
              row
            ),
          0
        );

      const penalty =
        getOutstandingPenaltySummary(
          loan
        );

      const schedule =
        Array.isArray(
          loan?.repaymentSchedule
        )
          ? loan.repaymentSchedule
          : [];

      const paidAmount =
        schedule.reduce(
          (
            total,
            row
          ) =>
            total +
            getPaidAmount(
              row
            ),
          0
        );

      return {
        loanAmount:
          getLoanAmount(
            loan
          ),
        outstanding:
          roundMoney(
            outstanding
          ),
        overdueAmount:
          roundMoney(
            overdueAmount
          ),
        currentDueAmount:
          roundMoney(
            currentDueAmount
          ),
        futureAmount:
          roundMoney(
            futureAmount
          ),
        penaltyAmount:
          roundMoney(
            penalty?.amount
          ),
        paidAmount:
          roundMoney(
            paidAmount
          ),
        overdueCount:
          repaymentState
            .overdue
            .length,
        currentDueCount:
          repaymentState
            .currentDue
            .length,
        futureCount:
          repaymentState
            .future
            .length,
      };
    };

  /* =======================================================
     DEFAULT ADVANCE
  ====================================================== */

  const getDefaultAdvanceAmount =
    (
      loan
    ) => {
      const {
        future,
      } =
        getRepaymentBuckets(
          loan
        );

      const firstFuture =
        future?.[0];

      return firstFuture
        ? getScheduleRemainingAmount(
            firstFuture
          )
        : 0;
    };

  const getLoanPaymentType = (
    loan,
    summary = null,
    isAdvanceOnly = false
  ) => {
    const loanSummary =
      summary ||
      getLoanSummary(
        loan
      );

    const hasOverdue =
      Number(
        loanSummary?.overdueAmount ||
          0
      ) > 0;

    const hasCurrentDue =
      Number(
        loanSummary?.currentDueAmount ||
          0
      ) > 0;

    if (
      isAdvanceOnly ||
      (
        !hasOverdue &&
        !hasCurrentDue
      )
    ) {
      return "Advance Payment";
    }

    if (hasCurrentDue) {
      return "Today Due";
    }

    if (hasOverdue) {
      return "Overdue";
    }

    return "Advance Payment";
  };

  /* =======================================================
     MAXIMUM COLLECTIBLE
  ====================================================== */

  const getMaximumCollectibleAmount =
    (
      loan
    ) => {
      if (!loan) {
        return 0;
      }

      const outstanding =
        getScheduleOutstanding(
          loan
        );

      const penalty =
        getOutstandingPenaltySummary(
          loan
        );

      return roundMoney(
        outstanding +
          Number(
            penalty?.amount ||
              0
          )
      );
    };

  /* =======================================================
     PAYMENT PREVIEW
  ====================================================== */

  const getLoanPaymentPreview =
    (
      loan,
      requestedAmount
    ) => {
      const paymentAmount =
        roundMoney(
          requestedAmount
        );

      if (
        !loan ||
        paymentAmount <= 0
      ) {
        return null;
      }

      try {
        const penaltySummary =
          getOutstandingPenaltySummary(
            loan
          );

        return previewRepayment({
          loan,
          amount:
            paymentAmount,
          penaltyAmount:
            penaltySummary?.amount ||
            0,
          allocationOptions: {
            allowAdvance:
              true,
            allowPrincipalPayment:
              false,
          },
        });
      } catch (
        previewError
      ) {
        console.error(
          "Failed to preview repayment:",
          previewError
        );

        return null;
      }
    };

  /* =======================================================
     BUILD DETAILED WATERFALL
  ====================================================== */

  const buildDetailedWaterfall =
    (
      loan,
      requestedAmount
    ) => {
      const total =
        roundMoney(
          requestedAmount
        );

      if (
        !loan ||
        total <= 0
      ) {
        return {
          totalPayment: 0,
          penalty: 0,
          installments: [],
          future: [],
          excess: 0,
        };
      }

      const {
        overdue,
        currentDue,
        future,
      } =
        getRepaymentBuckets(
          loan
        );

      let remaining =
        total;

      const penaltySummary =
        getOutstandingPenaltySummary(
          loan
        );

      const penaltyAmount =
        roundMoney(
          penaltySummary?.amount
        );

      const penaltyPaid =
        roundMoney(
          Math.min(
            remaining,
            penaltyAmount
          )
        );

      remaining =
        roundMoney(
          remaining -
            penaltyPaid
        );

      const installmentRows = [
        ...overdue,
        ...currentDue,
        ...future,
      ];

      const installments = [];

      for (
        const row of
          installmentRows
      ) {
        if (
          remaining <= 0
        ) {
          break;
        }

        const rowRemaining =
          getScheduleRemainingAmount(
            row
          );

        if (
          rowRemaining <= 0
        ) {
          continue;
        }

        const rowPayment =
          roundMoney(
            Math.min(
              remaining,
              rowRemaining
            )
          );

        const components =
          getPaymentComponentPreview(
            row,
            rowPayment
          );

        remaining =
          roundMoney(
            remaining -
              rowPayment
          );

        installments.push({
          installment:
            getInstallmentNumber(
              row
            ),
          dueDate:
            row?.dueDate ||
            "",
          amount:
            rowPayment,
          interest:
            components.interestPaid,
          principal:
            components.principalPaid,
          status:
            rowPayment >=
            rowRemaining
              ? "Paid"
              : "Partially Paid",
          previousPaid:
            getPaidAmount(
              row
            ),
          balanceAfter:
            roundMoney(
              rowRemaining -
                rowPayment
            ),
          isOverdue:
            overdue.some(
              (
                item
              ) =>
                (
                  item?.id &&
                  row?.id &&
                  String(
                    item.id
                  ) ===
                  String(
                    row.id
                  )
                ) ||
                (
                  !item?.id &&
                  !row?.id &&
                  getDateKey(
                    item?.dueDate
                  ) ===
                  getDateKey(
                    row?.dueDate
                  )
                )
            ),
        });
      }

      return {
        totalPayment:
          total,
        penalty:
          penaltyPaid,
        installments,
        future:
          future.map(
            (
              row
            ) => ({
              installment:
                getInstallmentNumber(
                  row
                ),
              dueDate:
                row?.dueDate ||
                "",
              scheduled:
                getScheduleAmount(
                  row
                ),
              previousPaid:
                getPaidAmount(
                  row
                ),
              balance:
                getScheduleRemainingAmount(
                  row
                ),
              interest:
                getRemainingInterest(
                  row
                ),
              principal:
                getRemainingPrincipal(
                  row
                ),
            })
          ),
        excess:
          roundMoney(
            remaining
          ),
      };
    };

  /* =======================================================
     OPEN DAILY REPAYMENT
  ====================================================== */

  const openCollection =
    (
      item
    ) => {
      if (
        !item?.loan
      ) {
        return;
      }

      const loan =
        item.loan;

      const summary =
        getLoanSummary(
          loan
        );

      setSelectedPayment({
        ...item,
        mode:
          "daily",
        paymentKind:
          item?.overdue
            ? "Overdue"
            : "Today Due",
        loanSummary:
          summary,
      });

      setAmount(
        item?.totalPayable > 0
          ? String(
              roundMoney(
                item.totalPayable
              )
            )
          : ""
      );

      setPaymentMode(
        "Cash"
      );

      setLocation("");
      setRemarks("");
      setMessage("");
      setError("");
    };

  /* =======================================================
     OPEN SEARCH LOAN
  ====================================================== */

  const openSearchLoan =
    (
      loan
    ) => {
      if (!loan) {
        return;
      }

      const summary =
        getLoanSummary(
          loan
        );

      const isAdvanceOnly =
        summary.currentDueAmount <=
          0 &&
        summary.overdueAmount <=
          0;

      let defaultAmount =
        0;

      if (
        !isAdvanceOnly
      ) {
        defaultAmount =
          roundMoney(
            summary.overdueAmount +
              summary.currentDueAmount +
              summary.penaltyAmount
          );
      }

      if (
        defaultAmount <= 0
      ) {
        defaultAmount =
          getDefaultAdvanceAmount(
            loan
          );
      }

      setSelectedPayment({
        loan,
        mode:
          "search",
        paymentKind:
          isAdvanceOnly
            ? "Advance Payment"
            : summary.overdueAmount >
              0
            ? "Overdue"
            : "Today Due",
        isAdvanceOnly,
        loanSummary:
          summary,
        currentDueAmount:
          summary.currentDueAmount,
        overdueAmount:
          summary.overdueAmount,
        penaltyAmount:
          summary.penaltyAmount,
      });

      setAmount(
        defaultAmount > 0
          ? String(
              defaultAmount
            )
          : ""
      );

      setPaymentMode(
        "Cash"
      );

      setLocation("");
      setRemarks("");
      setMessage("");
      setError("");
      setSearch("");
    };

  /* =======================================================
     CLOSE
  ====================================================== */

  const closeCollection =
    () => {
      setSelectedPayment(
        null
      );

      setAmount("");
      setPaymentMode(
        "Cash"
      );
      setLocation("");
      setRemarks("");
      setMessage("");
      setError("");
    };

  /* =======================================================
     PAYMENT SATISFACTION
  ====================================================== */

  const getPaymentSatisfaction =
    (
      loan,
      requestedAmount
    ) => {
      const numericAmount =
        roundMoney(
          requestedAmount
        );

      if (
        numericAmount <=
        0
      ) {
        return {
          status:
            "empty",
          label:
            "Enter Payment Amount",
          tone:
            "slate",
        };
      }

      const maximum =
        getMaximumCollectibleAmount(
          loan
        );

      if (
        numericAmount >
        maximum
      ) {
        return {
          status:
            "excess",
          label:
            "Amount exceeds allowed payable balance",
          tone:
            "amber",
        };
      }

      const summary =
        getLoanSummary(
          loan
        );

      const payable =
        roundMoney(
          summary.outstanding +
            summary.penaltyAmount
        );

      const waterfall =
        buildDetailedWaterfall(
          loan,
          numericAmount
        );

      if (
        numericAmount >=
          payable &&
        payable > 0 &&
        waterfall.excess <= 0
      ) {
        return {
          status:
            "satisfied",
          label:
            "Amount Satisfied",
          tone:
            "green",
          balance:
            0,
          waterfall,
        };
      }

      const allocation =
        getLoanPaymentPreview(
          loan,
          numericAmount
        );

      const balance =
        roundMoney(
          Math.max(
            payable -
              numericAmount,
            0
          )
        );

      if (
        numericAmount > 0 &&
        balance > 0
      ) {
        return {
          status:
            "partial",
          label:
            "Partial Payment",
          tone:
            "blue",
          balance,
          waterfall,
          allocation:
            allocation?.allocation ||
            null,
        };
      }

      return {
        status:
          "pending",
        label:
          "Payment Entered",
        tone:
          "slate",
        balance,
        waterfall,
      };
    };

  /* =======================================================
     SUBMIT
  ====================================================== */

  const handleSubmit =
    async (
      event
    ) => {
      event.preventDefault();

      setMessage("");
      setError("");

      const selectedLoan =
        selectedPayment?.loan;

      if (
        !selectedLoan
      ) {
        setError(
          "Please select a valid customer loan."
        );

        return;
      }

      const numericAmount =
        roundMoney(
          amount
        );

      if (
        numericAmount <=
        0
      ) {
        setError(
          "Enter a valid payment amount."
        );

        return;
      }

      const latestLoans =
        await safeGetLoans();

      const latestLoan =
        latestLoans.find(
          (
            item
          ) =>
            String(
              getLoanId(
                item
              )
            ) ===
            String(
              getLoanId(
                selectedLoan
              )
            )
        ) ||
        selectedLoan;

      if (
        !isCollectionEnabledLoan(
          latestLoan
        )
      ) {
        setError(
          "This loan is already closed or foreclosed."
        );

        return;
      }

      const maximum =
        getMaximumCollectibleAmount(
          latestLoan
        );

      if (
        maximum <= 0
      ) {
        setError(
          "This loan has no outstanding payable amount."
        );

        return;
      }

      if (
        numericAmount >
        maximum
      ) {
        setError(
          `Payment cannot exceed ${formatMoney(
            maximum
          )}.`
        );

        return;
      }

      const preview =
        getLoanPaymentPreview(
          latestLoan,
          numericAmount
        );

      if (
        !preview?.success
      ) {
        setError(
          "Unable to calculate the repayment allocation."
        );

        return;
      }

      const allocation =
        preview?.allocation ||
        {};

      const penaltySummary =
        getOutstandingPenaltySummary(
          latestLoan
        );

      const buckets =
        getRepaymentBuckets(
          latestLoan
        );

      const waterfall =
        buildDetailedWaterfall(
          latestLoan,
          numericAmount
        );

      const firstInstallment =
        waterfall?.installments?.[0];

      const selectedRow =
        selectedPayment?.scheduleRow ||
        null;

      const scheduleId =
        selectedRow?.id ||
        "";

      const installment =
        firstInstallment?.installment ??
        getInstallmentNumber(
          selectedRow
        );

      const dueDate =
        firstInstallment?.dueDate ||
        selectedRow?.dueDate ||
        "";

      const hasOverdue =
        waterfall.installments.some(
          (
            item
          ) =>
            item.isOverdue
        );

      const hasCurrentDue =
        waterfall.installments.some(
          (
            item
          ) =>
            !item.isOverdue &&
            getDateKey(
              item.dueDate
            ) ===
            getTodayKey()
        );

      const hasAdvance =
        waterfall.installments.some(
          (
            item
          ) =>
            !item.isOverdue &&
            getDateKey(
              item.dueDate
            ) !==
            getTodayKey()
        );

      let paymentType =
        "Repayment";

      if (
        selectedPayment?.isAdvanceOnly
      ) {
        paymentType =
          "Advance Payment";
      } else if (
        hasCurrentDue
      ) {
        paymentType =
          "Today Due";
      } else if (
        hasOverdue
      ) {
        paymentType =
          "Overdue";
      } else if (
        hasAdvance
      ) {
        paymentType =
          "Advance Payment";
      }

      const firstPenaltyRow =
        Array.isArray(
          penaltySummary?.rows
        )
          ? penaltySummary.rows[0]
          : null;

      const penaltyConfig =
        getPenaltyConfiguration(
          latestLoan
        );

      let newCollection;

      try {
        newCollection =
          await addCollection({
            customerId:
              getCustomerId(
                latestLoan
              ),
            customerName:
              getCustomerName(
                latestLoan
              ),
            loanId:
              latestLoan?.id ||
              "",
            loanNumber:
              latestLoan?.loanNumber ||
              "",
            scheduleId,
            installment,
            dueDate,
            collectedDate:
              getTodayKey(),
            loanAmount:
              getLoanAmount(
                latestLoan
              ),
            loanOutstanding:
              getScheduleOutstanding(
                latestLoan
              ),
            scheduledAmount:
              roundMoney(
                firstInstallment?.amount ||
                getOriginalPaymentAmount(
                  selectedRow
                ) ||
                getScheduleOutstanding(
                  latestLoan
                )
              ),
            dueAmount:
              roundMoney(
                allocation?.overdue +
                  allocation?.currentDue
              ),
            penaltyAmount:
              roundMoney(
                waterfall?.penalty
              ),
            amount:
              numericAmount,
            totalPayable:
              numericAmount,
            amountTowardDue:
              roundMoney(
                allocation?.overdue +
                  allocation?.currentDue
              ),
            amountTowardPenalty:
              roundMoney(
                waterfall?.penalty
              ),
            amountTowardAdvance:
              roundMoney(
                allocation?.advance
              ),
            amountTowardPrincipal:
              roundMoney(
                waterfall.installments.reduce(
                  (
                    total,
                    item
                  ) =>
                    total +
                    item.principal,
                  0
                )
              ),
            amountExcess:
              roundMoney(
                waterfall?.excess
              ),
            paymentType,
            overdue:
              hasOverdue,
            overdueDays:
              Number(
                firstPenaltyRow?.overdueDays ||
                  selectedPayment?.overdueDays ||
                  0
              ),
            graceDays:
              Number(
                firstPenaltyRow?.graceDays ??
                  penaltyConfig.graceDays ??
                  0
              ),
            penaltyDays:
              Number(
                firstPenaltyRow?.penaltyDays ||
                  0
              ),
            penaltyType:
              penaltyConfig.type,
            penaltyRate:
              Number(
                penaltyConfig.amount ||
                  0
              ),
            repaymentBuckets: {
              overdueCount:
                buckets?.overdue
                  ?.length ||
                0,
              currentDueCount:
                buckets?.currentDue
                  ?.length ||
                0,
              futureCount:
                buckets?.future
                  ?.length ||
                0,
              overdueAmount:
                roundMoney(
                  buckets?.overdue?.reduce(
                    (
                      total,
                      row
                    ) =>
                      total +
                      getScheduleRemainingAmount(
                        row
                      ),
                    0
                  )
                ),
              currentDueAmount:
                roundMoney(
                  buckets?.currentDue?.reduce(
                    (
                      total,
                      row
                    ) =>
                      total +
                      getScheduleRemainingAmount(
                        row
                      ),
                    0
                  )
                ),
            },
            allocation: {
              totalPayment:
                numericAmount,
              allocated:
                roundMoney(
                  numericAmount -
                    waterfall.excess
                ),
              remaining:
                roundMoney(
                  waterfall.excess
                ),
              penalty:
                roundMoney(
                  waterfall.penalty
                ),
              overdue:
                roundMoney(
                  allocation?.overdue
                ),
              currentDue:
                roundMoney(
                  allocation?.currentDue
                ),
              advance:
                roundMoney(
                  allocation?.advance
                ),
              principal:
                roundMoney(
                  waterfall.installments.reduce(
                    (
                      total,
                      item
                    ) =>
                      total +
                      item.principal,
                    0
                  )
                ),
              interest:
                roundMoney(
                  waterfall.installments.reduce(
                    (
                      total,
                      item
                    ) =>
                      total +
                      item.interest,
                    0
                  )
                ),
              excess:
                roundMoney(
                  waterfall.excess
                ),
              calculatedPenalty:
                roundMoney(
                  allocation?.calculatedPenalty
                ),
              penaltyRows:
                Array.isArray(
                  allocation?.penaltyRows
                )
                  ? allocation.penaltyRows
                  : [],
              items:
                Array.isArray(
                  allocation?.items
                )
                  ? allocation.items
                  : [],
              detailedWaterfall:
                waterfall,
            },
            paymentMode,
            location:
              location.trim(),
            remarks:
              remarks.trim(),
            status:
              "Pending",
          });
      } catch (
        submitError
      ) {
        console.error(
          "Failed to submit collection:",
          submitError
        );

        setError(
          submitError?.message ||
            "Unable to submit collection."
        );

        return;
      }

      setMessage(
        `Collection ${
          newCollection?.id ||
          ""
        } submitted successfully and is waiting for Admin approval.`
      );

      setCollections(
        await safeGetCollections()
      );

      setLoans(
        await safeGetLoans()
      );

      setSelectedPayment(
        null
      );

      setAmount("");
      setPaymentMode(
        "Cash"
      );
      setLocation("");
      setRemarks("");
    };

  /* =======================================================
     RENDER
  ====================================================== */

  return (
    <div
      className="
        min-h-full
        bg-[#F5F8F6]
        p-3
        sm:p-4
        lg:p-5
      "
    >
      <div className="mx-auto w-full max-w-[1500px]">

        {/* =================================================
            HEADER
        ================================================== */}

        <div
          className="
            mb-4
            overflow-hidden
            rounded-2xl
            border
            border-[#DCE9E1]
            bg-white
            shadow-[0_8px_30px_rgba(15,23,42,0.05)]
          "
        >
          <div
            className="
              flex
              flex-col
              gap-4
              px-5
              py-4
              sm:flex-row
              sm:items-center
              sm:justify-between
              lg:px-6
              lg:py-5
            "
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span
                  className="
                    inline-flex
                    items-center
                    rounded-full
                    bg-[#EAF5EF]
                    px-2.5
                    py-1
                    text-[9px]
                    font-extrabold
                    uppercase
                    tracking-[0.08em]
                    text-[#0B6B43]
                  "
                >
                  MotoLend
                </span>

                <span
                  className="
                    h-1
                    w-1
                    rounded-full
                    bg-[#A8C9B6]
                  "
                />

                <span
                  className="
                    text-[9px]
                    font-bold
                    uppercase
                    tracking-[0.08em]
                    text-slate-400
                  "
                >
                  Staff Collection
                </span>
              </div>

              <h1
                className="
                  mt-2
                  text-[24px]
                  font-extrabold
                  tracking-[-0.03em]
                  text-[#17221D]
                  sm:text-[27px]
                "
              >
                Staff Repayment
              </h1>

              <p
                className="
                  mt-1
                  max-w-[650px]
                  text-[11px]
                  font-medium
                  leading-relaxed
                  text-slate-500
                  sm:text-[12px]
                "
              >
                Today&apos;s due, overdue and customer advance payments
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
              <div
                className="
                  inline-flex
                  min-w-[145px]
                  items-center
                  gap-3
                  rounded-xl
                  border
                  border-[#D7E8DE]
                  bg-[#F4FAF6]
                  px-3.5
                  py-2.5
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
                    bg-[#DDF1E5]
                    text-[#0B6B43]
                  "
                >
                  <Clock3 size={15} />
                </div>

                <div>
                  <p
                    className="
                      text-[8px]
                      font-extrabold
                      uppercase
                      tracking-[0.06em]
                      text-slate-400
                    "
                  >
                    Open Today
                  </p>

                  <p
                    className="
                      mt-0.5
                      text-[12px]
                      font-extrabold
                      text-[#0B6B43]
                    "
                  >
                    {collectibleRows.length} active loan
                    {collectibleRows.length === 1
                      ? ""
                      : "s"}
                  </p>
                </div>

                <span
                  className="
                    ml-auto
                    h-2
                    w-2
                    rounded-full
                    bg-[#15A05C]
                    shadow-[0_0_0_4px_rgba(21,160,92,0.10)]
                  "
                />
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  px-4
                  text-[10px]
                  font-extrabold
                  text-slate-600
                  shadow-sm
                  transition-all
                  duration-200
                  hover:-translate-y-[1px]
                  hover:border-red-200
                  hover:bg-red-50
                  hover:text-red-600
                "
              >
                <LogOut size={14} />
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* =================================================
            MESSAGE
        ================================================== */}

        {message && (
          <div
            className="
              mb-4
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-[#CBE3D4]
              bg-[#F0FAF4]
              px-4
              py-3
              shadow-sm
            "
          >
            <div
              className="
                mt-0.5
                flex
                h-7
                w-7
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-[#DDF1E5]
                text-[#0B6B43]
              "
            >
              <CheckCircle2 size={15} />
            </div>

            <div className="min-w-0">
              <p
                className="
                  text-[11px]
                  font-extrabold
                  text-[#0B6B43]
                "
              >
                Collection Submitted
              </p>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  leading-relaxed
                  text-[#4C7862]
                "
              >
                {message}
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            ERROR
        ================================================== */}

        {error && (
          <div
            className="
              mb-4
              flex
              items-start
              gap-3
              rounded-xl
              border
              border-red-200
              bg-red-50
              px-4
              py-3
              shadow-sm
            "
          >
            <div
              className="
                mt-0.5
                flex
                h-7
                w-7
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-red-100
                text-red-600
              "
            >
              <AlertCircle size={15} />
            </div>

            <div>
              <p
                className="
                  text-[11px]
                  font-extrabold
                  text-red-700
                "
              >
                Unable to process repayment
              </p>

              <p
                className="
                  mt-0.5
                  text-[10px]
                  leading-relaxed
                  text-red-600
                "
              >
                {error}
              </p>
            </div>
          </div>
        )}

        {/* =================================================
            KPI SECTION
        ================================================== */}

        <div
          className="
            mb-4
            grid
            grid-cols-1
            gap-3
            md:grid-cols-3
          "
        >
          <SummaryCard
            icon={IndianRupee}
            label="Today's Due"
            value={formatMoney(
              collectibleRows
                .filter(
                  (
                    item
                  ) =>
                    item.todayInstallments?.length >
                    0
                )
                .reduce(
                  (
                    total,
                    item
                  ) =>
                    total +
                    item.totalPayable,
                  0
                )
            )}
            note={`${
              collectibleRows.filter(
                (
                  item
                ) =>
                  item.todayInstallments?.length >
                  0
              ).length
            } due installment${
              collectibleRows.filter(
                (
                  item
                ) =>
                  item.todayInstallments?.length >
                  0
              ).length === 1
                ? ""
                : "s"
            }`}
            tone="green"
          />

          <SummaryCard
            icon={ShieldAlert}
            label="Overdue"
            value={formatMoney(
              collectibleRows
                .filter(
                  (
                    item
                  ) =>
                    item.overdueInstallments?.length >
                    0
                )
                .reduce(
                  (
                    total,
                    item
                  ) =>
                    total +
                    item.totalPayable,
                  0
                )
            )}
            note={`${
              collectibleRows.filter(
                (
                  item
                ) =>
                  item.overdueInstallments?.length >
                  0
              ).length
            } overdue installment${
              collectibleRows.filter(
                (
                  item
                ) =>
                  item.overdueInstallments?.length >
                  0
              ).length === 1
                ? ""
                : "s"
            }`}
            tone="red"
          />

          <SummaryCard
            icon={Wallet}
            label="Total Collectable"
            value={formatMoney(
              collectibleRows.reduce(
                (
                  total,
                  item
                ) =>
                  total +
                  item.totalPayable,
                0
              )
            )}
            note="Due + overdue + penalty"
            tone="blue"
          />
        </div>

        {/* =================================================
            SEARCH
        ================================================== */}

        <div
          className="
            relative
            z-30
            mb-4
            rounded-2xl
            border
            border-slate-200
            bg-white
            p-4
            shadow-[0_8px_28px_rgba(15,23,42,0.04)]
          "
        >
          <div
            className="
              flex
              flex-col
              gap-3
              lg:flex-row
              lg:items-center
            "
          >
            <div
              className="
                flex
                shrink-0
                items-center
                gap-3
              "
            >
              <div
                className="
                  flex
                  h-10
                  w-10
                  items-center
                  justify-center
                  rounded-xl
                  bg-[#EAF5EF]
                  text-[#0B6B43]
                "
              >
                <Search size={17} />
              </div>

              <div>
                <p
                  className="
                    text-[12px]
                    font-extrabold
                    text-[#17221D]
                  "
                >
                  Find Customer
                </p>

                <p
                  className="
                    mt-0.5
                    text-[9px]
                    font-medium
                    text-slate-400
                  "
                >
                  Search customer or loan to record a repayment
                </p>
              </div>
            </div>

            <div className="relative min-w-0 flex-1">
              <Search
                size={15}
                className="
                  pointer-events-none
                  absolute
                  left-4
                  top-1/2
                  -translate-y-1/2
                  text-slate-400
                "
              />

              <input
                type="text"
                value={search}
                onChange={(
                  event
                ) =>
                  setSearch(
                    event.target.value
                  )
                }
                placeholder="Search by Customer ID, Name, Mobile or Loan Number..."
                className="
                  h-11
                  w-full
                  rounded-xl
                  border
                  border-slate-200
                  bg-[#FAFCFB]
                  pl-11
                  pr-4
                  text-[11px]
                  font-semibold
                  text-[#17221D]
                  outline-none
                  transition-all
                  duration-200
                  placeholder:text-slate-400
                  focus:border-[#86BD9D]
                  focus:bg-white
                  focus:ring-4
                  focus:ring-[#E4F2E9]
                "
              />
            </div>
          </div>

          {search &&
            searchResults.length === 0 && (
              <div
                className="
                  mt-3
                  rounded-xl
                  border
                  border-dashed
                  border-slate-200
                  bg-slate-50
                  px-4
                  py-3
                "
              >
                <p
                  className="
                    text-[10px]
                    font-semibold
                    text-slate-500
                  "
                >
                  No active loan found for this search.
                </p>
              </div>
            )}

          {searchResults.length > 0 && (
            <div
              className="
                absolute
                left-4
                right-4
                top-[92px]
                z-[100]
                max-h-[440px]
                overflow-y-auto
                rounded-2xl
                border
                border-slate-200
                bg-white
                shadow-[0_22px_55px_rgba(15,23,42,0.16)]
              "
            >
              {searchResults.map(
                (
                  loan
                ) => {
                  const summary =
                    getLoanSummary(
                      loan
                    );

                  const hasDue =
                    summary.currentDueAmount >
                    0;

                  const hasOverdue =
                    summary.overdueAmount >
                    0;

                  const actionLabel =
                    hasOverdue &&
                    hasDue
                      ? "Repayment"
                      : hasOverdue ||
                        hasDue
                      ? "Repayment"
                      : "Advance Payment";

                  return (
                    <button
                      key={getLoanId(
                        loan
                      )}
                      type="button"
                      onClick={() =>
                        openSearchLoan(
                          loan
                        )
                      }
                      className="
                        group
                        flex
                        w-full
                        flex-col
                        gap-4
                        border-b
                        border-slate-100
                        px-4
                        py-4
                        text-left
                        transition-colors
                        duration-150
                        last:border-b-0
                        hover:bg-[#F7FBF8]
                        lg:flex-row
                        lg:items-center
                        lg:justify-between
                      "
                    >
                      <div
                        className="
                          flex
                          min-w-0
                          items-start
                          gap-3
                        "
                      >
                        <div
                          className="
                            flex
                            h-11
                            w-11
                            shrink-0
                            items-center
                            justify-center
                            rounded-full
                            bg-[#EAF5EF]
                            text-[#0B6B43]
                            ring-4
                            ring-[#F4FAF6]
                          "
                        >
                          <UserRound size={18} />
                        </div>

                        <div className="min-w-0">
                          <p
                            className="
                              truncate
                              text-[12px]
                              font-extrabold
                              text-[#17221D]
                            "
                          >
                            {getCustomerName(
                              loan
                            )}
                          </p>

                          <div
                            className="
                              mt-1.5
                              flex
                              flex-wrap
                              items-center
                              gap-x-3
                              gap-y-1
                            "
                          >
                            <span
                              className="
                                text-[9px]
                                font-semibold
                                text-slate-500
                              "
                            >
                              ID:{" "}
                              {getCustomerId(
                                loan
                              ) || "—"}
                            </span>

                            <span
                              className="
                                text-[9px]
                                font-semibold
                                text-slate-500
                              "
                            >
                              {getLoanNumber(
                                loan
                              )}
                            </span>

                            {getCustomerMobile(
                              loan
                            ) && (
                              <span
                                className="
                                  inline-flex
                                  items-center
                                  gap-1
                                  text-[9px]
                                  font-medium
                                  text-slate-400
                                "
                              >
                                <Phone size={10} />

                                {getCustomerMobile(
                                  loan
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div
                        className="
                          grid
                          grid-cols-2
                          gap-3
                          sm:grid-cols-4
                          lg:min-w-[470px]
                        "
                      >
                        <SearchMoney
                          label="Loan"
                          value={
                            summary.loanAmount
                          }
                        />

                        <SearchMoney
                          label="Outstanding"
                          value={
                            summary.outstanding
                          }
                        />

                        <SearchMoney
                          label="Due"
                          value={
                            summary.currentDueAmount
                          }
                        />

                        <SearchMoney
                          label="Overdue"
                          value={
                            summary.overdueAmount
                          }
                          danger={
                            summary.overdueAmount >
                            0
                          }
                        />

                        <div
                          className="
                            col-span-2
                            sm:col-span-4
                          "
                        >
                          <span
                            className="
                              inline-flex
                              items-center
                              gap-1.5
                              rounded-full
                              bg-[#EAF5EF]
                              px-2.5
                              py-1.5
                              text-[8px]
                              font-extrabold
                              text-[#0B5D3B]
                            "
                          >
                            <ArrowDown size={10} />
                            {actionLabel}
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                }
              )}
            </div>
          )}
        </div>

        {/* =================================================
            DAILY LIST
        ================================================== */}

        <div
          className="
            overflow-hidden
            rounded-2xl
            border
            border-slate-200
            bg-white
            shadow-[0_8px_28px_rgba(15,23,42,0.04)]
          "
        >
          <div
            className="
              flex
              flex-col
              gap-3
              border-b
              border-slate-100
              px-5
              py-4
              sm:flex-row
              sm:items-center
              sm:justify-between
              lg:px-6
            "
          >
            <div>
              <div className="flex items-center gap-2.5">
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
                  <Receipt size={16} />
                </div>

                <div>
                  <h2
                    className="
                      text-[15px]
                      font-extrabold
                      tracking-tight
                      text-[#17221D]
                      sm:text-[16px]
                    "
                  >
                    Today&apos;s Repayment List
                  </h2>

                  <p
                    className="
                      mt-0.5
                      text-[9px]
                      font-medium
                      text-slate-400
                    "
                  >
                    Today due and overdue installments
                  </p>
                </div>
              </div>
            </div>

            <span
              className="
                inline-flex
                w-fit
                items-center
                rounded-full
                bg-[#EAF5EF]
                px-3
                py-1.5
                text-[9px]
                font-extrabold
                text-[#0B5D3B]
              "
            >
              {collectibleRows.length} record
              {collectibleRows.length === 1
                ? ""
                : "s"}
            </span>
          </div>

          {collectibleRows.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="divide-y divide-slate-100">
              {collectibleRows.map(
                (
                  item
                ) => (
                  <CollectionRow
                    key={getLoanId(
                      item.loan
                    )}
                    item={
                      item
                    }
                    onCollect={() =>
                      openCollection(
                        item
                      )
                    }
                  />
                )
              )}
            </div>
          )}
        </div>
      </div>

      {/* =================================================
          MODAL
      ================================================== */}

      {selectedPayment && (
        <CollectionModal
          item={
            selectedPayment
          }
          amount={
            amount
          }
          setAmount={
            setAmount
          }
          paymentMode={
            paymentMode
          }
          setPaymentMode={
            setPaymentMode
          }
          location={
            location
          }
          setLocation={
            setLocation
          }
          remarks={
            remarks
          }
          setRemarks={
            setRemarks
          }
          onClose={
            closeCollection
          }
          onSubmit={
            handleSubmit
          }
          getLoanPaymentPreview={
            getLoanPaymentPreview
          }
          getMaximumCollectibleAmount={
            getMaximumCollectibleAmount
          }
          getPaymentSatisfaction={
            getPaymentSatisfaction
          }
          getDetailedWaterfall={
            buildDetailedWaterfall
          }
          getLoanSummary={
            getLoanSummary
          }
          getLoanPaymentType={
            getLoanPaymentType
          }
        />
      )}
    </div>
  );
};

/* =========================================================
   COLLECTION ROW
========================================================= */

const CollectionRow = ({
  item,
  onCollect,
}) => {
  const loan =
    item?.loan ||
    {};

  const customerName =
    loan?.customerName ||
    loan?.customer?.personal
      ?.name ||
    "Customer";

  const customerId =
    loan?.customerId ||
    loan?.customer?.id ||
    loan?.customer?.customerId ||
    loan?.customer?.customerNumber ||
    "";

  const mobile =
    loan?.mobileNumber ||
    loan?.customer?.personal
      ?.mobileNumber ||
    loan?.mobile ||
    "";

  const loanNumber =
    loan?.loanNumber ||
    "Loan";

  const hasOverdue =
    item?.overdueInstallments?.length >
    0;

  const renderInstallment = (
    child
  ) => {
    const scheduleRow =
      child?.scheduleRow ||
      {};

    const installment =
      scheduleRow?.installmentNumber ??
      scheduleRow?.installmentNo ??
      "—";

    const isPartial =
      child?.paidAmount > 0 &&
      child?.amount > 0;

    const statusLabel =
      isPartial
        ? "Partially Paid"
        : child?.overdue
        ? "Overdue"
        : "Today's Due";

    return (
      <div
        key={
          scheduleRow?.id ||
          scheduleRow?.dueDate ||
          installment
        }
        className={`
          rounded-xl
          border
          px-3.5
          py-3
          ${
            child?.overdue
              ? "border-red-100 bg-red-50/60"
              : "border-[#D8E9DF] bg-[#F7FBF8]"
          }
        `}
      >
        <div
          className="
            flex
            flex-col
            gap-2
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="flex items-center gap-2">
            <div
              className={`
                flex
                h-7
                w-7
                items-center
                justify-center
                rounded-lg
                ${
                  child?.overdue
                    ? "bg-red-100 text-red-600"
                    : "bg-[#E3F2E8] text-[#0B6B43]"
                }
              `}
            >
              {child?.overdue ? (
                <ShieldAlert size={13} />
              ) : (
                <CheckCircle2 size={13} />
              )}
            </div>

            <div>
              <p
                className="
                  text-[10px]
                  font-extrabold
                  text-[#17221D]
                "
              >
                Installment #{installment}
              </p>

              <p
                className="
                  mt-0.5
                  text-[8px]
                  font-medium
                  text-slate-400
                "
              >
                {formatDisplayDate(
                  scheduleRow?.dueDate
                )}
              </p>
            </div>
          </div>

          <span
            className={`
              inline-flex
              w-fit
              rounded-full
              px-2.5
              py-1
              text-[8px]
              font-extrabold
              ${
                child?.overdue
                  ? "bg-red-100 text-red-700"
                  : isPartial
                  ? "bg-amber-100 text-amber-700"
                  : "bg-[#E6F4EB] text-[#0B6B43]"
              }
            `}
          >
            {statusLabel}
          </span>
        </div>

        <div
          className="
            mt-3
            grid
            grid-cols-2
            gap-2
            sm:grid-cols-5
          "
        >
          <InfoBlock
            label="Original Amount"
            value={formatMoney(
              child?.originalAmount
            )}
          />

          <InfoBlock
            label="Penalty"
            value={formatMoney(
              child?.penaltyAmount
            )}
            danger={
              child?.penaltyAmount > 0
            }
          />

          <InfoBlock
            label="Paid"
            value={formatMoney(
              child?.paidAmount
            )}
          />

          <InfoBlock
            label="Balance"
            value={formatMoney(
              child?.amount
            )}
            strong
          />

          <InfoBlock
            label="Status"
            value={statusLabel}
          />
        </div>
      </div>
    );
  };

  return (
    <div
      className="
        p-4
        transition-all
        duration-200
        hover:bg-[#FBFCFB]
        lg:p-5
      "
    >
      <div
        className="
          grid
          gap-5
          xl:grid-cols-[260px_minmax(0,1fr)_260px]
          xl:items-start
        "
      >
        {/* CUSTOMER */}

        <div
          className="
            flex
            items-start
            gap-3
          "
        >
          <div
            className={`
              flex
              h-12
              w-12
              shrink-0
              items-center
              justify-center
              rounded-full
              ring-4
              ${
                hasOverdue
                  ? "bg-red-50 text-red-600 ring-red-50"
                  : "bg-[#EAF5EF] text-[#0B6B43] ring-[#F4FAF6]"
              }
            `}
          >
            {hasOverdue ? (
              <ShieldAlert size={20} />
            ) : (
              <UserRound size={20} />
            )}
          </div>

          <div className="min-w-0">
            <p
              className="
                truncate
                text-[14px]
                font-extrabold
                tracking-tight
                text-[#17221D]
              "
            >
              {customerName}
            </p>

            <p
              className="
                mt-1
                text-[9px]
                font-semibold
                text-slate-500
              "
            >
              {customerId || "Customer ID unavailable"}
            </p>

            <div
              className="
                mt-2
                space-y-1.5
              "
            >
              <p
                className="
                  flex
                  items-center
                  gap-1.5
                  text-[9px]
                  font-medium
                  text-slate-400
                "
              >
                <Phone size={10} />
                {mobile || "Mobile unavailable"}
              </p>

              <p
                className="
                  text-[9px]
                  font-bold
                  text-[#0B6B43]
                "
              >
                {loanNumber}
              </p>
            </div>
          </div>
        </div>

        {/* INSTALLMENTS */}

        <div className="min-w-0">
          <div
            className="
              mb-3
              flex
              flex-wrap
              items-center
              gap-2
            "
          >
            {hasOverdue && (
              <span
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  bg-red-50
                  px-2.5
                  py-1.5
                  text-[8px]
                  font-extrabold
                  text-red-700
                "
              >
                <ShieldAlert size={10} />
                Overdue ·{" "}
                {item.overdueInstallments.length}
              </span>
            )}

            {item?.todayInstallments?.length >
              0 && (
              <span
                className="
                  inline-flex
                  items-center
                  gap-1.5
                  rounded-full
                  bg-[#EAF5EF]
                  px-2.5
                  py-1.5
                  text-[8px]
                  font-extrabold
                  text-[#0B6B43]
                "
              >
                <Clock3 size={10} />
                Today&apos;s Due ·{" "}
                {item.todayInstallments.length}
              </span>
            )}
          </div>

          {hasOverdue && (
            <div>
              <p
                className="
                  mb-1.5
                  text-[8px]
                  font-extrabold
                  uppercase
                  tracking-[0.07em]
                  text-red-600
                "
              >
                Overdue
              </p>

              <div className="space-y-2">
                {item.overdueInstallments.map(
                  renderInstallment
                )}
              </div>
            </div>
          )}

          {item?.todayInstallments?.length >
            0 && (
            <div
              className={
                hasOverdue
                  ? "mt-4"
                  : ""
              }
            >
              <p
                className="
                  mb-1.5
                  text-[8px]
                  font-extrabold
                  uppercase
                  tracking-[0.07em]
                  text-[#0B6B43]
                "
              >
                Today&apos;s Due
              </p>

              <div className="space-y-2">
                {item.todayInstallments.map(
                  renderInstallment
                )}
              </div>
            </div>
          )}
        </div>

        {/* SUMMARY / ACTION */}

        <div
          className="
            flex
            flex-col
            rounded-2xl
            border
            border-slate-100
            bg-[#FAFCFB]
            p-4
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
            <div>
              <p
                className="
                  text-[8px]
                  font-extrabold
                  uppercase
                  tracking-[0.08em]
                  text-slate-400
                "
              >
                Total Payable
              </p>

              <p
                className={`
                  mt-1
                  text-[22px]
                  font-extrabold
                  tracking-tight
                  ${
                    hasOverdue
                      ? "text-red-600"
                      : "text-[#0B6B43]"
                  }
                `}
              >
                {formatMoney(
                  item?.totalPayable
                )}
              </p>
            </div>

            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-white
                text-[#0B6B43]
                shadow-sm
                ring-1
                ring-slate-100
              "
            >
              <IndianRupee size={16} />
            </div>
          </div>

          <div
            className="
              mt-4
              grid
              grid-cols-2
              gap-2
            "
          >
            <CompactFinancial
              label="Loan"
              value={formatMoney(
                getLoanAmount(
                  loan
                )
              )}
            />

            <CompactFinancial
              label="Outstanding"
              value={formatMoney(
                getScheduleOutstanding(
                  loan
                )
              )}
            />

            <CompactFinancial
              label="Overdue"
              value={formatMoney(
                item?.overdueTotal
              )}
              danger={
                item?.overdueTotal > 0
              }
            />

            <CompactFinancial
              label="Today"
              value={formatMoney(
                item?.todayTotal
              )}
            />
          </div>

          <button
            type="button"
            onClick={onCollect}
            className={`
              mt-4
              inline-flex
              h-11
              w-full
              items-center
              justify-center
              gap-2
              rounded-xl
              px-4
              text-[11px]
              font-extrabold
              text-white
              shadow-sm
              transition-all
              duration-200
              hover:-translate-y-[1px]
              hover:shadow-md
              active:translate-y-0
              ${
                hasOverdue
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-[#0B6B43] hover:bg-[#095B3B]"
              }
            `}
          >
            <Calculator size={14} />
            Repayment
          </button>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   COLLECTION MODAL
========================================================= */

const CollectionModal = ({
  item,
  amount,
  setAmount,
  paymentMode,
  setPaymentMode,
  location,
  setLocation,
  remarks,
  setRemarks,
  onClose,
  onSubmit,
  getLoanPaymentPreview,
  getMaximumCollectibleAmount,
  getPaymentSatisfaction,
  getDetailedWaterfall,
  getLoanSummary,
  getLoanPaymentType,
}) => {
  const loan =
    item?.loan ||
    {};

  const scheduleRow =
    item?.scheduleRow ||
    null;

  const summary =
    getLoanSummary(
      loan
    );

  const loanAmount =
    summary.loanAmount;

  const loanOutstanding =
    summary.outstanding;

  const penaltySummary =
    getOutstandingPenaltySummary(
      loan
    );

  const penaltyAmount =
    Number(
      penaltySummary?.amount ||
        0
    );

  const {
    overdue,
    currentDue,
    future,
  } =
    getRepaymentBuckets(
      loan
    );

  const overdueAmount =
    overdue.reduce(
      (
        total,
        row
      ) =>
        total +
        getScheduleRemainingAmount(
          row
        ),
      0
    );

  const currentDueAmount =
    currentDue.reduce(
      (
        total,
        row
      ) =>
        total +
        getScheduleRemainingAmount(
          row
        ),
      0
    );

  const firstSchedule =
    scheduleRow ||
    overdue?.[0] ||
    currentDue?.[0] ||
    future?.[0] ||
    {};

  const installmentNumber =
    firstSchedule?.installmentNumber ??
    firstSchedule?.installmentNo ??
    "—";

  const originalEmi =
    getScheduleAmount(
      firstSchedule
    );

  const previousPaid =
    getSchedulePaidAmount(
      firstSchedule
    );

  const remainingInstallment =
    getScheduleRemainingAmount(
      firstSchedule
    );

  const remainingInterest =
    Math.max(
      getOriginalInterest(
        firstSchedule
      ) -
        Math.min(
          previousPaid,
          getOriginalInterest(
            firstSchedule
          )
        ),
      0
    );

  const remainingPrincipal =
    Math.max(
      getOriginalPrincipal(
        firstSchedule
      ) -
        Math.max(
          previousPaid -
            getOriginalInterest(
              firstSchedule
            ),
          0
        ),
      0
    );

  const paymentPreview =
    amount
      ? getLoanPaymentPreview(
          loan,
          Number(amount)
        )
      : null;

  const satisfaction =
    getPaymentSatisfaction(
      loan,
      amount
    );

  const waterfall =
    amount
      ? getDetailedWaterfall(
          loan,
          Number(amount)
        )
      : null;

  const isAdvanceOnly =
    Boolean(
      item?.isAdvanceOnly &&
      currentDueAmount <=
        0 &&
      overdueAmount <=
        0
    );

  const isOverdue =
    Boolean(
      item?.overdue ||
      overdueAmount > 0
    );

  const maximum =
    getMaximumCollectibleAmount(
      loan
    );

  const paymentType =
    getLoanPaymentType(
      loan,
      summary,
      isAdvanceOnly
    );

  return (
    <div
      className="
        fixed
        inset-0
        z-[700]
        flex
        items-center
        justify-center
        bg-slate-950/55
        p-3
        backdrop-blur-[5px]
        sm:p-5
      "
      onClick={
        onClose
      }
    >
      <div
        className="
          flex
          max-h-[95vh]
          w-full
          max-w-[860px]
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-[0_30px_100px_rgba(15,23,42,0.30)]
        "
        onClick={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        {/* HEADER */}

        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            border-b
            border-slate-100
            bg-white
            px-5
            py-4
            sm:px-6
          "
        >
          <div
            className="
              flex
              items-center
              gap-3
            "
          >
            <div
              className={`
                flex
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                ${
                  isAdvanceOnly
                    ? "bg-blue-50 text-blue-600"
                    : isOverdue
                    ? "bg-red-50 text-red-600"
                    : "bg-[#EAF5EF] text-[#0B6B43]"
                }
              `}
            >
              {isAdvanceOnly ? (
                <Wallet size={17} />
              ) : isOverdue ? (
                <ShieldAlert size={17} />
              ) : (
                <Receipt size={17} />
              )}
            </div>

            <div>
              <h2
                className="
                  text-[15px]
                  font-extrabold
                  tracking-tight
                  text-[#17221D]
                "
              >
                {paymentType}
              </h2>

              <p
                className="
                  mt-0.5
                  text-[9px]
                  font-medium
                  text-slate-400
                "
              >
                {getCustomerName(
                  loan
                )}{" "}
                ·{" "}
                {getLoanNumber(
                  loan
                )}
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
              h-9
              w-9
              items-center
              justify-center
              rounded-xl
              text-slate-400
              transition
              hover:bg-slate-100
              hover:text-slate-700
            "
          >
            <X size={17} />
          </button>
        </div>

        <div
          className="
            min-h-0
            overflow-y-auto
            p-5
            sm:p-6
          "
        >
          {/* CUSTOMER SUMMARY */}

          <section
            className="
              rounded-2xl
              border
              border-[#DDEAE2]
              bg-[#F7FBF8]
              p-4
            "
          >
            <div
              className="
                flex
                flex-col
                gap-4
                sm:flex-row
                sm:items-center
                sm:justify-between
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    h-12
                    w-12
                    shrink-0
                    items-center
                    justify-center
                    rounded-full
                    bg-[#EAF5EF]
                    text-[#0B6B43]
                  "
                >
                  <UserRound size={19} />
                </div>

                <div>
                  <p
                    className="
                      text-[14px]
                      font-extrabold
                      text-[#17221D]
                    "
                  >
                    {getCustomerName(
                      loan
                    )}
                  </p>

                  <div
                    className="
                      mt-1
                      flex
                      flex-wrap
                      items-center
                      gap-2.5
                    "
                  >
                    <span
                      className="
                        text-[9px]
                        font-semibold
                        text-slate-500
                      "
                    >
                      {getCustomerId(
                        loan
                      ) || "—"}
                    </span>

                    <span
                      className="
                        text-[9px]
                        font-semibold
                        text-slate-500
                      "
                    >
                      {getLoanNumber(
                        loan
                      )}
                    </span>

                    {getCustomerMobile(
                      loan
                    ) && (
                      <span
                        className="
                          inline-flex
                          items-center
                          gap-1
                          text-[9px]
                          font-medium
                          text-slate-400
                        "
                      >
                        <Phone size={10} />
                        {getCustomerMobile(
                          loan
                        )}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right">
                <p
                  className="
                    text-[8px]
                    font-extrabold
                    uppercase
                    tracking-[0.08em]
                    text-slate-400
                  "
                >
                  Loan Amount
                </p>

                <p
                  className="
                    mt-1
                    text-[18px]
                    font-extrabold
                    text-[#17221D]
                  "
                >
                  {formatMoney(
                    loanAmount
                  )}
                </p>
              </div>
            </div>
          </section>

          {/* TYPE */}

          <div
            className={`
              mt-4
              rounded-2xl
              border
              px-4
              py-3.5
              ${
                isAdvanceOnly
                  ? "border-blue-100 bg-blue-50"
                  : isOverdue
                  ? "border-red-100 bg-red-50"
                  : "border-[#D8E9DF] bg-[#F6FBF8]"
              }
            `}
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div>
                <p
                  className="
                    text-[8px]
                    font-extrabold
                    uppercase
                    tracking-[0.08em]
                    text-slate-400
                  "
                >
                  Payment Type
                </p>

                <p
                  className={`
                    mt-1
                    text-[16px]
                    font-extrabold
                    ${
                      isAdvanceOnly
                        ? "text-blue-700"
                        : isOverdue
                        ? "text-red-600"
                        : "text-[#0B5D3B]"
                    }
                  `}
                >
                  {paymentType}
                </p>
              </div>

              {isAdvanceOnly && (
                <span
                  className="
                    rounded-full
                    bg-blue-100
                    px-2.5
                    py-1.5
                    text-[8px]
                    font-extrabold
                    text-blue-700
                  "
                >
                  No Due Today
                </span>
              )}
            </div>
          </div>

          {/* REPAYMENT DETAILS */}

          <section className="mt-5">
            <div
              className="
                mb-3
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
                  text-[#0B6B43]
                "
              >
                <Calculator size={14} />
              </div>

              <h3
                className="
                  text-[13px]
                  font-extrabold
                  text-[#17221D]
                "
              >
                Repayment Details
              </h3>
            </div>

            <div
              className="
                grid
                grid-cols-2
                gap-2.5
                sm:grid-cols-4
              "
            >
              <MiniSummary
                label="Outstanding"
                value={formatMoney(
                  loanOutstanding
                )}
                highlight
              />

              <MiniSummary
                label="EMI"
                value={formatMoney(
                  originalEmi
                )}
              />

              <MiniSummary
                label="Installment"
                value={
                  installmentNumber
                }
              />

              <MiniSummary
                label="Balance"
                value={formatMoney(
                  remainingInstallment
                )}
                danger={
                  remainingInstallment >
                  0
                }
              />

              <MiniSummary
                label="Interest Balance"
                value={formatMoney(
                  remainingInterest
                )}
              />

              <MiniSummary
                label="Principal Balance"
                value={formatMoney(
                  remainingPrincipal
                )}
              />

              <MiniSummary
                label="Previous Paid"
                value={formatMoney(
                  previousPaid
                )}
              />

              <MiniSummary
                label="Due Date"
                value={formatDisplayDate(
                  firstSchedule?.dueDate
                )}
              />
            </div>
          </section>

          {/* OVERDUE */}

          {isOverdue && (
            <section
              className="
                mt-5
                rounded-2xl
                border
                border-red-100
                bg-red-50
                p-4
              "
            >
              <div
                className="
                  flex
                  items-start
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
                    rounded-xl
                    bg-red-100
                    text-red-600
                  "
                >
                  <ShieldAlert size={16} />
                </div>

                <div className="min-w-0 flex-1">
                  <p
                    className="
                      text-[11px]
                      font-extrabold
                      text-red-700
                    "
                  >
                    Overdue Details
                  </p>

                  <div
                    className="
                      mt-3
                      grid
                      grid-cols-2
                      gap-2.5
                      sm:grid-cols-4
                    "
                  >
                    <Info
                      label="Overdue Amount"
                      value={formatMoney(
                        overdueAmount
                      )}
                    />

                    <Info
                      label="Penalty"
                      value={formatMoney(
                        penaltyAmount
                      )}
                    />

                    <Info
                      label="Grace Days"
                      value={`${item?.graceDays ?? getPenaltyConfig(
                        loan
                      )?.graceDays ?? 0} days`}
                    />

                    <Info
                      label="Overdue Days"
                      value={`${item?.overdueDays ?? getOverdueDays(
                        firstSchedule?.dueDate
                      )} days`}
                    />
                  </div>
                </div>
              </div>
            </section>
          )}

          {/* ADVANCE */}

          {isAdvanceOnly && (
            <section
              className="
                mt-5
                rounded-2xl
                border
                border-blue-100
                bg-blue-50
                p-4
              "
            >
              <div
                className="
                  flex
                  items-start
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
                    rounded-xl
                    bg-blue-100
                    text-blue-600
                  "
                >
                  <Wallet size={16} />
                </div>

                <div>
                  <p
                    className="
                      text-[11px]
                      font-extrabold
                      text-blue-700
                    "
                  >
                    Advance Payment
                  </p>

                  <p
                    className="
                      mt-1
                      text-[9px]
                      leading-relaxed
                      text-blue-700/80
                    "
                  >
                    There is no current due or overdue amount.
                    The payment will be applied to future installments
                    in order.
                  </p>

                  {future?.[0] && (
                    <p
                      className="
                        mt-3
                        text-[9px]
                        font-bold
                        text-blue-700
                      "
                    >
                      Next EMI #
                      {getInstallmentNumber(
                        future[0]
                      )}
                      {" · "}
                      {formatMoney(
                        getScheduleRemainingAmount(
                          future[0]
                        )
                      )}
                      {" · "}
                      {formatDisplayDate(
                        future[0]?.dueDate
                      )}
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}

          {/* PAYMENT FORM */}

          <form
            onSubmit={
              onSubmit
            }
            className="mt-5"
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
                label="Payment Amount"
              >
                <div className="relative">
                  <span
                    className="
                      absolute
                      left-3.5
                      top-1/2
                      -translate-y-1/2
                      text-[13px]
                      font-extrabold
                      text-slate-400
                    "
                  >
                    ₹
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    max={
                      maximum
                    }
                    step="0.01"
                    value={
                      amount
                    }
                    onChange={(
                      event
                    ) =>
                      setAmount(
                        event.target.value
                      )
                    }
                    required
                    className={`${inputClass} pl-8`}
                    placeholder="0.00"
                  />
                </div>

                <p
                  className="
                    mt-1
                    text-[8px]
                    font-medium
                    text-slate-400
                  "
                >
                  Maximum accepted:
                  {" "}
                  <span className="font-bold text-slate-600">
                    {formatMoney(
                      maximum
                    )}
                  </span>
                </p>
              </FormField>

              <FormField
                label="Payment Mode"
              >
                <select
                  value={
                    paymentMode
                  }
                  onChange={(
                    event
                  ) =>
                    setPaymentMode(
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

                  <option>
                    Cheque
                  </option>
                </select>
              </FormField>

              <div className="sm:col-span-2">
                <FormField
                  label="Collection Location"
                >
                  <div className="relative">
                    <MapPin
                      size={14}
                      className="
                        pointer-events-none
                        absolute
                        left-3.5
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <input
                      type="text"
                      value={
                        location
                      }
                      onChange={(
                        event
                      ) =>
                        setLocation(
                          event.target.value
                        )
                      }
                      placeholder="Customer location / area"
                      className={`${inputClass} pl-9`}
                    />
                  </div>
                </FormField>
              </div>

              <div className="sm:col-span-2">
                <FormField
                  label="Remarks"
                >
                  <textarea
                    value={
                      remarks
                    }
                    onChange={(
                      event
                    ) =>
                      setRemarks(
                        event.target.value
                      )
                    }
                    rows={3}
                    placeholder="Optional repayment remarks"
                    className={`
                      ${inputClass}
                      h-auto
                      min-h-[82px]
                      resize-none
                      py-3
                    `}
                  />
                </FormField>
              </div>
            </div>

            {/* SATISFACTION */}

            {satisfaction && (
              <div
                className={`
                  mt-4
                  rounded-2xl
                  border
                  px-4
                  py-3.5
                  ${
                    satisfaction.tone ===
                    "green"
                      ? "border-[#CFE8D9] bg-[#F0FAF4]"
                      : satisfaction.tone ===
                        "amber"
                      ? "border-amber-200 bg-amber-50"
                      : satisfaction.tone ===
                        "blue"
                      ? "border-blue-200 bg-blue-50"
                      : satisfaction.tone ===
                        "red"
                      ? "border-red-200 bg-red-50"
                      : "border-slate-200 bg-slate-50"
                  }
                `}
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
                        bg-white/80
                      "
                    >
                      {satisfaction.status ===
                      "satisfied" ? (
                        <BadgeCheck
                          size={16}
                          className="text-[#0B6B43]"
                        />
                      ) : (
                        <Calculator
                          size={15}
                          className="text-slate-500"
                        />
                      )}
                    </div>

                    <div>
                      <p
                        className="
                          text-[8px]
                          font-extrabold
                          uppercase
                          tracking-[0.08em]
                          text-slate-400
                        "
                      >
                        Payment Status
                      </p>

                      <p
                        className={`
                          mt-0.5
                          text-[13px]
                          font-extrabold
                          ${
                            satisfaction.tone ===
                            "green"
                              ? "text-[#0B6B43]"
                              : satisfaction.tone ===
                                "blue"
                              ? "text-blue-700"
                              : satisfaction.tone ===
                                "amber"
                              ? "text-amber-700"
                              : "text-slate-600"
                          }
                        `}
                      >
                        {satisfaction.label}
                      </p>
                    </div>
                  </div>

                  <p
                    className="
                      text-[17px]
                      font-extrabold
                      text-[#17221D]
                    "
                  >
                    {formatMoney(
                      amount
                    )}
                  </p>
                </div>

                {satisfaction.status ===
                  "partial" &&
                  satisfaction.balance >
                    0 && (
                    <div
                      className="
                        mt-3
                        rounded-xl
                        border
                        border-blue-100
                        bg-white
                        px-3.5
                        py-3
                      "
                    >
                      <p
                        className="
                          text-[8px]
                          font-extrabold
                          uppercase
                          tracking-wide
                          text-slate-400
                        "
                      >
                        Balance Remaining
                      </p>

                      <p
                        className="
                          mt-1
                          text-[17px]
                          font-extrabold
                          text-blue-700
                        "
                      >
                        {formatMoney(
                          satisfaction.balance
                        )}
                      </p>

                      <p
                        className="
                          mt-1
                          text-[8px]
                          font-medium
                          leading-relaxed
                          text-slate-400
                        "
                      >
                        This balance stays linked to the same
                        installment and follows the same
                        grace-period penalty rule.
                      </p>
                    </div>
                  )}

                {waterfall && (
                  <WaterfallPreview
                    waterfall={
                      waterfall
                    }
                  />
                )}
              </div>
            )}

            {/* SUBMISSION INFO */}

            <div
              className="
                mt-4
                flex
                items-start
                gap-2.5
                rounded-xl
                border
                border-slate-100
                bg-slate-50
                px-3.5
                py-3
              "
            >
              <Clock3
                size={14}
                className="
                  mt-0.5
                  shrink-0
                  text-slate-400
                "
              />

              <div>
                <p
                  className="
                    text-[9px]
                    font-extrabold
                    text-slate-600
                  "
                >
                  Admin approval required
                </p>

                <p
                  className="
                    mt-0.5
                    text-[8px]
                    font-medium
                    leading-relaxed
                    text-slate-400
                  "
                >
                  This repayment will be submitted to Admin for approval.
                  Loan balance, EMI status and dashboard totals update
                  only after approval.
                </p>
              </div>
            </div>

            {/* FOOTER */}

            <div
              className="
                mt-5
                flex
                flex-col-reverse
                gap-2
                border-t
                border-slate-100
                pt-4
                sm:flex-row
                sm:items-center
                sm:justify-end
              "
            >
              <button
                type="button"
                onClick={
                  onClose
                }
                className="
                  h-10
                  rounded-xl
                  border
                  border-slate-200
                  px-5
                  text-[10px]
                  font-extrabold
                  text-slate-500
                  transition
                  hover:bg-slate-50
                "
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={
                  satisfaction?.status ===
                    "excess" ||
                  !amount ||
                  Number(amount) <=
                    0
                }
                className={`
                  inline-flex
                  h-10
                  items-center
                  justify-center
                  gap-2
                  rounded-xl
                  px-5
                  text-[10px]
                  font-extrabold
                  text-white
                  shadow-sm
                  transition-all
                  duration-200
                  disabled:cursor-not-allowed
                  disabled:opacity-50
                  ${
                    isAdvanceOnly
                      ? "bg-blue-600 hover:bg-blue-700"
                      : isOverdue
                      ? "bg-red-600 hover:bg-red-700"
                      : "bg-[#0B6B43] hover:bg-[#095B3B]"
                  }
                `}
              >
                <CheckCircle2 size={13} />
                Submit for Approval
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   WATERFALL PREVIEW
========================================================= */

const WaterfallPreview = ({
  waterfall,
}) => {
  if (!waterfall) {
    return null;
  }

  return (
    <div
      className="
        mt-3
        rounded-xl
        border
        border-slate-200
        bg-white
        p-3
      "
    >
      <div
        className="
          mb-2
          flex
          items-center
          gap-2
        "
      >
        <ArrowDown
          size={12}
          className="text-slate-500"
        />

        <p
          className="
            text-[8px]
            font-extrabold
            uppercase
            tracking-wide
            text-slate-500
          "
        >
          Payment Allocation
        </p>
      </div>

      {waterfall.penalty > 0 && (
        <WaterfallLine
          label="Penalty"
          value={
            waterfall.penalty
          }
          tone="danger"
        />
      )}

      {waterfall.installments.map(
        (
          item,
          index
        ) => (
          <div
            key={`${item.installment}-${item.dueDate}-${index}`}
            className="
              mt-2
              rounded-xl
              border
              border-slate-100
              bg-slate-50
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
              <div>
                <p
                  className="
                    text-[9px]
                    font-extrabold
                    text-[#17221D]
                  "
                >
                  Installment #
                  {item.installment}
                </p>

                <p
                  className="
                    mt-0.5
                    text-[8px]
                    text-slate-400
                  "
                >
                  {formatDisplayDate(
                    item.dueDate
                  )}
                </p>
              </div>

              <p
                className="
                  text-[11px]
                  font-extrabold
                  text-[#0B6B43]
                "
              >
                {formatMoney(
                  item.amount
                )}
              </p>
            </div>

            <div
              className="
                mt-2.5
                grid
                grid-cols-2
                gap-2
                sm:grid-cols-4
              "
            >
              <WaterfallMini
                label="Interest"
                value={
                  item.interest
                }
              />

              <WaterfallMini
                label="Principal"
                value={
                  item.principal
                }
              />

              <WaterfallMini
                label="Previous Paid"
                value={
                  item.previousPaid
                }
              />

              <WaterfallMini
                label="Balance After"
                value={
                  item.balanceAfter
                }
                danger={
                  item.balanceAfter >
                  0
                }
              />
            </div>

            <p
              className={`
                mt-2
                text-[8px]
                font-extrabold
                ${
                  item.status ===
                  "Paid"
                    ? "text-[#0B6B43]"
                    : "text-blue-600"
                }
              `}
            >
              {item.status ===
              "Paid"
                ? "Installment satisfied"
                : `Partial payment · Balance ${formatMoney(
                    item.balanceAfter
                  )}`}
            </p>
          </div>
        )
      )}

      {waterfall.excess > 0 && (
        <div
          className="
            mt-2
            rounded-xl
            border
            border-amber-200
            bg-amber-50
            px-3
            py-2.5
          "
        >
          <p
            className="
              text-[7px]
              font-extrabold
              uppercase
              text-amber-600
            "
          >
            Excess
          </p>

          <p
            className="
              mt-0.5
              text-[12px]
              font-extrabold
              text-amber-700
            "
          >
            {formatMoney(
              waterfall.excess
            )}
          </p>
        </div>
      )}
    </div>
  );
};

/* =========================================================
   WATERFALL LINE
========================================================= */

const WaterfallLine = ({
  label,
  value,
  tone = "normal",
}) => (
  <div
    className="
      flex
      items-center
      justify-between
      rounded-lg
      bg-slate-50
      px-3
      py-2.5
    "
  >
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
      className={`
        text-[10px]
        font-extrabold
        ${
          tone ===
          "danger"
            ? "text-red-600"
            : "text-[#253252]"
        }
      `}
    >
      {formatMoney(
        value
      )}
    </p>
  </div>
);

/* =========================================================
   WATERFALL MINI
========================================================= */

const WaterfallMini = ({
  label,
  value,
  danger = false,
}) => (
  <div
    className="
      rounded-lg
      border
      border-slate-100
      bg-white
      px-2.5
      py-2
    "
  >
    <p
      className="
        text-[7px]
        font-extrabold
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
        text-[9px]
        font-extrabold
        ${
          danger
            ? "text-blue-600"
            : "text-[#253252]"
        }
      `}
    >
      {formatMoney(
        value
      )}
    </p>
  </div>
);

/* =========================================================
   SUMMARY CARD
========================================================= */

const SummaryCard = ({
  icon: Icon,
  label,
  value,
  note,
  tone = "green",
}) => {
  const styles = {
    green: {
      bg:
        "bg-[#F1FAF4]",
      border:
        "border-[#D8EADD]",
      icon:
        "bg-[#DDF1E5] text-[#0B6B43]",
      value:
        "text-[#0B6B43]",
    },

    red: {
      bg:
        "bg-[#FFF6F5]",
      border:
        "border-[#F4DDDA]",
      icon:
        "bg-[#FDE7E4] text-red-600",
      value:
        "text-red-600",
    },

    blue: {
      bg:
        "bg-[#F4F7FE]",
      border:
        "border-[#E0E7FB]",
      icon:
        "bg-[#E5ECFD] text-blue-600",
      value:
        "text-blue-600",
    },
  };

  const current =
    styles[tone] ||
    styles.green;

  return (
    <div
      className={`
        group
        rounded-2xl
        border
        ${current.border}
        ${current.bg}
        px-4
        py-4
        shadow-sm
        transition-all
        duration-200
        hover:-translate-y-[2px]
        hover:shadow-md
      `}
    >
      <div
        className="
          flex
          items-start
          justify-between
          gap-4
        "
      >
        <div className="min-w-0">
          <p
            className="
              text-[8px]
              font-extrabold
              uppercase
              tracking-[0.08em]
              text-slate-400
            "
          >
            {label}
          </p>

          <p
            className={`
              mt-1.5
              truncate
              text-[23px]
              font-extrabold
              tracking-tight
              ${current.value}
              sm:text-[25px]
            `}
          >
            {value}
          </p>

          <p
            className="
              mt-1.5
              text-[9px]
              font-semibold
              text-slate-400
            "
          >
            {note}
          </p>
        </div>

        <div
          className={`
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl
            ${current.icon}
          `}
        >
          <Icon size={17} strokeWidth={2.1} />
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   SEARCH MONEY
========================================================= */

const SearchMoney = ({
  label,
  value,
  danger = false,
}) => (
  <div>
    <p
      className="
        text-[7px]
        font-extrabold
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
        text-[10px]
        font-extrabold
        ${
          danger
            ? "text-red-600"
            : "text-[#17221D]"
        }
      `}
    >
      {formatMoney(
        value
      )}
    </p>
  </div>
);

/* =========================================================
   COMPACT FINANCIAL
========================================================= */

const CompactFinancial = ({
  label,
  value,
  danger = false,
}) => (
  <div
    className="
      rounded-lg
      border
      border-slate-100
      bg-white
      px-2.5
      py-2
    "
  >
    <p
      className="
        text-[7px]
        font-extrabold
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
        text-[9px]
        font-extrabold
        ${
          danger
            ? "text-red-600"
            : "text-[#253252]"
        }
      `}
    >
      {value}
    </p>
  </div>
);

/* =========================================================
   MINI SUMMARY
========================================================= */

const MiniSummary = ({
  label,
  value,
  danger = false,
  highlight = false,
}) => (
  <div
    className={`
      rounded-xl
      border
      px-3
      py-2.5
      ${
        highlight
          ? "border-[#CFE8D9] bg-[#F4FAF6]"
          : "border-slate-100 bg-white"
      }
    `}
  >
    <p
      className="
        text-[7px]
        font-extrabold
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
        font-extrabold
        ${
          danger
            ? "text-red-600"
            : highlight
            ? "text-[#0B6B43]"
            : "text-[#17221D]"
        }
      `}
    >
      {value}
    </p>
  </div>
);

/* =========================================================
   FORM FIELD
========================================================= */

const FormField = ({
  label,
  children,
}) => (
  <label className="block">
    <span
      className="
        mb-1.5
        block
        text-[8px]
        font-extrabold
        uppercase
        tracking-[0.08em]
        text-slate-400
      "
    >
      {label}
    </span>

    {children}
  </label>
);

/* =========================================================
   INPUT
========================================================= */

const inputClass = `
  h-10
  w-full
  rounded-xl
  border
  border-slate-200
  bg-[#FBFCFB]
  px-3
  text-[10px]
  font-semibold
  text-[#253252]
  outline-none
  transition-all
  duration-200
  placeholder:text-slate-400
  focus:border-[#9CCEB1]
  focus:bg-white
  focus:ring-4
  focus:ring-[#E7F3EB]
`;

/* =========================================================
   INFO BLOCK
========================================================= */

const InfoBlock = ({
  label,
  value,
  danger = false,
  strong = false,
}) => (
  <div>
    <p
      className="
        text-[7px]
        font-extrabold
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
        break-words
        text-[9px]
        ${
          strong
            ? "font-extrabold"
            : "font-bold"
        }
        ${
          danger
            ? "text-red-600"
            : "text-[#253252]"
        }
      `}
    >
      {value}
    </p>
  </div>
);

/* =========================================================
   INFO
========================================================= */

const Info = ({
  label,
  value,
}) => (
  <div className="min-w-0">
    <p
      className="
        text-[7px]
        font-extrabold
        uppercase
        tracking-wide
        text-red-400
      "
    >
      {label}
    </p>

    <p
      className="
        mt-1
        break-words
        text-[10px]
        font-extrabold
        leading-tight
        text-red-700
      "
    >
      {value || "—"}
    </p>
  </div>
);

/* =========================================================
   EMPTY
========================================================= */

const EmptyState = () => (
  <div
    className="
      px-5
      py-16
      text-center
    "
  >
    <div
      className="
        mx-auto
        flex
        h-14
        w-14
        items-center
        justify-center
        rounded-2xl
        bg-[#EAF5EF]
        text-[#0B6B43]
      "
    >
      <CheckCircle2 size={23} />
    </div>

    <p
      className="
        mt-4
        text-[14px]
        font-extrabold
        tracking-tight
        text-[#17221D]
      "
    >
      No repayments pending
    </p>

    <p
      className="
        mx-auto
        mt-1.5
        max-w-[430px]
        text-[10px]
        font-medium
        leading-relaxed
        text-slate-400
      "
    >
      No due or overdue installments are currently available
      for collection.
    </p>
  </div>
);

export default StaffCollection;