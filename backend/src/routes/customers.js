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
import { asyncHandler } from "../util/asyncHandler.js";

export const customersRouter = Router();

customersRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    res.json(await getCustomers());
  })
);

customersRouter.get(
  "/:customerId",
  asyncHandler(async (req, res) => {
    const customer = await getCustomerById(req.params.customerId);

    if (!customer) {
      return res.status(404).json({ error: "Customer not found." });
    }

    res.json(customer);
  })
);

customersRouter.post(
  "/",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    res.status(201).json(await createCustomer(sanitizeCustomerPayload(req.body)));
  })
);

customersRouter.put(
  "/:customerId",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const customer = await updateCustomer(req.params.customerId, sanitizeCustomerPayload(req.body));

    if (!customer) {
      return res.status(404).json({ error: "Customer not found." });
    }

    res.json(customer);
  })
);

customersRouter.delete(
  "/:customerId",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    if (!(await deleteCustomer(req.params.customerId))) {
      return res.status(404).json({ error: "Customer not found." });
    }

    res.status(204).send();
  })
);

// Additional loan for an existing customer (the re-loan path).
customersRouter.post(
  "/:customerId/loans",
  requireRole("admin"),
  asyncHandler(async (req, res) => {
    const customer = await addLoanForCustomer(req.params.customerId, req.body || {});

    if (!customer) {
      return res.status(404).json({ error: "Customer not found." });
    }

    res.status(201).json(customer);
  })
);
