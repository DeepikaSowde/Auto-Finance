// src/services/auth.js
//
// Replaces the frontend's hardcoded DEMO_USERS array + plaintext password
// comparison. Passwords are scrypt-hashed (node:crypto — no extra
// dependency) and sessions are opaque bearer tokens stored in the database.

import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

import { db } from "../db/connection.js";

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
 * The frontend ships with two demo logins (admin/admin123, staff/staff123).
 * Seeding them keeps the existing login screen working while moving the
 * actual credential check server-side against hashed values.
 */
const SEED_USERS = [
  { id: "ADMIN-001", username: "admin", password: "admin123", name: "Admin", role: "admin" },
  { id: "STAFF-001", username: "staff", password: "staff123", name: "Ravi", role: "staff" },
];

export const seedUsers = () => {
  const existing = db.prepare("SELECT COUNT(*) AS count FROM users").get();

  if (existing.count > 0) {
    return;
  }

  const now = new Date().toISOString();

  const insert = db.prepare(
    `INSERT INTO users (id, username, password_hash, password_salt, name, role, created_at)
     VALUES ($id, $username, $passwordHash, $passwordSalt, $name, $role, $createdAt)`
  );

  for (const user of SEED_USERS) {
    const { salt, hash } = createPasswordRecord(user.password);

    insert.run({
      $id: user.id,
      $username: user.username,
      $passwordHash: hash,
      $passwordSalt: salt,
      $name: user.name,
      $role: user.role,
      $createdAt: now,
    });
  }
};

const toPublicUser = (row) => ({
  userId: row.id,
  username: row.username,
  name: row.name,
  role: row.role,
});

export const login = (username, password) => {
  const cleanUsername = String(username || "").trim();

  const row = db
    .prepare("SELECT * FROM users WHERE username = $username")
    .get({ $username: cleanUsername });

  if (!row || !verifyPassword(String(password || ""), row.password_salt, row.password_hash)) {
    return null;
  }

  const token = randomBytes(32).toString("hex");
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_TTL_HOURS * 60 * 60 * 1000);

  db.prepare(
    `INSERT INTO sessions (token, user_pk, created_at, expires_at)
     VALUES ($token, $userPk, $createdAt, $expiresAt)`
  ).run({
    $token: token,
    $userPk: row.pk,
    $createdAt: now.toISOString(),
    $expiresAt: expiresAt.toISOString(),
  });

  return {
    token,
    user: { ...toPublicUser(row), loginAt: now.toISOString() },
  };
};

export const logout = (token) => {
  db.prepare("DELETE FROM sessions WHERE token = $token").run({ $token: token });
};

export const getUserForToken = (token) => {
  if (!token) {
    return null;
  }

  const row = db
    .prepare(
      `SELECT users.*, sessions.expires_at AS expires_at
       FROM sessions
       JOIN users ON users.pk = sessions.user_pk
       WHERE sessions.token = $token`
    )
    .get({ $token: token });

  if (!row) {
    return null;
  }

  if (new Date(row.expires_at) < new Date()) {
    logout(token);
    return null;
  }

  return toPublicUser(row);
};
