// src/services/reloanRepository.js
//
// Re-loan configuration and the eligibility audit trail. The eligibility
// decision itself is computed in the frontend from loan/customer data it
// already holds; what lives here is the rule set it decides against and a
// write-once record of each check.

import { db } from "../db/connection.js";

const nowIso = () => new Date().toISOString();

const pad = (number, length = 4) => String(number).padStart(length, "0");

export const DEFAULT_RELOAN_RULES = {
  minimumPaidInstallmentPercentage: 75,
  maximumOverdueAmount: 5000,
  maximumOverdueDays: 30,
  allowActiveLoan: true,
  allowClosedLoan: true,
  allowForeclosedLoan: false,
  allowSeizedVehicle: false,
  allowSoldVehicle: false,
  requireCustomerVerification: true,
  requireDocuments: true,
};

export const getReLoanRules = () => {
  const row = db.prepare("SELECT * FROM reloan_rules WHERE pk = 1").get();

  if (!row) {
    return { ...DEFAULT_RELOAN_RULES };
  }

  try {
    return { ...DEFAULT_RELOAN_RULES, ...JSON.parse(row.rules_json) };
  } catch {
    return { ...DEFAULT_RELOAN_RULES };
  }
};

export const saveReLoanRules = (rules = {}) => {
  const merged = { ...getReLoanRules(), ...rules };

  db.prepare(
    `INSERT INTO reloan_rules (pk, rules_json, updated_at)
     VALUES (1, $rulesJson, $updatedAt)
     ON CONFLICT (pk) DO UPDATE SET rules_json = $rulesJson, updated_at = $updatedAt`
  ).run({ $rulesJson: JSON.stringify(merged), $updatedAt: nowIso() });

  return merged;
};

const mapCheck = (row) => ({
  ...JSON.parse(row.result_json || "{}"),
  id: row.id,
  customerId: row.customer_id || "",
  loanId: row.loan_id || "",
  eligible: Boolean(row.eligible),
  status: row.status,
  checkedAt: row.checked_at,
});

const SELECT_CHECKS = `
  SELECT
    reloan_eligibility_checks.*,
    customers.id AS customer_id,
    loans.id AS loan_id
  FROM reloan_eligibility_checks
  LEFT JOIN customers ON customers.pk = reloan_eligibility_checks.customer_pk
  LEFT JOIN loans ON loans.pk = reloan_eligibility_checks.loan_pk
`;

export const getEligibilityChecks = (loanId) => {
  if (!loanId) {
    return db
      .prepare(`${SELECT_CHECKS} ORDER BY reloan_eligibility_checks.pk DESC`)
      .all()
      .map(mapCheck);
  }

  return db
    .prepare(`${SELECT_CHECKS} WHERE loans.id = $loanId ORDER BY reloan_eligibility_checks.pk DESC`)
    .all({ $loanId: loanId })
    .map(mapCheck);
};

export const saveEligibilityCheck = (result = {}) => {
  const now = nowIso();

  const customerRow = result.customerId
    ? db.prepare("SELECT pk FROM customers WHERE id = $id").get({ $id: result.customerId })
    : null;

  const loanRow = result.loanId
    ? db.prepare("SELECT pk FROM loans WHERE id = $id").get({ $id: result.loanId })
    : null;

  const insert = db
    .prepare(
      `INSERT INTO reloan_eligibility_checks
        (id, customer_pk, loan_pk, eligible, status, result_json, checked_at)
       VALUES ('', $customerPk, $loanPk, $eligible, $status, $resultJson, $checkedAt)`
    )
    .run({
      $customerPk: customerRow?.pk ?? null,
      $loanPk: loanRow?.pk ?? null,
      $eligible: result.eligible ? 1 : 0,
      $status: result.status || "NOT_ELIGIBLE",
      $resultJson: JSON.stringify(result),
      $checkedAt: result.checkedAt || now,
    });

  const id = `RLC-${pad(insert.lastInsertRowid)}`;

  db.prepare("UPDATE reloan_eligibility_checks SET id = $id WHERE pk = $pk").run({
    $id: id,
    $pk: insert.lastInsertRowid,
  });

  return getEligibilityChecks().find((check) => check.id === id) || null;
};
