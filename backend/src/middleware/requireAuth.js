// src/middleware/requireAuth.js

import { getUserForToken } from "../services/auth.js";
import { asyncHandler } from "../util/asyncHandler.js";

const readToken = (req) => {
  const header = req.get("authorization") || "";

  return header.startsWith("Bearer ") ? header.slice(7).trim() : "";
};

export const requireAuth = asyncHandler(async (req, res, next) => {
  const user = await getUserForToken(readToken(req));

  if (!user) {
    return res.status(401).json({ error: "Authentication required." });
  }

  req.user = user;
  next();
});

export const requireRole =
  (...roles) =>
  (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: "Authentication required." });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "You do not have access to this action." });
    }

    next();
  };
