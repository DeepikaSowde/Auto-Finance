// src/routes/loans.js

import { Router } from "express";

import { getLoans } from "../services/customerRepository.js";
import { getCollectionsForLoan } from "../services/collectionRepository.js";

export const loansRouter = Router();

loansRouter.get("/", (req, res) => {
  res.json(getLoans());
});

loansRouter.get("/:loanId", (req, res) => {
  const loan = getLoans().find((item) => item.id === req.params.loanId);

  if (!loan) {
    return res.status(404).json({ error: "Loan not found." });
  }

  res.json(loan);
});

loansRouter.get("/:loanId/collections", (req, res) => {
  res.json(getCollectionsForLoan(req.params.loanId));
});
