// src/services/expenseStorage.js
//
// Expenses are stored server-side; this module is a thin client plus the
// reporting/aggregation helpers the expense pages render.

import { apiDelete, apiGet, apiPost, apiPut, notifyDataUpdated } from "./api";

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

const roundMoney = (
  value
) => {
  return (
    Math.round(
      (
        toNumber(value) +
        Number.EPSILON
      ) * 100
    ) / 100
  );
};

/* =========================================================
   DATE HELPERS
========================================================= */

export const getExpenseDateKey = (
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
    ).padStart(2, "0"),
    String(
      date.getDate()
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

const startOfDay = (
  value
) => {
  const date =
    parseLocalDate(value);

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

const endOfDay = (
  value
) => {
  const date =
    parseLocalDate(value);

  if (!date) {
    return null;
  }

  date.setHours(
    23,
    59,
    59,
    999
  );

  return date;
};

/* =========================================================
   REPORT DATE
========================================================= */

export const getExpenseReportDate = (
  expense
) => {
  return (
    expense?.date ||
    expense?.expenseDate ||
    expense?.createdAt ||
    expense?.updatedAt ||
    ""
  );
};

/* =========================================================
   GET ALL EXPENSES
========================================================= */

export const getExpenses = async () => {
  try {
    const expenses = await apiGet("/expenses");

    return Array.isArray(expenses) ? expenses : [];
  } catch (error) {
    console.error("Failed to read expenses:", error);

    return [];
  }
};

/* =========================================================
   CREATE
========================================================= */

export const addExpense = async (expense = {}) => {
  const saved = await apiPost("/expenses", expense);

  notifyDataUpdated();

  return saved;
};

/* =========================================================
   UPDATE
========================================================= */

export const updateExpense = async (expenseId, updates = {}) => {
  const saved = await apiPut(`/expenses/${expenseId}`, updates);

  notifyDataUpdated();

  return saved;
};

/* =========================================================
   DELETE
========================================================= */

export const deleteExpense = async (expenseId) => {
  await apiDelete(`/expenses/${expenseId}`);

  notifyDataUpdated();

  return true;
};

/* =========================================================
   GET ONE
========================================================= */

export const getExpenseById = async (expenseId) => {
  try {
    return await apiGet(`/expenses/${expenseId}`);
  } catch (error) {
    console.error("Failed to load expense:", error);

    return null;
  }
};

/* =========================================================
   STATUS HELPERS
========================================================= */

export const getPaidExpenses = async () => {
  return (await getExpenses()).filter(
    (expense) =>
      normalize(
        expense?.status
      ) ===
      "paid"
  );
};

export const getPendingExpenses = async () => {
  return (await getExpenses()).filter(
    (expense) =>
      normalize(
        expense?.status
      ) ===
      "pending"
  );
};

/* =========================================================
   EXPENSE TOTAL
========================================================= */

export const getTotalExpense = async ({
  startDate = "",
  endDate = "",
  status = "Paid",
  search = "",
} = {}) => {
  const records =
    await getExpenseHistory({
      startDate,
      endDate,
      status,
      search,
    });

  return roundMoney(
    records.reduce(
      (
        total,
        expense
      ) =>
        total +
        toNumber(
          expense?.amount
        ),
      0
    )
  );
};

/* =========================================================
   EXPENSE DATE RANGE FILTER
========================================================= */

const expenseMatchesDateRange = (
  expense,
  startDate,
  endDate
) => {
  const reportDate =
    parseLocalDate(
      getExpenseReportDate(
        expense
      )
    );

  if (!reportDate) {
    return false;
  }

  const start =
    startDate
      ? startOfDay(
          startDate
        )
      : null;

  const end =
    endDate
      ? endOfDay(
          endDate
        )
      : null;

  if (
    start &&
    reportDate.getTime() <
      start.getTime()
  ) {
    return false;
  }

  if (
    end &&
    reportDate.getTime() >
      end.getTime()
  ) {
    return false;
  }

  return true;
};

/* =========================================================
   EXPENSE HISTORY
========================================================= */

export const getExpenseHistory = async ({
  startDate = "",
  endDate = "",
  status = "",
  category = "",
  customer = "",
  vendor = "",
  search = "",
} = {}) => {
  const expenses =
    await getExpenses();

  const query =
    normalize(
      search ||
        customer ||
        vendor
    );

  return expenses
    .filter(
      (expense) => {
        /*
         * DATE
         */
        if (
          startDate ||
          endDate
        ) {
          if (
            !expenseMatchesDateRange(
              expense,
              startDate,
              endDate
            )
          ) {
            return false;
          }
        }

        /*
         * STATUS
         */
        if (
          status &&
          normalize(
            expense?.status
          ) !==
            normalize(
              status
            )
        ) {
          return false;
        }

        /*
         * CATEGORY
         */
        if (
          category &&
          normalize(
            category
          ) !==
            normalize(
              expense?.category
            )
        ) {
          return false;
        }

        /*
         * GENERIC SEARCH
         */
        if (query) {
          const searchableText = [
            expense?.id,
            expense?.category,
            expense?.subCategory,
            expense?.description,
            expense?.paidBy,
            expense?.vendor,
            expense?.reference,
            expense?.paymentMode,
            expense?.status,
          ]
            .filter(Boolean)
            .join(" ")
            .toLowerCase();

          if (
            !searchableText.includes(
              query
            )
          ) {
            return false;
          }
        }

        return true;
      }
    )
    .sort(
      (
        a,
        b
      ) => {
        const aDate =
          parseLocalDate(
            getExpenseReportDate(
              a
            )
          );

        const bDate =
          parseLocalDate(
            getExpenseReportDate(
              b
            )
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

/* =========================================================
   EXPENSE HISTORY BY DATE RANGE
========================================================= */

export const getExpenseHistoryByDateRange =
  async (
    startDate,
    endDate,
    options = {}
  ) => {
    return getExpenseHistory({
      ...options,
      startDate,
      endDate,
    });
  };

/* =========================================================
   EXPENSE HISTORY SUMMARY
========================================================= */

export const getExpenseHistorySummary =
  async ({
    startDate = "",
    endDate = "",
    status = "",
    category = "",
    search = "",
  } = {}) => {
    const records =
      await getExpenseHistory({
        startDate,
        endDate,
        status,
        category,
        search,
      });

    const totalAmount =
      records.reduce(
        (
          total,
          expense
        ) =>
          total +
          toNumber(
            expense?.amount
          ),
        0
      );

    const paidRecords =
      records.filter(
        (expense) =>
          normalize(
            expense?.status
          ) ===
          "paid"
      );

    const pendingRecords =
      records.filter(
        (expense) =>
          normalize(
            expense?.status
          ) ===
          "pending"
      );

    const paidAmount =
      paidRecords.reduce(
        (
          total,
          expense
        ) =>
          total +
          toNumber(
            expense?.amount
          ),
        0
      );

    const pendingAmount =
      pendingRecords.reduce(
        (
          total,
          expense
        ) =>
          total +
          toNumber(
            expense?.amount
          ),
        0
      );

    /*
     * Category-wise data.
     */
    const byCategoryMap =
      new Map();

    records.forEach(
      (expense) => {
        const categoryName =
          expense?.category ||
          "Uncategorized";

        const existing =
          byCategoryMap.get(
            categoryName
          ) || {
            category:
              categoryName,

            amount:
              0,

            count:
              0,
          };

        existing.amount +=
          toNumber(
            expense?.amount
          );

        existing.count +=
          1;

        byCategoryMap.set(
          categoryName,
          existing
        );
      }
    );

    const byCategory =
      Array.from(
        byCategoryMap.values()
      )
        .map(
          (item) => ({
            ...item,
            amount:
              roundMoney(
                item.amount
              ),
          })
        )
        .sort(
          (a, b) =>
            b.amount -
            a.amount
        );

    /*
     * Paid-by / employee-wise data.
     */
    const byPaidByMap =
      new Map();

    records.forEach(
      (expense) => {
        const paidBy =
          expense?.paidBy ||
          "Unknown";

        const existing =
          byPaidByMap.get(
            paidBy
          ) || {
            paidBy,
            amount:
              0,
            count:
              0,
          };

        existing.amount +=
          toNumber(
            expense?.amount
          );

        existing.count +=
          1;

        byPaidByMap.set(
          paidBy,
          existing
        );
      }
    );

    const byPaidBy =
      Array.from(
        byPaidByMap.values()
      )
        .map(
          (item) => ({
            ...item,
            amount:
              roundMoney(
                item.amount
              ),
          })
        )
        .sort(
          (a, b) =>
            b.amount -
            a.amount
        );

    /*
     * Vendor-wise data.
     */
    const byVendorMap =
      new Map();

    records.forEach(
      (expense) => {
        const vendor =
          expense?.vendor ||
          "No Vendor";

        const existing =
          byVendorMap.get(
            vendor
          ) || {
            vendor,
            amount:
              0,
            count:
              0,
          };

        existing.amount +=
          toNumber(
            expense?.amount
          );

        existing.count +=
          1;

        byVendorMap.set(
          vendor,
          existing
        );
      }
    );

    const byVendor =
      Array.from(
        byVendorMap.values()
      )
        .map(
          (item) => ({
            ...item,
            amount:
              roundMoney(
                item.amount
              ),
          })
        )
        .sort(
          (a, b) =>
            b.amount -
            a.amount
        );

    /*
     * Monthly data.
     */
    const monthlyMap =
      new Map();

    records.forEach(
      (expense) => {
        const date =
          parseLocalDate(
            getExpenseReportDate(
              expense
            )
          );

        if (!date) {
          return;
        }

        const month =
          `${date.getFullYear()}-${String(
            date.getMonth() + 1
          ).padStart(
            2,
            "0"
          )}`;

        const existing =
          monthlyMap.get(
            month
          ) || {
            month,
            total:
              0,
            count:
              0,
          };

        existing.total +=
          toNumber(
            expense?.amount
          );

        existing.count +=
          1;

        monthlyMap.set(
          month,
          existing
        );
      }
    );

    const byMonth =
      Array.from(
        monthlyMap.values()
      )
        .map(
          (item) => ({
            ...item,
            total:
              roundMoney(
                item.total
              ),
          })
        )
        .sort(
          (a, b) =>
            b.month.localeCompare(
              a.month
            )
        );

    const uniqueVendors =
      new Set(
        records
          .map(
            (expense) =>
              expense?.vendor
          )
          .filter(Boolean)
      );

    const uniqueCategories =
      new Set(
        records
          .map(
            (expense) =>
              expense?.category
          )
          .filter(Boolean)
      );

    const averageExpense =
      records.length
        ? totalAmount /
          records.length
        : 0;

    return {
      startDate,
      endDate,

      recordCount:
        records.length,

      /*
       * Compatibility alias.
       */
      totalRecords:
        records.length,

      totalAmount:
        roundMoney(
          totalAmount
        ),

      paidCount:
        paidRecords.length,

      paidAmount:
        roundMoney(
          paidAmount
        ),

      pendingCount:
        pendingRecords.length,

      pendingAmount:
        roundMoney(
          pendingAmount
        ),

      vendorCount:
        uniqueVendors.size,

      categoryCount:
        uniqueCategories.size,

      averageExpense:
        roundMoney(
          averageExpense
        ),

      byCategory,

      byPaidBy,

      byVendor,

      byMonth,

      records,
    };
  };

/* =========================================================
   MONTHLY EXPENSE SUMMARY
========================================================= */

export const getMonthlyExpenseSummary =
  async ({
    status = "Paid",
    year = null,
  } = {}) => {
    const expenses =
      await getExpenses();

    const grouped =
      {};

    expenses.forEach(
      (expense) => {
        if (
          status &&
          normalize(
            expense?.status
          ) !==
            normalize(
              status
            )
        ) {
          return;
        }

        const date =
          parseLocalDate(
            getExpenseReportDate(
              expense
            )
          );

        if (!date) {
          return;
        }

        const expenseYear =
          date.getFullYear();

        if (
          year !== null &&
          year !== undefined &&
          Number(year) !==
            expenseYear
        ) {
          return;
        }

        const month =
          `${expenseYear}-${String(
            date.getMonth() + 1
          ).padStart(
            2,
            "0"
          )}`;

        if (
          !grouped[
            month
          ]
        ) {
          grouped[
            month
          ] = {
            month,
            total:
              0,
            count:
              0,
          };
        }

        grouped[
          month
        ].total +=
          toNumber(
            expense?.amount
          );

        grouped[
          month
        ].count +=
          1;
      }
    );

    return Object.values(
      grouped
    )
      .map(
        (item) => ({
          ...item,
          total:
            roundMoney(
              item.total
            ),
        })
      )
      .sort(
        (a, b) =>
          b.month.localeCompare(
            a.month
          )
      );
  };

/* =========================================================
   LIFETIME EXPENSE SUMMARY
========================================================= */

export const getLifetimeExpenseSummary =
  () => {
    return getExpenseHistorySummary({
      status:
        "Paid",
    });
  };

/* =========================================================
   THIS MONTH EXPENSE SUMMARY
========================================================= */

export const getThisMonthExpenseSummary =
  () => {
    const today =
      new Date();

    const firstDay =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );

    const lastDay =
      new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      );

    return getExpenseHistorySummary({
      startDate:
        getExpenseDateKey(
          firstDay
        ),

      endDate:
        getExpenseDateKey(
          lastDay
        ),

      status:
        "Paid",
    });
  };

/* =========================================================
   YESTERDAY EXPENSE SUMMARY
========================================================= */

export const getYesterdayExpenseSummary =
  () => {
    const yesterday =
      new Date();

    yesterday.setDate(
      yesterday.getDate() -
        1
    );

    const date =
      getExpenseDateKey(
        yesterday
      );

    return getExpenseHistorySummary({
      startDate:
        date,

      endDate:
        date,

      status:
        "Paid",
    });
  };

/* =========================================================
   TODAY EXPENSE SUMMARY
========================================================= */

export const getTodayExpenseSummary =
  () => {
    const today =
      getExpenseDateKey(
        new Date()
      );

    return getExpenseHistorySummary({
      startDate:
        today,

      endDate:
        today,

      status:
        "Paid",
    });
  };

/* =========================================================
   STATUS SUMMARY
========================================================= */

export const getExpenseStatusSummary =
  async () => {
    const expenses =
      await getExpenses();

    const paid =
      expenses.filter(
        (expense) =>
          normalize(
            expense?.status
          ) ===
          "paid"
      );

    const pending =
      expenses.filter(
        (expense) =>
          normalize(
            expense?.status
          ) ===
          "pending"
      );

    return {
      total:
        expenses.length,

      paidCount:
        paid.length,

      pendingCount:
        pending.length,

      paidAmount:
        roundMoney(
          paid.reduce(
            (
              total,
              expense
            ) =>
              total +
              toNumber(
                expense?.amount
              ),
            0
          )
        ),

      pendingAmount:
        roundMoney(
          pending.reduce(
            (
              total,
              expense
            ) =>
              total +
              toNumber(
                expense?.amount
              ),
            0
          )
        ),
    };
  };

/* =========================================================
   LEGACY COMPATIBILITY
========================================================= */

export const getExpenseTotal =
  getTotalExpense;

/* =========================================================
   DEFAULT EXPORT
========================================================= */

export default {
  getExpenses,

  addExpense,
  updateExpense,
  deleteExpense,
  getExpenseById,

  getPaidExpenses,
  getPendingExpenses,

  getTotalExpense,
  getExpenseTotal,

  getExpenseDateKey,
  getExpenseReportDate,

  getExpenseHistory,
  getExpenseHistoryByDateRange,
  getExpenseHistorySummary,

  getMonthlyExpenseSummary,

  getLifetimeExpenseSummary,
  getThisMonthExpenseSummary,
  getYesterdayExpenseSummary,
  getTodayExpenseSummary,

  getExpenseStatusSummary,
};