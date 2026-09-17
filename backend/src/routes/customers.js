// src/routes/customers.js

import { Router } from "express";

import {
  addLoanForCustomer,
  createCustomer,
  deleteCustomer,
  getCustomerById,
  getCustomers,
  updateCustomer,
} from "../services/customerRepository.js";
import { sanitizeCustomerPayload } from "../services/sanitize.js";
import { requireRole } from "../middleware/requireAuth.js";

export const customersRouter = Router();

customersRouter.get("/", (req, res) => {
  res.json(getCustomers());
});

customersRouter.get("/:customerId", (req, res) => {
  const customer = getCustomerById(req.params.customerId);

  if (!customer) {
    return res.status(404).json({ error: "Customer not found." });
  }

  res.json(customer);
});

customersRouter.post("/", requireRole("admin"), (req, res, next) => {
  try {
    res.status(201).json(createCustomer(sanitizeCustomerPayload(req.body)));
  } catch (error) {
    next(error);
  }
});

customersRouter.put("/:customerId", requireRole("admin"), (req, res, next) => {
  try {
    const customer = updateCustomer(req.params.customerId, sanitizeCustomerPayload(req.body));

    if (!customer) {
      return res.status(404).json({ error: "Customer not found." });
    }

    res.json(customer);
  } catch (error) {
    next(error);
  }
});

customersRouter.delete("/:customerId", requireRole("admin"), (req, res) => {
  if (!deleteCustomer(req.params.customerId)) {
    return res.status(404).json({ error: "Customer not found." });
  }

  res.status(204).send();
});

// Additional loan for an existing customer (the re-loan path).
customersRouter.post("/:customerId/loans", requireRole("admin"), (req, res, next) => {
  try {
    const customer = addLoanForCustomer(req.params.customerId, req.body || {});

    if (!customer) {
      return res.status(404).json({ error: "Customer not found." });
    }

    res.status(201).json(customer);
  } catch (error) {
    next(error);
  }
});
