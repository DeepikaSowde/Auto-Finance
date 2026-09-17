// src/services/vehicleStorage.js
//
// Vehicle lifecycle, backed by the API. The database keeps one canonical
// status enum (ACTIVE/SEIZED/PENDING_SALE/RELEASED/SOLD); this module
// translates it to the display vocabulary the vehicle pages already match
// on ("Active"/"Seized"/"Pending Sale"/"Released"/"Sold").
//
// Transition rules (a vehicle can only be released once seized, sold once
// pending sale, and so on) are enforced server-side now, so an invalid
// action fails loudly instead of silently corrupting a record.

import { apiGet, apiPost, notifyDataUpdated } from "./api";

export const VEHICLE_LIFECYCLE_STATUS = {
  ACTIVE: "Active",
  SEIZED: "Seized",
  RELEASED: "Released",
  PENDING_SALE: "Pending Sale",
  SOLD: "Sold",
};

const STATUS_FROM_API = {
  ACTIVE: VEHICLE_LIFECYCLE_STATUS.ACTIVE,
  SEIZED: VEHICLE_LIFECYCLE_STATUS.SEIZED,
  RELEASED: VEHICLE_LIFECYCLE_STATUS.RELEASED,
  PENDING_SALE: VEHICLE_LIFECYCLE_STATUS.PENDING_SALE,
  SOLD: VEHICLE_LIFECYCLE_STATUS.SOLD,
};

const toDisplayStatus = (status) => STATUS_FROM_API[status] || VEHICLE_LIFECYCLE_STATUS.ACTIVE;

const vehicleName = (vehicle) =>
  [vehicle.brand, vehicle.model, vehicle.variant].filter(Boolean).join(" ") || "Vehicle";

/*
 * A vehicle has at most one live seizure, so a stable derived id keeps the
 * pages' "act on this seizure record" calls resolvable back to a vehicle.
 */
const seizureIdFor = (vehicleId) => `SEIZE-${vehicleId}`;

const toRecord = (vehicle) => ({
  ...vehicle,
  id: vehicle.id,
  vehicleId: vehicle.id,
  status: toDisplayStatus(vehicle.status),
  vehicleName: vehicleName(vehicle),
  loanAmount: Number(vehicle.loan?.loanAmount || 0),
  outstandingAmount: Number(vehicle.outstandingAmount || 0),
});

export const getVehicleRecords = async () => {
  try {
    const vehicles = await apiGet("/vehicles");

    return Array.isArray(vehicles) ? vehicles.map(toRecord) : [];
  } catch (error) {
    console.error("Failed to load vehicles:", error);

    return [];
  }
};

export const getVehicleById = async (vehicleId) => {
  try {
    return toRecord(await apiGet(`/vehicles/${vehicleId}`));
  } catch (error) {
    console.error("Failed to load vehicle:", error);

    return null;
  }
};

export const getVehicleStatusCounts = async () => {
  try {
    return await apiGet("/vehicles/counts");
  } catch (error) {
    console.error("Failed to load vehicle counts:", error);

    return { total: 0, active: 0, seized: 0, pendingSale: 0, released: 0, sold: 0 };
  }
};

/*
 * Lifecycle records: every vehicle that has ever been seized, flattened
 * into the shape the seized/released/sold pages render.
 */
export const getVehicleSeizures = async () => {
  const vehicles = await getVehicleRecords();

  return vehicles
    .filter((vehicle) => Boolean(vehicle.seizure))
    .map((vehicle) => ({
      ...vehicle.seizure,

      id: seizureIdFor(vehicle.id),
      vehicleId: vehicle.id,
      registrationNumber: vehicle.registrationNumber || "",
      customerId: vehicle.customerId || "",
      customerName: vehicle.customerName || "",
      mobileNumber: vehicle.mobileNumber || "",
      loanId: vehicle.loanId || "",
      loanNumber: vehicle.loanNumber || "",
      vehicleName: vehicle.vehicleName,
      vehicleType: vehicle.vehicleType || "",
      loanAmount: vehicle.loanAmount,
      outstandingAmount: vehicle.outstandingAmount,

      seizedAt: vehicle.seizure?.seizureDate || vehicle.seizure?.seizedAt || "",
      seizedBy: vehicle.seizure?.seizedBy || "Admin",
      reason: vehicle.seizure?.reason || "",
      remarks: vehicle.seizure?.remarks || "",
      attachment: vehicle.seizure?.attachment || null,

      status: vehicle.status,
      seizure: vehicle.seizure,
      release: vehicle.release || null,
      sale: vehicle.sale || null,

      vehicle,
    }));
};

export const getVehicleSeizureById = async (seizureId) => {
  const seizures = await getVehicleSeizures();

  return seizures.find((record) => record.id === seizureId) || null;
};

export const getVehicleSeizureByVehicleId = async (vehicleId, loanId, loanNumber, customerId) => {
  const seizures = await getVehicleSeizures();

  return (
    seizures.find(
      (record) =>
        (vehicleId && record.vehicleId === vehicleId) ||
        (loanId && record.loanId === loanId) ||
        (loanNumber && record.loanNumber === loanNumber) ||
        (customerId && record.customerId === customerId)
    ) || null
  );
};

/*
 * Pages act on either a vehicle id or a derived seizure id.
 */
const resolveVehicleId = async (reference) => {
  const value = String(reference || "");

  if (!value) {
    return "";
  }

  if (value.startsWith("SEIZE-")) {
    return value.slice("SEIZE-".length);
  }

  if (value.startsWith("VH-")) {
    return value;
  }

  const record = await getVehicleSeizureByVehicleId(value, value, value, value);

  return record?.vehicleId || value;
};

const runAction = async (vehicleId, action, body) => {
  try {
    const vehicle = await apiPost(`/vehicles/${vehicleId}/${action}`, body);

    notifyDataUpdated();

    return toRecord(vehicle);
  } catch (error) {
    console.error(`Vehicle ${action} failed:`, error);

    // The pages surface a message when null comes back.
    return null;
  }
};

export const addVehicleSeizure = async (details = {}) => {
  const vehicleId = await resolveVehicleId(details.vehicleId);

  return runAction(vehicleId, "seize", details);
};

export const releaseVehicleSeizure = async (reference, releasedBy = "Admin", remarks = "") => {
  const vehicleId = await resolveVehicleId(reference);

  return runAction(vehicleId, "release", { releasedBy, remarks, releaseStatus: "Released" });
};

export const markVehicleForSale = async (reference, details = {}) => {
  const vehicleId = await resolveVehicleId(reference);

  return runAction(vehicleId, "pending-sale", details);
};

export const completeVehicleSale = async (reference, saleData = {}) => {
  const vehicleId = await resolveVehicleId(reference);

  return runAction(vehicleId, "complete-sale", saleData);
};

export const cancelVehicleSale = async (reference, reason = "") => {
  const vehicleId = await resolveVehicleId(reference);

  return runAction(vehicleId, "cancel-sale", { reason });
};
