// src/db/connection.js

import { DatabaseSync } from "node:sqlite";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { mkdirSync, readFileSync } from "node:fs";

const __dirname = dirname(fileURLToPath(import.meta.url));

const dataDir = join(__dirname, "..", "..", "data");
mkdirSync(dataDir, { recursive: true });

const dbPath = process.env.DATABASE_PATH || join(dataDir, "autofinance.db");

export const db = new DatabaseSync(dbPath);

db.exec("PRAGMA foreign_keys = ON;");

const schema = readFileSync(join(__dirname, "schema.sql"), "utf8");

db.exec(schema);
