// src/hooks/dashboard/useDashboardMetrics.js
//
// Derived metrics for the redesigned Dashboard page. Built on top of the
// raw arrays useDashboardData() already loads (loans, collections,
// expenses, customers) rather than duplicating its fetch/normalize logic.
// Everything here is month-scoped or grouped in ways the base hook
// doesn't already provide.

import { useMemo } from "react";

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

const isSameMonth = (value, reference) => {
  if (!value) return false;

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return false;

  return (
    date.getFullYear() === reference.getFullYear() &&
    date.getMonth() === reference.getMonth()
  );
};

const weekOfMonth = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return Math.min(4, Math.ceil(date.getDate() / 7));
};

const dayKey = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return null;

  return date.toISOString().slice(0, 10);
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
} = {}) => {
  const now = useMemo(() => new Date(), []);

  /* =======================================================
     APPROVED COLLECTIONS THIS MONTH
  ======================================================== */

  const approvedThisMonth = useMemo(() => {
    return collections.filter(
      (collection) =>
        normalizeStatus(collection?.status) === "approved" &&
        isSameMonth(collectionDateOf(collection), now)
    );
  }, [collections, now]);

  const monthCollected = useMemo(
    () =>
      approvedThisMonth.reduce(
        (sum, collection) => sum + Number(collection?.amount || 0),
        0
      ),
    [approvedThisMonth]
  );

  /* =======================================================
     SCHEDULED DUE THIS MONTH (from every loan's repayment
     schedule rows, regardless of loan status)
  ======================================================== */

  const scheduleRowsThisMonth = useMemo(() => {
    const rows = [];

    loans.forEach((loan) => {
      const schedule = Array.isArray(loan?.repaymentSchedule)
        ? loan.repaymentSchedule
        : [];

      schedule.forEach((row) => {
        if (isSameMonth(row?.dueDate, now)) {
          rows.push(row);
        }
      });
    });

    return rows;
  }, [loans, now]);

  const monthDue = useMemo(
    () =>
      scheduleRowsThisMonth.reduce(
        (sum, row) =>
          sum + Number(row?.paymentAmount || row?.emiAmount || row?.amount || 0),
        0
      ),
    [scheduleRowsThisMonth]
  );

  const collectionRate = monthDue > 0 ? Math.min(100, (monthCollected / monthDue) * 100) : 0;

  /* =======================================================
     WEEKLY TREND (collected vs due, week-of-month)
  ======================================================== */

  const weeklyTrend = useMemo(() => {
    const weeks = [1, 2, 3, 4].map((week) => ({
      week: `Week ${week}`,
      collected: 0,
      due: 0,
      overdue: 0,
    }));

    approvedThisMonth.forEach((collection) => {
      const week = weekOfMonth(collectionDateOf(collection));

      if (week) {
        weeks[week - 1].collected += Number(collection?.amount || 0);
      }
    });

    scheduleRowsThisMonth.forEach((row) => {
      const week = weekOfMonth(row?.dueDate);

      if (!week) return;

      const amount = Number(row?.paymentAmount || row?.emiAmount || row?.amount || 0);

      weeks[week - 1].due += amount;

      if (normalizeStatus(row?.status) === "overdue") {
        weeks[week - 1].overdue += amount;
      }
    });

    return weeks;
  }, [approvedThisMonth, scheduleRowsThisMonth]);

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
     NEW LOANS vs RE-LOANS THIS MONTH
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
        if (!isSameMonth(loan?.createdAt, now)) return;

        if (index === 0) {
          newLoans += 1;
        } else {
          reLoans += 1;
        }
      });
    });

    return { newLoans, reLoans };
  }, [loans, now]);

  /* =======================================================
     CUSTOMER BASE
  ======================================================== */

  const customerBase = useMemo(() => {
    const newCustomers = customers.filter((record) =>
      isSameMonth(record?.customer?.createdAt, now)
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
  }, [customers, loans, totalCustomers, now]);

  /* =======================================================
     DAILY EXPENSE TREND (this month)
  ======================================================== */

  const dailyExpenseTrend = useMemo(() => {
    const byDay = new Map();

    expenses.forEach((expense) => {
      if (normalizeStatus(expense?.status) === "rejected") return;

      if (!isSameMonth(expense?.date, now)) return;

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
  }, [expenses, now]);

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
    monthCollected,
    monthDue,
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
