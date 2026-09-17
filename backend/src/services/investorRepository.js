// src/services/investorRepository.js
//
// Investors and their transactions. Transactions are the ledger of record:
// every invested / allocated / available figure is summed from them rather
// than stored, so the numbers cannot drift out of sync.

import { db } from "../db/connection.js";

const roundMoney = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.round((number + Number.EPSILON) * 100) / 100
    : 0;
};

const pad = (number, length = 4) => String(number).padStart(length, "0");

const nowIso = () => new Date().toISOString();

const parseJson = (value, fallback) => {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

class InvestorError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "InvestorError";
    this.statusCode = statusCode;
  }
}

/* =========================================================
   MAPPING
========================================================= */

const mapTransaction = (row) => ({
  id: row.id,
  investorId: row.investor_id || "",
  type: row.type,
  amount: row.amount,
  date: row.date || "",
  reference: row.reference || "",
  investmentMode: row.investment_mode || "",
  notes: row.notes || "",
  loanId: row.loan_id || "",
  loanNumber: row.loan_number || "",
  createdAt: row.created_at,
});

const SELECT_TRANSACTIONS = `
  SELECT
    investor_transactions.*,
    investors.id AS investor_id,
    loans.id AS loan_id
  FROM investor_transactions
  LEFT JOIN investors ON investors.pk = investor_transactions.investor_pk
  LEFT JOIN loans ON loans.pk = investor_transactions.loan_pk
`;

/*
 * Per-investor totals, computed in SQL.
 */
const totalsForInvestor = (investorPk) => {
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'Investment' THEN amount END), 0) AS invested,
         COALESCE(SUM(CASE WHEN type = 'Loan Allocation' THEN amount END), 0) AS allocated
       FROM investor_transactions
       WHERE investor_pk = $pk`
    )
    .get({ $pk: investorPk });

  const totalInvested = roundMoney(row.invested);
  const allocatedAmount = roundMoney(row.allocated);

  return {
    totalInvested,
    allocatedAmount,
    availableBalance: roundMoney(Math.max(0, totalInvested - allocatedAmount)),
  };
};

const mapInvestor = (row) => {
  const totals = totalsForInvestor(row.pk);

  return {
    id: row.id,
    name: row.name,
    mobileNumber: row.mobile_number || "",
    email: row.email || "",
    address: row.address || "",
    city: row.city || "",
    state: row.state || "",
    pincode: row.pincode || "",
    investorType: row.investor_type,
    pan: row.pan || "",
    bankDetails: parseJson(row.bank_details_json, {}),
    investment: {
      ...parseJson(row.investment_json, {}),
      ...totals,
    },
    status: row.status,
    remarks: row.remarks || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/* =========================================================
   READS
========================================================= */

export const getInvestors = () =>
  db.prepare("SELECT * FROM investors ORDER BY pk ASC").all().map(mapInvestor);

export const getInvestorById = (investorId) => {
  const row = db.prepare("SELECT * FROM investors WHERE id = $id").get({ $id: investorId });

  return row ? mapInvestor(row) : null;
};

export const getInvestorTransactions = (investorId) => {
  if (!investorId) {
    return db.prepare(`${SELECT_TRANSACTIONS} ORDER BY investor_transactions.pk ASC`).all().map(mapTransaction);
  }

  return db
    .prepare(`${SELECT_TRANSACTIONS} WHERE investors.id = $id ORDER BY investor_transactions.pk ASC`)
    .all({ $id: investorId })
    .map(mapTransaction);
};

/*
 * Pool-wide funding position — what onboarding checks before
 * disbursing a loan.
 */
export const getFundingSummary = () => {
  const row = db
    .prepare(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'Investment' THEN amount END), 0) AS invested,
         COALESCE(SUM(CASE WHEN type = 'Loan Allocation' THEN amount END), 0) AS allocated
       FROM investor_transactions`
    )
    .get();

  const investorCount = db.prepare("SELECT COUNT(*) AS count FROM investors").get();

  const totalInvestment = roundMoney(row.invested);
  const distributedToLoans = roundMoney(row.allocated);

  return {
    totalInvestors: investorCount.count,
    totalInvestment,
    distributedToLoans,
    availableInvestmentBalance: roundMoney(Math.max(0, totalInvestment - distributedToLoans)),
  };
};

const nextTransactionId = () => {
  const row = db.prepare("SELECT COALESCE(MAX(pk), 0) AS max FROM investor_transactions").get();

  return `ITX-${pad(row.max + 1)}`;
};

export const getNextInvestorTransactionId = () => nextTransactionId();

/* =========================================================
   VALIDATION
========================================================= */

const validateInvestor = (input) => {
  const name = String(input?.name || "").trim();
  const amount = Number(input?.investment?.initialAmount);

  if (!name) {
    throw new InvestorError("Investor name is required.");
  }

  if (!String(input?.mobileNumber || "").trim()) {
    throw new InvestorError("Investor mobile number is required.");
  }

  if (!Number.isFinite(amount) || amount <= 0) {
    throw new InvestorError("Initial investment amount must be greater than zero.");
  }

  if (!input?.investment?.investmentDate) {
    throw new InvestorError("Investment date is required.");
  }

  if (input?.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]$/i.test(String(input.pan).trim())) {
    throw new InvestorError("Enter a valid PAN.");
  }

  if (
    input?.bankDetails?.ifsc &&
    !/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(String(input.bankDetails.ifsc).trim())
  ) {
    throw new InvestorError("Enter a valid IFSC code.");
  }

  if (
    input?.bankDetails?.accountNumber &&
    !/^\d{6,20}$/.test(String(input.bankDetails.accountNumber).trim())
  ) {
    throw new InvestorError("Enter a valid bank account number.");
  }
};

const insertTransaction = ({
  investorPk = null,
  type,
  amount,
  date,
  reference = "",
  investmentMode = "",
  notes = "",
  loanPk = null,
  loanNumber = "",
  now,
}) => {
  const result = db
    .prepare(
      `INSERT INTO investor_transactions
        (id, investor_pk, type, amount, date, reference, investment_mode, notes, loan_pk, loan_number, created_at)
       VALUES ('', $investorPk, $type, $amount, $date, $reference, $investmentMode, $notes, $loanPk, $loanNumber, $createdAt)`
    )
    .run({
      $investorPk: investorPk,
      $type: type,
      $amount: roundMoney(amount),
      $date: date || now,
      $reference: reference,
      $investmentMode: investmentMode,
      $notes: notes,
      $loanPk: loanPk,
      $loanNumber: loanNumber,
      $createdAt: now,
    });

  const id = `ITX-${pad(result.lastInsertRowid)}`;

  db.prepare("UPDATE investor_transactions SET id = $id WHERE pk = $pk").run({
    $id: id,
    $pk: result.lastInsertRowid,
  });

  return id;
};

/* =========================================================
   WRITES
========================================================= */

export const createInvestor = (input = {}) => {
  validateInvestor(input);

  const now = nowIso();
  const amount = roundMoney(input.investment.initialAmount);
  let investorId;

  db.exec("BEGIN");

  try {
    const result = db
      .prepare(
        `INSERT INTO investors
          (id, name, mobile_number, email, address, city, state, pincode, investor_type,
           pan, bank_details_json, investment_json, status, remarks, created_at, updated_at)
         VALUES
          ('', $name, $mobileNumber, $email, $address, $city, $state, $pincode, $investorType,
           $pan, $bankDetailsJson, $investmentJson, 'Active', $remarks, $createdAt, $updatedAt)`
      )
      .run({
        $name: String(input.name).trim(),
        $mobileNumber: String(input.mobileNumber || "").trim(),
        $email: String(input.email || "").trim(),
        $address: String(input.address || "").trim(),
        $city: String(input.city || "").trim(),
        $state: String(input.state || "").trim(),
        $pincode: String(input.pincode || "").trim(),
        $investorType: input.investorType || "Individual",
        $pan: String(input.pan || "").trim().toUpperCase(),
        $bankDetailsJson: JSON.stringify({
          accountName: String(input.bankDetails?.accountName || "").trim(),
          accountNumber: String(input.bankDetails?.accountNumber || "").trim(),
          ifsc: String(input.bankDetails?.ifsc || "").trim().toUpperCase(),
        }),
        $investmentJson: JSON.stringify({
          initialAmount: amount,
          investmentDate: input.investment.investmentDate,
          referenceNumber: String(input.investment.referenceNumber || "").trim(),
          investmentMode: input.investment.investmentMode || "Bank Transfer",
        }),
        $remarks: String(input.remarks || "").trim(),
        $createdAt: now,
        $updatedAt: now,
      });

    const investorPk = result.lastInsertRowid;
    investorId = `INV-${pad(investorPk)}`;

    db.prepare("UPDATE investors SET id = $id WHERE pk = $pk").run({
      $id: investorId,
      $pk: investorPk,
    });

    insertTransaction({
      investorPk,
      type: "Investment",
      amount,
      date: input.investment.investmentDate,
      reference: String(input.investment.referenceNumber || "").trim(),
      investmentMode: input.investment.investmentMode || "Bank Transfer",
      notes: String(input.remarks || "").trim() || "Initial investment",
      now,
    });

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getInvestorById(investorId);
};

export const addInvestorInvestment = ({
  investorId,
  amount,
  date,
  reference = "",
  investmentMode = "Bank Transfer",
  notes = "Additional investment",
} = {}) => {
  const value = Number(amount);

  const investorRow = db
    .prepare("SELECT * FROM investors WHERE id = $id")
    .get({ $id: investorId });

  if (!investorRow) {
    throw new InvestorError("Investor not found.", 404);
  }

  if (!Number.isFinite(value) || value <= 0) {
    throw new InvestorError("Investment amount must be greater than zero.");
  }

  if (!date) {
    throw new InvestorError("Investment date is required.");
  }

  const now = nowIso();

  const id = insertTransaction({
    investorPk: investorRow.pk,
    type: "Investment",
    amount: value,
    date,
    reference,
    investmentMode,
    notes,
    now,
  });

  return {
    transaction: getInvestorTransactions(investorId).find((item) => item.id === id),
    investor: getInvestorById(investorId),
  };
};

/*
 * Funds a loan from the pool. The balance check and the
 * one-allocation-per-loan rule are enforced here (and the latter is
 * also a unique index, so a race cannot slip a second one through).
 */
export const allocateInvestmentPoolToLoan = ({
  amount,
  loanId,
  loanNumber,
  date,
  notes = "Loan disbursement",
} = {}) => {
  const value = Number(amount);

  if (!Number.isFinite(value) || value <= 0) {
    throw new InvestorError("Loan amount must be greater than zero.");
  }

  if (!loanId && !loanNumber) {
    throw new InvestorError("Loan identity is required for funding allocation.");
  }

  const loanRow = db
    .prepare("SELECT * FROM loans WHERE id = $id OR loan_number = $number")
    .get({ $id: loanId || "", $number: loanNumber || "" });

  if (!loanRow) {
    throw new InvestorError("Loan not found.", 404);
  }

  const existing = db
    .prepare(
      "SELECT COUNT(*) AS count FROM investor_transactions WHERE type = 'Loan Allocation' AND loan_pk = $pk"
    )
    .get({ $pk: loanRow.pk });

  if (existing.count > 0) {
    throw new InvestorError("This loan already has an investor funding allocation.", 409);
  }

  const summary = getFundingSummary();

  if (summary.availableInvestmentBalance < value) {
    throw new InvestorError(
      `Insufficient investment balance. Available funding: ₹${summary.availableInvestmentBalance.toLocaleString(
        "en-IN"
      )}.`
    );
  }

  const now = nowIso();

  const id = insertTransaction({
    type: "Loan Allocation",
    amount: value,
    date: date || now,
    notes,
    loanPk: loanRow.pk,
    loanNumber: loanRow.loan_number,
    now,
  });

  return {
    transaction: getInvestorTransactions().find((item) => item.id === id),
    summary: getFundingSummary(),
  };
};

export const getInvestorFundedLoans = (investorId) =>
  getInvestorTransactions(investorId).filter(
    (transaction) => transaction.type === "Loan Allocation"
  );

export { InvestorError };
