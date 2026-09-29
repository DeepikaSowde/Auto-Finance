// src/pages/reminder/Reminder.jsx

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useSearchParams,
} from "react-router-dom";

import {
  Bell,
  BellRing,
  CheckCircle2,
  Eye,
  History,
  IndianRupee,
  Search,
  Send,
  ShieldAlert,
  UserRound,
  Wallet,
  X,
  PauseCircle,
  PlayCircle,
} from "lucide-react";

import {
  getLoans,
} from "../../services/customerStorage";

import {
  REMINDER_EVENT,
  getReminders,
  addReminder,
  updateReminder,
} from "../../services/reminderStorage";

import { can } from "../../config/permissions";

/* =========================================================
   CONSTANTS
========================================================= */

const FOLLOW_UP_OPTIONS = [
  {
    id: "once",
    label: "Once",
    description:
      "Send this reminder only once.",
    days: null,
  },

  {
    id: "daily",
    label: "Daily",
    description:
      "Send a follow-up every day.",
    days: 1,
  },

  {
    id: "2days",
    label: "Every 2 Days",
    description:
      "Send a follow-up once every 2 days.",
    days: 2,
  },

  {
    id: "weekly",
    label: "Weekly",
    description:
      "Send a follow-up once every 7 days.",
    days: 7,
  },
];

/* =========================================================
   HELPERS
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

const getDateKey = (
  value
) => {
  const date =
    parseLocalDate(value);

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

const addDays = (
  value,
  days
) => {
  const date =
    parseLocalDate(value);

  if (!date) {
    return "";
  }

  date.setDate(
    date.getDate() +
      Number(days || 0)
  );

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
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  )}`;
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

/* =========================================================
   LOAN HELPERS
========================================================= */

const getCustomerName = (
  loan
) => {
  return (
    loan?.customerName ||
    loan?.customer?.personal
      ?.name ||
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

const getMobile = (
  loan
) => {
  return (
    loan?.mobileNumber ||
    loan?.customer?.personal
      ?.mobileNumber ||
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
    loan?.id ||
    "Loan"
  );
};

const getLoanAmount = (
  loan
) => {
  return roundMoney(
    loan?.loanAmount ??
      loan?.calculation
        ?.principal ??
      0
  );
};

const getScheduleAmount = (
  row
) => {
  return roundMoney(
    row?.remainingAmount ??
      row?.balance ??
      row?.paymentAmount ??
      row?.emiAmount ??
      row?.amount ??
      0
  );
};

const getOriginalScheduleAmount = (
  row
) => {
  return roundMoney(
    row?.paymentAmount ??
      row?.emiAmount ??
      row?.amount ??
      0
  );
};

const getSchedulePaidAmount = (
  row
) => {
  return roundMoney(
    row?.paidAmount ??
      0
  );
};

const getScheduleStatus = (
  row
) => {
  const status =
    normalize(
      row?.status
    );

  if (
    [
      "paid",
      "completed",
      "closed",
      "settled",
    ].includes(
      status
    )
  ) {
    return "Paid";
  }

  if (
    status ===
      "partially paid" ||
    status ===
      "partially-paid" ||
    status ===
      "partial"
  ) {
    return "Partially Paid";
  }

  return "Pending";
};

const getOpenScheduleRows = (
  loan
) => {
  const schedule =
    Array.isArray(
      loan?.repaymentSchedule
    )
      ? loan.repaymentSchedule
      : [];

  return schedule
    .map(
      (
        row,
        index
      ) => ({
        ...row,

        installmentNumber:
          row?.installmentNumber ??
          row?.installmentNo ??
          index + 1,

        paymentAmount:
          getOriginalScheduleAmount(
            row
          ),

        remainingAmount:
          getScheduleAmount(
            row
          ),

        paidAmount:
          getSchedulePaidAmount(
            row
          ),

        status:
          getScheduleStatus(
            row
          ),
      })
    )
    .filter(
      (row) =>
        row.remainingAmount >
          0 &&
        row.status !==
          "Paid"
    );
};

const getRepaymentType = (
  row
) => {
  const dueDate =
    parseLocalDate(
      row?.dueDate
    );

  if (!dueDate) {
    return "Upcoming";
  }

  const today =
    parseLocalDate(
      getTodayKey()
    );

  if (!today) {
    return "Upcoming";
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
    dueDate.getTime() <
    today.getTime()
  ) {
    return "Overdue";
  }

  if (
    dueDate.getTime() ===
    today.getTime()
  ) {
    return "Due Today";
  }

  return "Upcoming";
};

const getLoanPaymentSummary = (
  loan
) => {
  const rows =
    getOpenScheduleRows(
      loan
    );

  let overdue = 0;
  let today = 0;
  let future = 0;

  rows.forEach(
    (row) => {
      const type =
        getRepaymentType(
          row
        );

      if (
        type ===
        "Overdue"
      ) {
        overdue +=
          row.remainingAmount;
      } else if (
        type ===
        "Due Today"
      ) {
        today +=
          row.remainingAmount;
      } else {
        future +=
          row.remainingAmount;
      }
    }
  );

  return {
    outstanding:
      roundMoney(
        overdue +
          today +
          future
      ),

    overdue:
      roundMoney(
        overdue
      ),

    today:
      roundMoney(
        today
      ),

    future:
      roundMoney(
        future
      ),

    openInstallments:
      rows.length,
  };
};

const getPrimaryReminderRow = (
  loan
) => {
  const rows =
    getOpenScheduleRows(
      loan
    );

  if (!rows.length) {
    return null;
  }

  const sorted =
    [...rows].sort(
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

  return (
    sorted[0] ||
    null
  );
};

/* =========================================================
   COMPONENT
========================================================= */

const Reminder = () => {
  const [
    searchParams,
    setSearchParams,
  ] = useSearchParams();

  const [
    loans,
    setLoans,
  ] = useState([]);

  const [
    reminders,
    setReminders,
  ] = useState([]);

  const [
    search,
    setSearch,
  ] = useState(
    searchParams.get(
      "customerName"
    ) ||
      searchParams.get(
        "customerId"
      ) ||
      searchParams.get(
        "loanNumber"
      ) ||
      ""
  );

  const [
    selectedLoan,
    setSelectedLoan,
  ] = useState(null);

  const [
    selectedReminder,
    setSelectedReminder,
  ] = useState(null);

  const [
    showSendModal,
    setShowSendModal,
  ] = useState(false);

  const [
    showViewModal,
    setShowViewModal,
  ] = useState(false);

  const [
    toast,
    setToast,
  ] = useState("");

  /* =======================================================
     LOAD DATA
  ====================================================== */

  useEffect(() => {
    const reload = async () => {
      const [
        nextLoans,
        nextReminders,
      ] = await Promise.all([
        safeGetLoans(),
        getReminders(),
      ]);

      setLoans(
        nextLoans
      );

      setReminders(
        nextReminders
      );
    };

    reload();

    window.addEventListener(
      REMINDER_EVENT,
      reload
    );

    window.addEventListener(
      "auto-finance:data-updated",
      reload
    );

    window.addEventListener(
      "storage",
      reload
    );

    return () => {
      window.removeEventListener(
        REMINDER_EVENT,
        reload
      );

      window.removeEventListener(
        "auto-finance:data-updated",
        reload
      );

      window.removeEventListener(
        "storage",
        reload
      );
    };
  }, []);

  /* =======================================================
     QUERY CONTEXT
  ====================================================== */

  useEffect(() => {
    const hasQueryContext =
      searchParams.get(
        "loanId"
      ) ||
      searchParams.get(
        "loanNumber"
      ) ||
      searchParams.get(
        "customerId"
      ) ||
      searchParams.get(
        "customerName"
      );

    if (!hasQueryContext) {
      return;
    }

    const matched =
      loans.find(
        (loan) => {
          const loanId =
            String(
              getLoanId(
                loan
              )
            );

          const loanNumber =
            String(
              getLoanNumber(
                loan
              )
            );

          const customerId =
            String(
              getCustomerId(
                loan
              )
            );

          const customerName =
            normalize(
              getCustomerName(
                loan
              )
            );

          return (
            (
              searchParams.get(
                "loanId"
              ) &&
              loanId ===
                String(
                  searchParams.get(
                    "loanId"
                  )
                )
            ) ||
            (
              searchParams.get(
                "loanNumber"
              ) &&
              loanNumber ===
                String(
                  searchParams.get(
                    "loanNumber"
                  )
                )
            ) ||
            (
              searchParams.get(
                "customerId"
              ) &&
              customerId ===
                String(
                  searchParams.get(
                    "customerId"
                  )
                )
            ) ||
            (
              searchParams.get(
                "customerName"
              ) &&
              customerName.includes(
                normalize(
                  searchParams.get(
                    "customerName"
                  )
                )
              )
            )
          );
        }
      );

    if (matched) {
      setSelectedLoan(
        matched
      );

      setSearch(
        getCustomerName(
          matched
        )
      );
    }
  }, [
    loans,
    searchParams,
  ]);

  /* =======================================================
     TOAST
  ====================================================== */

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timer =
      window.setTimeout(
        () => {
          setToast("");
        },
        3500
      );

    return () =>
      window.clearTimeout(
        timer
      );
  }, [
    toast,
  ]);

  /* =======================================================
     SEARCH
  ====================================================== */

  const searchResults =
    useMemo(() => {
      const query =
        normalize(
          search
        );

      if (!query) {
        return [];
      }

      return loans
        .filter(
          (loan) => {
            const text = [
              getCustomerId(
                loan
              ),
              getCustomerName(
                loan
              ),
              getMobile(
                loan
              ),
              getLoanNumber(
                loan
              ),
              getLoanId(
                loan
              ),
            ]
              .filter(
                Boolean
              )
              .join(" ")
              .toLowerCase();

            return text.includes(
              query
            );
          }
        )
        .slice(
          0,
          10
        );
    }, [
      loans,
      search,
    ]);

  /* =======================================================
     LOAN ROWS
  ====================================================== */

  const loanRows =
    useMemo(() => {
      return loans
        .map(
          (loan) => {
            const summary =
              getLoanPaymentSummary(
                loan
              );

            const primary =
              getPrimaryReminderRow(
                loan
              );

            const paymentType =
              primary
                ? getRepaymentType(
                    primary
                  )
                : "No Due";

            return {
              loan,
              summary,
              primary,
              paymentType,
            };
          }
        )
        .filter(
          ({
            summary,
          }) =>
            summary.outstanding >
            0
        );
    }, [
      loans,
    ]);

  /* =======================================================
     REMINDER STATUS
  ====================================================== */

  const activeReminders =
    reminders.filter(
      (item) =>
        item?.status ===
        "Active"
    );

  /*
   * IMPORTANT:
   *
   * A reminder can be ACTIVE and already SENT.
   *
   * Example:
   *
   * status     = Active
   * sendCount  = 1
   *
   * Therefore "Sent Reminders" must NOT depend
   * on status !== Active.
   *
   * A reminder counts as sent once sendCount > 0.
   */

  const sentReminders =
    reminders.filter(
      (item) =>
        Number(
          item?.sendCount || 0
        ) > 0
    );

  const completedReminders =
    reminders.filter(
      (item) =>
        item?.status !==
        "Active"
    );

  /* =======================================================
     OPEN SEND MODAL
  ====================================================== */

  const openSendReminder = (
    loan
  ) => {
    setSelectedLoan(
      loan
    );

    setShowSendModal(
      true
    );
  };

  /* =======================================================
     CREATE REMINDER
  ====================================================== */

  const handleCreateReminder = async ({
    loan,
    followUp,
    note,
  }) => {
    if (!loan) {
      return;
    }

    const summary =
      getLoanPaymentSummary(
        loan
      );

    const primary =
      getPrimaryReminderRow(
        loan
      );

    const today =
      getTodayKey();

    const selectedFollowUp =
      FOLLOW_UP_OPTIONS.find(
        (item) =>
          item.id ===
          followUp
      ) ||
      FOLLOW_UP_OPTIONS[0];

    // The server assigns the id.
    const reminder = {
      customerId:
        getCustomerId(
          loan
        ),

      customerName:
        getCustomerName(
          loan
        ),

      mobileNumber:
        getMobile(
          loan
        ),

      loanId:
        getLoanId(
          loan
        ),

      loanNumber:
        getLoanNumber(
          loan
        ),

      loanAmount:
        getLoanAmount(
          loan
        ),

      outstanding:
        summary.outstanding,

      overdueAmount:
        summary.overdue,

      todayDueAmount:
        summary.today,

      futureAmount:
        summary.future,

      installmentNumber:
        primary?.installmentNumber ||
        null,

      dueDate:
        primary?.dueDate ||
        "",

      dueType:
        primary
          ? getRepaymentType(
              primary
            )
          : "No Due",

      originalInstallmentAmount:
        primary
          ? primary.paymentAmount
          : 0,

      remainingInstallmentAmount:
        primary
          ? primary.remainingAmount
          : 0,

      followUp:
        selectedFollowUp.id,

      followUpLabel:
        selectedFollowUp.label,

      followUpDays:
        selectedFollowUp.days,

      note:
        note ||
        "",

      createdAt:
        new Date().toISOString(),

      lastSentAt:
        new Date().toISOString(),

      nextReminderDate:
        selectedFollowUp.days
          ? addDays(
              today,
              selectedFollowUp.days
            )
          : "",

      /*
       * IMPORTANT:
       *
       * The first notification is already
       * sent at the time the reminder is created.
       */
      sendCount:
        1,

      status:
        "Active",

      channel:
        "Demo Notification",
    };

    let saved;

    try {
      saved =
        await addReminder(
          reminder
        );
    } catch (error) {
      setToast(
        error.message ||
          "Couldn't save this reminder."
      );

      return;
    }

    setReminders(
      (current) => [
        saved,
        ...current,
      ]
    );

    setSelectedReminder(
      saved
    );

    setShowSendModal(
      false
    );

    setToast(
      `${getCustomerName(
        loan
      )} reminder sent successfully.`
    );
  };

  /* =======================================================
     SEND EXISTING REMINDER NOW
  ====================================================== */

  /*
   * Applies `buildUpdates(item)` to one reminder, saves it and swaps the
   * server's copy into state.
   */
  const saveReminderChange = async (
    reminderId,
    buildUpdates,
    successMessage
  ) => {
    const item =
      reminders.find(
        (reminder) =>
          reminder.id ===
          reminderId
      );

    if (!item) {
      return;
    }

    try {
      const saved =
        await updateReminder(
          reminderId,
          buildUpdates(item)
        );

      setReminders(
        (current) =>
          current.map(
            (reminder) =>
              reminder.id ===
              reminderId
                ? saved
                : reminder
          )
      );

      setToast(
        successMessage
      );
    } catch (error) {
      setToast(
        error.message ||
          "Couldn't update this reminder."
      );
    }
  };

  const handleSendNow = (
    reminderId
  ) => {
    const now =
      new Date();

    return saveReminderChange(
      reminderId,
      (item) => {
        const nextDate =
          item.followUpDays
            ? addDays(
                getDateKey(
                  now
                ),
                item.followUpDays
              )
            : "";

        return {
          lastSentAt:
            now.toISOString(),

          sendCount:
            Number(
              item.sendCount ||
                0
            ) + 1,

          nextReminderDate:
            nextDate,

          /*
           * Sending now must keep the
           * reminder Active if follow-up
           * is configured.
           */
          status:
            item.status ===
              "Stopped"
              ? "Active"
              : item.status ||
                "Active",
        };
      },
      "Reminder sent successfully."
    );
  };

  /* =======================================================
     STOP REMINDER
  ====================================================== */

  const handleStopReminder = (
    reminderId
  ) =>
    saveReminderChange(
      reminderId,
      () => ({
        status:
          "Stopped",

        stoppedAt:
          new Date().toISOString(),

        nextReminderDate:
          "",
      }),
      "Reminder follow-up stopped."
    );

  /* =======================================================
     RESUME REMINDER
  ====================================================== */

  const handleResumeReminder = (
    reminderId
  ) =>
    saveReminderChange(
      reminderId,
      (item) => ({
        status:
          "Active",

        nextReminderDate:
          item.followUpDays
            ? addDays(
                getTodayKey(),
                item.followUpDays
              )
            : "",
      }),
      "Reminder follow-up resumed."
    );

  /* =======================================================
     VIEW REMINDER
  ====================================================== */

  const openReminderDetails = (
    reminder
  ) => {
    setSelectedReminder(
      reminder
    );

    setShowViewModal(
      true
    );
  };

  /* =======================================================
     CLEAR QUERY
  ====================================================== */

  const clearQueryContext = () => {
    const nextParams =
      new URLSearchParams(
        searchParams
      );

    [
      "loanId",
      "loanNumber",
      "customerId",
      "customerName",
    ].forEach(
      (key) =>
        nextParams.delete(
          key
        )
    );

    setSearchParams(
      nextParams
    );

    setSelectedLoan(
      null
    );

    setSearch("");
  };

  /* =======================================================
     RENDER
  ====================================================== */

  return (
    <div
      className="
        min-h-full
        bg-[#F7F9F8]
        p-3
        sm:p-4
        lg:p-5
      "
    >
      {/* ===================================================
          HEADER
      =================================================== */}

      <header
        className="
          mb-4
          flex
          flex-col
          gap-3
          lg:flex-row
          lg:items-center
          lg:justify-between
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
            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-xl
                bg-[#EAF5EF]
                text-[#0B5D3B]
              "
            >
              <Bell
                size={18}
                strokeWidth={2}
              />
            </div>

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
                    text-[22px]
                    font-semibold
                    tracking-tight
                    text-[#17221D]
                    sm:text-[24px]
                  "
                >
                  Reminders
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
                  mt-0.5
                  text-[10px]
                  text-slate-400
                  sm:text-[11px]
                "
              >
                Send and manage payment reminders
                for customers.
              </p>
            </div>
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
          <StatBadge
            icon={BellRing}
            label="Active Reminders"
            value={
              activeReminders.length
            }
          />

          <StatBadge
            icon={History}
            label="Sent Reminders"
            value={
              sentReminders.length
            }
          />
        </div>
      </header>

      {/* ===================================================
          TOAST
      =================================================== */}

      {toast && (
        <div
          className="
            mb-3
            flex
            items-center
            justify-between
            gap-3
            rounded-xl
            border
            border-[#CFE8D9]
            bg-[#F0FAF4]
            px-3.5
            py-3
          "
        >
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <CheckCircle2
              size={15}
              className="
                shrink-0
                text-[#0B6B43]
              "
            />

            <p
              className="
                text-[9px]
                font-semibold
                text-[#0B6B43]
              "
            >
              {toast}
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              setToast("")
            }
            className="
              text-slate-400
              hover:text-slate-700
            "
          >
            <X size={13} />
          </button>
        </div>
      )}

      {/* ===================================================
          SEARCH
      =================================================== */}

      <section
        className="
          relative
          mb-4
          rounded-2xl
          border
          border-slate-200
          bg-white
          p-3.5
          shadow-sm
        "
      >
        <div
          className="
            mb-2.5
            flex
            items-center
            justify-between
            gap-3
          "
        >
          <div>
            <p
              className="
                text-[11px]
                font-extrabold
                text-[#17221D]
              "
            >
              Search Customer / Loan
            </p>

            <p
              className="
                mt-0.5
                text-[8px]
                text-slate-400
              "
            >
              Search by Customer ID,
              customer name, mobile or
              loan number.
            </p>
          </div>

          {(
            searchParams.get(
              "loanId"
            ) ||
            searchParams.get(
              "loanNumber"
            ) ||
            searchParams.get(
              "customerId"
            ) ||
            searchParams.get(
              "customerName"
            )
          ) && (
            <button
              type="button"
              onClick={
                clearQueryContext
              }
              className="
                rounded-lg
                border
                border-slate-200
                bg-white
                px-2.5
                py-1.5
                text-[8px]
                font-semibold
                text-slate-500
                hover:bg-slate-50
              "
            >
              Clear Selection
            </button>
          )}
        </div>

        <div
          className="
            relative
          "
        >
          <Search
            size={14}
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
            type="text"
            value={search}
            onChange={(event) =>
              setSearch(
                event.target.value
              )
            }
            placeholder="Customer ID / Customer Name / Mobile / Loan Number..."
            className="
              h-10
              w-full
              rounded-xl
              border
              border-slate-200
              bg-white
              pl-9
              pr-3
              text-[10px]
              font-semibold
              text-[#17221D]
              outline-none
              transition
              focus:border-[#9CCEB1]
              focus:ring-1
              focus:ring-[#DCEFE4]
            "
          />
        </div>

        {/* SEARCH RESULTS */}

        {searchResults.length >
          0 && (
          <div
            className="
              absolute
              left-3.5
              right-3.5
              top-[108px]
              z-[100]
              max-h-[430px]
              overflow-y-auto
              rounded-xl
              border
              border-slate-200
              bg-white
              shadow-[0_20px_50px_rgba(15,23,42,0.16)]
            "
          >
            {searchResults.map(
              (loan) => {
                const summary =
                  getLoanPaymentSummary(
                    loan
                  );

                const primary =
                  getPrimaryReminderRow(
                    loan
                  );

                const dueType =
                  primary
                    ? getRepaymentType(
                        primary
                      )
                    : "No Due";

                return (
                  <button
                    key={
                      getLoanId(
                        loan
                      )
                    }
                    type="button"
                    onClick={() => {
                      setSelectedLoan(
                        loan
                      );

                      setSearch(
                        getCustomerName(
                          loan
                        )
                      );
                    }}
                    className="
                      flex
                      w-full
                      flex-col
                      gap-3
                      border-b
                      border-slate-100
                      px-3.5
                      py-3
                      text-left
                      last:border-b-0
                      hover:bg-[#F8FBF9]
                      sm:flex-row
                      sm:items-center
                      sm:justify-between
                    "
                  >
                    <div
                      className="
                        flex
                        min-w-0
                        items-center
                        gap-2.5
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
                          rounded-full
                          bg-[#EAF5EF]
                          text-[#0B5D3B]
                        "
                      >
                        <UserRound
                          size={15}
                        />
                      </div>

                      <div className="min-w-0">
                        <p
                          className="
                            truncate
                            text-[10px]
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
                              text-[7px]
                              font-semibold
                              text-slate-400
                            "
                          >
                            ID:{" "}
                            {getCustomerId(
                              loan
                            ) ||
                              "—"}
                          </span>

                          <span
                            className="
                              text-[7px]
                              font-semibold
                              text-slate-400
                            "
                          >
                            {getLoanNumber(
                              loan
                            )}
                          </span>

                          {getMobile(
                            loan
                          ) && (
                            <span
                              className="
                                text-[7px]
                                font-medium
                                text-slate-400
                              "
                            >
                              {getMobile(
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
                        sm:min-w-[320px]
                        sm:grid-cols-4
                      "
                    >
                      <SearchAmount
                        label="Loan"
                        value={
                          getLoanAmount(
                            loan
                          )
                        }
                      />

                      <SearchAmount
                        label="Outstanding"
                        value={
                          summary.outstanding
                        }
                      />

                      <SearchAmount
                        label="Today"
                        value={
                          summary.today
                        }
                      />

                      <SearchAmount
                        label="Overdue"
                        value={
                          summary.overdue
                        }
                        danger={
                          summary.overdue >
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
                          className={`
                            inline-flex
                            items-center
                            gap-1.5
                            rounded-full
                            px-2.5
                            py-1
                            text-[7px]
                            font-extrabold

                            ${
                              dueType ===
                              "Overdue"
                                ? "bg-red-50 text-red-600"
                                : dueType ===
                                  "Due Today"
                                ? "bg-[#EAF5EF] text-[#0B5D3B]"
                                : "bg-blue-50 text-blue-600"
                            }
                          `}
                        >
                          {dueType}
                        </span>
                      </div>
                    </div>
                  </button>
                );
              }
            )}
          </div>
        )}
      </section>

      {/* ===================================================
          SELECTED CUSTOMER
      =================================================== */}

      {selectedLoan && (
        <SelectedLoanCard
          loan={
            selectedLoan
          }
          onSend={
            can("reminders", "add")
              ? () =>
                  openSendReminder(
                    selectedLoan
                  )
              : undefined
          }
          onClear={() =>
            setSelectedLoan(
              null
            )
          }
        />
      )}

      {/* ===================================================
          REMINDER SCHEDULE
      =================================================== */}

      <section
        className="
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-sm
        "
      >
        <div
          className="
            flex
            flex-col
            gap-2
            border-b
            border-slate-100
            px-4
            py-3
            sm:flex-row
            sm:items-center
            sm:justify-between
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
              Reminder Schedule
            </h2>

            <p
              className="
                mt-0.5
                text-[8px]
                text-slate-400
              "
            >
              Customers who currently have
              reminder follow-ups configured.
            </p>
          </div>

          <span
            className="
              self-start
              rounded-full
              bg-[#EAF5EF]
              px-2.5
              py-1
              text-[8px]
              font-bold
              text-[#0B5D3B]
              sm:self-auto
            "
          >
            {
              activeReminders.length
            }{" "}
            Active
          </span>
        </div>

        {activeReminders.length ===
        0 ? (
          <EmptyReminderState />
        ) : (
          <div
            className="
              divide-y
              divide-slate-100
            "
          >
            {activeReminders.map(
              (reminder) => (
                <ReminderRow
                  key={
                    reminder.id
                  }
                  reminder={
                    reminder
                  }
                  onView={() =>
                    openReminderDetails(
                      reminder
                    )
                  }
                  onStop={
                    can("reminders", "edit")
                      ? () =>
                          handleStopReminder(
                            reminder.id
                          )
                      : undefined
                  }
                />
              )
            )}
          </div>
        )}
      </section>

      {/* ===================================================
          SENT / STOPPED HISTORY
      =================================================== */}

      <section
        className="
          mt-4
          overflow-hidden
          rounded-2xl
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
              Reminder History
            </h2>

            <p
              className="
                mt-0.5
                text-[8px]
                text-slate-400
              "
            >
              Previously stopped or completed
              reminder records.
            </p>
          </div>

          <History
            size={15}
            className="text-slate-400"
          />
        </div>

        {completedReminders.length ===
        0 ? (
          <div
            className="
              px-4
              py-10
              text-center
            "
          >
            <p
              className="
                text-[10px]
                font-semibold
                text-slate-500
              "
            >
              No stopped reminder history yet.
            </p>
          </div>
        ) : (
          <div
            className="
              divide-y
              divide-slate-100
            "
          >
            {completedReminders
              .slice(
                0,
                10
              )
              .map(
                (reminder) => (
                  <ReminderHistoryRow
                    key={
                      reminder.id
                    }
                    reminder={
                      reminder
                    }
                    onView={() =>
                      openReminderDetails(
                        reminder
                      )
                    }
                    onResume={
                      can("reminders", "edit")
                        ? () =>
                            handleResumeReminder(
                              reminder.id
                            )
                        : undefined
                    }
                  />
                )
              )}
          </div>
        )}
      </section>

      {/* ===================================================
          SEND MODAL
      =================================================== */}

      {showSendModal &&
        selectedLoan && (
          <SendReminderModal
            loan={
              selectedLoan
            }
            onClose={() =>
              setShowSendModal(
                false
              )
            }
            onSubmit={
              handleCreateReminder
            }
          />
        )}

      {/* ===================================================
          VIEW MODAL
      =================================================== */}

      {showViewModal &&
        selectedReminder && (
          <ReminderDetailsModal
            reminder={
              selectedReminder
            }
            onClose={() =>
              setShowViewModal(
                false
              )
            }
            onSendNow={
              can("reminders", "edit")
                ? () => {
                    handleSendNow(
                      selectedReminder.id
                    );

                    setShowViewModal(
                      false
                    );
                  }
                : undefined
            }
            onStop={
              can("reminders", "edit")
                ? () => {
                    handleStopReminder(
                      selectedReminder.id
                    );

                    setShowViewModal(
                      false
                    );
                  }
                : undefined
            }
            onResume={
              can("reminders", "edit")
                ? () => {
                    handleResumeReminder(
                      selectedReminder.id
                    );

                    setShowViewModal(
                      false
                    );
                  }
                : undefined
            }
          />
        )}
    </div>
  );
};

/* =========================================================
   STAT BADGE
========================================================= */

const StatBadge = ({
  icon: Icon,
  label,
  value,
}) => {
  return (
    <div
      className="
        flex
        items-center
        gap-2
        rounded-xl
        border
        border-slate-200
        bg-white
        px-3
        py-2
      "
    >
      <div
        className="
          flex
          h-7
          w-7
          items-center
          justify-center
          rounded-lg
          bg-[#EAF5EF]
          text-[#0B5D3B]
        "
      >
        <Icon
          size={13}
        />
      </div>

      <div>
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
          className="
            mt-0.5
            text-[11px]
            font-extrabold
            text-[#17221D]
          "
        >
          {value}
        </p>
      </div>
    </div>
  );
};

/* =========================================================
   SELECTED LOAN CARD
========================================================= */

const SelectedLoanCard = ({
  loan,
  onSend,
  onClear,
}) => {
  const summary =
    getLoanPaymentSummary(
      loan
    );

  const primary =
    getPrimaryReminderRow(
      loan
    );

  const type =
    primary
      ? getRepaymentType(
          primary
        )
      : "No Due";

  return (
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
      <div
        className="
          flex
          flex-col
          gap-3
          border-b
          border-[#D8E9DF]
          bg-[#F6FBF8]
          px-4
          py-3
          sm:flex-row
          sm:items-center
          sm:justify-between
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
              rounded-xl
              bg-[#EAF5EF]
              text-[#0B5D3B]
            "
          >
            <UserRound
              size={15}
            />
          </div>

          <div>
            <p
              className="
                text-[11px]
                font-extrabold
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
                font-semibold
                text-slate-400
              "
            >
              {getLoanNumber(
                loan
              )}
              {" • "}
              {getCustomerId(
                loan
              ) ||
                "No Customer ID"}
            </p>
          </div>
        </div>

        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          <span
            className={`
              rounded-full
              px-2.5
              py-1
              text-[7px]
              font-extrabold

              ${
                type ===
                "Overdue"
                  ? "bg-red-50 text-red-600"
                  : type ===
                    "Due Today"
                  ? "bg-[#EAF5EF] text-[#0B5D3B]"
                  : "bg-blue-50 text-blue-600"
              }
            `}
          >
            {type}
          </span>

          <button
            type="button"
            onClick={
              onClear
            }
            className="
              flex
              h-7
              w-7
              items-center
              justify-center
              rounded-lg
              text-slate-400
              hover:bg-white
              hover:text-slate-700
            "
          >
            <X
              size={14}
            />
          </button>
        </div>
      </div>

      <div
        className="
          grid
          grid-cols-2
          gap-2
          p-3
          sm:grid-cols-4
          lg:grid-cols-6
        "
      >
        <SummaryAmount
          label="Loan Amount"
          value={
            getLoanAmount(
              loan
            )
          }
        />

        <SummaryAmount
          label="Outstanding"
          value={
            summary.outstanding
          }
        />

        <SummaryAmount
          label="Overdue"
          value={
            summary.overdue
          }
          danger={
            summary.overdue >
            0
          }
        />

        <SummaryAmount
          label="Today Due"
          value={
            summary.today
          }
        />

        <SummaryAmount
          label="Future"
          value={
            summary.future
          }
        />

        <SummaryAmount
          label="Open Installments"
          value={
            summary.openInstallments
          }
          raw
        />
      </div>

      {primary && (
        <div
          className="
            flex
            flex-col
            gap-3
            border-t
            border-slate-100
            px-4
            py-3
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div>
            <p
              className="
                text-[8px]
                font-bold
                uppercase
                tracking-wide
                text-slate-400
              "
            >
              Next Relevant Installment
            </p>

            <p
              className="
                mt-1
                text-[10px]
                font-extrabold
                text-[#17221D]
              "
            >
              Installment #
              {
                primary.installmentNumber
              }
              {" • "}
              {formatDate(
                primary.dueDate
              )}
            </p>

            <p
              className="
                mt-0.5
                text-[8px]
                text-slate-400
              "
            >
              Remaining{" "}
              {formatMoney(
                primary.remainingAmount
              )}
            </p>
          </div>

          {onSend && (
<button
            type="button"
            onClick={
              onSend
            }
            className="
              inline-flex
              h-9
              items-center
              justify-center
              gap-1.5
              rounded-lg
              bg-[#0B5D3B]
              px-3.5
              text-[9px]
              font-extrabold
              text-white
              shadow-sm
              transition
              hover:bg-[#084A30]
            "
          >
            <Send
              size={12}
            />

            Send Reminder
          </button>
)}
        </div>
      )}

      {!primary && (
        <div
          className="
            border-t
            border-slate-100
            px-4
            py-3
          "
        >
          <p
            className="
              text-[8px]
              font-semibold
              text-slate-400
            "
          >
            This loan currently has no
            open installment.
          </p>
        </div>
      )}
    </section>
  );
};

/* =========================================================
   SUMMARY AMOUNT
========================================================= */

const SummaryAmount = ({
  label,
  value,
  danger = false,
  raw = false,
}) => {
  return (
    <div
      className="
        rounded-lg
        border
        border-slate-100
        bg-slate-50
        px-3
        py-2
      "
    >
      <p
        className="
          text-[6px]
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
          text-[10px]
          font-extrabold

          ${
            danger
              ? "text-red-600"
              : "text-[#17221D]"
          }
        `}
      >
        {raw
          ? value
          : formatMoney(
              value
            )}
      </p>
    </div>
  );
};

/* =========================================================
   REMINDER ROW
========================================================= */

const ReminderRow = ({
  reminder,
  onView,
  onStop,
}) => {
  const overdue =
    reminder.overdueAmount >
    0;

  const dueToday =
    reminder.todayDueAmount >
    0;

  return (
    <div
      className="
        flex
        flex-col
        gap-3
        px-4
        py-3.5
        transition
        hover:bg-[#FAFCFB]
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
          className={`
            flex
            h-10
            w-10
            shrink-0
            items-center
            justify-center
            rounded-xl

            ${
              overdue
                ? "bg-red-50 text-red-600"
                : dueToday
                ? "bg-[#EAF5EF] text-[#0B5D3B]"
                : "bg-blue-50 text-blue-600"
            }
          `}
        >
          {overdue ? (
            <ShieldAlert
              size={17}
            />
          ) : (
            <BellRing
              size={17}
            />
          )}
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
            <p
              className="
                truncate
                text-[11px]
                font-extrabold
                text-[#17221D]
              "
            >
              {reminder.customerName}
            </p>

            <StatusBadge
              type={
                overdue
                  ? "Overdue"
                  : dueToday
                  ? "Due Today"
                  : "Upcoming"
              }
            />
          </div>

          <div
            className="
              mt-1
              flex
              flex-wrap
              items-center
              gap-3
            "
          >
            <span
              className="
                text-[8px]
                font-semibold
                text-slate-400
              "
            >
              {reminder.loanNumber}
            </span>

            <span
              className="
                text-[8px]
                font-medium
                text-slate-400
              "
            >
              {reminder.followUpLabel}
            </span>

            <span
              className="
                text-[8px]
                font-medium
                text-slate-400
              "
            >
              {reminder.sendCount || 0} send
              {Number(
                reminder.sendCount ||
                  0
              ) === 1
                ? ""
                : "s"}
            </span>
          </div>
        </div>
      </div>

      <div
        className="
          grid
          grid-cols-2
          gap-3
          sm:grid-cols-4
          lg:min-w-[410px]
        "
      >
        <SearchAmount
          label="Outstanding"
          value={
            reminder.outstanding
          }
        />

        <SearchAmount
          label="Overdue"
          value={
            reminder.overdueAmount
          }
          danger={
            reminder.overdueAmount >
            0
          }
        />

        <SearchAmount
          label="Due"
          value={
            reminder.todayDueAmount
          }
        />

        <div>
          <p
            className="
              text-[6px]
              font-bold
              uppercase
              tracking-wide
              text-slate-400
            "
          >
            Next Reminder
          </p>

          <p
            className="
              mt-0.5
              text-[8px]
              font-extrabold
              text-[#17221D]
            "
          >
            {reminder.nextReminderDate
              ? formatDate(
                  reminder.nextReminderDate
                )
              : "No follow-up"}
          </p>
        </div>
      </div>

      <div
        className="
          flex
          items-center
          gap-1.5
          sm:justify-end
        "
      >
        <button
          type="button"
          onClick={
            onView
          }
          className="
            inline-flex
            h-8
            items-center
            gap-1.5
            rounded-lg
            border
            border-slate-200
            bg-white
            px-2.5
            text-[8px]
            font-bold
            text-slate-600
            hover:bg-slate-50
          "
        >
          <Eye
            size={12}
          />

          View
        </button>

        {onStop && (
<button
          type="button"
          onClick={
            onStop
          }
          className="
            inline-flex
            h-8
            items-center
            gap-1.5
            rounded-lg
            border
            border-red-100
            bg-red-50
            px-2.5
            text-[8px]
            font-bold
            text-red-600
            hover:bg-red-100
          "
        >
          <PauseCircle
            size={12}
          />

          Stop
        </button>
)}
      </div>
    </div>
  );
};

/* =========================================================
   HISTORY ROW
========================================================= */

const ReminderHistoryRow = ({
  reminder,
  onView,
  onResume,
}) => {
  return (
    <div
      className="
        flex
        flex-col
        gap-3
        px-4
        py-3
        lg:flex-row
        lg:items-center
        lg:justify-between
      "
    >
      <div>
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
              text-[10px]
              font-extrabold
              text-[#17221D]
            "
          >
            {reminder.customerName}
          </p>

          <span
            className="
              rounded-full
              bg-slate-100
              px-2
              py-0.5
              text-[6px]
              font-bold
              uppercase
              text-slate-500
            "
          >
            {reminder.status}
          </span>
        </div>

        <p
          className="
            mt-1
            text-[8px]
            text-slate-400
          "
        >
          {reminder.loanNumber}
          {" • "}
          {reminder.sendCount || 0} total sends
          {" • "}
          Last sent{" "}
          {formatDateTime(
            reminder.lastSentAt
          )}
        </p>
      </div>

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
            onView
          }
          className="
            inline-flex
            h-8
            items-center
            gap-1.5
            rounded-lg
            border
            border-slate-200
            bg-white
            px-2.5
            text-[8px]
            font-bold
            text-slate-600
          "
        >
          <Eye
            size={12}
          />

          View
        </button>

        {onResume && (
<button
          type="button"
          onClick={
            onResume
          }
          className="
            inline-flex
            h-8
            items-center
            gap-1.5
            rounded-lg
            bg-[#EAF5EF]
            px-2.5
            text-[8px]
            font-bold
            text-[#0B5D3B]
          "
        >
          <PlayCircle
            size={12}
          />

          Resume
        </button>
)}
      </div>
    </div>
  );
};

/* =========================================================
   STATUS BADGE
========================================================= */

const StatusBadge = ({
  type,
}) => {
  return (
    <span
      className={`
        rounded-full
        px-2
        py-0.5
        text-[6px]
        font-extrabold

        ${
          type ===
          "Overdue"
            ? "bg-red-50 text-red-600"
            : type ===
              "Due Today"
            ? "bg-[#EAF5EF] text-[#0B5D3B]"
            : "bg-blue-50 text-blue-600"
        }
      `}
    >
      {type}
    </span>
  );
};

/* =========================================================
   SEARCH AMOUNT
========================================================= */

const SearchAmount = ({
  label,
  value,
  danger = false,
}) => {
  return (
    <div>
      <p
        className="
          text-[6px]
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
          mt-0.5
          text-[9px]
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
};

/* =========================================================
   SEND REMINDER MODAL
========================================================= */

const SendReminderModal = ({
  loan,
  onClose,
  onSubmit,
}) => {
  const [
    followUp,
    setFollowUp,
  ] = useState(
    "once"
  );

  const [
    note,
    setNote,
  ] = useState("");

  const summary =
    getLoanPaymentSummary(
      loan
    );

  const primary =
    getPrimaryReminderRow(
      loan
    );

  const paymentType =
    primary
      ? getRepaymentType(
          primary
        )
      : "No Due";

  const handleSubmit =
    (event) => {
      event.preventDefault();

      onSubmit({
        loan,
        followUp,
        note:
          note.trim(),
      });
    };

  return (
    <div
      className="
        fixed
        inset-0
        z-[700]
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
          max-h-[94vh]
          w-full
          max-w-[620px]
          overflow-y-auto
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-[0_25px_90px_rgba(15,23,42,0.28)]
        "
        onClick={(
          event
        ) =>
          event.stopPropagation()
        }
      >
        <div
          className="
            sticky
            top-0
            z-10
            flex
            items-center
            justify-between
            border-b
            border-slate-100
            bg-white
            px-5
            py-4
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
                h-10
                w-10
                items-center
                justify-center
                rounded-xl
                bg-[#EAF5EF]
                text-[#0B5D3B]
              "
            >
              <BellRing
                size={17}
              />
            </div>

            <div>
              <h2
                className="
                  text-[14px]
                  font-extrabold
                  text-[#17221D]
                "
              >
                Send Payment Reminder
              </h2>

              <p
                className="
                  mt-0.5
                  text-[8px]
                  text-slate-400
                "
              >
                {getCustomerName(
                  loan
                )}
                {" • "}
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
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              text-slate-400
              hover:bg-slate-50
              hover:text-slate-700
            "
          >
            <X
              size={15}
            />
          </button>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="p-5"
        >
          <div
            className="
              rounded-xl
              border
              border-slate-100
              bg-[#F8FAF9]
              p-3.5
            "
          >
            <div
              className="
                grid
                grid-cols-2
                gap-3
                sm:grid-cols-4
              "
            >
              <InfoItem
                label="Customer"
                value={getCustomerName(
                  loan
                )}
              />

              <InfoItem
                label="Loan Number"
                value={getLoanNumber(
                  loan
                )}
              />

              <InfoItem
                label="Loan Amount"
                value={formatMoney(
                  getLoanAmount(
                    loan
                  )
                )}
              />

              <InfoItem
                label="Status"
                value={paymentType}
              />
            </div>
          </div>

          <div className="mt-3">
            <div
              className="
                mb-2
                flex
                items-center
                gap-2
              "
            >
              <IndianRupee
                size={13}
                className="text-[#0B5D3B]"
              />

              <p
                className="
                  text-[9px]
                  font-extrabold
                  text-[#17221D]
                "
              >
                Current Payment Position
              </p>
            </div>

            <div
              className="
                grid
                grid-cols-2
                gap-2
                sm:grid-cols-4
              "
            >
              <MiniValue
                label="Outstanding"
                value={formatMoney(
                  summary.outstanding
                )}
              />

              <MiniValue
                label="Overdue"
                value={formatMoney(
                  summary.overdue
                )}
                danger={
                  summary.overdue >
                  0
                }
              />

              <MiniValue
                label="Today Due"
                value={formatMoney(
                  summary.today
                )}
              />

              <MiniValue
                label="Future"
                value={formatMoney(
                  summary.future
                )}
              />
            </div>
          </div>

          <div className="mt-4">
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
                    text-[10px]
                    font-extrabold
                    text-[#17221D]
                  "
                >
                  Follow-up Reminder
                </p>

                <p
                  className="
                    mt-0.5
                    text-[8px]
                    text-slate-400
                  "
                >
                  Choose how often the reminder
                  should continue.
                </p>
              </div>

              <span
                className="
                  rounded-full
                  bg-blue-50
                  px-2.5
                  py-1
                  text-[6px]
                  font-extrabold
                  uppercase
                  tracking-wide
                  text-blue-600
                "
              >
                UI Demo
              </span>
            </div>

            <div
              className="
                mt-2.5
                grid
                grid-cols-1
                gap-2
                sm:grid-cols-2
              "
            >
              {FOLLOW_UP_OPTIONS.map(
                (option) => {
                  const active =
                    followUp ===
                    option.id;

                  return (
                    <button
                      key={
                        option.id
                      }
                      type="button"
                      onClick={() =>
                        setFollowUp(
                          option.id
                        )
                      }
                      className={`
                        rounded-xl
                        border
                        px-3
                        py-3
                        text-left
                        transition

                        ${
                          active
                            ? "border-[#9CCEB1] bg-[#F0FAF4] ring-1 ring-[#DCEFE4]"
                            : "border-slate-200 bg-white hover:bg-slate-50"
                        }
                      `}
                    >
                      <div
                        className="
                          flex
                          items-center
                          justify-between
                          gap-2
                        "
                      >
                        <p
                          className={`
                            text-[9px]
                            font-extrabold

                            ${
                              active
                                ? "text-[#0B5D3B]"
                                : "text-[#17221D]"
                            }
                          `}
                        >
                          {
                            option.label
                          }
                        </p>

                        {active && (
                          <CheckCircle2
                            size={13}
                            className="
                              text-[#0B5D3B]
                            "
                          />
                        )}
                      </div>

                      <p
                        className="
                          mt-1
                          text-[7px]
                          leading-4
                          text-slate-400
                        "
                      >
                        {
                          option.description
                        }
                      </p>
                    </button>
                  );
                }
              )}
            </div>
          </div>

          <div className="mt-4">
            <label
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
              Reminder Note
            </label>

            <textarea
              value={
                note
              }
              onChange={(
                event
              ) =>
                setNote(
                  event.target.value
                )
              }
              rows={3}
              placeholder="Optional message / internal note"
              className="
                w-full
                resize-none
                rounded-xl
                border
                border-slate-200
                bg-white
                px-3
                py-2.5
                text-[9px]
                font-medium
                text-[#17221D]
                outline-none
                focus:border-[#9CCEB1]
                focus:ring-1
                focus:ring-[#DCEFE4]
              "
            />
          </div>

          <div
            className="
              mt-4
              rounded-xl
              border
              border-blue-100
              bg-blue-50
              px-3.5
              py-3
            "
          >
            <div
              className="
                flex
                items-start
                gap-2
              "
            >
              <Bell
                size={14}
                className="
                  mt-0.5
                  shrink-0
                  text-blue-600
                "
              />

              <div>
                <p
                  className="
                    text-[8px]
                    font-extrabold
                    text-blue-700
                  "
                >
                  Notification Demo
                </p>

                <p
                  className="
                    mt-1
                    text-[7px]
                    leading-4
                    text-blue-700/75
                  "
                >
                  This currently records the
                  reminder in the system UI only.
                  WhatsApp/SMS integration can be
                  connected later without changing
                  this reminder workflow.
                </p>
              </div>
            </div>
          </div>

          <div
            className="
              mt-4
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
                inline-flex
                h-9
                items-center
                gap-1.5
                rounded-lg
                bg-[#0B5D3B]
                px-4
                text-[9px]
                font-extrabold
                text-white
                shadow-sm
                hover:bg-[#084A30]
              "
            >
              <Send
                size={12}
              />

              Send Reminder
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* =========================================================
   REMINDER DETAILS MODAL
========================================================= */

const ReminderDetailsModal = ({
  reminder,
  onClose,
  onSendNow,
  onStop,
  onResume,
}) => {
  const active =
    reminder.status ===
    "Active";

  return (
    <div
      className="
        fixed
        inset-0
        z-[700]
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
          max-w-[600px]
          max-h-[92vh]
          overflow-y-auto
          rounded-2xl
          border
          border-slate-200
          bg-white
          shadow-[0_25px_90px_rgba(15,23,42,0.28)]
        "
        onClick={(
          event
        ) =>
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
            py-4
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
              <BellRing
                size={16}
                className="
                  text-[#0B5D3B]
                "
              />

              <h2
                className="
                  text-[13px]
                  font-extrabold
                  text-[#17221D]
                "
              >
                Reminder Details
              </h2>
            </div>

            <p
              className="
                mt-1
                text-[8px]
                text-slate-400
              "
            >
              {reminder.customerName}
              {" • "}
              {
                reminder.loanNumber
              }
            </p>
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
              size={15}
            />
          </button>
        </div>

        <div
          className="
            space-y-4
            p-5
          "
        >
          <div
            className="
              rounded-xl
              border
              border-[#D8E9DF]
              bg-[#F6FBF8]
              px-4
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
                    text-[7px]
                    font-bold
                    uppercase
                    tracking-wide
                    text-slate-400
                  "
                >
                  Reminder Status
                </p>

                <p
                  className="
                    mt-1
                    text-[13px]
                    font-extrabold
                    text-[#0B5D3B]
                  "
                >
                  {
                    reminder.status
                  }
                </p>
              </div>

              <StatusBadge
                type={
                  reminder.dueType ||
                  "Upcoming"
                }
              />
            </div>
          </div>

          <div
            className="
              grid
              grid-cols-2
              gap-3
              sm:grid-cols-4
            "
          >
            <InfoItem
              label="Customer"
              value={
                reminder.customerName
              }
            />

            <InfoItem
              label="Customer ID"
              value={
                reminder.customerId
              }
            />

            <InfoItem
              label="Loan Number"
              value={
                reminder.loanNumber
              }
            />

            <InfoItem
              label="Mobile"
              value={
                reminder.mobileNumber ||
                "—"
              }
            />
          </div>

          <div>
            <p
              className="
                mb-2
                text-[9px]
                font-extrabold
                text-[#17221D]
              "
            >
              Payment Position
            </p>

            <div
              className="
                grid
                grid-cols-2
                gap-2
                sm:grid-cols-4
              "
            >
              <MiniValue
                label="Loan"
                value={formatMoney(
                  reminder.loanAmount
                )}
              />

              <MiniValue
                label="Outstanding"
                value={formatMoney(
                  reminder.outstanding
                )}
              />

              <MiniValue
                label="Overdue"
                value={formatMoney(
                  reminder.overdueAmount
                )}
                danger={
                  reminder.overdueAmount >
                  0
                }
              />

              <MiniValue
                label="Today Due"
                value={formatMoney(
                  reminder.todayDueAmount
                )}
              />
            </div>
          </div>

          <div
            className="
              rounded-xl
              border
              border-slate-100
              bg-slate-50
              px-3.5
              py-3
            "
          >
            <div
              className="
                grid
                grid-cols-2
                gap-3
                sm:grid-cols-4
              "
            >
              <InfoItem
                label="Follow-up"
                value={
                  reminder.followUpLabel
                }
              />

              <InfoItem
                label="Sent Count"
                value={
                  reminder.sendCount ||
                  0
                }
              />

              <InfoItem
                label="Last Sent"
                value={formatDateTime(
                  reminder.lastSentAt
                )}
              />

              <InfoItem
                label="Next Reminder"
                value={
                  reminder.nextReminderDate
                    ? formatDate(
                        reminder.nextReminderDate
                      )
                    : "No follow-up"
                }
              />
            </div>
          </div>

          {reminder.note && (
            <div
              className="
                rounded-xl
                border
                border-slate-100
                bg-white
                px-3.5
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
                Reminder Note
              </p>

              <p
                className="
                  mt-1.5
                  text-[9px]
                  leading-5
                  text-slate-600
                "
              >
                {reminder.note}
              </p>
            </div>
          )}

          <div
            className="
              flex
              items-start
              gap-2
              rounded-xl
              border
              border-blue-100
              bg-blue-50
              px-3
              py-3
            "
          >
            <Bell
              size={14}
              className="
                mt-0.5
                shrink-0
                text-blue-600
              "
            />

            <p
              className="
                text-[8px]
                leading-4
                text-blue-700/80
              "
            >
              Reminder delivery is currently
              represented as a UI/demo
              notification. External WhatsApp or
              SMS delivery can be integrated later.
            </p>
          </div>

          <div
            className="
              flex
              flex-wrap
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
              Close
            </button>

            {active ? (
              onStop && (
<button
                type="button"
                onClick={
                  onStop
                }
                className="
                  inline-flex
                  h-9
                  items-center
                  gap-1.5
                  rounded-lg
                  bg-red-50
                  px-4
                  text-[9px]
                  font-extrabold
                  text-red-600
                "
              >
                <PauseCircle
                  size={12}
                />

                Stop Reminder
              </button>
)
            ) : (
              onResume && (
<button
                type="button"
                onClick={
                  onResume
                }
                className="
                  inline-flex
                  h-9
                  items-center
                  gap-1.5
                  rounded-lg
                  bg-[#EAF5EF]
                  px-4
                  text-[9px]
                  font-extrabold
                  text-[#0B5D3B]
                "
              >
                <PlayCircle
                  size={12}
                />

                Resume Reminder
              </button>
)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   INFO ITEM
========================================================= */

const InfoItem = ({
  label,
  value,
}) => {
  return (
    <div
      className="
        min-w-0
      "
    >
      <p
        className="
          text-[6px]
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
          text-[9px]
          font-bold
          text-[#253252]
        "
      >
        {value || "—"}
      </p>
    </div>
  );
};

/* =========================================================
   MINI VALUE
========================================================= */

const MiniValue = ({
  label,
  value,
  danger = false,
}) => {
  return (
    <div
      className="
        rounded-lg
        border
        border-slate-100
        bg-white
        px-3
        py-2
      "
    >
      <p
        className="
          text-[6px]
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
          text-[10px]
          font-extrabold

          ${
            danger
              ? "text-red-600"
              : "text-[#17221D]"
          }
        `}
      >
        {value}
      </p>
    </div>
  );
};

/* =========================================================
   EMPTY REMINDER
========================================================= */

const EmptyReminderState = () => {
  return (
    <div
      className="
        px-5
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
          text-[#0B5D3B]
        "
      >
        <Bell
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
        No active reminders
      </p>

      <p
        className="
          mt-1
          text-[9px]
          text-slate-400
        "
      >
        Search a customer or loan above and
        send a payment reminder.
      </p>
    </div>
  );
};

/* =========================================================
   DATE TIME
========================================================= */

const formatDateTime = (
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

export default Reminder;