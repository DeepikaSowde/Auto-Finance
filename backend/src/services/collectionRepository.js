// src/services/collectionRepository.js
//
// Collections are payment submissions that go through
// Pending -> Approved | Rejected | Reversed. Approval is the only thing
// that moves money: it runs the allocation waterfall and posts the result
// against the loan's installments inside a single transaction.

import { db } from "../db/connection.js";
import {
  buildLoan,
  getCustomerRow,
  getInstallmentRows,
} from "./customerRepository.js";
import {
  applyAllocation,
  buildAllocation,
  deriveLoanStatus,
  derivePaymentType,
  describeInstallment,
  roundMoney,
  summariseOutstanding,
} from "./repaymentEngine.js";

export const COLLECTION_STATUS = {
  PENDING: "Pending",
  APPROVED: "Approved",
  REJECTED: "Rejected",
  REVERSED: "Reversed",
};

const nowIso = () => new Date().toISOString();

const pad = (number, length = 4) => String(number).padStart(length, "0");

class CollectionError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = "CollectionError";
    this.statusCode = statusCode;
  }
}

const mapCollection = (row) => ({
  id: row.id,
  customerId: row.customer_id || "",
  customerName: row.customer_name || "",
  mobileNumber: row.mobile_number || "",
  loanId: row.loan_id || "",
  loanNumber: row.loan_number || "",

  status: row.status,

  amount: row.amount,
  dueAmount: row.due_amount,
  penaltyAmount: row.penalty_amount,
  totalPayable: row.total_payable,

  paymentType: row.payment_type || "",
  payMode: row.pay_mode || "",
  paymentMode: row.pay_mode || "",
  receiptNumber: row.receipt_number || "",
  dueDate: row.due_date || "",
  installment: row.installment_number,

  staffName: row.staff_name || "",
  location: row.location || "",
  remarks: row.remarks || "",

  overdueDays: row.overdue_days,
  graceDays: row.grace_days,

  amountTowardDue: row.amount_toward_due,
  amountTowardPenalty: row.amount_toward_penalty,
  amountTowardPrincipal: row.amount_toward_principal,
  amountTowardAdvance: row.amount_toward_advance,
  amountExcess: row.amount_excess,

  allocation: row.allocation_json ? JSON.parse(row.allocation_json) : null,
  repaymentProcessed: Boolean(row.repayment_processed),
  repaymentProcessedAt: row.repayment_processed_at || "",
  repaymentProcessingStatus: row.repayment_processing_status,
  repaymentError: row.repayment_error || "",

  submittedAt: row.submitted_at,
  collectedDate: row.collected_date || "",
  approvedAt: row.approved_at || "",
  approvedBy: row.approved_by || "",
  rejectedAt: row.rejected_at || "",
  rejectedBy: row.rejected_by || "",
  rejectionRemarks: row.rejection_remarks || "",
  reversedAt: row.reversed_at || "",
  reversedBy: row.reversed_by || "",
  reversalReason: row.reversal_reason || "",

  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

/*
 * Collections carry denormalised customer/loan identifiers because the UI
 * lists them standalone; the join keeps them accurate.
 */
const SELECT_COLLECTIONS = `
  SELECT
    collections.*,
    customers.id AS customer_id,
    customers.personal_json AS personal_json,
    loans.id AS loan_id,
    loans.loan_number AS loan_number
  FROM collections
  LEFT JOIN customers ON customers.pk = collections.customer_pk
  LEFT JOIN loans ON loans.pk = collections.loan_pk
`;

const hydrate = (row) => {
  if (!row) return null;

  const personal = row.personal_json ? JSON.parse(row.personal_json) : {};

  return mapCollection({
    ...row,
    customer_name: personal.name || "",
    mobile_number: personal.mobileNumber || "",
  });
};

export const getCollections = () =>
  db.prepare(`${SELECT_COLLECTIONS} ORDER BY collections.pk DESC`).all().map(hydrate);

export const getCollectionById = (collectionId) =>
  hydrate(
    db.prepare(`${SELECT_COLLECTIONS} WHERE collections.id = $id`).get({ $id: collectionId })
  );

const getCollectionRow = (collectionId) =>
  db.prepare("SELECT * FROM collections WHERE id = $id").get({ $id: collectionId });

const getLoanRowById = (loanId) =>
  db.prepare("SELECT * FROM loans WHERE id = $id").get({ $id: loanId });

export const createCollection = (payload = {}, submittedBy) => {
  const now = nowIso();

  const customerRow = payload.customerId ? getCustomerRow(payload.customerId) : null;
  const loanRow = payload.loanId ? getLoanRowById(payload.loanId) : null;

  if (!loanRow) {
    throw new CollectionError("A valid loanId is required.", 404);
  }

  const amount = roundMoney(payload.amount || 0);

  if (amount <= 0) {
    throw new CollectionError("Collection amount must be greater than zero.");
  }

  const result = db
    .prepare(
      `INSERT INTO collections
        (id, customer_pk, loan_pk, status, amount, due_amount, penalty_amount, total_payable,
         payment_type, pay_mode, receipt_number, due_date, installment_number,
         staff_name, location, remarks, overdue_days, grace_days,
         submitted_at, collected_date, created_at, updated_at)
       VALUES
        ('', $customerPk, $loanPk, 'Pending', $amount, $dueAmount, $penaltyAmount, $totalPayable,
         $paymentType, $payMode, $receiptNumber, $dueDate, $installmentNumber,
         $staffName, $location, $remarks, $overdueDays, $graceDays,
         $submittedAt, $collectedDate, $createdAt, $updatedAt)`
    )
    .run({
      $customerPk: customerRow?.pk ?? loanRow.customer_pk,
      $loanPk: loanRow.pk,
      $amount: amount,
      $dueAmount: roundMoney(payload.dueAmount || 0),
      $penaltyAmount: roundMoney(payload.penaltyAmount || 0),
      $totalPayable: roundMoney(payload.totalPayable || payload.dueAmount || 0),
      $paymentType: payload.paymentType || "",
      $payMode: payload.payMode || payload.paymentMode || "",
      $receiptNumber: payload.receiptNumber || payload.receiptNo || "",
      $dueDate: payload.dueDate || "",
      $installmentNumber: payload.installment ?? payload.installmentNumber ?? null,
      $staffName: payload.staffName || submittedBy?.name || "",
      $location: payload.location || "",
      $remarks: payload.remarks || "",
      $overdueDays: Number(payload.overdueDays) || 0,
      $graceDays: Number(payload.graceDays) || 0,
      $submittedAt: payload.submittedAt || now,
      $collectedDate: payload.collectedDate || now,
      $createdAt: now,
      $updatedAt: now,
    });

  const collectionId = `COL-${pad(result.lastInsertRowid)}`;

  db.prepare("UPDATE collections SET id = $id WHERE pk = $pk").run({
    $id: collectionId,
    $pk: result.lastInsertRowid,
  });

  return getCollectionById(collectionId);
};

const CLOSED_LOAN_STATUSES = new Set(["closed", "paid", "settled", "completed", "foreclosed"]);

/*
 * The one path that actually moves money.
 */
export const approveCollection = (collectionId, approvedBy) => {
  const collectionRow = getCollectionRow(collectionId);

  if (!collectionRow) {
    throw new CollectionError("Collection not found.", 404);
  }

  if (collectionRow.status !== COLLECTION_STATUS.PENDING) {
    throw new CollectionError(
      `Only pending collections can be approved (this one is ${collectionRow.status}).`,
      409
    );
  }

  // Idempotency guard: a collection may never post twice.
  const alreadyPosted = db
    .prepare("SELECT COUNT(*) AS count FROM payment_allocations WHERE collection_pk = $pk")
    .get({ $pk: collectionRow.pk });

  if (alreadyPosted.count > 0) {
    throw new CollectionError("This collection has already been processed.", 409);
  }

  const loanRow = db
    .prepare("SELECT * FROM loans WHERE pk = $pk")
    .get({ $pk: collectionRow.loan_pk });

  if (!loanRow) {
    throw new CollectionError("The loan for this collection no longer exists.", 404);
  }

  if (CLOSED_LOAN_STATUSES.has(String(loanRow.status || "").toLowerCase())) {
    throw new CollectionError(`Loan is ${loanRow.status} — it cannot take further payments.`, 409);
  }

  const referenceDate = new Date();
  const now = nowIso();

  const installments = getInstallmentRows(loanRow.pk).map((row) =>
    describeInstallment(row, referenceDate)
  );

  const allocation = buildAllocation({
    installments,
    paymentAmount: collectionRow.amount,
    penaltyAmount: collectionRow.penalty_amount,
    referenceDate,
  });

  const updated = applyAllocation({ installments, items: allocation.items, referenceDate });
  const outstanding = summariseOutstanding(updated);
  const loanStatus = deriveLoanStatus(updated, referenceDate);
  const paymentType = derivePaymentType(allocation, installments, referenceDate);

  db.exec("BEGIN");

  try {
    const updateInstallment = db.prepare(
      `UPDATE installments SET
        paid_principal = $paidPrincipal,
        paid_interest = $paidInterest,
        penalty_paid_amount = $penaltyPaidAmount,
        status = $status
       WHERE loan_pk = $loanPk AND installment_number = $installmentNumber`
    );

    for (const installment of updated) {
      updateInstallment.run({
        $loanPk: loanRow.pk,
        $installmentNumber: installment.installmentNumber,
        $paidPrincipal: installment.paidPrincipal,
        $paidInterest: installment.paidInterest,
        $penaltyPaidAmount: installment.penaltyPaidAmount,
        $status: installment.status,
      });
    }

    const insertAllocation = db.prepare(
      `INSERT INTO payment_allocations
        (id, loan_pk, collection_pk, installment_number, due_date, amount, type,
         is_penalty, is_interest, is_principal, created_at)
       VALUES
        ('', $loanPk, $collectionPk, $installmentNumber, $dueDate, $amount, $type,
         $isPenalty, $isInterest, $isPrincipal, $createdAt)`
    );

    allocation.items.forEach((item, index) => {
      const result = insertAllocation.run({
        $loanPk: loanRow.pk,
        $collectionPk: collectionRow.pk,
        $installmentNumber: item.installmentNumber,
        $dueDate: item.dueDate || "",
        $amount: item.amount,
        $type: item.type,
        $isPenalty: item.isPenalty ? 1 : 0,
        $isInterest: item.isInterest ? 1 : 0,
        $isPrincipal: item.isPrincipal ? 1 : 0,
        $createdAt: now,
      });

      db.prepare("UPDATE payment_allocations SET id = $id WHERE pk = $pk").run({
        $id: `PAY-${collectionRow.id}-${index + 1}`,
        $pk: result.lastInsertRowid,
      });
    });

    db.prepare(
      `UPDATE loans SET
        status = $status,
        repayment_meta_json = $repaymentMetaJson,
        updated_at = $updatedAt
       WHERE pk = $pk`
    ).run({
      $pk: loanRow.pk,
      $status: loanStatus,
      $repaymentMetaJson: JSON.stringify({
        repaymentMeta: {
          lastPaymentAt: now,
          lastPaymentAmount: collectionRow.amount,
          lastPaymentType: paymentType,
          lastPenaltyPaid: allocation.penalty,
          lastInterestPaid: allocation.interest,
          lastPrincipalPaid: allocation.principal,
          outstanding: outstanding.outstanding,
          principalOutstanding: outstanding.principalOutstanding,
          interestOutstanding: outstanding.interestOutstanding,
        },
      }),
      $updatedAt: now,
    });

    db.prepare(
      `UPDATE collections SET
        status = 'Approved',
        approved_at = $approvedAt,
        approved_by = $approvedBy,
        payment_type = $paymentType,
        amount_toward_due = $amountTowardDue,
        amount_toward_penalty = $amountTowardPenalty,
        amount_toward_principal = $amountTowardPrincipal,
        amount_toward_advance = $amountTowardAdvance,
        amount_excess = $amountExcess,
        allocation_json = $allocationJson,
        repayment_processed = 1,
        repayment_processed_at = $processedAt,
        repayment_processing_status = 'Processed',
        repayment_error = NULL,
        updated_at = $updatedAt
       WHERE pk = $pk`
    ).run({
      $pk: collectionRow.pk,
      $approvedAt: now,
      $approvedBy: approvedBy?.username || "",
      $paymentType: paymentType,
      $amountTowardDue: roundMoney(allocation.interest + allocation.principal - allocation.advance),
      $amountTowardPenalty: allocation.penalty,
      $amountTowardPrincipal: allocation.principal,
      $amountTowardAdvance: allocation.advance,
      $amountExcess: allocation.excess,
      $allocationJson: JSON.stringify(allocation),
      $processedAt: now,
      $updatedAt: now,
    });

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return {
    collection: getCollectionById(collectionId),
    loan: buildLoan(db.prepare("SELECT * FROM loans WHERE pk = $pk").get({ $pk: loanRow.pk })),
    allocation,
  };
};

export const rejectCollection = (collectionId, { remarks = "", rejectedBy } = {}) => {
  const row = getCollectionRow(collectionId);

  if (!row) {
    throw new CollectionError("Collection not found.", 404);
  }

  if (row.status !== COLLECTION_STATUS.PENDING) {
    throw new CollectionError("Only pending collections can be rejected.", 409);
  }

  const now = nowIso();

  db.prepare(
    `UPDATE collections SET
      status = 'Rejected',
      rejected_at = $rejectedAt,
      rejected_by = $rejectedBy,
      rejection_remarks = $remarks,
      repayment_processing_status = 'Rejected',
      updated_at = $updatedAt
     WHERE pk = $pk`
  ).run({
    $pk: row.pk,
    $rejectedAt: now,
    $rejectedBy: rejectedBy?.username || "",
    $remarks: remarks,
    $updatedAt: now,
  });

  return getCollectionById(collectionId);
};

/*
 * Reversing an approved collection unwinds its postings: the allocation
 * rows are removed and the affected installments are recomputed from what
 * remains, so the loan returns to its pre-approval state.
 */
export const reverseCollection = (collectionId, { reason = "", reversedBy } = {}) => {
  const row = getCollectionRow(collectionId);

  if (!row) {
    throw new CollectionError("Collection not found.", 404);
  }

  if (row.status !== COLLECTION_STATUS.APPROVED) {
    throw new CollectionError("Only approved collections can be reversed.", 409);
  }

  const now = nowIso();
  const referenceDate = new Date();

  db.exec("BEGIN");

  try {
    const postings = db
      .prepare("SELECT * FROM payment_allocations WHERE collection_pk = $pk")
      .all({ $pk: row.pk });

    const updateInstallment = db.prepare(
      `UPDATE installments SET
        paid_principal = MAX(paid_principal - $principal, 0),
        paid_interest = MAX(paid_interest - $interest, 0),
        penalty_paid_amount = MAX(penalty_paid_amount - $penalty, 0)
       WHERE loan_pk = $loanPk AND installment_number = $installmentNumber`
    );

    for (const posting of postings) {
      if (posting.installment_number == null) {
        continue;
      }

      updateInstallment.run({
        $loanPk: row.loan_pk,
        $installmentNumber: posting.installment_number,
        $principal: posting.is_principal ? posting.amount : 0,
        $interest: posting.is_interest ? posting.amount : 0,
        $penalty: posting.is_penalty ? posting.amount : 0,
      });
    }

    db.prepare("DELETE FROM payment_allocations WHERE collection_pk = $pk").run({ $pk: row.pk });

    // Recompute installment statuses and the loan status from what is left.
    const refreshed = getInstallmentRows(row.loan_pk).map((installment) =>
      describeInstallment(installment, referenceDate)
    );

    const updateStatus = db.prepare(
      "UPDATE installments SET status = $status WHERE loan_pk = $loanPk AND installment_number = $installmentNumber"
    );

    for (const installment of refreshed) {
      updateStatus.run({
        $loanPk: row.loan_pk,
        $installmentNumber: installment.installmentNumber,
        $status: installment.status,
      });
    }

    db.prepare("UPDATE loans SET status = $status, updated_at = $updatedAt WHERE pk = $pk").run({
      $pk: row.loan_pk,
      $status: deriveLoanStatus(refreshed, referenceDate),
      $updatedAt: now,
    });

    db.prepare(
      `UPDATE collections SET
        status = 'Reversed',
        reversed_at = $reversedAt,
        reversed_by = $reversedBy,
        reversal_reason = $reason,
        repayment_processed = 0,
        repayment_processing_status = 'Pending',
        updated_at = $updatedAt
       WHERE pk = $pk`
    ).run({
      $pk: row.pk,
      $reversedAt: now,
      $reversedBy: reversedBy?.username || "",
      $reason: reason,
      $updatedAt: now,
    });

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getCollectionById(collectionId);
};

export const getCollectionsForLoan = (loanId) => {
  const loanRow = getLoanRowById(loanId);

  if (!loanRow) {
    return [];
  }

  return db
    .prepare(`${SELECT_COLLECTIONS} WHERE collections.loan_pk = $pk ORDER BY collections.pk DESC`)
    .all({ $pk: loanRow.pk })
    .map(hydrate);
};

export { CollectionError };
