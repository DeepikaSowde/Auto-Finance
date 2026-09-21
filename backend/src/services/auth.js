// src/services/auth.js
//
// Replaces the frontend's hardcoded DEMO_USERS array and plaintext
// password comparison. Passwords are scrypt-hashed (node:crypto — no extra
// dependency) and sessions are opaque bearer tokens stored in the database.

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { query } from "../db/connection.js";

const SESSION_TTL_HOURS = 12;

const hashPassword = (password, salt) =>
  scryptSync(password, salt, 64).toString("hex");

const createPasswordRecord = (password) => {
  const salt = randomBytes(16).toString("hex");

  return { salt, hash: hashPassword(password, salt) };
};

const verifyPassword = (password, salt, expectedHash) => {
  const actual = Buffer.from(hashPassword(password, salt), "hex");
  const expected = Buffer.from(expectedHash, "hex");

  if (actual.length !== expected.length) {
    return false;
  }

  return timingSafeEqual(actual, expected);
};

/*
 * The frontend shipped with two demo logins (admin/admin123,
 * staff/staff123). Seeding them keeps the existing login screen working
 * while moving the credential check server-side against hashed values.
 */
const SEED_USERS = [
  { id: "ADMIN-001", username: "admin", password: "admin123", name: "Admin", role: "admin" },
  { id: "STAFF-001", username: "staff", password: "staff123", name: "Ravi", role: "staff" },
];

export const seedUsers = async () => {
  const existing = await query("SELECT COUNT(*)::int AS count FROM users");

  if (existing.rows[0].count > 0) {
    return;
  }

  for (const user of SEED_USERS) {
    const { salt, hash } = createPasswordRecord(user.password);

    await query(
      `INSERT INTO users (id, username, password_hash, password_salt, name, role)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (username) DO NOTHING`,
      [user.id, user.username, hash, salt, user.name, user.role]
    );
  }
};

const toPublicUser = (row) => ({
  userId: row.id,
  username: row.username,
  name: row.name,
  role: row.role,
});

export const login = async (username, password) => {
  const cleanUsername = String(username || "").trim();

  const result = await query("SELECT * FROM users WHERE username = $1", [cleanUsername]);
  const row = result.rows[0];

  if (!row || !verifyPassword(String(password || ""), row.password_salt, row.password_hash)) {
    return null;
  }

  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  await query(
    "INSERT INTO sessions (token, user_pk, expires_at) VALUES ($1, $2, $3)",
    [token, row.pk, expiresAt.toISOString()]
  );

  return {
    token,
    user: { ...toPublicUser(row), loginAt: now.toISOString() },
  };
};

export const logout = async (token) => {
  await query("DELETE FROM sessions WHERE token = $1", [token]);
};

/* =========================================================
   USER MANAGEMENT (admin-only)
========================================================= */

const pad = (number, length = 3) => String(number).padStart(length, "0");

export const getUsers = async () => {
  const result = await query("SELECT * FROM users ORDER BY created_at ASC");

  return result.rows.map((row) => ({
    id: row.id,
    username: row.username,
    name: row.name,
    role: row.role,
    createdAt: row.created_at,
  }));
};

export const createUser = async ({ username, password, name, role } = {}) => {
  const cleanUsername = String(username || "").trim().toLowerCase();
  const cleanName = String(name || "").trim();
  const cleanRole = role === "staff" ? "staff" : "admin";

  if (!cleanUsername || !password || !cleanName) {
    const error = new Error("Username, password and name are required.");

    error.statusCode = 400;

    throw error;
  }

  const existing = await query("SELECT pk FROM users WHERE username = $1", [cleanUsername]);

  if (existing.rows.length > 0) {
    const error = new Error("That username is already taken.");

    error.statusCode = 409;

    throw error;
  }

  const { salt, hash } = createPasswordRecord(String(password));

  const countResult = await query("SELECT COUNT(*)::int AS count FROM users");
  const id = `${cleanRole.toUpperCase()}-${pad(countResult.rows[0].count + 1)}`;

  await query(
    `INSERT INTO users (id, username, password_hash, password_salt, name, role)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [id, cleanUsername, hash, salt, cleanName, cleanRole]
  );

  return { id, username: cleanUsername, name: cleanName, role: cleanRole };
};

export const deleteUser = async (userId, requestingUserId) => {
  if (userId === requestingUserId) {
    const error = new Error("You can't remove your own account while signed in.");

    error.statusCode = 400;

    throw error;
  }

  const target = await query("SELECT * FROM users WHERE id = $1", [userId]);

  if (!target.rows[0]) {
    return false;
  }

  if (target.rows[0].role === "admin") {
    const adminCount = await query("SELECT COUNT(*)::int AS count FROM users WHERE role = 'admin'");

    if (adminCount.rows[0].count <= 1) {
      const error = new Error("At least one admin account must remain.");

      error.statusCode = 400;

      throw error;
    }
  }

  const result = await query("DELETE FROM users WHERE id = $1", [userId]);

  return result.rowCount > 0;
};

export const getUserForToken = async (token) => {
  if (!token) {
    return null;
  }

  const result = await query(
    `SELECT users.*, sessions.expires_at
     FROM sessions
     JOIN users ON users.pk = sessions.user_pk
     WHERE sessions.token = $1`,
    [token]
  );

  const row = result.rows[0];

  if (!row) {
    return null;
  }

  if (new Date(row.expires_at) < new Date()) {
    await logout(token);
    return null;
  }

  return toPublicUser(row);
};
