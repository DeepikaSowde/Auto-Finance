// src/pages/customers/CustomerOnboarding.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  useLocation,
  useNavigate,
} from "react-router-dom";

import {
  X,
  ArrowLeft,
  ArrowRight,
  Check,
  User,
  FileText,
  Car,
  Users,
  IndianRupee,
  ClipboardCheck,
} from "lucide-react";

import CustomerInfoStep from "../../components/customers/onboarding/CustomerInfoStep";
import KycDocumentsStep from "../../components/customers/onboarding/KycDocumentsStep";
import VehicleRcStep from "../../components/customers/onboarding/VehicleRcStep";
import GuarantorStep from "../../components/customers/onboarding/GuarantorStep";
import LoanDetailsStep from "../../components/customers/onboarding/LoanDetailsStep";
import ReviewStep from "../../components/customers/onboarding/ReviewStep";
import RepaymentScheduleModal from "../../components/loans/RepaymentScheduleModal";
import { generateRepaymentSchedule } from "../../services/repaymentSchedule";
import {
  saveCustomer,
  deleteCustomer,
  appendLoanToCustomer,
  getCustomerById,
  getVehicles,
} from "../../services/customerStorage";
import {
  checkReLoanEligibility,
  createReLoanContext,
  findCustomerAndLoan,
  getReLoanRules,
} from "../../services/reloanStorage";
import {
  allocateInvestmentPoolToLoan,
  getInvestmentPoolSummary,
  getNextInvestorTransactionId,
} from "../../services/investorStorage";

import {
  createEmptyCustomer,
} from "../../data/schemas/customerSchema";

const steps = [
  {
    id: 1,
    title: "Customer",
    shortTitle: "Customer",
    icon: User,
  },
  {
    id: 2,
    title: "KYC & Documents",
    shortTitle: "KYC",
    icon: FileText,
  },
  {
    id: 3,
    title: "Vehicle & RC",
    shortTitle: "Vehicle",
    icon: Car,
  },
  {
    id: 4,
    title: "Guarantor",
    shortTitle: "Guarantor",
    icon: Users,
  },
  {
    id: 5,
    title: "Loan & Due Details",
    shortTitle: "Loan",
    icon: IndianRupee,
  },
  {
    id: 6,
    title: "Review",
    shortTitle: "Review",
    icon: ClipboardCheck,
  },
];

const STEP_DESCRIPTIONS = {
  1: "Basic customer and contact details",
  2: "Verify identity and required documents",
  3: "Vehicle, RC and compliance information",
 4: "Choose whether this customer has a guarantor",
  5: "Loan amount, interest and repayment details",
  6: "Review all information before creating the customer",
};

const CustomerOnboarding = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const reLoanParams = useMemo(() => {
    const params = new URLSearchParams(
      location.search
    );
    return {
      isReLoan:
        params.get("source") === "reloan" ||
        params.get("type") === "reloan",
      customerId:
        params.get("customerId") || "",
      previousLoanId:
        params.get("previousLoanId") || "",
    };
  }, [location.search]);

  const [currentStep, setCurrentStep] = useState(1);
const [showRepaymentSchedule, setShowRepaymentSchedule] =
  useState(false);

const [createdLoan, setCreatedLoan] =
  useState(null);

  const [formData, setFormData] = useState(() => {
    const customer = createEmptyCustomer();

    const today = new Date()
      .toISOString()
      .split("T")[0];

    customer.customer.personal.date = today;

    return customer;
  });

  /*
   * Re-loan prefill. The existing customer now comes from the API, so it
   * is loaded after mount rather than in the state initialiser.
   */
  useEffect(() => {
    if (!reLoanParams.isReLoan) {
      return;
    }

    let cancelled = false;

    const prefillFromExistingCustomer = async () => {
      const existing = await getCustomerById(
        reLoanParams.customerId
      );

      const previous = await findCustomerAndLoan(
        reLoanParams.previousLoanId
      );

      if (cancelled || !existing || !previous) {
        return;
      }

      const reLoanContext = createReLoanContext({
        customer: existing,
        loan: previous.loan,
      });

      setFormData((current) => ({
        ...current,
        ...existing,
        loan: {
          ...current.loan,
          ...reLoanContext,
        },
        reLoanContext,
      }));
    };

    prefillFromExistingCustomer();

    return () => {
      cancelled = true;
    };
  }, [
    reLoanParams.customerId,
    reLoanParams.isReLoan,
    reLoanParams.previousLoanId,
  ]);

  const [stepValidity, setStepValidity] = useState({
    1: true,
    2: false,
    3: true,
    4: true,
    5: true,
    6: true,
  });

  /*
   * --------------------------------------------------------
   * CURRENT STEP
   * --------------------------------------------------------
   */

  const currentStepInfo = useMemo(
    () => steps[currentStep - 1],
    [currentStep]
  );

  /*
   * --------------------------------------------------------
   * PREVIEW REPAYMENT SCHEDULE
   *
   * IMPORTANT:
   * This is only a preview.
   * Nothing is saved here.
   * The final schedule is generated again
   * during Create Customer.
   * --------------------------------------------------------
   */

  const repaymentSchedulePreview = useMemo(() => {
    const loan = formData.loan || {};

    if (
      !loan.loanAmount ||
      !loan.repayment?.tenure
    ) {
      return [];
    }

    try {
      return generateRepaymentSchedule({
        principal: Number(
          loan.loanAmount || 0
        ),

        rate: Number(
          loan.interest?.rate || 0
        ),

        tenure: Number(
          loan.repayment?.tenure || 0
        ),

        tenureUnit:
          loan.repayment?.tenureUnit ||
          "Months",

        interestType:
          loan.interest?.type ||
          "Flat",

        repaymentMethod:
          loan.repayment?.method ||
          "EMI",

        frequency:
          loan.repayment?.frequency ||
          "Monthly",

        firstDueDate:
          loan.firstDueDate || "",
      });
    } catch (error) {
      console.error(
        "Repayment preview failed:",
        error
      );

      return [];
    }
  }, [
    formData.loan,
  ]);

  /*
   * --------------------------------------------------------
   * CLOSE
   * --------------------------------------------------------
   */

  const handleClose = useCallback(() => {
    navigate("/customers");
  }, [navigate]);

  /*
   * --------------------------------------------------------
   * VALIDITY
   * --------------------------------------------------------
   */

  const updateStepValidity = useCallback(
    (step, valid) => {
      setStepValidity((previous) => {
        if (previous[step] === valid) {
          return previous;
        }

        return {
          ...previous,
          [step]: valid,
        };
      });
    },
    []
  );

  const handleKycValidation = useCallback(
    (valid) => {
      updateStepValidity(2, valid);
    },
    [updateStepValidity]
  );

  /*
   * --------------------------------------------------------
   * NEXT
   * --------------------------------------------------------
   */

const handleNext = useCallback(() => {
  const currentStepIsValid =
    stepValidity[currentStep] === true;

  if (!currentStepIsValid) {
    return;
  }

  // Step 4: No guarantor -> directly go to Loan
  if (
    currentStep === 4 &&
    formData.guarantor?.hasGuarantor === false
  ) {
    setCurrentStep(5);
    return;
  }

  // Normal next step
  if (currentStep < steps.length) {
    setCurrentStep((previous) => previous + 1);
  }
}, [
  currentStep,
  stepValidity,
  formData.guarantor?.hasGuarantor,
]);
  /*
   * --------------------------------------------------------
   * BACK
   * --------------------------------------------------------
   */

  const handleBack = useCallback(() => {
    if (currentStep === 1) {
      handleClose();
      return;
    }

    setCurrentStep(
      (previous) => previous - 1
    );
  }, [
    currentStep,
    handleClose,
  ]);

  /*
   * --------------------------------------------------------
   * STEP CLICK
   * --------------------------------------------------------
   */

  const handleStepClick = useCallback(
    (stepId) => {
      if (stepId <= currentStep) {
        setCurrentStep(stepId);
      }
    },
    [currentStep]
  );

  /*
   * --------------------------------------------------------
   * CUSTOMER PERSONAL
   * --------------------------------------------------------
   */

  const updateCustomerPersonal = useCallback(
    (data) => {
      setFormData((previous) => ({
        ...previous,

        customer: {
          ...previous.customer,

          personal: {
            ...previous.customer.personal,
            ...data,
          },
        },
      }));
    },
    []
  );

  /*
   * --------------------------------------------------------
   * KYC
   * --------------------------------------------------------
   */

  const updateCustomerKyc = useCallback(
    (data) => {
      setFormData((previous) => ({
        ...previous,

        customer: {
          ...previous.customer,
          ...data,
        },
      }));
    },
    []
  );

  /*
   * --------------------------------------------------------
   * VEHICLE / RC
   * --------------------------------------------------------
   */

const updateVehicleData = useCallback(
  (data) => {
    setFormData((previous) => {
      const incomingVehicle =
        data?.vehicle || {};

      // New vehicles get their id from the server on save; an existing
      // one (re-loan against the same vehicle) keeps the id it has.
      const vehicleId =
        previous?.vehicle?.vehicleId ||
        previous?.vehicle?.id ||
        "";

      return {
        ...previous,

        vehicle: {
          ...(previous?.vehicle || {}),
          ...incomingVehicle,

          id:
            incomingVehicle?.id ||
            incomingVehicle?.vehicleId ||
            vehicleId,

          vehicleId:
            incomingVehicle?.vehicleId ||
            incomingVehicle?.id ||
            vehicleId,
        },

        rc: {
          ...(previous?.rc || {}),
          ...(data?.rc || {}),
        },
      };
    });
  },
  []
);
  /*
   * --------------------------------------------------------
   * GUARANTOR
   * --------------------------------------------------------
   */

  const updateGuarantorData = useCallback(
    (data) => {
      setFormData((previous) => ({
        ...previous,

        guarantor: {
          ...previous.guarantor,
          ...(data.guarantor || {}),
        },
      }));
    },
    []
  );

  /*
   * --------------------------------------------------------
   * LOAN
   * --------------------------------------------------------
   */

  const updateLoanData = useCallback(
    (data) => {
      setFormData((previous) => ({
        ...previous,

        loan: {
          ...previous.loan,
          ...(data.loan || {}),
        },
      }));
    },
    []
  );

  /*
   * --------------------------------------------------------
   * CREATE CUSTOMER
   *
   * The API assigns identifiers, recalculates the loan and
   * generates the repayment schedule, so this only validates
   * funding and submits the captured form data.
   * --------------------------------------------------------
   */

  const handleCreateCustomer = useCallback(async () => {
    let createdCustomerId = "";

    try {
      const now = new Date().toISOString();

      const loan = formData.loan || {};

      const loanAmount = Number(
        loan.loanAmount || 0
      );

      const fundingSummary =
        getInvestmentPoolSummary();

      if (
        !Number.isFinite(loanAmount) ||
        loanAmount <= 0
      ) {
        throw new Error(
          "Loan amount must be greater than zero."
        );
      }

      if (
        loanAmount >
        fundingSummary.availableInvestmentBalance
      ) {
        throw new Error(
          `Insufficient investment balance. Available funding: ₹${fundingSummary.availableInvestmentBalance.toLocaleString("en-IN")}.`
        );
      }

      const fundingTransactionId =
        getNextInvestorTransactionId();

      /*
       * The API assigns the customer, vehicle and loan identifiers and
       * builds the repayment schedule from the loan terms, so only the
       * captured form data is sent.
       */
      const payload = {
        ...formData,

        customer: {
          ...formData.customer,
          status: "Active",
        },

        loan: {
          ...loan,

          funding: {
            source: "investment-pool",
            fundedAmount: loanAmount,
            allocationDate: now,
            fundingTransactionId,
          },

          ...(reLoanParams.isReLoan
            ? {
                previousLoanId:
                  loan?.previousLoanId ||
                  reLoanParams.previousLoanId,
                previousLoanNumber:
                  loan?.previousLoanNumber ||
                  (await findCustomerAndLoan(
                    reLoanParams.previousLoanId
                  ))?.loan?.loanNumber ||
                  "",
                collateralVehicleMode:
                  loan?.collateralVehicleMode ||
                  "same",
              }
            : {}),

          status: "Active",
        },
      };

      let savedRecord;

      if (reLoanParams.isReLoan) {
        const eligibility =
          checkReLoanEligibility({
            customer: await getCustomerById(
              reLoanParams.customerId
            ),
            loan: (await findCustomerAndLoan(
              reLoanParams.previousLoanId
            ))?.loan,
            vehicle: formData.vehicle,
            rules: getReLoanRules(),
          });

        if (!eligibility.eligible) {
          throw new Error(
            "Re-loan eligibility has changed. Please review the updated result."
          );
        }

        savedRecord = await appendLoanToCustomer(
          reLoanParams.customerId,
          payload.loan
        );
      } else {
        savedRecord = await saveCustomer(payload);
        createdCustomerId =
          savedRecord?.customer?.id || "";
      }

      /*
       * The newest loan on the returned record is the one just created.
       */
      const savedLoan = reLoanParams.isReLoan
        ? (savedRecord?.loans || []).at(-1) ||
          savedRecord?.loan
        : savedRecord?.loan;

      allocateInvestmentPoolToLoan({
        amount: loanAmount,
        loanId: savedLoan?.id,
        loanNumber: savedLoan?.loanNumber,
        date: now,
        transactionId: fundingTransactionId,
      });

      navigate("/customers");
    } catch (error) {
      /*
       * Investor allocation still lives in the browser, so if it fails
       * after the customer was created the new record is removed again
       * rather than leaving a loan with no funding behind it.
       */
      if (createdCustomerId) {
        try {
          await deleteCustomer(createdCustomerId);
        } catch (rollbackError) {
          console.error(
            "Failed to roll back the created customer:",
            rollbackError
          );
        }
      }

      console.error(
        "Create Customer failed:",
        error
      );

      window.alert(
        `Unable to create customer.\n\n${
          error?.message ||
          "Unknown error"
        }`
      );
    }
  }, [
    formData,
    navigate,
    reLoanParams.customerId,
    reLoanParams.isReLoan,
    reLoanParams.previousLoanId,
  ]);

  /*
   * --------------------------------------------------------
   * RENDER CURRENT STEP
   * --------------------------------------------------------
   */

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <CustomerInfoStep
            data={
              formData.customer.personal
            }
            onChange={
              updateCustomerPersonal
            }
          />
        );

      case 2:
        return (
          <KycDocumentsStep
            data={
              formData.customer
            }
            onChange={
              updateCustomerKyc
            }
            onValidationChange={
              handleKycValidation
            }
          />
        );

      case 3:
        return (
          <VehicleRcStep
            data={{
              vehicle:
                formData.vehicle,
              rc:
                formData.rc,
            }}
            onChange={
              updateVehicleData
            }
          />
        );

    case 4:
  return (
    <GuarantorStep
      data={{
        guarantor: formData.guarantor,
      }}
      onChange={updateGuarantorData}
      onNoGuarantor={() => {
        setCurrentStep(5);
      }}
    />
  );

      case 5:
        return (
          <LoanDetailsStep
            data={{
              loan:
                formData.loan,
            }}
            onChange={
              updateLoanData
            }
          />
        );
case 6:
  return (
    <ReviewStep
      data={{
        ...formData,

        loan: {
          ...formData.loan,

          repaymentSchedule:
            repaymentSchedulePreview,
        },
      }}
      onEdit={setCurrentStep}
      onViewSchedule={() => {
        const loan = {
          ...formData.loan,
          repaymentSchedule:
            repaymentSchedulePreview,
        };

        if (!repaymentSchedulePreview.length) {
          window.alert(
            "Please complete the loan amount, tenure and repayment details first."
          );
          return;
        }

        setCreatedLoan(loan);
        setShowRepaymentSchedule(true);
      }}
    />
  );

      default:
        return null;
    }
  };

  const canContinue =
    stepValidity[currentStep] === true;

  const [collateralVehicles, setCollateralVehicles] =
    useState([]);

  useEffect(() => {
    let cancelled = false;

    getVehicles().then((vehicles) => {
      if (!cancelled) {
        setCollateralVehicles(vehicles);
      }
    });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div
      className="
        fixed
        inset-0
        z-[100]
        flex
        items-center
        justify-center
        bg-slate-950/45
        p-0
        backdrop-blur-[3px]
        sm:p-3
      "
    >
      <div
        className="
          flex
          h-[100dvh]
          w-full
          max-w-full
          flex-col
          overflow-hidden
          bg-white
          shadow-2xl
          ring-1
          ring-black/5
          sm:h-[calc(100vh-24px)]
          sm:max-w-[920px]
          sm:rounded-2xl
        "
      >
        {/* HEADER */}
        <header
          className="
            shrink-0
            border-b
            border-slate-100
            px-3.5
            py-3
            sm:px-6
            sm:py-3.5
          "
        >
          <div className="flex items-center justify-between gap-2 sm:gap-4">
            <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
              <div
                className="
                  flex
                  h-9
                  w-9
                  shrink-0
                  items-center
                  justify-center
                  rounded-full
                  bg-[#EAF5EF]
                  sm:h-10
                  sm:w-10
                "
              >
                <User
                  size={18}
                  className="text-[#0B5D3B] sm:hidden"
                />
                <User
                  size={20}
                  className="hidden text-[#0B5D3B] sm:block"
                />
              </div>

              <div className="min-w-0">
                <h1 className="truncate text-sm font-semibold text-[#17221D] sm:text-[17px]">
                  Customer Onboarding
                </h1>

                <p className="hidden truncate text-xs text-slate-500 sm:block">
                  Create customer and vehicle finance record
                </p>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              <span className="whitespace-nowrap rounded-full bg-[#EAF5EF] px-2.5 py-1 text-[10px] font-semibold text-[#0B5D3B] sm:px-3 sm:text-[11px]">
                Step {currentStep} of {steps.length}
              </span>

              <button
                type="button"
                onClick={handleClose}
                className="
                  flex
                  h-8
                  w-8
                  shrink-0
                  items-center
                  justify-center
                  rounded-lg
                  text-slate-400
                  hover:bg-slate-100
                  hover:text-slate-700
                "
              >
                <X size={18} />
              </button>
            </div>
          </div>
        </header>

        {reLoanParams.isReLoan && (
          <section className="shrink-0 border-b border-[#D8E9DF] bg-[#F6FBF8] px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[9px] font-extrabold uppercase tracking-wide text-[#0B6B43]">Existing Customer · RE-LOAN</p>
                <p className="mt-1 text-xs font-bold text-[#17221D]">
                  Previous Loan: {formData.loan?.previousLoanNumber || reLoanParams.previousLoanId}
                </p>
              </div>
              <label className="flex items-center gap-2 text-[10px] font-semibold text-slate-600">
                Collateral Vehicle
                <select
                  value={formData.loan?.collateralVehicleMode || "same"}
                  onChange={async (event) => {
                    const mode = event.target.value;
                    const previous = await findCustomerAndLoan(reLoanParams.previousLoanId);
                    const selected = mode === "same"
                      ? previous?.vehicle || formData.vehicle
                      : formData.vehicle;
                    setFormData((current) => ({
                      ...current,
                      vehicle: selected || current.vehicle,
                      loan: {
                        ...current.loan,
                        collateralVehicleMode: mode,
                        vehicleId: selected?.vehicleId || selected?.id || current.loan?.vehicleId || "",
                      },
                    }));
                  }}
                  className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-[10px] font-semibold text-slate-700"
                >
                  <option value="same">Same Vehicle</option>
                  <option value="different">Different Vehicle</option>
                </select>
              </label>
            </div>
            {formData.loan?.collateralVehicleMode === "different" && (
              <select
                value={formData.loan?.vehicleId || ""}
                onChange={(event) => {
                  const selected = collateralVehicles.find(
                    (vehicle) => String(vehicle?.vehicleId || vehicle?.id) === String(event.target.value)
                  );
                  if (!selected) return;
                  setFormData((current) => ({
                    ...current,
                    vehicle: selected,
                    loan: { ...current.loan, vehicleId: selected.vehicleId || selected.id },
                  }));
                }}
                className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[10px] font-semibold text-slate-700 sm:max-w-sm"
              >
                <option value="">Select Vehicle</option>
                {collateralVehicles.map((vehicle) => (
                  <option key={vehicle.vehicleId || vehicle.id} value={vehicle.vehicleId || vehicle.id}>
                    {vehicle.registrationNumber || vehicle.vehicleId || vehicle.id}
                  </option>
                ))}
              </select>
            )}
          </section>
        )}

        {/* STEPPER */}
        <div
          className="
            shrink-0
            border-b
            border-slate-100
            px-3.5
            py-2.5
            sm:px-6
          "
        >
          <div className="flex items-center overflow-x-auto">
            {steps.map((step, index) => {
              const Icon = step.icon;

              const completed =
                step.id < currentStep;

              const active =
                step.id === currentStep;

              return (
                <div
                  key={step.id}
                  className="
                    flex
                    min-w-[52px]
                    shrink-0
                    items-center
                    sm:min-w-0
                    sm:flex-1
                    sm:shrink
                  "
                >
                  <button
                    type="button"
                    disabled={
                      step.id > currentStep
                    }
                    onClick={() =>
                      handleStepClick(
                        step.id
                      )
                    }
                    className="
                      group
                      flex
                      min-w-0
                      flex-col
                      items-center
                      gap-1
                      disabled:cursor-default
                    "
                  >
                    <div
                      className={`
                        flex
                        h-7
                        w-7
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        border
                        sm:h-8
                        sm:w-8

                        ${
                          completed
                            ? "border-[#0B5D3B] bg-[#0B5D3B] text-white"
                            : active
                            ? "border-[#0B5D3B] bg-white text-[#0B5D3B] ring-4 ring-[#EAF5EF]"
                            : "border-slate-200 bg-white text-slate-400"
                        }
                      `}
                    >
                      {completed ? (
                        <Check
                          size={14}
                          strokeWidth={2.5}
                        />
                      ) : (
                        <Icon size={14} />
                      )}
                    </div>

                    <span
                      className={`
                        hidden
                        truncate
                        text-[10px]
                        font-medium
                        sm:block
                        ${
                          active ||
                          completed
                            ? "text-[#17221D]"
                            : "text-slate-400"
                        }
                      `}
                    >
                      {step.shortTitle}
                    </span>
                  </button>

                  {index <
                    steps.length - 1 && (
                    <div
                      className={`
                        mx-1.5
                        h-px
                        w-5
                        shrink-0
                        sm:mx-2
                        sm:mt-[-15px]
                        sm:w-auto
                        sm:min-w-[10px]
                        sm:flex-1
                        ${
                          completed
                            ? "bg-[#0B5D3B]"
                            : "bg-slate-200"
                        }
                      `}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* STEP TITLE */}
        <div
          className="
            shrink-0
            px-3.5
            pb-2
            pt-2.5
            sm:px-6
          "
        >
          <h2 className="text-sm font-semibold text-[#17221D] sm:text-[15px]">
            {currentStepInfo.title}
          </h2>

          <p className="text-[11px] text-slate-400">
            {STEP_DESCRIPTIONS[currentStep]}
          </p>
        </div>

        {/* FORM AREA
            IMPORTANT:
            No page-level scrolling.
            Individual step content must stay compact.
        */}
        <div
          className="
            min-h-0
            flex-1
            overflow-hidden
            px-3.5
            pb-3
            pt-1
            sm:px-6
          "
        >
          {renderCurrentStep()}
        </div>

        {/* FOOTER */}
        <footer
          className="
            flex
            shrink-0
            items-center
            justify-between
            gap-2
            border-t
            border-slate-100
            bg-white
            px-3.5
            py-2.5
            sm:px-6
            sm:py-3
          "
        >
          <button
            type="button"
            onClick={handleBack}
            className="
              inline-flex
              items-center
              gap-1.5
              rounded-lg
              border
              border-slate-200
              bg-white
              px-3
              py-2
              text-xs
              font-medium
              text-slate-600
              hover:border-slate-300
              hover:text-slate-800
              sm:px-3.5
            "
          >
            <ArrowLeft size={14} />

            {currentStep === 1
              ? "Cancel"
              : "Back"}
          </button>

          {currentStep <
          steps.length ? (
            <button
              type="button"
              onClick={handleNext}
              disabled={!canContinue}
              className={`
                inline-flex
                items-center
                gap-1.5
                rounded-lg
                px-3.5
                py-2
                text-xs
                font-semibold
                text-white
                shadow-sm
                sm:px-4

                ${
                  canContinue
                    ? "bg-[#0B5D3B] hover:bg-[#084A30]"
                    : "cursor-not-allowed bg-slate-300"
                }
              `}
            >
              Continue
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              onClick={
                handleCreateCustomer
              }
              className="
                inline-flex
                items-center
                gap-1.5
                rounded-lg
                bg-[#0B5D3B]
                px-3.5
                py-2
                text-xs
                font-semibold
                text-white
                shadow-sm
                hover:bg-[#084A30]
                sm:px-4
              "
            >
              <Check size={14} />
              Create Customer
            </button>
          )}
        </footer>
      </div>

      {/* REPAYMENT SCHEDULE PREVIEW MODAL */}
      {showRepaymentSchedule && createdLoan && (
        <RepaymentScheduleModal
          loan={createdLoan}
          customer={formData.customer.personal}
          schedule={createdLoan.repaymentSchedule || []}
          onClose={() => {
            setShowRepaymentSchedule(false);
          }}
        />
      )}
    </div>
    
  );
};

export default CustomerOnboarding;