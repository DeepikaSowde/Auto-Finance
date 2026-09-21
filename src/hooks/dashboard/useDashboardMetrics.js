// src/hooks/dashboard/useDashboardMetrics.js
//
// Derived metrics for the redesigned Dashboard page. Built on top of the
// raw arrays useDashboardData() already loads (loans, collections,
// expenses, customers) rather than duplicating its fetch/normalize logic.
// Everything here is scoped to a selectable period (Today / This Week /
// This Month / Last 6 Months / This Year / Custom Range).

import { useMemo } from "react";

export const PERIOD_OPTIONS = [
  { id: "today", label: "Today" },
  { id: "week", label: "This Week" },
  { id: "month", label: "This Month" },
  { id: "6months", label: "Last 6 Months" },
  { id: "year", label: "This Year" },
  { id: "custom", label: "Custom Range" },
];

const normalizeStatus = (value) =>
  String(value || "")
    .trim()
    .toLowerCase();

const collectionDateOf = (collection) =>
  collection?.collectedDate ||
  collection?.collectionDate ||
  collection?.submittedAt ||
  collection?.approvedAt ||
  null;

const startOfDay = (date) => {
  const clone = new Date(date);

  clone.setHours(0, 0, 0, 0);

  return clone;
};

const endOfDay = (date) => {
  const clone = new Date(date);

  clone.setHours(23, 59, 59, 999);

  return clone;
};

export const getPeriodRange = (period, now = new Date(), customRange = {}) => {
  const today = startOfDay(now);

  switch (period) {
    case "today":
      return { start: today, end: endOfDay(now) };

    case "week": {
      const start = new Date(today);

      start.setDate(start.getDate() - 6);

      return { start, end: endOfDay(now) };
    }

    case "6months": {
      const start = new Date(today.getFullYear(), today.getMonth() - 5, 1);

      return { start, end: endOfDay(now) };
    }

    case "year": {
      const start = new Date(today.getFullYear(), 0, 1);

      return { start, end: endOfDay(now) };
    }

    case "custom": {
      const start = customRange.start ? startOfDay(new Date(customRange.start)) : today;
      const end = customRange.end ? endOfDay(new Date(customRange.end)) : endOfDay(now);

      return { start, end };
    }

    case "month":
    default: {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);

      return { start, end: endOfDay(now) };
    }
  }
};

const isInRange = (value, range) => {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  return date >= range.start && date <= range.end;
};

const rangeSpanDays = (range) =>
  Math.max(1, Math.round((range.end - range.start) / (1000 * 60 * 60 * 24)) + 1);

// Short-span ranges (<=45 days) bucket by day; longer ones bucket by
// month, so a year-long range doesn't render 365 bars.
const bucketKeyFor = (value, range) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  if (rangeSpanDays(range) <= 45) {
    return date.toISOString().slice(0, 10);
  }

  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
};

const bucketLabelFor = (key, range) => {
  if (rangeSpanDays(range) <= 45) {
    const date = new Date(key);

    return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short" });
  }

  const [year, month] = key.split("-").map(Number);

  return new Date(year, month - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "2-digit" });
};

const buildBucketKeys = (range) => {
  const keys = [];
  const daily = rangeSpanDays(range) <= 45;
  const cursor = new Date(range.start);

  while (cursor <= range.end) {
    keys.push(bucketKeyFor(cursor, range));

    cursor.setDate(cursor.getDate() + (daily ? 1 : 0));

    if (!daily) {
      cursor.setMonth(cursor.getMonth() + 1);
      cursor.setDate(1);
    }
  }

  return [...new Set(keys)];
};

const dayKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
};

const PERIOD_LABELS = {
  today: "Today",
  week: "This Week",
  month: "This Month",
  "6months": "Last 6 Months",
  year: "This Year",
  custom: "Selected Range",
};

const useDashboardMetrics = ({
  loans = [],
  customers = [],
  collections = [],
  expenses = [],
  activeLoans = 0,
  closedLoans = 0,
  overdueLoanCount = 0,
  overdueAmount = 0,
  totalCustomers = 0,
  followUpQueue = [],
  ptpDue = { count: 0, amount: 0 },
  period = "month",
  customRange = {},
} = {}) => {
  const now = useMemo(() => new Date(), []);

  const range = useMemo(() => getPeriodRange(period, now, customRange), [period, now, customRange]);

  const periodLabel = PERIOD_LABELS[period] || PERIOD_LABELS.month;

  /* =======================================================
     APPROVED COLLECTIONS IN RANGE
  ======================================================== */

  const approvedInRange = useMemo(() => {
    return collections.filter(
      (collection) =>
        normalizeStatus(collection?.status) === "approved" &&
        isInRange(collectionDateOf(collection), range)
    );
  }, [collections, range]);

  const periodCollected = useMemo(
    () =>
      approvedInRange.reduce((sum, collection) => sum + Number(collection?.amount || 0), 0),
    [approvedInRange]
  );

  /* =======================================================
     SCHEDULED DUE IN RANGE (from every loan's repayment
     schedule rows, regardless of loan status)
  ======================================================== */

  const scheduleRowsInRange = useMemo(() => {
    const rows = [];

    loans.forEach((loan) => {
      const schedule = Array.isArray(loan?.repaymentSchedule)
        ? loan.repaymentSchedule
        : [];

      schedule.forEach((row) => {
        if (isInRange(row?.dueDate, range)) {
          rows.push(row);
        }
      });
    });

    return rows;
  }, [loans, range]);

  const periodDue = useMemo(
    () =>
      scheduleRowsInRange.reduce(
        (sum, row) =>
          sum + Number(row?.paymentAmount || row?.emiAmount || row?.amount || 0),
        0
      ),
    [scheduleRowsInRange]
  );

  const collectionRate = periodDue > 0 ? Math.min(100, (periodCollected / periodDue) * 100) : 0;

  /* =======================================================
     TREND (collected vs due, bucketed to fit the range)
  ======================================================== */

  const weeklyTrend = useMemo(() => {
    const keys = buildBucketKeys(range);

    const buckets = new Map(
      keys.map((key) => [key, { week: bucketLabelFor(key, range), collected: 0, due: 0, overdue: 0 }])
    );

    approvedInRange.forEach((collection) => {
      const key = bucketKeyFor(collectionDateOf(collection), range);
      const bucket = buckets.get(key);

      if (bucket) bucket.collected += Number(collection?.amount || 0);
    });

    scheduleRowsInRange.forEach((row) => {
      const key = bucketKeyFor(row?.dueDate, range);
      const bucket = buckets.get(key);

      if (!bucket) return;

      const amount = Number(row?.paymentAmount || row?.emiAmount || row?.amount || 0);

      bucket.due += amount;

      if (normalizeStatus(row?.status) === "overdue") {
        bucket.overdue += amount;
      }
    });

    return Array.from(buckets.values());
  }, [range, approvedInRange, scheduleRowsInRange]);

  /* =======================================================
     PORTFOLIO COMPOSITION
  ======================================================== */

  const portfolioComposition = useMemo(() => {
    // overdueLoanCount is a payment-schedule state layered on top of
    // "active", not a separate loan.status — subtract it out so the
    // three slices sum to the real total instead of double-counting.
    const activeCurrent = Math.max(activeLoans - overdueLoanCount, 0);
    const total = activeCurrent + closedLoans + overdueLoanCount;

    const rows = [
      { key: "active", label: "Active", count: activeCurrent, color: "#0B6B43" },
      { key: "closed", label: "Closed", count: closedLoans, color: "#4779D8" },
      { key: "overdue", label: "Overdue", count: overdueLoanCount, color: "#D92D3A" },
    ];

    return rows.map((row) => ({
      ...row,
      pct: total > 0 ? Math.round((row.count / total) * 1000) / 10 : 0,
    }));
  }, [activeLoans, closedLoans, overdueLoanCount]);

  const totalLoansForComposition =
    portfolioComposition.reduce((sum, row) => sum + row.count, 0);

  /* =======================================================
     OUTSTANDING BY VEHICLE TYPE
     (real substitute for a branch breakdown, since branches
     aren't part of the data model)
  ======================================================== */

  const outstandingByVehicleType = useMemo(() => {
    const buckets = new Map();

    loans.forEach((loan) => {
      const type =
        loan?.vehicle?.vehicleType || loan?.vehicle?.brand || "Unspecified";

      const outstanding =
        loan?.outstandingAmount !== undefined && loan?.outstandingAmount !== null
          ? Number(loan.outstandingAmount)
          : Math.max(
              Number(loan?.calculation?.totalDue || loan?.totalDue || 0) -
                Number(
                  loan?.paymentHistory?.reduce(
                    (sum, payment) => sum + Number(payment.amount || 0),
                    0
                  ) || 0
                ),
              0
            );

      buckets.set(type, (buckets.get(type) || 0) + outstanding);
    });

    return Array.from(buckets.entries())
      .map(([type, amount]) => ({ type, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 6);
  }, [loans]);

  /* =======================================================
     NEW LOANS vs RE-LOANS IN RANGE
     A loan is a re-loan when it isn't the earliest loan on
     record for its customer.
  ======================================================== */

  const loanActivityThisMonth = useMemo(() => {
    const byCustomer = new Map();

    loans.forEach((loan) => {
      const customerId = loan?.customerId;

      if (!customerId) return;

      if (!byCustomer.has(customerId)) byCustomer.set(customerId, []);

      byCustomer.get(customerId).push(loan);
    });

    let newLoans = 0;
    let reLoans = 0;

    byCustomer.forEach((customerLoans) => {
      const sorted = [...customerLoans].sort(
        (a, b) => new Date(a?.createdAt || 0) - new Date(b?.createdAt || 0)
      );

      sorted.forEach((loan, index) => {
        if (!isInRange(loan?.createdAt, range)) return;

        if (index === 0) {
          newLoans += 1;
        } else {
          reLoans += 1;
        }
      });
    });

    return { newLoans, reLoans };
  }, [loans, range]);

  /* =======================================================
     CUSTOMER BASE
  ======================================================== */

  const customerBase = useMemo(() => {
    const newCustomers = customers.filter((record) =>
      isInRange(record?.customer?.createdAt, range)
    ).length;

    const activeCustomerIds = new Set(
      loans
        .filter((loan) => normalizeStatus(loan?.status) === "active")
        .map((loan) => loan?.customerId)
        .filter(Boolean)
    );

    return {
      total: totalCustomers,
      newThisMonth: newCustomers,
      activeBorrowers: activeCustomerIds.size,
      newGrowthPct:
        totalCustomers > 0 ? Math.round((newCustomers / totalCustomers) * 1000) / 10 : 0,
      activeGrowthPct:
        totalCustomers > 0
          ? Math.round((activeCustomerIds.size / totalCustomers) * 1000) / 10
          : 0,
    };
  }, [customers, loans, totalCustomers, range]);

  /* =======================================================
     EXPENSE TREND IN RANGE
  ======================================================== */

  const dailyExpenseTrend = useMemo(() => {
    const byDay = new Map();

    expenses.forEach((expense) => {
      if (normalizeStatus(expense?.status) === "rejected") return;

      if (!isInRange(expense?.date, range)) return;

      const key = dayKey(expense?.date);

      if (!key) return;

      byDay.set(key, (byDay.get(key) || 0) + Number(expense?.amount || 0));
    });

    return Array.from(byDay.entries())
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .map(([date, amount]) => ({
        day: date.slice(8, 10),
        amount,
      }));
  }, [expenses, range]);

  const monthExpenseTotal = useMemo(
    () => dailyExpenseTrend.reduce((sum, row) => sum + row.amount, 0),
    [dailyExpenseTrend]
  );

  /* =======================================================
     NEEDS ATTENTION
  ======================================================== */

  const needsAttention = useMemo(
    () => ({
      overdueCount: overdueLoanCount,
      overdueAmount,
      followUpCount: Array.isArray(followUpQueue) ? followUpQueue.length : 0,
      ptpCount: ptpDue?.count || 0,
      ptpAmount: ptpDue?.amount || 0,
    }),
    [overdueLoanCount, overdueAmount, followUpQueue, ptpDue]
  );

  /* =======================================================
     AGING BUCKETS
  ======================================================== */

  const agingBuckets = useMemo(() => {
    const buckets = [
      { key: "1-30", label: "1–30 Days", count: 0, amount: 0 },
      { key: "31-60", label: "31–60 Days", count: 0, amount: 0 },
      { key: "61-90", label: "61–90 Days", count: 0, amount: 0 },
      { key: "90+", label: "90+ Days", count: 0, amount: 0 },
    ];

    loans.forEach((loan) => {
      const schedule = Array.isArray(loan?.repaymentSchedule)
        ? loan.repaymentSchedule
        : [];

      schedule.forEach((row) => {
        if (normalizeStatus(row?.status) !== "overdue") return;

        const dueDate = new Date(row?.dueDate || 0);

        if (Number.isNaN(dueDate.getTime())) return;

        const days = Math.max(
          0,
          Math.floor((now.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
        );

        const amount = Number(row?.paymentAmount || row?.emiAmount || row?.amount || 0);

        const bucket = days <= 30 ? 0 : days <= 60 ? 1 : days <= 90 ? 2 : 3;

        buckets[bucket].count += 1;
        buckets[bucket].amount += amount;
      });
    });

    return buckets;
  }, [loans, now]);

  return {
    periodLabel,
    monthCollected: periodCollected,
    monthDue: periodDue,
    collectionRate,
    weeklyTrend,
    portfolioComposition,
    totalLoansForComposition,
    outstandingByVehicleType,
    loanActivityThisMonth,
    customerBase,
    dailyExpenseTrend,
    monthExpenseTotal,
    needsAttention,
    agingBuckets,
  };
};

export default useDashboardMetrics;
