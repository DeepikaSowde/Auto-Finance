// src/routes/finance.js
//
// Investors, expenses and re-loan configuration.

import { Router } from "express";

import {
  addInvestorInvestment,
  allocateInvestmentPoolToLoan,
  createInvestor,
  getFundingSummary,
  getInvestorById,
  getInvestorTransactions,
  getInvestors,
} from "../services/investorRepository.js";
import {
  addExpense,
  deleteExpense,
  getExpenseById,
  getExpenses,
  updateExpense,
} from "../services/expenseRepository.js";
import {
  addIncome,
  deleteIncome,
  getIncomeById,
  getIncomes,
  updateIncome,
} from "../services/incomeRepository.js";
import {
  addCategory,
  deleteCategory,
  getCategories,
} from "../services/categoryRepository.js";
import {
  getEligibilityChecks,
  getReLoanRules,
  saveEligibilityCheck,
  saveReLoanRules,
} from "../services/reloanRepository.js";
import { requireRole } from "../middleware/requireAuth.js";
import { asyncHandler } from "../util/asyncHandler.js";

/* =========================================================
   INVESTORS
========================================================= */

export const investorsRouter = Router();

investorsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await getInvestors());
  })
);

investorsRouter.get(
  "/summary",
  asyncHandler(async (req, res) => {
    res.json(await getFundingSummary());
  })
);

investorsRouter.get(
  "/transactions",
  asyncHandler(async (req, res) => {
    res.json(await getInvestorTransactions(req.query.investorId));
  })
);

investorsRouter.get(
  "/:investorId",
  asyncHandler(async (req, res) => {
    const investor = await getInvestorById(req.params.investorId);

    if (!investor) {
      return res.status(404).json({ error: "Investor not found." });
    }

    res.json(investor);
  })
);

investorsRouter.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createInvestor(req.body || {}));
  })
);

investorsRouter.post(
  "/:investorId/investments",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res
      .status(201)
      .json(await addInvestorInvestment({ ...(req.body || {}), investorId: req.params.investorId }));
  })
);

// Funding a loan draws on the whole pool, so it is not nested under an investor.
investorsRouter.post(
  "/allocations",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.status(201).json(await allocateInvestmentPoolToLoan(req.body || {}));
  })
);

/* =========================================================
   EXPENSES
========================================================= */

export const expensesRouter = Router();

expensesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await getExpenses());
  })
);

expensesRouter.get(
  "/:expenseId",
  asyncHandler(async (req, res) => {
    const expense = await getExpenseById(req.params.expenseId);

    if (!expense) {
      return res.status(404).json({ error: "Expense not found." });
    }

    res.json(expense);
  })
);

expensesRouter.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.status(201).json(await addExpense(req.body || {}));
  })
);

expensesRouter.put(
  "/:expenseId",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const expense = await updateExpense(req.params.expenseId, req.body || {});

    if (!expense) {
      return res.status(404).json({ error: "Expense not found." });
    }

    res.json(expense);
  })
);

expensesRouter.delete(
  "/:expenseId",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    if (!(await deleteExpense(req.params.expenseId))) {
      return res.status(404).json({ error: "Expense not found." });
    }

    res.status(204).send();
  })
);

/* =========================================================
   INCOME
========================================================= */

export const incomesRouter = Router();

incomesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await getIncomes());
  })
);

incomesRouter.get(
  "/:incomeId",
  asyncHandler(async (req, res) => {
    const income = await getIncomeById(req.params.incomeId);

    if (!income) {
      return res.status(404).json({ error: "Income not found." });
    }

    res.json(income);
  })
);

incomesRouter.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.status(201).json(await addIncome(req.body || {}));
  })
);

incomesRouter.put(
  "/:incomeId",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const income = await updateIncome(req.params.incomeId, req.body || {});

    if (!income) {
      return res.status(404).json({ error: "Income not found." });
    }

    res.json(income);
  })
);

incomesRouter.delete(
  "/:incomeId",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    if (!(await deleteIncome(req.params.incomeId))) {
      return res.status(404).json({ error: "Income not found." });
    }

    res.status(204).send();
  })
);

/* =========================================================
   CATEGORIES
========================================================= */

export const categoriesRouter = Router();

categoriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await getCategories(req.query.type));
  })
);

categoriesRouter.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const { type, name } = req.body || {};

    res.status(201).json(await addCategory(type, name));
  })
);

categoriesRouter.delete(
  "/:categoryId",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    if (!(await deleteCategory(req.params.categoryId))) {
      return res.status(404).json({ error: "Category not found." });
    }

    res.status(204).send();
  })
);

/* =========================================================
   RE-LOAN
========================================================= */

export const reloanRouter = Router();

reloanRouter.get(
  "/rules",
  asyncHandler(async (req, res) => {
    res.json(await getReLoanRules());
  })
);

reloanRouter.put(
  "/rules",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.json(await saveReLoanRules(req.body || {}));
  })
);

reloanRouter.get(
  "/eligibility",
  asyncHandler(async (req, res) => {
    res.json(await getEligibilityChecks(req.query.loanId));
  })
);

reloanRouter.post(
  "/eligibility",
  asyncHandler(async (req, res) => {
    res.status(201).json(await saveEligibilityCheck(req.body || {}));
  })
);
