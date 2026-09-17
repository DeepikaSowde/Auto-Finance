// src/services/customerStorage.js
//
// Persistence layer backed by the Auto Finance API + SQLite database
// (see /backend). Records are no longer held in localStorage, so the read
// functions are async — callers must await them.
//
// The API returns the same nested
// { customer, vehicle, rc, guarantor, loan, loans[] } shape this app has
// always used, so consumers only needed an await, not reshaping.

import { apiDelete, apiGet, apiPost, apiPut, notifyDataUpdated } from "./api";

export const VEHICLE_STATUS = {
  ACTIVE: "ACTIVE",
  SEIZED: "SEIZED",
  PENDING_SALE: "PENDING_SALE",
  RELEASED: "RELEASED",
  SOLD: "SOLD",
};

/* =========================================================
   SANITIZATION

   Uploaded file contents are never sent to the server — only
   metadata (name/type/size), matching what this app always did.
========================================================= */

const stripUploads = (uploads = []) =>
  uploads.map((upload) => ({
    type: upload.type || "",
    fileName: upload.fileName || "",
    fileType: upload.fileType || "",
    fileSize: upload.fileSize || 0,
    uploadedAt: upload.uploadedAt || "",
    fileData: "",
  }));

const sanitizeCustomerForRequest = (record) => {
  const safe = structuredClone(record);

  if (safe.customer?.photo) {
    safe.customer.photo = { fileName: "", fileData: "" };
  }

  if (safe.customer?.documents?.uploads) {
    safe.customer.documents.uploads = stripUploads(safe.customer.documents.uploads);
  }

  if (safe.guarantor?.photo) {
    safe.guarantor.photo = { fileName: "", fileData: "" };
  }

  if (safe.guarantor?.documents?.uploads) {
    safe.guarantor.documents.uploads = stripUploads(safe.guarantor.documents.uploads);
  }

  if (safe.rc?.insurance?.document) {
    const document = safe.rc.insurance.document;

    safe.rc.insurance.document = {
      fileName: document.fileName || "",
      fileType: document.fileType || "",
      fileSize: document.fileSize || 0,
      uploadedAt: document.uploadedAt || "",
      fileData: "",
    };
  }

  return safe;
};

/* =========================================================
   CUSTOMERS
========================================================= */

export const getCustomers = async () => {
  try {
    const customers = await apiGet("/customers");

    return Array.isArray(customers) ? customers : [];
  } catch (error) {
    console.error("Failed to load customers:", error);

    return [];
  }
};

export const getCustomerById = async (customerId) => {
  try {
    return await apiGet(`/customers/${customerId}`);
  } catch (error) {
    console.error("Failed to load customer:", error);

    return null;
  }
};

export const saveCustomer = async (record) => {
  const saved = await apiPost("/customers", sanitizeCustomerForRequest(record));

  notifyDataUpdated();

  return saved;
};

export const updateCustomer = async (customerId, record) => {
  const saved = await apiPut(`/customers/${customerId}`, sanitizeCustomerForRequest(record));

  notifyDataUpdated();

  return saved;
};

export const deleteCustomer = async (customerId) => {
  await apiDelete(`/customers/${customerId}`);

  notifyDataUpdated();
};

/* =========================================================
   LOANS
========================================================= */

export const getLoans = async () => {
  try {
    const loans = await apiGet("/loans");

    return Array.isArray(loans) ? loans : [];
  } catch (error) {
    console.error("Failed to load loans:", error);

    return [];
  }
};

/**
 * Adds an additional loan (the re-loan path) to an existing customer.
 * The server assigns the loan number and builds its repayment schedule.
 */
export const appendLoanToCustomer = async (customerId, loan) => {
  const saved = await apiPost(`/customers/${customerId}/loans`, loan);

  notifyDataUpdated();

  return saved;
};

/* =========================================================
   VEHICLES (read helpers — lifecycle lives in vehicleStorage.js)
========================================================= */

export const getVehicles = async () => {
  try {
    const vehicles = await apiGet("/vehicles");

    return Array.isArray(vehicles) ? vehicles : [];
  } catch (error) {
    console.error("Failed to load vehicles:", error);

    return [];
  }
};

export const getVehicleById = async (vehicleId) => {
  try {
    return await apiGet(`/vehicles/${vehicleId}`);
  } catch (error) {
    console.error("Failed to load vehicle:", error);

    return null;
  }
};

export const getCustomerByVehicleId = async (vehicleId) => {
  const vehicle = await getVehicleById(vehicleId);

  return vehicle?.customerId ? getCustomerById(vehicle.customerId) : null;
};

/* =========================================================
   OUTSTANDING

   Pure helper over an already-fetched loan, so it stays
   synchronous. The server computes outstandingAmount from the
   installment rows; the older shape is still handled for any
   caller passing a loan-like object that lacks it.
========================================================= */

export const getOutstandingAmount = (loan) => {
  if (loan?.outstandingAmount !== undefined && loan?.outstandingAmount !== null) {
    return Number(loan.outstandingAmount) || 0;
  }

  const totalPayable = Number(loan?.calculation?.totalDue || loan?.totalDue || 0);

  const paidAmount = Number(
    loan?.paymentHistory?.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) || 0
  );

  return Math.max(totalPayable - paidAmount, 0);
};
