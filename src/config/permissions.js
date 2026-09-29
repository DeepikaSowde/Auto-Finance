// src/config/permissions.js
//
// Per-user permissions for staff accounts. Mirrors the backend catalog in
// backend/src/services/permissions.js — keep the two in sync. The backend
// enforces these on every API call; the frontend uses them to hide pages,
// sidebar items and buttons the user can't use.

import { getSession } from "../services/authStorage";

export const PERMISSION_ACTIONS = [
  { key: "view", label: "View" },
  { key: "add", label: "Add" },
  { key: "edit", label: "Edit" },
  { key: "delete", label: "Delete" },
  { key: "approve", label: "Approve" },
];

export const PERMISSION_MODULES = [
  { key: "dashboard", label: "Dashboard", actions: ["view"] },
  { key: "customers", label: "Customers", actions: ["view", "add", "edit", "delete"] },
  {
    key: "loans",
    label: "Loans",
    actions: ["view", "add", "edit", "delete"],
    hint: "Add = New Loan",
  },
  {
    key: "reloan",
    label: "Re-loan",
    actions: ["view", "add", "edit"],
    hint: "Edit = eligibility rules",
  },
  {
    key: "collections",
    label: "Collections",
    actions: ["view", "add", "approve"],
    hint: "Add = record payment · Approve = approve / reject / reverse",
  },
  {
    key: "vehicles",
    label: "Vehicles",
    actions: ["view", "edit"],
    hint: "Edit = seize / release / sell",
  },
  { key: "ledger", label: "Ledger", actions: ["view"] },
  { key: "investor", label: "Investor", actions: ["view", "add"] },
  { key: "income", label: "Income", actions: ["view", "add", "edit", "delete"] },
  {
    key: "expense",
    label: "Expense",
    actions: ["view", "add", "edit", "delete", "approve"],
    hint: "Approve = mark referral commission paid",
  },
  { key: "reminders", label: "Reminders", actions: ["view", "add", "edit"] },
  { key: "control-center", label: "Control Center", actions: ["view"] },
];

export const DEFAULT_STAFF_PERMISSIONS = {
  collections: { view: true, add: true },
};

export const isAdmin = (session = getSession()) => session?.role === "admin";

export const can = (module, action = "view", session = getSession()) => {
  if (!session) {
    return false;
  }

  if (session.role === "admin") {
    return true;
  }

  return session.permissions?.[module]?.[action] === true;
};

/*
 * Which permission opens each screen. Admin-only screens (Settings,
 * User Management) are not listed here; they are guarded by role.
 */
export const ROUTE_PERMISSIONS = [
  { prefix: "/dashboard", module: "dashboard" },
  { prefix: "/activities", module: "dashboard" },
  { prefix: "/customers/onboarding", module: "loans", action: "add", orModule: "reloan" },
  { prefix: "/customers", module: "customers" },
  { prefix: "/loan", module: "loans" },
  { prefix: "/reloan", module: "reloan" },
  { prefix: "/collections", module: "collections" },
  { prefix: "/repayment", module: "collections", action: "add" },
  { prefix: "/vehicles", module: "vehicles" },
  { prefix: "/ledger", module: "ledger" },
  { prefix: "/investor", module: "investor" },
  { prefix: "/income", module: "income" },
  { prefix: "/expense-control", module: "expense" },
  { prefix: "/reminders", module: "reminders" },
  { prefix: "/control-center", module: "control-center" },
];

const LANDING_ORDER = [
  "/dashboard",
  "/collections",
  "/customers",
  "/loan",
  "/reloan",
  "/vehicles/all",
  "/reminders",
  "/ledger",
  "/investor",
  "/income",
  "/expense-control",
  "/control-center",
];

export const canOpenPath = (path, session = getSession()) => {
  const rule = ROUTE_PERMISSIONS.find(
    ({ prefix }) => path === prefix || path.startsWith(`${prefix}/`)
  );

  if (!rule) {
    return isAdmin(session);
  }

  const action = rule.action || "view";

  return (
    can(rule.module, action, session) ||
    Boolean(rule.orModule && can(rule.orModule, action, session))
  );
};

// The first screen this user may open, or null when they have none.
export const getLandingPath = (session = getSession()) => {
  if (isAdmin(session)) {
    return "/dashboard";
  }

  return LANDING_ORDER.find((path) => canOpenPath(path, session)) || null;
};
