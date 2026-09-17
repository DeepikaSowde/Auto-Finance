// src/services/vehicleRepository.js
//
// Vehicle lifecycle: ACTIVE -> SEIZED -> (RELEASED | PENDING_SALE -> SOLD).
// The transition guards mirror the rules the frontend enforced in
// customerStorage.js / vehicleStorage.js, now enforced server-side where
// they cannot be bypassed.

import { db } from "../db/connection.js";
import {
  buildCustomerRecord,
  buildLoan,
  getCustomerRow,
  mapVehicle,
} from "./customerRepository.js";

export const VEHICLE_STATUS = {
  ACTIVE: "ACTIVE",
  SEIZED: "SEIZED",
  PENDING_SALE: "PENDING_SALE",
  RELEASED: "RELEASED",
  SOLD: "SOLD",
};

const nowIso = () => new Date().toISOString();

const pad = (number, length = 4) => String(number).padStart(length, "0");

const roundMoney = (value) => Math.round((Number(value) + Number.EPSILON) * 100) / 100;

class TransitionError extends Error {
  constructor(message) {
    super(message);
    this.name = "TransitionError";
    this.statusCode = 409;
  }
}

const getVehicleRow = (vehicleId) =>
  db.prepare("SELECT * FROM vehicles WHERE id = $id").get({ $id: vehicleId });

const getLoanRowForVehicle = (vehiclePk) =>
  db
    .prepare("SELECT * FROM loans WHERE vehicle_pk = $pk ORDER BY is_primary DESC, pk ASC LIMIT 1")
    .get({ $pk: vehiclePk });

const getCustomerRowByPk = (customerPk) =>
  db.prepare("SELECT * FROM customers WHERE pk = $pk").get({ $pk: customerPk });

/*
 * Vehicle view enriched with the customer/loan context the vehicle pages
 * display alongside it.
 */
const decorateVehicle = (vehicleRow) => {
  const customerRow = getCustomerRowByPk(vehicleRow.customer_pk);
  const loanRow = getLoanRowForVehicle(vehicleRow.pk);
  const loan = loanRow ? buildLoan(loanRow) : {};

  const personal = customerRow ? JSON.parse(customerRow.personal_json || "{}") : {};

  const rcRow = db
    .prepare("SELECT * FROM rc_details WHERE vehicle_pk = $pk")
    .get({ $pk: vehicleRow.pk });

  return {
    ...mapVehicle(vehicleRow),
    registrationNumber: rcRow?.registration_number || "",
    customerId: customerRow?.id || "",
    customerNumber: customerRow?.customer_number || "",
    customerName: personal.name || "",
    mobileNumber: personal.mobileNumber || "",
    loan,
    loanId: loan?.id || "",
    loanNumber: loan?.loanNumber || "",
    outstandingAmount: loan?.outstandingAmount ?? 0,
  };
};

export const getVehicles = () =>
  db.prepare("SELECT * FROM vehicles ORDER BY pk ASC").all().map(decorateVehicle);

export const getVehicleById = (vehicleId) => {
  const row = getVehicleRow(vehicleId);

  return row ? decorateVehicle(row) : null;
};

export const getVehiclesByStatus = (status) =>
  db
    .prepare("SELECT * FROM vehicles WHERE status = $status ORDER BY pk ASC")
    .all({ $status: status })
    .map(decorateVehicle);

export const getVehicleEvents = (vehicleId) => {
  const row = getVehicleRow(vehicleId);

  if (!row) {
    return [];
  }

  return db
    .prepare("SELECT * FROM vehicle_events WHERE vehicle_pk = $pk ORDER BY pk ASC")
    .all({ $pk: row.pk })
    .map((event) => ({
      id: event.id,
      vehicleId,
      type: event.event_type,
      fromStatus: event.from_status,
      toStatus: event.to_status,
      performedBy: event.performed_by || "",
      createdAt: event.created_at,
      ...JSON.parse(event.details_json || "{}"),
    }));
};

const recordEvent = ({ vehiclePk, type, fromStatus, toStatus, details, performedBy, now }) => {
  const result = db
    .prepare(
      `INSERT INTO vehicle_events
        (id, vehicle_pk, event_type, from_status, to_status, details_json, performed_by, created_at)
       VALUES ('', $vehiclePk, $type, $fromStatus, $toStatus, $detailsJson, $performedBy, $createdAt)`
    )
    .run({
      $vehiclePk: vehiclePk,
      $type: type,
      $fromStatus: fromStatus,
      $toStatus: toStatus,
      $detailsJson: JSON.stringify(details || {}),
      $performedBy: performedBy || "",
      $createdAt: now,
    });

  db.prepare("UPDATE vehicle_events SET id = $id WHERE pk = $pk").run({
    $id: `VEV-${pad(result.lastInsertRowid, 5)}`,
    $pk: result.lastInsertRowid,
  });
};

const requireVehicle = (vehicleId) => {
  const row = getVehicleRow(vehicleId);

  if (!row) {
    const error = new TransitionError("Vehicle not found.");
    error.statusCode = 404;
    throw error;
  }

  return row;
};

const transition = ({
  vehicleId,
  allowedFrom,
  toStatus,
  eventType,
  details,
  performedBy,
  columns = {},
  onCommit,
  errorMessage,
}) => {
  const vehicleRow = requireVehicle(vehicleId);

  if (!allowedFrom.includes(vehicleRow.status)) {
    throw new TransitionError(errorMessage);
  }

  const now = nowIso();

  db.exec("BEGIN");

  try {
    const assignments = Object.keys(columns)
      .map((column) => `${column} = $${column}`)
      .join(", ");

    db.prepare(
      `UPDATE vehicles SET status = $status, updated_at = $updatedAt${
        assignments ? `, ${assignments}` : ""
      } WHERE pk = $pk`
    ).run({
      $pk: vehicleRow.pk,
      $status: toStatus,
      $updatedAt: now,
      ...Object.fromEntries(
        Object.entries(columns).map(([column, value]) => [`$${column}`, value])
      ),
    });

    recordEvent({
      vehiclePk: vehicleRow.pk,
      type: eventType,
      fromStatus: vehicleRow.status,
      toStatus,
      details,
      performedBy,
      now,
    });

    onCommit?.({ vehicleRow, now });

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getVehicleById(vehicleId);
};

export const seizeVehicle = (vehicleId, details = {}, performedBy) => {
  const now = nowIso();

  return transition({
    vehicleId,
    allowedFrom: [VEHICLE_STATUS.ACTIVE],
    toStatus: VEHICLE_STATUS.SEIZED,
    eventType: "SEIZURE",
    details,
    performedBy,
    columns: {
      seizure_json: JSON.stringify({
        ...details,
        seizureDate: details.seizureDate || now,
        seizedBy: performedBy || details.seizedBy || "",
        updatedAt: now,
      }),
    },
    errorMessage: "Only an active vehicle can be seized.",
  });
};

export const releaseVehicle = (vehicleId, details = {}, performedBy) => {
  const now = nowIso();

  return transition({
    vehicleId,
    allowedFrom: [VEHICLE_STATUS.SEIZED],
    toStatus: VEHICLE_STATUS.RELEASED,
    eventType: "RELEASE",
    details,
    performedBy,
    columns: {
      release_json: JSON.stringify({
        ...details,
        releaseDate: details.releaseDate || now,
        releasedBy: performedBy || details.releasedBy || "",
        updatedAt: now,
      }),
    },
    errorMessage: "Only a seized vehicle can be released.",
  });
};

export const moveVehicleToPendingSale = (vehicleId, details = {}, performedBy) => {
  const now = nowIso();

  return transition({
    vehicleId,
    allowedFrom: [VEHICLE_STATUS.SEIZED],
    toStatus: VEHICLE_STATUS.PENDING_SALE,
    eventType: "PENDING_SALE",
    details,
    performedBy,
    columns: {
      sale_json: JSON.stringify({
        ...details,
        saleStatus: "PENDING_SALE",
        initiatedAt: details.initiatedAt || now,
        updatedAt: now,
      }),
    },
    errorMessage: "Only a seized vehicle can be moved to pending sale.",
  });
};

export const cancelVehicleSale = (vehicleId, reason = "", performedBy) => {
  const now = nowIso();
  const vehicleRow = requireVehicle(vehicleId);
  const existingSale = JSON.parse(vehicleRow.sale_json || "{}");

  return transition({
    vehicleId,
    allowedFrom: [VEHICLE_STATUS.PENDING_SALE],
    toStatus: VEHICLE_STATUS.SEIZED,
    eventType: "SALE_CANCELLED",
    details: { reason },
    performedBy,
    columns: {
      sale_json: JSON.stringify({
        ...existingSale,
        saleStatus: "CANCELLED",
        cancellationReason: reason,
        cancelledAt: now,
        updatedAt: now,
      }),
    },
    errorMessage: "Only a pending-sale vehicle can have its sale cancelled.",
  });
};

/*
 * Completing a sale also forecloses the linked loan — the recovery figures
 * are computed from the loan's real outstanding, not a client-supplied one.
 */
export const completeVehicleSale = (vehicleId, details = {}, performedBy) => {
  const now = nowIso();
  const vehicleRow = requireVehicle(vehicleId);
  const existingSale = JSON.parse(vehicleRow.sale_json || "{}");
  const loanRow = getLoanRowForVehicle(vehicleRow.pk);
  const loan = loanRow ? buildLoan(loanRow) : null;

  const salePrice = roundMoney(details.salePrice || 0);
  const saleExpenses = roundMoney(details.saleExpenses || 0);
  const outstandingAmount = roundMoney(loan?.outstandingAmount ?? 0);
  const netSaleProceeds = roundMoney(Math.max(salePrice - saleExpenses, 0));
  const deficiency = roundMoney(Math.max(outstandingAmount - netSaleProceeds, 0));
  const surplus = roundMoney(Math.max(netSaleProceeds - outstandingAmount, 0));

  return transition({
    vehicleId,
    allowedFrom: [VEHICLE_STATUS.PENDING_SALE],
    toStatus: VEHICLE_STATUS.SOLD,
    eventType: "SALE",
    details: { ...details, salePrice, saleExpenses, netSaleProceeds, deficiency, surplus },
    performedBy,
    columns: {
      sale_json: JSON.stringify({
        ...existingSale,
        ...details,
        saleStatus: "SOLD",
        salePrice,
        saleExpenses,
        outstandingAmount,
        netSaleProceeds,
        deficiency,
        surplus,
        soldAt: details.soldAt || now,
        soldBy: performedBy || details.soldBy || "",
        updatedAt: now,
      }),
    },
    onCommit: () => {
      if (!loanRow) {
        return;
      }

      db.prepare(
        `UPDATE loans SET
          status = 'Foreclosed',
          foreclosure_status = 'Foreclosed',
          foreclosed_at = $foreclosedAt,
          foreclosure_reason = $reason,
          updated_at = $updatedAt
         WHERE pk = $pk`
      ).run({
        $pk: loanRow.pk,
        $foreclosedAt: now,
        $reason: "Vehicle sold",
        $updatedAt: now,
      });
    },
    errorMessage: "Only a vehicle pending sale can be marked as sold.",
  });
};

export const getVehicleStatusCounts = () => {
  const rows = db.prepare("SELECT status, COUNT(*) AS count FROM vehicles GROUP BY status").all();

  const counts = { total: 0, active: 0, seized: 0, pendingSale: 0, released: 0, sold: 0 };

  const keys = {
    ACTIVE: "active",
    SEIZED: "seized",
    PENDING_SALE: "pendingSale",
    RELEASED: "released",
    SOLD: "sold",
  };

  for (const row of rows) {
    counts.total += row.count;
    counts[keys[row.status]] = row.count;
  }

  return counts;
};

export const getCustomerForVehicle = (vehicleId) => {
  const vehicleRow = getVehicleRow(vehicleId);

  if (!vehicleRow) {
    return null;
  }

  const customerRow = getCustomerRowByPk(vehicleRow.customer_pk);

  return customerRow ? buildCustomerRecord(customerRow) : null;
};

export { TransitionError };
export { getCustomerRow };
