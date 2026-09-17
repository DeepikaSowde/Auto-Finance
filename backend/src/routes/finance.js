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
  getEligibilityChecks,
  getReLoanRules,
  saveEligibilityCheck,
  saveReLoanRules,
} from "../services/reloanRepository.js";
import { requireRole } from "../middleware/requireAuth.js";

/* =========================================================
   INVESTORS
========================================================= */

export const investorsRouter = Router();

investorsRouter.get("/", (req, res) => {
  res.json(getInvestors());
});

investorsRouter.get("/summary", (req, res) => {
  res.json(getFundingSummary());
});

investorsRouter.get("/transactions", (req, res) => {
  res.json(getInvestorTransactions(req.query.investorId));
});

investorsRouter.get("/:investorId", (req, res) => {
  const investor = getInvestorById(req.params.investorId);

  if (!investor) {
    return res.status(404).json({ error: "Investor not found." });
  }

  res.json(investor);
});

investorsRouter.post("/", requireRole("admin"), (req, res, next) => {
  try {
    res.status(201).json(createInvestor(req.body || {}));
  } catch (error) {
    next(error);
  }
});

investorsRouter.post("/:investorId/investments", requireRole("admin"), (req, res, next) => {
  try {
    res.status(201).json(
      addInvestorInvestment({ ...(req.body || {}), investorId: req.params.investorId })
    );
  } catch (error) {
    next(error);
  }
});

// Funding a loan draws on the whole pool, so it is not nested under an investor.
investorsRouter.post("/allocations", requireRole("admin"), (req, res, next) => {
  try {
    res.status(201).json(allocateInvestmentPoolToLoan(req.body || {}));
  } catch (error) {
    next(error);
  }
});

/* =========================================================
   EXPENSES
========================================================= */

export const expensesRouter = Router();

expensesRouter.get("/", (req, res) => {
  res.json(getExpenses());
});

expensesRouter.get("/:expenseId", (req, res) => {
  const expense = getExpenseById(req.params.expenseId);

  if (!expense) {
    return res.status(404).json({ error: "Expense not found." });
  }

  res.json(expense);
});

expensesRouter.post("/", requireRole("admin"), (req, res, next) => {
  try {
    res.status(201).json(addExpense(req.body || {}));
  } catch (error) {
    next(error);
  }
});

expensesRouter.put("/:expenseId", requireRole("admin"), (req, res, next) => {
  try {
    const expense = updateExpense(req.params.expenseId, req.body || {});

    if (!expense) {
      return res.status(404).json({ error: "Expense not found." });
    }

    res.json(expense);
  } catch (error) {
    next(error);
  }
});

expensesRouter.delete("/:expenseId", requireRole("admin"), (req, res) => {
  if (!deleteExpense(req.params.expenseId)) {
    return res.status(404).json({ error: "Expense not found." });
  }

  res.status(204).send();
});

/* =========================================================
   RE-LOAN
========================================================= */

export const reloanRouter = Router();

reloanRouter.get("/rules", (req, res) => {
  res.json(getReLoanRules());
});

reloanRouter.put("/rules", requireRole("admin"), (req, res) => {
  res.json(saveReLoanRules(req.body || {}));
});

reloanRouter.get("/eligibility", (req, res) => {
  res.json(getEligibilityChecks(req.query.loanId));
});

reloanRouter.post("/eligibility", (req, res, next) => {
  try {
    res.status(201).json(saveEligibilityCheck(req.body || {}));
  } catch (error) {
    next(error);
  }
});
