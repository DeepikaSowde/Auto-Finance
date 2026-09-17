// src/services/ledgerService.js

import { getCustomers } from "./customerStorage";
import { getCollections } from "./collectionStorage";
import { getExpenses } from "./expenseStorage";
import { getSession } from "./authStorage";
import { getVehicleRecords } from "./vehicleStorage";

/* =========================================================
   BASIC HELPERS
========================================================= */

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
};

const dateKey = (value) => {
  if (!value) {
    return "";
  }

  const raw = String(value);

  const match = raw.match(
    /^(\d{4})-(\d{2})-(\d{2})/
  );

  if (match) {
    return `${match[1]}-${match[2]}-${match[3]}`;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
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

export const parseDate = (value) => {
  const key = dateKey(value);

  if (!key) {
    return null;
  }

  const [
    year,
    month,
    day,
  ] = key
    .split("-")
    .map(Number);

  const date = new Date(
    year,
    month - 1,
    day
  );

  date.setHours(
    0,
    0,
    0,
    0
  );

  return date;
};

const roundMoney = (value) =>
  Math.round(
    (
      toNumber(value) +
      Number.EPSILON
    ) * 100
  ) / 100;

/* =========================================================
   LOANS
========================================================= */

const allLoans = (
  customers
) =>
  customers.flatMap(
    (record) => {
      const loans =
        Array.isArray(
          record?.loans
        )
          ? record.loans
          : [];

      const source =
        record?.loan
          ? [
              record.loan,
              ...loans,
            ]
          : loans;

      const seen =
        new Set();

      return source
        .filter(
          (loan) => {
            const key =
              String(
                loan?.id ||
                  loan?.loanNumber ||
                  ""
              );

            if (
              !key ||
              seen.has(key)
            ) {
              return false;
            }

            seen.add(key);

            return true;
          }
        )
        .map(
          (loan) => ({
            loan,
            customer:
              record?.customer ||
              {},
          })
        );
    }
  );

const findLoan = (
  loans,
  collection
) =>
  loans.find(
    ({ loan }) =>
      String(
        loan?.id || ""
      ) ===
        String(
          collection?.loanId ||
            ""
        ) ||
      String(
        loan?.loanNumber ||
          ""
      ) ===
        String(
          collection?.loanNumber ||
            ""
        )
  );

const customerName = (
  customer,
  loan
) =>
  customer?.personal?.name ||
  loan?.customerName ||
  loan?.customer?.personal
    ?.name ||
  "";

const customerId = (
  customer,
  loan
) =>
  customer?.customerNumber ||
  customer?.id ||
  loan?.customerNumber ||
  loan?.customerId ||
  "";

/* =========================================================
   COLLECTION → LEDGER INCOME
========================================================= */

const collectionTransaction = (
  collection,
  loans,
  session
) => {
  const match =
    findLoan(
      loans,
      collection
    );

  const loan =
    match?.loan || {};

  const customer =
    match?.customer || {};

  const amount =
    roundMoney(
      collection?.amount ||
        collection?.totalPayable
    );

  const breakdown = {
    principal:
      roundMoney(
        collection?.amountTowardPrincipal
      ),

    interest:
      roundMoney(
        collection?.amountTowardInterest ||
          collection?.repayment?.interest
      ),

    penalty:
      roundMoney(
        collection?.amountTowardPenalty ||
          collection?.penaltyAmount
      ),

    advance:
      roundMoney(
        collection?.amountTowardAdvance
      ),

    excess:
      roundMoney(
        collection?.amountExcess
      ),
  };

  return {
    id:
      collection?.id ||
      collection?.receiptNumber ||
      `collection-${collection?.collectedDate || amount}`,

    kind: "income",

    type: "Income",

    date:
      collection?.approvedAt ||
      collection?.collectedDate ||
      collection?.createdAt,

    dateKey:
      dateKey(
        collection?.approvedAt ||
          collection?.collectedDate ||
          collection?.createdAt
      ),

    amount,

    source:
      customerName(
        customer,
        loan
      ) ||
      collection?.paymentType ||
      "Collection",

    category:
      collection?.paymentType ||
      "Collection",

    reference:
      collection?.receiptNumber ||
      collection?.receiptNo ||
      collection?.reference ||
      "",

    loanNumber:
      loan?.loanNumber ||
      collection?.loanNumber ||
      "",

    customerName:
      customerName(
        customer,
        loan
      ),

    customerId:
      customerId(
        customer,
        loan
      ),

    mobile:
      customer?.personal
        ?.mobileNumber ||
      loan?.mobileNumber ||
      "",

    description:
      collection?.remarks ||
      collection?.paymentType ||
      "",

    paymentMode:
      collection?.paymentMode ||
      collection?.payMode ||
      "",

    status:
      collection?.status ||
      "Approved",

    collectedBy:
      collection?.approvedBy?.name ||
      collection?.approvedBy ||
      collection?.staffName ||
      session?.name ||
      "",

    remarks:
      collection?.remarks ||
      "",

    breakdown,

    total:
      amount,

    installment:
      collection?.installment ||
      "",

    dueDate:
      collection?.dueDate ||
      "",

    paymentType:
      collection?.paymentType ||
      "",

    loanAmount:
      loan?.loanAmount,

    raw:
      collection,
  };
};

/* =========================================================
   VEHICLE SALE → LEDGER INCOME
========================================================= */

/*
 * IMPORTANT:
 *
 * A completed vehicle sale is treated as an
 * income transaction in the Ledger.
 *
 * This uses ONLY the actual sale price.
 *
 * Existing vehicle sale calculations such as:
 *
 * - outstanding
 * - net recovery
 * - deficiency
 * - surplus
 * - foreclosure
 *
 * are NOT recalculated or modified here.
 *
 * The Ledger only records the cash received
 * from the completed vehicle sale.
 */

const vehicleSaleIncomeTransaction = (
  vehicle
) => {
  const sale =
    vehicle?.sale || {};

  const status =
    String(
      vehicle?.status || ""
    )
      .trim()
      .toLowerCase();

  /*
   * Only completed SOLD vehicles
   * should enter Ledger income.
   */
  if (
    status !== "sold"
  ) {
    return null;
  }

  const salePrice =
    roundMoney(
      sale?.salePrice
    );

  /*
   * Ignore invalid / zero-value
   * sale records.
   */
  if (
    salePrice <= 0
  ) {
    return null;
  }

  const vehicleName =
    [
      vehicle?.brand,
      vehicle?.model,
      vehicle?.variant,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Vehicle";

  const soldAt =
    sale?.soldAt ||
    sale?.saleDate ||
    vehicle?.updatedAt ||
    vehicle?.createdAt;

  return {
    id:
      `vehicle-sale-${vehicle?.vehicleId || vehicle?.id || soldAt || salePrice}`,

    kind: "income",

    type: "Income",

    date:
      soldAt,

    dateKey:
      dateKey(soldAt),

    amount:
      salePrice,

    source:
      "Sold Vehicle",

    category:
      "Sold Vehicle",

    reference:
      vehicle?.vehicleId ||
      vehicle?.id ||
      "",

    loanNumber:
      vehicle?.loanNumber ||
      "",

    customerName:
      vehicle?.customerName ||
      "",

    customerId:
      vehicle?.customerId ||
      "",

    mobile:
      vehicle?.mobileNumber ||
      "",

    description:
      `${vehicleName} sold`,

    paymentMode:
      sale?.saleMethod ||
      "",

    status:
      "Completed",

    collectedBy:
      sale?.soldBy ||
      "",

    remarks:
      sale?.notes ||
      sale?.remarks ||
      "",

    breakdown:
      null,

    total:
      salePrice,

    installment:
      "",

    dueDate:
      "",

    paymentType:
      "Sold Vehicle",

    loanAmount:
      vehicle?.loanAmount ||
      0,

    /*
     * Extra sale-specific data.
     * These fields are useful in the
     * Ledger View Details drawer.
     *
     * They do not affect calculations.
     */
    vehicleId:
      vehicle?.vehicleId ||
      vehicle?.id ||
      "",

    vehicleName,

    registrationNumber:
      vehicle?.registrationNumber ||
      "",

    salePrice,

    saleExpenses:
      roundMoney(
        sale?.saleExpenses
      ),

    netRecovery:
      roundMoney(
        sale?.netSaleProceeds ??
          Math.max(
            salePrice -
              toNumber(
                sale?.saleExpenses
              ),
            0
          )
      ),

    surplus:
      roundMoney(
        sale?.surplus
      ),

    deficiency:
      roundMoney(
        sale?.deficiency
      ),

    saleMethod:
      sale?.saleMethod ||
      "",

    buyerName:
      sale?.buyerName ||
      "",

    buyerId:
      sale?.buyerId ||
      "",

    soldBy:
      sale?.soldBy ||
      "",

    raw:
      vehicle,
  };
};

/* =========================================================
   EXPENSE → LEDGER EXPENSE
========================================================= */

const expenseTransaction = (
  expense,
  session
) => ({
  id:
    expense?.id ||
    expense?.reference ||
    `expense-${expense?.date || expense?.amount}`,

  kind: "expense",

  type: "Expense",

  date:
    expense?.date ||
    expense?.expenseDate ||
    expense?.createdAt,

  dateKey:
    dateKey(
      expense?.date ||
        expense?.expenseDate ||
        expense?.createdAt
    ),

  amount:
    roundMoney(
      expense?.amount
    ),

  source:
    expense?.category ||
    "Expense",

  category:
    expense?.category ||
    "",

  reference:
    expense?.reference ||
    expense?.id ||
    "",

  loanNumber:
    "",

  customerName:
    "",

  customerId:
    "",

  mobile:
    "",

  description:
    expense?.description ||
    expense?.purpose ||
    "",

  paymentMode:
    expense?.paymentMode ||
    "",

  status:
    expense?.status ||
    "",

  collectedBy:
    expense?.createdBy ||
    expense?.recordedBy ||
    session?.name ||
    "",

  remarks:
    expense?.remarks ||
    "",

  breakdown:
    null,

  total:
    roundMoney(
      expense?.amount
    ),

  vendor:
    expense?.vendor ||
    expense?.paidBy ||
    "",

  raw:
    expense,
});

/* =========================================================
   GET ALL LEDGER TRANSACTIONS
========================================================= */

export const getLedgerTransactions = async () => {
  const customers =
    await getCustomers();

  const loans =
    allLoans(customers);

  const session =
    getSession();

  /*
   * COLLECTION INCOME
   */
  const incomes =
    (await getCollections())
      .filter(
        (collection) =>
          String(
            collection?.status ||
              ""
          ).toLowerCase() ===
          "approved"
      )
      .map(
        (collection) =>
          collectionTransaction(
            collection,
            loans,
            session
          )
      );

  /*
   * VEHICLE SALE INCOME
   *
   * Newly added:
   * Every completed SOLD vehicle
   * is automatically represented
   * as a Ledger income transaction.
   */
  const vehicleSaleIncome =
    (await getVehicleRecords())
      .map(
        vehicleSaleIncomeTransaction
      )
      .filter(Boolean);

  /*
   * NORMAL EXPENSES
   *
   * Existing expense logic
   * remains untouched.
   */
  const expenses =
    (await getExpenses()).map(
      (expense) =>
        expenseTransaction(
          expense,
          session
        )
    );

  return [
    ...incomes,
    ...vehicleSaleIncome,
    ...expenses,
  ].filter(
    (transaction) =>
      transaction.dateKey &&
      transaction.amount >= 0
  );
};

/* =========================================================
   EXPORT HELPERS
========================================================= */

export const getLedgerDateKey =
  dateKey;

export const formatLedgerDate =
  (value) => {
    const date =
      parseDate(value);

    return date
      ? date.toLocaleDateString(
          "en-IN",
          {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }
        )
      : "—";
  };

export const formatLedgerMoney =
  (value) =>
    `₹${toNumber(
      value
    ).toLocaleString(
      "en-IN",
      {
        maximumFractionDigits: 2,
      }
    )}`;

export const roundLedgerMoney =
  roundMoney;

/* =========================================================
   SUM LEDGER
========================================================= */

export const sumLedger = (
  transactions
) =>
  transactions.reduce(
    (
      summary,
      transaction
    ) => {
      if (
        transaction.kind ===
        "income"
      ) {
        summary.income +=
          transaction.amount;
      } else {
        summary.expense +=
          transaction.amount;
      }

      summary.transactions +=
        1;

      return summary;
    },
    {
      income: 0,
      expense: 0,
      transactions: 0,
    }
  );

/* =========================================================
   LEDGER DATE RANGE
========================================================= */

export const getLedgerRange = (
  period,
  customStart = "",
  customEnd = "",
  now = new Date()
) => {
  const today =
    new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    );

  let start =
    new Date(today);

  let end =
    new Date(today);

  if (
    period ===
    "this-month"
  ) {
    start =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1
      );
  }

  if (
    period ===
    "last-month"
  ) {
    start =
      new Date(
        today.getFullYear(),
        today.getMonth() - 1,
        1
      );

    end =
      new Date(
        today.getFullYear(),
        today.getMonth(),
        0
      );
  }

  if (
    period ===
    "last-6-months"
  ) {
    start =
      new Date(
        today.getFullYear(),
        today.getMonth() - 5,
        1
      );
  }

  if (
    period ===
    "this-year"
  ) {
    start =
      new Date(
        today.getFullYear(),
        0,
        1
      );
  }

  if (
    period ===
    "custom"
  ) {
    start =
      parseDate(
        customStart
      ) || today;

    end =
      parseDate(
        customEnd
      ) || start;
  }

  end.setHours(
    23,
    59,
    59,
    999
  );

  return {
    start,
    end,
  };
};

/* =========================================================
   PREVIOUS LEDGER RANGE
========================================================= */

export const getPreviousLedgerRange = ({
  start,
  end,
}) => {
  const days =
    Math.max(
      1,
      Math.round(
        (
          end.getTime() -
          start.getTime()
        ) /
          86400000
      ) + 1
    );

  const previousEnd =
    new Date(start);

  previousEnd.setDate(
    previousEnd.getDate() -
      1
  );

  previousEnd.setHours(
    23,
    59,
    59,
    999
  );

  const previousStart =
    new Date(
      previousEnd
    );

  previousStart.setDate(
    previousStart.getDate() -
      days +
      1
  );

  previousStart.setHours(
    0,
    0,
    0,
    0
  );

  return {
    start:
      previousStart,
    end:
      previousEnd,
  };
};

/* =========================================================
   RANGE CHECK
========================================================= */

export const isInRange = (
  transaction,
  range
) => {
  const date =
    parseDate(
      transaction.date
    );

  return (
    date &&
    date >= range.start &&
    date <= range.end
  );
};