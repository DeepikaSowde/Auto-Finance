// src/data/schemas/customerSchema.js

/**
 * Master customer data structure.
 *
 * This object defines the complete shape of a new
 * customer onboarding record.
 */

export const CUSTOMER_SCHEMA = {
  customer: {
    id: "",
    customerNumber: "",
    createdAt: "",
    updatedAt: "",
    status: "Draft",

    personal: {
      date: "",
      name: "",
      mobileNumber: "",
      alternateMobileNumber: "",
      address: "",
      area: "",
      landmark: "",
      pincode: "",
      ownHouse: null,
      profession: "",
      groupOrVehicleType: "",
      referredBy: "",
    },

    kyc: {
      aadhaarNumber: "",
      drivingLicenceNumber: "",
      panNumber: "",
      voterIdNumber: "",
    },

    documents: {
      requiredMinimum: 2,
      selectedTypes: [],
      uploads: [],
    },

    photo: {
      fileName: "",
      fileType: "",
      fileSize: 0,
      fileData: "",
      uploadedAt: "",
    },
  },

  /**
   * Vehicle information
   */
  vehicle: {
    id: "",
    vehicleId: "",

    vehicleType: "",
    brand: "",
    model: "",
    variant: "",
    colour: "",

    manufacturingYear: "",
    fuelType: "",

    vehicleValue: 0,

    photo: {
      fileName: "",
      fileType: "",
      fileSize: 0,
      fileData: "",
      uploadedAt: "",
    },
  },

  /**
   * RC / Registration / Insurance information
   */
  rc: {
    rcBookNumber: "",
    registrationNumber: "",
    location: "",
    dateOfRegistration: "",

    chassisNumber: "",
    engineNumber: "",

    existingFinancier: "None",
    hypothecation: false,

    taxExpiry: "",
    permitExpiry: "",
    fcExpiry: "",

    insurance: {
      companyName: "",
      policyNumber: "",
      expiryDate: "",

      document: {
        fileName: "",
        fileType: "",
        fileSize: 0,
        fileData: "",
        uploadedAt: "",
      },
    },

    endorsement: {
      enabled: false,
    },

    remarks: "",
  },

  /**
   * Guarantor information
   *
   * hasGuarantor controls whether the guarantor
   * form is shown during onboarding.
   */
  guarantor: {
    hasGuarantor: false,

    personal: {
      name: "",
      printName: "",
      mobileNumber: "",
      alternateMobileNumber: "",
      address: "",
      area: "",
      landmark: "",
      pincode: "",
      ownHouse: null,
      profession: "",
    },

    kyc: {
      aadhaarNumber: "",
      drivingLicenceNumber: "",
      panNumber: "",
      voterIdNumber: "",
    },

    documents: {
      requiredMinimum: 2,
      selectedTypes: [],
      uploads: [],
    },

    photo: {
      fileName: "",
      fileData: "",
    },
  },

  /**
   * Loan information
   *
   * Calculation model:
   *
   * 1. Flat
   * 2. Reducing Balance + EMI
   * 3. Reducing Balance + Principal
   */
loan: {
  id: "",
  loanNumber: "",

  funding: {
    investorId: "",
    investorName: "",
    fundedAmount: 0,
    allocationDate: "",
    fundingTransactionId: "",
  },

  vehicleAmount: 0,
  downPayment: 0,
  loanAmount: 0,

  interest: {
    rate: 0,
    type: "Flat",
  },

  repayment: {
    method: "EMI",
    frequency: "Monthly",
    tenure: 0,
    tenureUnit: "Months",
  },

  calculation: {
    principal: 0,
    interestAmount: 0,
    totalDue: 0,
    emiAmount: null,
    numberOfPayments: 0,
    principalPerPayment: 0,
    interestPerPayment: 0,
    firstPayment: 0,
    lastPayment: 0,
    paymentAmount: 0,
  },

  firstDueDate: "",

  charges: {
    defaultInterest: 0,

    graceDays: 0,

    penalty: {
      enabled: true,
      type: "Fixed",
      amount: 0,
      maxAmount: 0,
    },

    advanceEmi: 0,
    documentCharge: 0,
    differenceInitial: 0,
    insuranceAmount: 0,
    fineAmount: 0,
  },

  collection: {
    payMode: "",
    receiptAmount: 0,
    receiptMode: "",
  },

  remarks: "",

  status: "Draft",
  createdAt: "",
},
};


/**
 * Creates a completely fresh onboarding object.
 *
 * JSON cloning ensures nested objects and arrays
 * are not shared between different customers.
 */
export const createEmptyCustomer = () => {
  return JSON.parse(
    JSON.stringify(CUSTOMER_SCHEMA)
  );
};