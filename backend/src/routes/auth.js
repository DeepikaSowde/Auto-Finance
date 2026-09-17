// src/routes/auth.js

import { Router } from "express";

import { login, logout } from "../services/auth.js";
import { requireAuth } from "../middleware/requireAuth.js";

export const authRouter = Router();

authRouter.post("/login", (req, res) => {
  const { username, password } = req.body || {};

  const session = login(username, password);

  if (!session) {
    return res.status(401).json({ error: "Invalid username or password." });
  }

  res.json(session);
});

authRouter.post("/logout", requireAuth, (req, res) => {
  const header = req.get("authorization") || "";

  logout(header.startsWith("Bearer ") ? header.slice(7).trim() : "");

  res.status(204).send();
});

authRouter.get("/me", requireAuth, (req, res) => {
  res.json({ user: req.user });
});
