// src/services/expenseRepository.js
//
// Business overhead, unrelated to any customer or loan. The UI treats an
// expense as a free-form record, so anything beyond the fields that get
// filtered and summed travels in details_json.

import { db } from "../db/connection.js";

const roundMoney = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? Math.round((number + Number.EPSILON) * 100) / 100
    : 0;
};

const pad = (number, length = 4) => String(number).padStart(length, "0");

const nowIso = () => new Date().toISOString();

const KNOWN_FIELDS = new Set([
  "id",
  "amount",
  "status",
  "category",
  "subCategory",
  "expenseDate",
  "date",
  "paymentMode",
  "paidBy",
  "vendor",
  "reference",
  "description",
  "remarks",
  "createdBy",
  "recordedBy",
  "createdAt",
  "updatedAt",
]);

const extraFields = (expense) =>
  Object.fromEntries(
    Object.entries(expense).filter(([key]) => !KNOWN_FIELDS.has(key))
  );

const mapExpense = (row) => ({
  ...JSON.parse(row.details_json || "{}"),
  id: row.id,
  amount: row.amount,
  status: row.status,
  category: row.category || "",
  subCategory: row.sub_category || "",
  expenseDate: row.expense_date || "",
  date: row.expense_date || "",
  paymentMode: row.payment_mode || "",
  paidBy: row.paid_by || "",
  vendor: row.vendor || "",
  reference: row.reference || "",
  description: row.description || "",
  remarks: row.remarks || "",
  createdBy: row.created_by || "",
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const toParams = (expense, now) => ({
  $amount: roundMoney(expense.amount),
  $status: expense.status || "Pending",
  $category: expense.category || "",
  $subCategory: expense.subCategory || "",
  $expenseDate: expense.expenseDate || expense.date || now,
  $paymentMode: expense.paymentMode || "",
  $paidBy: expense.paidBy || "",
  $vendor: expense.vendor || "",
  $reference: expense.reference || "",
  $description: expense.description || "",
  $remarks: expense.remarks || "",
  $detailsJson: JSON.stringify(extraFields(expense)),
  $createdBy: expense.createdBy || expense.recordedBy || "",
});

export const getExpenses = () =>
  db.prepare("SELECT * FROM expenses ORDER BY pk DESC").all().map(mapExpense);

export const getExpenseById = (expenseId) => {
  const row = db.prepare("SELECT * FROM expenses WHERE id = $id").get({ $id: expenseId });

  return row ? mapExpense(row) : null;
};

export const addExpense = (expense = {}) => {
  const now = nowIso();

  const result = db
    .prepare(
      `INSERT INTO expenses
        (id, amount, status, category, sub_category, expense_date, payment_mode, paid_by,
         vendor, reference, description, remarks, details_json, created_by, created_at, updated_at)
       VALUES
        ('', $amount, $status, $category, $subCategory, $expenseDate, $paymentMode, $paidBy,
         $vendor, $reference, $description, $remarks, $detailsJson, $createdBy, $createdAt, $updatedAt)`
    )
    .run({ ...toParams(expense, now), $createdAt: expense.createdAt || now, $updatedAt: now });

  const id = `EXP-${pad(result.lastInsertRowid)}`;

  db.prepare("UPDATE expenses SET id = $id WHERE pk = $pk").run({
    $id: id,
    $pk: result.lastInsertRowid,
  });

  return getExpenseById(id);
};

export const updateExpense = (expenseId, updates = {}) => {
  const existing = getExpenseById(expenseId);

  if (!existing) {
    return null;
  }

  const now = nowIso();
  const merged = { ...existing, ...updates };

  db.prepare(
    `UPDATE expenses SET
      amount = $amount,
      status = $status,
      category = $category,
      sub_category = $subCategory,
      expense_date = $expenseDate,
      payment_mode = $paymentMode,
      paid_by = $paidBy,
      vendor = $vendor,
      reference = $reference,
      description = $description,
      remarks = $remarks,
      details_json = $detailsJson,
      created_by = $createdBy,
      updated_at = $updatedAt
     WHERE id = $id`
  ).run({ ...toParams(merged, now), $id: expenseId, $updatedAt: now });

  return getExpenseById(expenseId);
};

export const deleteExpense = (expenseId) => {
  const result = db.prepare("DELETE FROM expenses WHERE id = $id").run({ $id: expenseId });

  return result.changes > 0;
};
