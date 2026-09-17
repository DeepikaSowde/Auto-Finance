// src/services/customerRepository.js
//
// Owns the customer/vehicle/rc/guarantor/loan aggregate. Reads assemble the
// same nested { customer, vehicle, rc, guarantor, loan, loans[] } shape the
// React app already consumes, so UI code does not need reshaping.

import { db } from "../db/connection.js";
import { calculateLoan } from "./loanCalculator.js";
import { generateRepaymentSchedule } from "./repaymentSchedule.js";
import { describeInstallment, summariseOutstanding } from "./repaymentEngine.js";

const parseJson = (value, fallback) => {
  if (!value) return fallback;

  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

const pad = (number, length = 5) => String(number).padStart(length, "0");

const nowIso = () => new Date().toISOString();

const emptyDocuments = () => ({ requiredMinimum: 2, selectedTypes: [], uploads: [] });
const emptyPhoto = () => ({ fileName: "", fileData: "" });

/* =========================================================
   ROW -> API SHAPE
========================================================= */

const mapCustomer = (row) => ({
  id: row.id,
  customerNumber: row.customer_number,
  status: row.status,
  personal: parseJson(row.personal_json, {}),
  kyc: parseJson(row.kyc_json, {}),
  documents: parseJson(row.documents_json, emptyDocuments()),
  photo: parseJson(row.photo_json, emptyPhoto()),
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

export const mapVehicle = (row) => {
  if (!row) return {};

  return {
    id: row.id,
    vehicleId: row.id,
    vehicleType: row.vehicle_type || "",
    brand: row.brand || "",
    model: row.model || "",
    variant: row.variant || "",
    colour: row.colour || "",
    manufacturingYear: row.manufacturing_year || "",
    fuelType: row.fuel_type || "",
    vehicleValue: row.vehicle_value || 0,
    status: row.status,
    seizure: parseJson(row.seizure_json, null),
    release: parseJson(row.release_json, null),
    sale: parseJson(row.sale_json, null),
  };
};

const mapRc = (row) => {
  if (!row) return {};

  return {
    rcBookNumber: row.rc_book_number || "",
    registrationNumber: row.registration_number || "",
    location: row.location || "",
    dateOfRegistration: row.date_of_registration || "",
    chassisNumber: row.chassis_number || "",
    engineNumber: row.engine_number || "",
    existingFinancier: row.existing_financier || "None",
    hypothecation: Boolean(row.hypothecation),
    taxExpiry: row.tax_expiry || "",
    permitExpiry: row.permit_expiry || "",
    fcExpiry: row.fc_expiry || "",
    insurance: parseJson(row.insurance_json, {}),
    endorsement: parseJson(row.endorsement_json, { enabled: false }),
    remarks: row.remarks || "",
  };
};

const mapGuarantor = (row) => {
  if (!row) return { hasGuarantor: false };

  return {
    hasGuarantor: Boolean(row.has_guarantor),
    personal: parseJson(row.personal_json, {}),
    kyc: parseJson(row.kyc_json, {}),
    documents: parseJson(row.documents_json, emptyDocuments()),
    photo: parseJson(row.photo_json, emptyPhoto()),
  };
};

const mapLoan = (row, installmentRows, allocationRows, previousLoanRow) => {
  if (!row) return {};

  const schedule = installmentRows.map((installment) => describeInstallment(installment));
  const outstanding = summariseOutstanding(schedule);

  return {
    id: row.id,
    loanNumber: row.loan_number,
    vehicleAmount: row.vehicle_amount,
    downPayment: row.down_payment,
    loanAmount: row.loan_amount,
    funding: parseJson(row.funding_json, {}),
    interest: { rate: row.interest_rate, type: row.interest_type },
    repayment: {
      method: row.repayment_method,
      frequency: row.repayment_frequency,
      tenure: row.tenure,
      tenureUnit: row.tenure_unit,
    },
    calculation: parseJson(row.calculation_json, {}),
    firstDueDate: row.first_due_date || "",
    charges: parseJson(row.charges_json, {}),
    collection: parseJson(row.collection_json, {}),
    remarks: row.remarks || "",
    status: row.status,

    foreclosureStatus: row.foreclosure_status || "",
    foreclosedAt: row.foreclosed_at || "",
    foreclosureReason: row.foreclosure_reason || "",

    previousLoanId: previousLoanRow?.id || "",
    previousLoanNumber: previousLoanRow?.loan_number || "",

    repaymentSchedule: schedule,
    paymentHistory: allocationRows.map((allocation) => ({
      id: allocation.id,
      collectionId: allocation.collection_id || "",
      loanId: row.id,
      loanNumber: row.loan_number,
      installment: allocation.installment_number,
      dueDate: allocation.due_date || "",
      amount: allocation.amount,
      type: allocation.type,
      isPenalty: Boolean(allocation.is_penalty),
      isInterest: Boolean(allocation.is_interest),
      isPrincipal: Boolean(allocation.is_principal),
      paidAt: allocation.created_at,
    })),

    outstandingAmount: outstanding.outstanding,
    principalOutstanding: outstanding.principalOutstanding,
    interestOutstanding: outstanding.interestOutstanding,

    ...parseJson(row.repayment_meta_json, {}),

    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
};

/* =========================================================
   LOOKUPS
========================================================= */

const customerByIdStmt = () => db.prepare("SELECT * FROM customers WHERE id = $id");

export const getCustomerRow = (customerId) => customerByIdStmt().get({ $id: customerId });

export const getVehicleRowForCustomer = (customerPk) =>
  db.prepare("SELECT * FROM vehicles WHERE customer_pk = $pk").get({ $pk: customerPk });

const getRcRow = (vehiclePk) =>
  vehiclePk
    ? db.prepare("SELECT * FROM rc_details WHERE vehicle_pk = $pk").get({ $pk: vehiclePk })
    : undefined;

const getGuarantorRow = (customerPk) =>
  db.prepare("SELECT * FROM guarantors WHERE customer_pk = $pk").get({ $pk: customerPk });

const getLoanRows = (customerPk) =>
  db
    .prepare("SELECT * FROM loans WHERE customer_pk = $pk ORDER BY is_primary DESC, pk ASC")
    .all({ $pk: customerPk });

export const getInstallmentRows = (loanPk) =>
  db
    .prepare(
      "SELECT * FROM installments WHERE loan_pk = $pk ORDER BY installment_number ASC"
    )
    .all({ $pk: loanPk });

const getAllocationRows = (loanPk) =>
  db
    .prepare(
      `SELECT payment_allocations.*, collections.id AS collection_id
       FROM payment_allocations
       LEFT JOIN collections ON collections.pk = payment_allocations.collection_pk
       WHERE payment_allocations.loan_pk = $pk
       ORDER BY payment_allocations.pk ASC`
    )
    .all({ $pk: loanPk });

const getLoanRowByPk = (loanPk) =>
  loanPk ? db.prepare("SELECT * FROM loans WHERE pk = $pk").get({ $pk: loanPk }) : undefined;

export const buildLoan = (loanRow) =>
  mapLoan(
    loanRow,
    getInstallmentRows(loanRow.pk),
    getAllocationRows(loanRow.pk),
    getLoanRowByPk(loanRow.previous_loan_pk)
  );

export const buildCustomerRecord = (customerRow) => {
  const vehicleRow = getVehicleRowForCustomer(customerRow.pk);
  const rcRow = getRcRow(vehicleRow?.pk);
  const guarantorRow = getGuarantorRow(customerRow.pk);
  const loanRows = getLoanRows(customerRow.pk);

  const loans = loanRows.map(buildLoan);

  return {
    customer: mapCustomer(customerRow),
    vehicle: mapVehicle(vehicleRow),
    rc: mapRc(rcRow),
    guarantor: mapGuarantor(guarantorRow),
    loan: loans[0] || {},
    loans: loans.slice(1),
  };
};

/* =========================================================
   READS
========================================================= */

export const getCustomers = () =>
  db.prepare("SELECT * FROM customers ORDER BY pk ASC").all().map(buildCustomerRecord);

export const getCustomerById = (customerId) => {
  const row = getCustomerRow(customerId);

  return row ? buildCustomerRecord(row) : null;
};

export const getLoans = () =>
  getCustomers().flatMap((record) =>
    [record.loan, ...(record.loans || [])]
      .filter((loan) => loan?.id)
      .map((loan) => ({
        ...loan,
        customerId: record.customer.id,
        customerNumber: record.customer.customerNumber,
        customerName: record.customer.personal?.name || "",
        mobileNumber: record.customer.personal?.mobileNumber || "",
        vehicle: record.vehicle,
        rc: record.rc,
      }))
  );

/* =========================================================
   WRITES — building blocks
========================================================= */

const insertVehicle = (customerPk, vehicle = {}, now) => {
  const result = db
    .prepare(
      `INSERT INTO vehicles
        (id, customer_pk, vehicle_type, brand, model, variant, colour, manufacturing_year,
         fuel_type, vehicle_value, status, created_at, updated_at)
       VALUES
        ('', $customerPk, $vehicleType, $brand, $model, $variant, $colour, $manufacturingYear,
         $fuelType, $vehicleValue, 'ACTIVE', $createdAt, $updatedAt)`
    )
    .run({
      $customerPk: customerPk,
      $vehicleType: vehicle.vehicleType || "",
      $brand: vehicle.brand || "",
      $model: vehicle.model || "",
      $variant: vehicle.variant || "",
      $colour: vehicle.colour || "",
      $manufacturingYear: String(vehicle.manufacturingYear || ""),
      $fuelType: vehicle.fuelType || "",
      $vehicleValue: Number(vehicle.vehicleValue) || 0,
      $createdAt: now,
      $updatedAt: now,
    });

  const vehiclePk = result.lastInsertRowid;

  // Matches the frontend's existing VH-#### format.
  db.prepare("UPDATE vehicles SET id = $id WHERE pk = $pk").run({
    $id: `VH-${pad(vehiclePk, 4)}`,
    $pk: vehiclePk,
  });

  return vehiclePk;
};

const rcParams = (vehiclePk, rc = {}) => ({
  $vehiclePk: vehiclePk,
  $rcBookNumber: rc.rcBookNumber || "",
  $registrationNumber: rc.registrationNumber || "",
  $location: rc.location || "",
  $dateOfRegistration: rc.dateOfRegistration || "",
  $chassisNumber: rc.chassisNumber || "",
  $engineNumber: rc.engineNumber || "",
  $existingFinancier: rc.existingFinancier || "None",
  $hypothecation: rc.hypothecation ? 1 : 0,
  $taxExpiry: rc.taxExpiry || "",
  $permitExpiry: rc.permitExpiry || "",
  $fcExpiry: rc.fcExpiry || "",
  $insuranceJson: JSON.stringify(rc.insurance || {}),
  $endorsementJson: JSON.stringify(rc.endorsement || { enabled: false }),
  $remarks: rc.remarks || "",
});

const insertRc = (vehiclePk, rc) => {
  db.prepare(
    `INSERT INTO rc_details
      (vehicle_pk, rc_book_number, registration_number, location, date_of_registration,
       chassis_number, engine_number, existing_financier, hypothecation, tax_expiry,
       permit_expiry, fc_expiry, insurance_json, endorsement_json, remarks)
     VALUES
      ($vehiclePk, $rcBookNumber, $registrationNumber, $location, $dateOfRegistration,
       $chassisNumber, $engineNumber, $existingFinancier, $hypothecation, $taxExpiry,
       $permitExpiry, $fcExpiry, $insuranceJson, $endorsementJson, $remarks)`
  ).run(rcParams(vehiclePk, rc));
};

const updateRc = (vehiclePk, rc) => {
  db.prepare(
    `UPDATE rc_details SET
      rc_book_number = $rcBookNumber,
      registration_number = $registrationNumber,
      location = $location,
      date_of_registration = $dateOfRegistration,
      chassis_number = $chassisNumber,
      engine_number = $engineNumber,
      existing_financier = $existingFinancier,
      hypothecation = $hypothecation,
      tax_expiry = $taxExpiry,
      permit_expiry = $permitExpiry,
      fc_expiry = $fcExpiry,
      insurance_json = $insuranceJson,
      endorsement_json = $endorsementJson,
      remarks = $remarks
     WHERE vehicle_pk = $vehiclePk`
  ).run(rcParams(vehiclePk, rc));
};

const guarantorParams = (customerPk, guarantor = {}) => ({
  $customerPk: customerPk,
  $hasGuarantor: guarantor.hasGuarantor ? 1 : 0,
  $personalJson: JSON.stringify(guarantor.personal || {}),
  $kycJson: JSON.stringify(guarantor.kyc || {}),
  $documentsJson: JSON.stringify(guarantor.documents || emptyDocuments()),
  $photoJson: JSON.stringify(guarantor.photo || emptyPhoto()),
});

const insertGuarantor = (customerPk, guarantor) => {
  db.prepare(
    `INSERT INTO guarantors (customer_pk, has_guarantor, personal_json, kyc_json, documents_json, photo_json)
     VALUES ($customerPk, $hasGuarantor, $personalJson, $kycJson, $documentsJson, $photoJson)`
  ).run(guarantorParams(customerPk, guarantor));
};

const updateGuarantor = (customerPk, guarantor) => {
  db.prepare(
    `UPDATE guarantors SET
      has_guarantor = $hasGuarantor,
      personal_json = $personalJson,
      kyc_json = $kycJson,
      documents_json = $documentsJson,
      photo_json = $photoJson
     WHERE customer_pk = $customerPk`
  ).run(guarantorParams(customerPk, guarantor));
};

const loanTerms = (loan = {}) => ({
  principal: Number(loan.loanAmount) || 0,
  rate: Number(loan.interest?.rate) || 0,
  tenure: Number(loan.repayment?.tenure) || 0,
  tenureUnit: loan.repayment?.tenureUnit || "Months",
  interestType: loan.interest?.type || "Flat",
  repaymentMethod: loan.repayment?.method || "EMI",
  frequency: loan.repayment?.frequency || "Monthly",
});

const insertInstallments = (loanPk, loan) => {
  const schedule = generateRepaymentSchedule({
    ...loanTerms(loan),
    firstDueDate: loan.firstDueDate || "",
  });

  const insert = db.prepare(
    `INSERT INTO installments
      (loan_pk, installment_number, due_date, opening_balance, principal, interest,
       payment_amount, closing_balance, status)
     VALUES
      ($loanPk, $installmentNumber, $dueDate, $openingBalance, $principal, $interest,
       $paymentAmount, $closingBalance, 'Pending')`
  );

  for (const row of schedule) {
    insert.run({
      $loanPk: loanPk,
      $installmentNumber: row.installmentNumber,
      $dueDate: row.dueDate,
      $openingBalance: row.openingBalance,
      $principal: row.principal,
      $interest: row.interest,
      $paymentAmount: row.paymentAmount,
      $closingBalance: row.closingBalance,
    });
  }

  return schedule.length;
};

export const insertLoan = (customerPk, vehiclePk, loan = {}, now, options = {}) => {
  const terms = loanTerms(loan);

  // Loan figures are always recomputed here — a client-submitted
  // calculation is never trusted.
  const calculation = calculateLoan(terms);

  const result = db
    .prepare(
      `INSERT INTO loans
        (id, loan_number, customer_pk, vehicle_pk, previous_loan_pk, is_primary,
         vehicle_amount, down_payment, loan_amount, interest_rate, interest_type,
         repayment_method, repayment_frequency, tenure, tenure_unit, first_due_date,
         calculation_json, charges_json, collection_json, funding_json, repayment_meta_json,
         remarks, status, created_at, updated_at)
       VALUES
        ('', '', $customerPk, $vehiclePk, $previousLoanPk, $isPrimary,
         $vehicleAmount, $downPayment, $loanAmount, $interestRate, $interestType,
         $repaymentMethod, $repaymentFrequency, $tenure, $tenureUnit, $firstDueDate,
         $calculationJson, $chargesJson, $collectionJson, $fundingJson, '{}',
         $remarks, $status, $createdAt, $updatedAt)`
    )
    .run({
      $customerPk: customerPk,
      $vehiclePk: vehiclePk ?? null,
      $previousLoanPk: options.previousLoanPk ?? null,
      $isPrimary: options.isPrimary === false ? 0 : 1,
      $vehicleAmount: Number(loan.vehicleAmount) || 0,
      $downPayment: Number(loan.downPayment) || 0,
      $loanAmount: terms.principal,
      $interestRate: terms.rate,
      $interestType: terms.interestType,
      $repaymentMethod: terms.repaymentMethod,
      $repaymentFrequency: terms.frequency,
      $tenure: terms.tenure,
      $tenureUnit: terms.tenureUnit,
      $firstDueDate: loan.firstDueDate || "",
      $calculationJson: JSON.stringify({
        principal: calculation.principal,
        interestAmount: calculation.interest,
        totalDue: calculation.totalDue,
        emiAmount: calculation.emiAmount ?? 0,
        numberOfPayments: calculation.paymentCount,
        principalPerPayment: calculation.principalPerPayment ?? 0,
        interestPerPayment: calculation.interestPerPayment ?? 0,
        firstPayment: calculation.firstPayment ?? 0,
        lastPayment: calculation.lastPayment ?? 0,
        paymentAmount: calculation.paymentAmount ?? calculation.emiAmount ?? 0,
      }),
      $chargesJson: JSON.stringify(loan.charges || {}),
      $collectionJson: JSON.stringify(loan.collection || {}),
      $fundingJson: JSON.stringify(loan.funding || {}),
      $remarks: loan.remarks || "",
      $status: loan.status || "Active",
      $createdAt: loan.createdAt || now,
      $updatedAt: now,
    });

  const loanPk = result.lastInsertRowid;
  const loanId = `LN-${pad(loanPk)}`;

  db.prepare("UPDATE loans SET id = $id, loan_number = $loanNumber WHERE pk = $pk").run({
    $id: loanId,
    $loanNumber: loanId,
    $pk: loanPk,
  });

  insertInstallments(loanPk, loan);

  return loanPk;
};

/* =========================================================
   CUSTOMER CRUD
========================================================= */

export const createCustomer = (payload = {}) => {
  const now = nowIso();
  let customerId;

  db.exec("BEGIN");

  try {
    const result = db
      .prepare(
        `INSERT INTO customers
          (id, customer_number, status, personal_json, kyc_json, documents_json, photo_json, created_at, updated_at)
         VALUES ('', '', $status, $personalJson, $kycJson, $documentsJson, $photoJson, $createdAt, $updatedAt)`
      )
      .run({
        $status: payload.customer?.status || "Active",
        $personalJson: JSON.stringify(payload.customer?.personal || {}),
        $kycJson: JSON.stringify(payload.customer?.kyc || {}),
        $documentsJson: JSON.stringify(payload.customer?.documents || emptyDocuments()),
        $photoJson: JSON.stringify(payload.customer?.photo || emptyPhoto()),
        $createdAt: now,
        $updatedAt: now,
      });

    const customerPk = result.lastInsertRowid;
    customerId = `CUS-${pad(customerPk)}`;

    db.prepare(
      "UPDATE customers SET id = $id, customer_number = $customerNumber WHERE pk = $pk"
    ).run({ $id: customerId, $customerNumber: customerId, $pk: customerPk });

    const vehiclePk = insertVehicle(customerPk, payload.vehicle, now);
    insertRc(vehiclePk, payload.rc);
    insertGuarantor(customerPk, payload.guarantor || { hasGuarantor: false });
    insertLoan(customerPk, vehiclePk, payload.loan || {}, now);

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getCustomerById(customerId);
};

export const updateCustomer = (customerId, payload = {}) => {
  const customerRow = getCustomerRow(customerId);

  if (!customerRow) {
    return null;
  }

  const now = nowIso();

  db.exec("BEGIN");

  try {
    const existing = buildCustomerRecord(customerRow);

    db.prepare(
      `UPDATE customers SET
        status = $status,
        personal_json = $personalJson,
        kyc_json = $kycJson,
        documents_json = $documentsJson,
        photo_json = $photoJson,
        updated_at = $updatedAt
       WHERE pk = $pk`
    ).run({
      $pk: customerRow.pk,
      $status: payload.customer?.status || existing.customer.status,
      $personalJson: JSON.stringify({
        ...existing.customer.personal,
        ...(payload.customer?.personal || {}),
      }),
      $kycJson: JSON.stringify({ ...existing.customer.kyc, ...(payload.customer?.kyc || {}) }),
      $documentsJson: JSON.stringify({
        ...existing.customer.documents,
        ...(payload.customer?.documents || {}),
      }),
      $photoJson: JSON.stringify({ ...existing.customer.photo, ...(payload.customer?.photo || {}) }),
      $updatedAt: now,
    });

    const vehicleRow = getVehicleRowForCustomer(customerRow.pk);

    if (vehicleRow && payload.vehicle) {
      const merged = { ...existing.vehicle, ...payload.vehicle };

      db.prepare(
        `UPDATE vehicles SET
          vehicle_type = $vehicleType,
          brand = $brand,
          model = $model,
          variant = $variant,
          colour = $colour,
          manufacturing_year = $manufacturingYear,
          fuel_type = $fuelType,
          vehicle_value = $vehicleValue,
          updated_at = $updatedAt
         WHERE pk = $pk`
      ).run({
        $pk: vehicleRow.pk,
        $vehicleType: merged.vehicleType || "",
        $brand: merged.brand || "",
        $model: merged.model || "",
        $variant: merged.variant || "",
        $colour: merged.colour || "",
        $manufacturingYear: String(merged.manufacturingYear || ""),
        $fuelType: merged.fuelType || "",
        $vehicleValue: Number(merged.vehicleValue) || 0,
        $updatedAt: now,
      });
    }

    if (vehicleRow && payload.rc) {
      updateRc(vehicleRow.pk, {
        ...existing.rc,
        ...payload.rc,
        insurance: { ...existing.rc.insurance, ...(payload.rc.insurance || {}) },
        endorsement: { ...existing.rc.endorsement, ...(payload.rc.endorsement || {}) },
      });
    }

    if (payload.guarantor) {
      updateGuarantor(customerRow.pk, {
        ...existing.guarantor,
        ...payload.guarantor,
        personal: { ...existing.guarantor.personal, ...(payload.guarantor.personal || {}) },
        kyc: { ...existing.guarantor.kyc, ...(payload.guarantor.kyc || {}) },
        documents: { ...existing.guarantor.documents, ...(payload.guarantor.documents || {}) },
        photo: { ...existing.guarantor.photo, ...(payload.guarantor.photo || {}) },
      });
    }

    // Loan terms are deliberately not editable here: changing them would
    // invalidate an already-running repayment schedule. Only descriptive
    // fields and status move.
    if (payload.loan && existing.loan?.id) {
      db.prepare(
        `UPDATE loans SET
          remarks = $remarks,
          status = $status,
          funding_json = $fundingJson,
          charges_json = $chargesJson,
          updated_at = $updatedAt
         WHERE id = $id`
      ).run({
        $id: existing.loan.id,
        $remarks: payload.loan.remarks ?? existing.loan.remarks ?? "",
        $status: payload.loan.status || existing.loan.status,
        $fundingJson: JSON.stringify({ ...existing.loan.funding, ...(payload.loan.funding || {}) }),
        $chargesJson: JSON.stringify({ ...existing.loan.charges, ...(payload.loan.charges || {}) }),
        $updatedAt: now,
      });
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getCustomerById(customerId);
};

export const deleteCustomer = (customerId) => {
  const row = getCustomerRow(customerId);

  if (!row) {
    return false;
  }

  db.prepare("DELETE FROM customers WHERE pk = $pk").run({ $pk: row.pk });

  return true;
};

/*
 * Additional loan against an existing customer (the re-loan path).
 */
export const addLoanForCustomer = (customerId, loan = {}) => {
  const customerRow = getCustomerRow(customerId);

  if (!customerRow) {
    return null;
  }

  const now = nowIso();
  const vehicleRow = getVehicleRowForCustomer(customerRow.pk);

  const previousLoanRow = db
    .prepare("SELECT * FROM loans WHERE customer_pk = $pk ORDER BY pk DESC LIMIT 1")
    .get({ $pk: customerRow.pk });

  db.exec("BEGIN");

  try {
    insertLoan(customerRow.pk, vehicleRow?.pk ?? null, loan, now, {
      isPrimary: false,
      previousLoanPk: previousLoanRow?.pk ?? null,
    });

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }

  return getCustomerById(customerId);
};
