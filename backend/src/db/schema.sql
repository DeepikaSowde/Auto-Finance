-- Auto Finance — core money-path schema.
--
-- Relational tables for anything that is queried, joined or aggregated.
-- JSON text columns only for genuinely free-form sub-objects (KYC fields,
-- document metadata, insurance, charges, allocation snapshots) — these
-- mirror the nested shape the React app already expects.

PRAGMA foreign_keys = ON;

/* =========================================================
   AUTH
========================================================= */

CREATE TABLE IF NOT EXISTS users (
  pk             INTEGER PRIMARY KEY AUTOINCREMENT,
  id             TEXT UNIQUE NOT NULL,
  username       TEXT UNIQUE NOT NULL,
  password_hash  TEXT NOT NULL,
  password_salt  TEXT NOT NULL,
  name           TEXT NOT NULL,
  role           TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  created_at     TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token       TEXT PRIMARY KEY,
  user_pk     INTEGER NOT NULL REFERENCES users (pk) ON DELETE CASCADE,
  created_at  TEXT NOT NULL,
  expires_at  TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user_pk ON sessions (user_pk);

/* =========================================================
   CUSTOMER
========================================================= */

CREATE TABLE IF NOT EXISTS customers (
  pk               INTEGER PRIMARY KEY AUTOINCREMENT,
  id               TEXT UNIQUE NOT NULL,
  customer_number  TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'Active',
  personal_json    TEXT NOT NULL DEFAULT '{}',
  kyc_json         TEXT NOT NULL DEFAULT '{}',
  documents_json   TEXT NOT NULL DEFAULT '{}',
  photo_json       TEXT NOT NULL DEFAULT '{}',
  created_at       TEXT NOT NULL,
  updated_at       TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS guarantors (
  pk              INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_pk     INTEGER NOT NULL UNIQUE REFERENCES customers (pk) ON DELETE CASCADE,
  has_guarantor   INTEGER NOT NULL DEFAULT 0,
  personal_json   TEXT NOT NULL DEFAULT '{}',
  kyc_json        TEXT NOT NULL DEFAULT '{}',
  documents_json  TEXT NOT NULL DEFAULT '{}',
  photo_json      TEXT NOT NULL DEFAULT '{}'
);

/* =========================================================
   VEHICLE
   One unified table. Replaces the three competing vehicle
   stores the frontend grew (customerStorage's dead copy,
   vehicleStorage's live one, and dead vehicleSaleStorage).
========================================================= */

CREATE TABLE IF NOT EXISTS vehicles (
  pk                  INTEGER PRIMARY KEY AUTOINCREMENT,
  id                  TEXT UNIQUE NOT NULL,
  customer_pk         INTEGER NOT NULL REFERENCES customers (pk) ON DELETE CASCADE,
  vehicle_type        TEXT,
  brand               TEXT,
  model               TEXT,
  variant             TEXT,
  colour              TEXT,
  manufacturing_year  TEXT,
  fuel_type           TEXT,
  vehicle_value       REAL NOT NULL DEFAULT 0,
  status              TEXT NOT NULL DEFAULT 'ACTIVE'
                      CHECK (status IN ('ACTIVE', 'SEIZED', 'PENDING_SALE', 'RELEASED', 'SOLD')),
  seizure_json        TEXT,
  release_json        TEXT,
  sale_json           TEXT,
  created_at          TEXT NOT NULL,
  updated_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicles_customer_pk ON vehicles (customer_pk);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles (status);

-- Append-only lifecycle history (seize / release / pending-sale / sale / cancel).
CREATE TABLE IF NOT EXISTS vehicle_events (
  pk           INTEGER PRIMARY KEY AUTOINCREMENT,
  id           TEXT UNIQUE NOT NULL,
  vehicle_pk   INTEGER NOT NULL REFERENCES vehicles (pk) ON DELETE CASCADE,
  event_type   TEXT NOT NULL
               CHECK (event_type IN ('SEIZURE', 'RELEASE', 'PENDING_SALE', 'SALE', 'SALE_CANCELLED')),
  from_status  TEXT,
  to_status    TEXT NOT NULL,
  details_json TEXT NOT NULL DEFAULT '{}',
  performed_by TEXT,
  created_at   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_vehicle_events_vehicle_pk ON vehicle_events (vehicle_pk);

CREATE TABLE IF NOT EXISTS rc_details (
  pk                    INTEGER PRIMARY KEY AUTOINCREMENT,
  vehicle_pk            INTEGER NOT NULL UNIQUE REFERENCES vehicles (pk) ON DELETE CASCADE,
  rc_book_number        TEXT,
  registration_number   TEXT,
  location              TEXT,
  date_of_registration  TEXT,
  chassis_number        TEXT,
  engine_number         TEXT,
  existing_financier    TEXT DEFAULT 'None',
  hypothecation         INTEGER NOT NULL DEFAULT 0,
  tax_expiry            TEXT,
  permit_expiry         TEXT,
  fc_expiry             TEXT,
  insurance_json        TEXT NOT NULL DEFAULT '{}',
  endorsement_json      TEXT NOT NULL DEFAULT '{}',
  remarks               TEXT
);

CREATE INDEX IF NOT EXISTS idx_rc_registration ON rc_details (registration_number);

/* =========================================================
   LOAN
========================================================= */

CREATE TABLE IF NOT EXISTS loans (
  pk                   INTEGER PRIMARY KEY AUTOINCREMENT,
  id                   TEXT UNIQUE NOT NULL,
  loan_number          TEXT NOT NULL,
  customer_pk          INTEGER NOT NULL REFERENCES customers (pk) ON DELETE CASCADE,
  vehicle_pk           INTEGER REFERENCES vehicles (pk) ON DELETE SET NULL,
  previous_loan_pk     INTEGER REFERENCES loans (pk) ON DELETE SET NULL,
  is_primary           INTEGER NOT NULL DEFAULT 1,

  vehicle_amount       REAL NOT NULL DEFAULT 0,
  down_payment         REAL NOT NULL DEFAULT 0,
  loan_amount          REAL NOT NULL DEFAULT 0,

  interest_rate        REAL NOT NULL DEFAULT 0,
  interest_type        TEXT NOT NULL DEFAULT 'Flat',
  repayment_method     TEXT NOT NULL DEFAULT 'EMI',
  repayment_frequency  TEXT NOT NULL DEFAULT 'Monthly',
  tenure               REAL NOT NULL DEFAULT 0,
  tenure_unit          TEXT NOT NULL DEFAULT 'Months',
  first_due_date       TEXT,

  calculation_json     TEXT NOT NULL DEFAULT '{}',
  charges_json         TEXT NOT NULL DEFAULT '{}',
  collection_json      TEXT NOT NULL DEFAULT '{}',
  funding_json         TEXT NOT NULL DEFAULT '{}',
  repayment_meta_json  TEXT NOT NULL DEFAULT '{}',

  remarks              TEXT,
  status               TEXT NOT NULL DEFAULT 'Active',

  foreclosure_status   TEXT,
  foreclosed_at        TEXT,
  foreclosure_reason   TEXT,

  created_at           TEXT NOT NULL,
  updated_at           TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_loans_customer_pk ON loans (customer_pk);
CREATE INDEX IF NOT EXISTS idx_loans_vehicle_pk ON loans (vehicle_pk);
CREATE INDEX IF NOT EXISTS idx_loans_status ON loans (status);

CREATE TABLE IF NOT EXISTS installments (
  pk                   INTEGER PRIMARY KEY AUTOINCREMENT,
  loan_pk              INTEGER NOT NULL REFERENCES loans (pk) ON DELETE CASCADE,
  installment_number   INTEGER NOT NULL,
  due_date             TEXT,
  opening_balance      REAL NOT NULL DEFAULT 0,
  principal            REAL NOT NULL DEFAULT 0,
  interest             REAL NOT NULL DEFAULT 0,
  payment_amount       REAL NOT NULL DEFAULT 0,
  closing_balance      REAL NOT NULL DEFAULT 0,
  paid_principal       REAL NOT NULL DEFAULT 0,
  paid_interest        REAL NOT NULL DEFAULT 0,
  penalty_paid_amount  REAL NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'Pending',
  UNIQUE (loan_pk, installment_number)
);

CREATE INDEX IF NOT EXISTS idx_installments_loan_pk ON installments (loan_pk);

/* =========================================================
   COLLECTION (payment submission + approval workflow)
========================================================= */

CREATE TABLE IF NOT EXISTS collections (
  pk                           INTEGER PRIMARY KEY AUTOINCREMENT,
  id                           TEXT UNIQUE NOT NULL,
  customer_pk                  INTEGER REFERENCES customers (pk) ON DELETE SET NULL,
  loan_pk                      INTEGER REFERENCES loans (pk) ON DELETE SET NULL,

  status                       TEXT NOT NULL DEFAULT 'Pending'
                               CHECK (status IN ('Pending', 'Approved', 'Rejected', 'Reversed')),

  amount                       REAL NOT NULL DEFAULT 0,
  due_amount                   REAL NOT NULL DEFAULT 0,
  penalty_amount               REAL NOT NULL DEFAULT 0,
  total_payable                REAL NOT NULL DEFAULT 0,

  payment_type                 TEXT,
  pay_mode                     TEXT,
  receipt_number               TEXT,
  due_date                     TEXT,
  installment_number           INTEGER,

  staff_name                   TEXT,
  location                     TEXT,
  remarks                      TEXT,

  overdue_days                 INTEGER NOT NULL DEFAULT 0,
  grace_days                   INTEGER NOT NULL DEFAULT 0,

  amount_toward_due            REAL NOT NULL DEFAULT 0,
  amount_toward_penalty        REAL NOT NULL DEFAULT 0,
  amount_toward_principal      REAL NOT NULL DEFAULT 0,
  amount_toward_advance        REAL NOT NULL DEFAULT 0,
  amount_excess                REAL NOT NULL DEFAULT 0,

  allocation_json              TEXT,
  repayment_processed          INTEGER NOT NULL DEFAULT 0,
  repayment_processed_at       TEXT,
  repayment_processing_status  TEXT NOT NULL DEFAULT 'Pending',
  repayment_error              TEXT,

  submitted_at                 TEXT NOT NULL,
  collected_date               TEXT,
  approved_at                  TEXT,
  approved_by                  TEXT,
  rejected_at                  TEXT,
  rejected_by                  TEXT,
  rejection_remarks            TEXT,
  reversed_at                  TEXT,
  reversed_by                  TEXT,
  reversal_reason              TEXT,

  created_at                   TEXT NOT NULL,
  updated_at                   TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_collections_loan_pk ON collections (loan_pk);
CREATE INDEX IF NOT EXISTS idx_collections_customer_pk ON collections (customer_pk);
CREATE INDEX IF NOT EXISTS idx_collections_status ON collections (status);

-- One row per allocation bucket actually posted against a loan.
-- This is the ledger of record for money applied.
CREATE TABLE IF NOT EXISTS payment_allocations (
  pk                  INTEGER PRIMARY KEY AUTOINCREMENT,
  id                  TEXT UNIQUE NOT NULL,
  loan_pk             INTEGER NOT NULL REFERENCES loans (pk) ON DELETE CASCADE,
  collection_pk       INTEGER REFERENCES collections (pk) ON DELETE SET NULL,
  installment_number  INTEGER,
  due_date            TEXT,
  amount              REAL NOT NULL DEFAULT 0,
  type                TEXT NOT NULL,
  is_penalty          INTEGER NOT NULL DEFAULT 0,
  is_interest         INTEGER NOT NULL DEFAULT 0,
  is_principal        INTEGER NOT NULL DEFAULT 0,
  created_at          TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_allocations_loan_pk ON payment_allocations (loan_pk);
CREATE INDEX IF NOT EXISTS idx_allocations_collection_pk ON payment_allocations (collection_pk);
