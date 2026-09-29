// src/components/auth/ProtectedRoute.jsx

import {
  Navigate,
  useLocation,
} from "react-router-dom";

import {
  getSession,
} from "../../services/authStorage";

import {
  can,
  getLandingPath,
} from "../../config/permissions";

import NoAccess from "./NoAccess";

/*
 * adminOnly  – Settings, User Management.
 * module     – permission module that opens this screen.
 * action     – defaults to "view".
 * anyOf      – [[module, action], ...] when several permissions may open it
 *              (New Loan opens for loans.add or, for a re-loan, reloan.add).
 *
 * A user who can't open the screen is sent to the first screen they can
 * open, or shown a "no access" notice when they have none at all.
 */
const ProtectedRoute = ({
  children,
  adminOnly = false,
  module,
  action = "view",
  anyOf,
}) => {
  const session =
    getSession();

  const location =
    useLocation();

  if (!session) {
    return (
      <Navigate
        to="/login"
        replace
        state={{
          from:
            location.pathname,
        }}
      />
    );
  }

  const allowed = adminOnly
    ? session.role === "admin"
    : anyOf
      ? anyOf.some(([anyModule, anyAction = "view"]) =>
          can(anyModule, anyAction, session)
        )
      : !module || can(module, action, session);

  if (!allowed) {
    const landing =
      getLandingPath(session);

    if (
      !landing ||
      landing === location.pathname
    ) {
      return <NoAccess />;
    }

    return (
      <Navigate
        to={landing}
        replace
      />
    );
  }

  return children;
};

export default ProtectedRoute;
