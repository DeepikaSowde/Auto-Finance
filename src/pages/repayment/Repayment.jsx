// src/pages/staff/Repayment.jsx

import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  Clock3,
  IndianRupee,
  MapPin,
  Receipt,
  Search,
  ShieldAlert,
  UserRound,
  WalletCards,
  X,
  LogOut,
  Calculator,
} from "lucide-react";

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
} from "react-router-dom";

import {
  getLoans,
} from "../../services/customerStorage";

import {
  addCollection,
  getCollections,
} from "../../services/collectionStorage";

import {
  getSession,
} from "../../services/authStorage";

import {
  getLoanRepaymentState,
  previewRepayment,
  getPaymentTypeFromAllocation,
} from "../../services/repaymentStorage";

/* =========================================================
   MAIN
========================================================= */

const Repayment = () => {
  const navigate = useNavigate();

  /* =======================================================
     STATE
  ======================================================= */

  const [loans, setLoans] = useState([]);

  const [
    collections,
    setCollections,
  ] = useState([]);

  const [
    search,
    setSearch,
  ] = useState("");

  const [
    selectedLoan,
    setSelectedLoan,
  ] = useState(null);

  const [
    amount,
    setAmount,
  ] = useState("");

  const [
    paymentMode,
    setPaymentMode,
  ] = useState("Cash");

  const [
    location,
    setLocation,
  ] = useState("");

  const [
    remarks,
    setRemarks,
  ] = useState("");

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    error,
    setError,
  ] = useState("");

  const [
    showSearchResults,
    setShowSearchResults,
  ] = useState(false);

  /* =======================================================
     LOGOUT
  ======================================================= */

  const handleLogout = () => {
    localStorage.removeItem(
      "auto_finance_auth"
    );

    navigate("/login", {
      replace: true,
    });
  };

  /* =======================================================
     LOAD / SYNC
  ======================================================= */

  useEffect(() => {
    const reload = async () => {
      const [loadedLoans, loadedCollections] =
        await Promise.all([
          safeGetLoans(),
          safeGetCollections(),
        ]);

      setLoans(loadedLoans);
      setCollections(loadedCollections);
    };

    reload();

    window.addEventListener(
      "auto-finance:data-updated",
      reload
    );

    window.addEventListener(
      "fleetopz:data-updated",
      reload
    );

    window.addEventListener(
      "storage",
      reload
    );

    return () => {
      window.removeEventListener(
        "auto-finance:data-updated",
        reload
      );

      window.removeEventListener(
        "fleetopz:data-updated",
        reload
      );

      window.removeEventListener(
        "storage",
        reload
      );
    };
  }, []);

  /* =======================================================
     NORMALIZE
  ======================================================= */

  const normalize = (value) =>
    String(value || "")
      .trim()
      .toLowerCase();

  /* =======================================================
     LOAN STATUS GUARD
  ======================================================= */

  const isLoanClosedLike = (loan) => {
    const status = normalize(
      loan?.status
    );

    return [
      "closed",
      "foreclosed",
      "paid",
      "paid off",
      "paid_off",
      "settled",
    ].includes(status);
  };

  const isCollectionEnabled = (loan) => {
    return Boolean(
      loan &&
      !isLoanClosedLike(loan)
    );
  };

  /* =======================================================
     CUSTOMER HELPERS
  ======================================================= */

  const getCustomerName = (loan) =>
    loan?.customerName ||
    loan?.customer?.personal?.name ||
    "Customer";

  const getCustomerNumber = (loan) =>
    loan?.customerNumber ||
    loan?.customer?.customerNumber ||
    loan?.customerId ||
    "—";

  const getCustomerMobile = (loan) =>
    loan?.mobileNumber ||
    loan?.customer?.personal?.mobileNumber ||
    "—";

  const getLoanNumber = (loan) =>
    loan?.loanNumber ||
    "Loan";

  const getLoanId = (loan) =>
    loan?.id ||
    loan?.loanNumber ||
    "";

  const getVehicleName = (loan) =>
    [
      loan?.vehicle?.brand,
      loan?.vehicle?.model,
      loan?.vehicle?.variant,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Vehicle not assigned";

  /* =======================================================
     SEARCH
  ======================================================= */

  const searchableLoans = useMemo(() => {
    return loans.filter(
      (loan) =>
        isCollectionEnabled(loan)
    );
  }, [loans]);

  const filteredLoans = useMemo(() => {
    const query =
      search
        .trim()
        .toLowerCase();

    if (!query) {
      return [];
    }

    return searchableLoans
      .filter((loan) => {
        const searchable = [
          getCustomerName(loan),
          getCustomerNumber(loan),
          getCustomerMobile(loan),
          getLoanNumber(loan),
          loan?.id,
          loan?.customerId,
          getVehicleName(loan),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchable.includes(query);
      })
      .slice(0, 10);
  }, [
    search,
    searchableLoans,
  ]);

  /* =======================================================
     SELECT LOAN
  ======================================================= */

  const handleSelectLoan = (loan) => {
    setSelectedLoan(loan);

    setShowSearchResults(false);

    setMessage("");
    setError("");

    /*
     * Put the currently actionable amount
     * into the payment box automatically.
     *
     * Priority:
     * overdue + penalty
     * current due
     * future advance
     */
    const state =
      getLoanRepaymentState(
        loan
      );

    const actionableAmount =
      state.overdueAmount +
      state.currentDueAmount +
      state.penaltyAmount;

    if (
      actionableAmount > 0
    ) {
      setAmount(
        String(
          roundMoney(
            actionableAmount
          )
        )
      );
    } else if (
      state.futureAmount > 0
    ) {
      /*
       * No current/overdue payment.
       * This becomes Advance Payment.
       *
       * Do not force the whole future
       * amount; staff can enter whatever
       * advance amount the customer gives.
       */
      setAmount("");
    } else {
      setAmount("");
    }

    setPaymentMode("Cash");
    setLocation("");
    setRemarks("");
  };

  /* =======================================================
     CLEAR
  ======================================================= */

  const clearSelection = () => {
    setSelectedLoan(null);
    setAmount("");
    setPaymentMode("Cash");
    setLocation("");
    setRemarks("");
    setError("");
  };

  /* =======================================================
     LOAN STATE
  ======================================================= */

  const loanState = useMemo(() => {
    if (!selectedLoan) {
      return null;
    }

    try {
      return getLoanRepaymentState(
        selectedLoan
      );
    } catch (stateError) {
      console.error(
        "Failed to calculate repayment state:",
        stateError
      );

      return null;
    }
  }, [selectedLoan]);

  /* =======================================================
     PREVIEW
  ======================================================= */

  const repaymentPreview = useMemo(() => {
    if (!selectedLoan) {
      return null;
    }

    const numericAmount =
      Number(amount || 0);

    if (
      numericAmount <= 0
    ) {
      return null;
    }

    try {
      return previewRepayment({
        loan: selectedLoan,
        amount:
          numericAmount,
        penaltyAmount:
          loanState?.penaltyAmount ||
          0,
        allocationOptions: {
          allowAdvance: true,
          allowPrincipalPayment: false,
        },
      });
    } catch (previewError) {
      console.error(
        "Repayment preview failed:",
        previewError
      );

      return null;
    }
  }, [
    selectedLoan,
    amount,
    loanState,
  ]);

  /* =======================================================
     PAYMENT TYPE
  ======================================================= */

  const paymentType = useMemo(() => {
    if (
      repaymentPreview?.allocation
    ) {
      return getPaymentTypeFromAllocation(
        repaymentPreview.allocation
      );
    }

    if (!selectedLoan) {
      return "Payment";
    }

    if (
      loanState?.penaltyAmount > 0 &&
      loanState?.overdueAmount > 0 &&
      loanState?.currentDueAmount > 0
    ) {
      return "Overdue + Due + Advance";
    }

    if (
      loanState?.overdueAmount > 0
    ) {
      return "Overdue Payment";
    }

    if (
      loanState?.currentDueAmount > 0
    ) {
      return "Due Payment";
    }

    if (
      loanState?.futureAmount > 0
    ) {
      return "Advance Payment";
    }

    return "Payment";
  }, [
    repaymentPreview,
    selectedLoan,
    loanState,
  ]);

  /* =======================================================
     SUBMIT
  ======================================================= */

  const handleSubmit = async (event) => {
    event.preventDefault();

    setMessage("");
    setError("");

    if (!selectedLoan) {
      setError(
        "Select a customer or loan first."
      );

      return;
    }

    if (
      isLoanClosedLike(
        selectedLoan
      )
    ) {
      setError(
        "This loan is already closed or foreclosed."
      );

      return;
    }

    const numericAmount =
      roundMoney(
        amount
      );

    if (
      numericAmount <= 0
    ) {
      setError(
        "Enter a valid payment amount."
      );

      return;
    }

    /*
     * Re-read latest loan data before
     * creating the collection.
     */
    const latestLoans =
      await safeGetLoans();

    const latestLoan =
      latestLoans.find(
        (loan) =>
          String(
            getLoanId(loan)
          ) ===
          String(
            getLoanId(
              selectedLoan
            )
          )
      ) ||
      selectedLoan;

    if (
      isLoanClosedLike(
        latestLoan
      )
    ) {
      setError(
        "This loan is already closed or foreclosed."
      );

      setSelectedLoan(
        latestLoan
      );

      return;
    }

    let latestState;

    try {
      latestState =
        getLoanRepaymentState(
          latestLoan
        );
    } catch (stateError) {
      console.error(
        stateError
      );

      setError(
        "Unable to calculate the latest repayment state."
      );

      return;
    }

    let latestPreview;

    try {
      latestPreview =
        previewRepayment({
          loan:
            latestLoan,

          amount:
            numericAmount,

          penaltyAmount:
            latestState
              ?.penaltyAmount || 0,

          allocationOptions: {
            allowAdvance: true,
            allowPrincipalPayment: false,
          },
        });
    } catch (previewError) {
      console.error(
        previewError
      );

      setError(
        "Unable to calculate payment allocation."
      );

      return;
    }

    if (
      !latestPreview?.success
    ) {
      setError(
        getPreviewError(
          latestPreview
        )
      );

      return;
    }

    /*
     * Prevent a duplicate pending collection
     * when the same staff member/browser opens
     * the same loan again.
     *
     * This is only a safety check.
     */
    const blockingDuplicate =
      findDuplicatePendingCollection(
        collections,
        latestLoan
      );

    /*
     * For advance payments there may be
     * no scheduleId, so this duplicate guard
     * intentionally remains permissive.
     */
    if (
      blockingDuplicate &&
      hasMeaningfulScheduleTarget(
        blockingDuplicate
      )
    ) {
      /*
       * Do not block completely different
       * allocations. Only block when the
       * exact schedule is currently pending.
       */
      const previewItems =
        Array.isArray(
          latestPreview?.allocation
            ?.items
        )
          ? latestPreview
              .allocation
              .items
          : [];

      const sameSchedule =
        previewItems.some(
          (item) =>
            item?.scheduleId &&
            String(
              item.scheduleId
            ) ===
            String(
              blockingDuplicate
                .scheduleId
            )
        );

      if (sameSchedule) {
        setError(
          "A collection for this repayment is already waiting for Admin approval."
        );

        return;
      }
    }

    /*
     * Get staff session.
     */
    const session =
      safeGetSession();

    /*
     * Build audit-safe collection.
     *
     * IMPORTANT:
     * This creates Pending only.
     *
     * It does NOT change the loan.
     *
     * Loan/schedule/dashboard updates happen
     * after Admin approval.
     */
    let newCollection;

    try {
      newCollection =
        await addCollection({
          customerId:
            latestLoan?.customerId ||
            latestLoan?.customer?.id ||
            "",

          customerName:
            getCustomerName(
              latestLoan
            ),

          customerNumber:
            getCustomerNumber(
              latestLoan
            ),

          mobileNumber:
            getCustomerMobile(
              latestLoan
            ),

          loanId:
            latestLoan?.id ||
            "",

          loanNumber:
            latestLoan?.loanNumber ||
            "",

          vehicleId:
            latestLoan?.vehicle?.id ||
            latestLoan?.vehicle?.vehicleId ||
            "",

          vehicleName:
            getVehicleName(
              latestLoan
            ),

          /*
           * These are populated when
           * there is one clear schedule target.
           *
           * Full allocation remains available
           * in allocation.items.
           */
          scheduleId:
            getPrimaryScheduleId(
              latestPreview
            ),

          installment:
            getPrimaryInstallment(
              latestPreview
            ),

          dueDate:
            getPrimaryDueDate(
              latestPreview
            ),

          collectedDate:
            getTodayKey(),

          amount:
            numericAmount,

          dueAmount:
            roundMoney(
              latestPreview
                ?.allocation
                ?.overdue +
                latestPreview
                  ?.allocation
                  ?.currentDue
            ),

          penaltyAmount:
            roundMoney(
              latestPreview
                ?.allocation
                ?.penalty
            ),

          totalPayable:
            numericAmount,

          amountTowardDue:
            roundMoney(
              latestPreview
                ?.allocation
                ?.overdue +
                latestPreview
                  ?.allocation
                  ?.currentDue
            ),

          amountTowardPenalty:
            roundMoney(
              latestPreview
                ?.allocation
                ?.penalty
            ),

          amountTowardAdvance:
            roundMoney(
              latestPreview
                ?.allocation
                ?.advance
            ),

          amountTowardPrincipal:
            roundMoney(
              latestPreview
                ?.allocation
                ?.principal
            ),

          amountExcess:
            roundMoney(
              latestPreview
                ?.allocation
                ?.excess
            ),

          paymentType:
            paymentType ||
            "Payment",

          overdue:
            (
              latestPreview
                ?.allocation
                ?.overdue || 0
            ) > 0,

          overdueDays:
            getPrimaryOverdueDays(
              latestPreview,
              latestState
            ),

          graceDays:
            getPrimaryGraceDays(
              latestPreview,
              latestState
            ),

          penaltyDays:
            getPrimaryPenaltyDays(
              latestPreview
            ),

          penaltyType:
            latestState?.penaltyRows?.[0]
              ?.penaltyType ||
            latestLoan?.charges
              ?.penalty?.type ||
            "Fixed",

          penaltyRate:
            Number(
              latestState
                ?.penaltyRows?.[0]
                ?.penaltyRate ||
                latestLoan
                  ?.charges
                  ?.penalty
                  ?.amount ||
                latestLoan
                  ?.charges
                  ?.defaultInterest ||
                0
            ),

          /*
           * Complete repayment allocation.
           */
          allocation:
            buildCollectionAllocation(
              latestPreview
            ),

          paymentMode,

          location:
            location.trim(),

          remarks:
            remarks.trim(),

          staffName:
            session?.name ||
            session?.username ||
            "Staff",

          staffId:
            session?.id ||
            session?.userId ||
            "",

          status:
            "Pending",
        });
    } catch (submitError) {
      console.error(
        "Failed to submit repayment:",
        submitError
      );

      setError(
        submitError?.message ||
        "Unable to submit repayment."
      );

      return;
    }

    setMessage(
      `Repayment ${newCollection?.id || ""} submitted for Admin approval.`
    );

    setCollections(
      await safeGetCollections()
    );

    setLoans(
      await safeGetLoans()
    );

    setSelectedLoan(
      null
    );

    setAmount("");
    setPaymentMode(
      "Cash"
    );
    setLocation("");
    setRemarks("");
    setSearch("");
    setShowSearchResults(
      false
    );
  };

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div
      className="
        min-h-full
        bg-[#F6F8F7]
        p-3
        sm:p-4
        lg:p-5
      "
    >
      {/* ===================================================
          HEADER
      ==================================================== */}

      <div
        className="
          mb-4
          flex
          flex-col
          gap-3
          sm:flex-row
          sm:items-center
          sm:justify-between
        "
      >
        <div>
          <div
            className="
              flex
              items-center
              gap-2
            "
          >
            <div
              className="
                flex
                h-9
                w-9
                items-center
                justify-center
                rounded-lg
                bg-[#EAF5EF]
              "
            >
              <Calculator
                size={17}
                className="text-[#0B6B43]"
              />
            </div>

            <div>
              <h1
                className="
                  text-[22px]
                  font-extrabold
                  tracking-tight
                  text-[#17221D]
                "
              >
                Repayment
              </h1>

              <p
                className="
                  mt-0.5
                  text-[9px]
                  font-medium
                  text-slate-400
                "
              >
                Record customer repayments and
                submit them for Admin approval
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={
            handleLogout
          }
          className="
            inline-flex
            h-9
            items-center
            gap-1.5
            self-start
            rounded-lg
            border
            border-slate-200
            bg-white
            px-3
            text-[10px]
            font-semibold
            text-slate-600
            transition
            hover:border-red-200
            hover:bg-red-50
            hover:text-red-600
            sm:self-auto
          "
        >
          <LogOut
            size={14}
          />
          Logout
        </button>
      </div>

      {/* ===================================================
          MESSAGE
      ==================================================== */}

      {message && (
        <div
          className="
            mb-3
            flex
            items-center
            gap-2
            rounded-lg
            border
            border-[#CFE8D9]
            bg-[#F0FAF4]
            px-3
            py-2.5
          "
        >
          <CheckCircle2
            size={15}
            className="shrink-0 text-[#0B6B43]"
          />

          <p
            className="
              text-[9px]
              font-semibold
              text-[#0B6B43]
            "
          >
            {message}
          </p>
        </div>
      )}

      {error && (
        <div
          className="
            mb-3
            flex
            items-center
            gap-2
            rounded-lg
            border
            border-red-200
            bg-red-50
            px-3
            py-2.5
          "
        >
          <AlertCircle
            size={15}
            className="shrink-0 text-red-600"
          />

          <p
            className="
              text-[9px]
              font-semibold
              text-red-600
            "
          >
            {error}
          </p>
        </div>
      )}

      {/* ===================================================
          SEARCH
      ==================================================== */}

      <section
        className="
          rounded-xl
          border
          border-slate-200
          bg-white
          p-3
          shadow-sm
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          <div
            className="
              flex
              h-8
              w-8
              shrink-0
              items-center
              justify-center
              rounded-lg
              bg-[#EAF5EF]
            "
          >
            <Search
              size={15}
              className="text-[#0B6B43]"
            />
          </div>

          <div>
            <h2
              className="
                text-[12px]
                font-extrabold
                text-[#17221D]
              "
            >
              Search Customer / Loan
            </h2>

            <p
              className="
                mt-0.5
                text-[8px]
                text-slate-400
              "
            >
              Search by name, mobile, customer
              number, loan number or vehicle
            </p>
          </div>
        </div>

        <div
          className="
            relative
            mt-3
          "
        >
          <Search
            size={14}
            className="
              pointer-events-none
              absolute
              left-3
              top-1/2
              -translate-y-1/2
              text-slate-400
            "
          />

          <input
            type="text"
            value={search}
            onChange={(event) => {
              setSearch(
                event.target.value
              );

              setShowSearchResults(
                Boolean(
                  event.target.value.trim()
                )
              );
            }}
            onFocus={() =>
              setShowSearchResults(
                Boolean(
                  search.trim()
                )
              )
            }
            placeholder="
              Search customer, mobile, loan number...
            "
            className="
              h-10
              w-full
              rounded-lg
              border
              border-slate-200
              bg-white
              pl-9
              pr-3
              text-[10px]
              font-semibold
              text-[#17221D]
              outline-none
              transition
              focus:border-[#9CCEB1]
              focus:ring-1
              focus:ring-[#DCEFE4]
            "
          />

          {showSearchResults &&
            search.trim() && (
              <div
                className="
                  absolute
                  left-0
                  right-0
                  top-[46px]
                  z-50
                  overflow-hidden
                  rounded-xl
                  border
                  border-slate-200
                  bg-white
                  shadow-xl
                "
              >
                {filteredLoans.length ===
                0 ? (
                  <div
                    className="
                      px-4
                      py-5
                      text-center
                    "
                  >
                    <p
                      className="
                        text-[10px]
                        font-bold
                        text-slate-500
                      "
                    >
                      No open loan found
                    </p>

                    <p
                      className="
                        mt-1
                        text-[8px]
                        text-slate-400
                      "
                    >
                      Closed and foreclosed
                      loans are excluded.
                    </p>
                  </div>
                ) : (
                  <div
                    className="
                      max-h-[360px]
                      overflow-y-auto
                    "
                  >
                    {filteredLoans.map(
                      (loan) => {
                        const state =
                          safeGetLoanState(
                            loan
                          );

                        return (
                          <button
                            key={
                              getLoanId(
                                loan
                              )
                            }
                            type="button"
                            onClick={() =>
                              handleSelectLoan(
                                loan
                              )
                            }
                            className="
                              flex
                              w-full
                              items-center
                              justify-between
                              gap-3
                              border-b
                              border-slate-100
                              px-4
                              py-3
                              text-left
                              transition
                              last:border-b-0
                              hover:bg-[#F7FBF8]
                            "
                          >
                            <div
                              className="
                                flex
                                min-w-0
                                items-center
                                gap-3
                              "
                            >
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
                                "
                              >
                                <UserRound
                                  size={15}
                                  className="text-[#0B6B43]"
                                />
                              </div>

                              <div
                                className="
                                  min-w-0
                                "
                              >
                                <p
                                  className="
                                    truncate
                                    text-[10px]
                                    font-extrabold
                                    text-[#17221D]
                                  "
                                >
                                  {getCustomerName(
                                    loan
                                  )}
                                </p>

                                <p
                                  className="
                                    mt-0.5
                                    truncate
                                    text-[8px]
                                    font-semibold
                                    text-slate-400
                                  "
                                >
                                  {
                                    loan?.loanNumber
                                  }
                                  {" · "}
                                  {
                                    getCustomerMobile(
                                      loan
                                    )
                                  }
                                </p>

                                <p
                                  className="
                                    mt-0.5
                                    truncate
                                    text-[8px]
                                    text-slate-500
                                  "
                                >
                                  {getVehicleName(
                                    loan
                                  )}
                                </p>
                              </div>
                            </div>

                            <div
                              className="
                                shrink-0
                                text-right
                              "
                            >
                              <span
                                className="
                                  inline-flex
                                  rounded-full
                                  bg-[#EAF5EF]
                                  px-2
                                  py-1
                                  text-[7px]
                                  font-extrabold
                                  text-[#0B6B43]
                                "
                              >
                                {formatStateLabel(
                                  state
                                )}
                              </span>

                              <p
                                className="
                                  mt-1
                                  text-[8px]
                                  font-bold
                                  text-slate-500
                                "
                              >
                                ₹
                                {money(
                                  state?.outstanding
                                )}
                              </p>
                            </div>
                          </button>
                        );
                      }
                    )}
                  </div>
                )}
              </div>
            )}
        </div>
      </section>

      {/* ===================================================
          SELECTED LOAN
      ==================================================== */}

      {selectedLoan ? (
        <div
          className="
            mt-3
            grid
            gap-3
            xl:grid-cols-[minmax(0,1.4fr)_minmax(360px,0.8fr)]
          "
        >
          {/* LEFT */}
          <div
            className="
              min-w-0
              space-y-3
            "
          >
            {/* CUSTOMER CARD */}

            <section
              className="
                rounded-xl
                border
                border-slate-200
                bg-white
                p-4
                shadow-sm
              "
            >
              <div
                className="
                  flex
                  items-start
                  justify-between
                  gap-3
                "
              >
                <div
                  className="
                    flex
                    min-w-0
                    items-center
                    gap-3
                  "
                >
                  <div
                    className="
                      flex
                      h-11
                      w-11
                      shrink-0
                      items-center
                      justify-center
                      rounded-full
                      bg-[#EAF5EF]
                    "
                  >
                    <UserRound
                      size={18}
                      className="text-[#0B6B43]"
                    />
                  </div>

                  <div className="min-w-0">
                    <div
                      className="
                        flex
                        flex-wrap
                        items-center
                        gap-2
                      "
                    >
                      <h2
                        className="
                          truncate
                          text-[14px]
                          font-extrabold
                          text-[#17221D]
                        "
                      >
                        {getCustomerName(
                          selectedLoan
                        )}
                      </h2>

                      <span
                        className="
                          rounded-full
                          bg-[#EAF5EF]
                          px-2
                          py-1
                          text-[7px]
                          font-extrabold
                          text-[#0B6B43]
                        "
                      >
                        {selectedLoan?.status ||
                          "Active"}
                      </span>
                    </div>

                    <div
                      className="
                        mt-1
                        flex
                        flex-wrap
                        items-center
                        gap-2
                      "
                    >
                      <span
                        className="
                          text-[8px]
                          font-semibold
                          text-slate-400
                        "
                      >
                        {
                          selectedLoan?.loanNumber
                        }
                      </span>

                      <span className="text-slate-300">
                        •
                      </span>

                      <span
                        className="
                          text-[8px]
                          text-slate-400
                        "
                      >
                        {getCustomerMobile(
                          selectedLoan
                        )}
                      </span>

                      <span className="text-slate-300">
                        •
                      </span>

                      <span
                        className="
                          text-[8px]
                          text-slate-500
                        "
                      >
                        {getVehicleName(
                          selectedLoan
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={
                    clearSelection
                  }
                  className="
                    flex
                    h-8
                    w-8
                    shrink-0
                    items-center
                    justify-center
                    rounded-lg
                    text-slate-400
                    transition
                    hover:bg-slate-50
                    hover:text-slate-700
                  "
                >
                  <X
                    size={15}
                  />
                </button>
              </div>
            </section>

            {/* LOAN STATE */}

            {loanState && (
              <RepaymentStateCard
                state={
                  loanState
                }
              />
            )}

            {/* PREVIEW */}

            {repaymentPreview && (
              <AllocationPreview
                preview={
                  repaymentPreview
                }
                paymentType={
                  paymentType
                }
              />
            )}
          </div>

          {/* RIGHT */}

          <section
            className="
              rounded-xl
              border
              border-slate-200
              bg-white
              p-4
              shadow-sm
            "
          >
            <div
              className="
                flex
                items-center
                justify-between
                gap-3
              "
            >
              <div
                className="
                  flex
                  items-center
                  gap-2
                "
              >
                <div
                  className="
                    flex
                    h-8
                    w-8
                    items-center
                    justify-center
                    rounded-lg
                    bg-[#EAF5EF]
                  "
                >
                  <Receipt
                    size={15}
                    className="text-[#0B6B43]"
                  />
                </div>

                <div>
                  <h3
                    className="
                      text-[12px]
                      font-extrabold
                      text-[#17221D]
                    "
                  >
                    Record Repayment
                  </h3>

                  <p
                    className="
                      mt-0.5
                      text-[8px]
                      text-slate-400
                    "
                  >
                    Payment is sent to Admin
                    for approval
                  </p>
                </div>
              </div>

              <span
                className="
                  rounded-full
                  bg-[#EAF5EF]
                  px-2
                  py-1
                  text-[7px]
                  font-extrabold
                  text-[#0B6B43]
                "
              >
                Auto Allocation
              </span>
            </div>

            <form
              onSubmit={
                handleSubmit
              }
              className="mt-4"
            >
              {/* AMOUNT */}

              <FormField
                label="Payment Amount"
              >
                <div className="relative">
                  <span
                    className="
                      absolute
                      left-3
                      top-1/2
                      -translate-y-1/2
                      text-[12px]
                      font-bold
                      text-slate-400
                    "
                  >
                    ₹
                  </span>

                  <input
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={
                      amount
                    }
                    onChange={(event) =>
                      setAmount(
                        event.target.value
                      )
                    }
                    className={`
                      ${inputClass}
                      h-11
                      pl-8
                      text-[12px]
                    `}
                    placeholder="Enter amount"
                    required
                  />
                </div>
              </FormField>

              {/* AUTO TYPE */}

              <div
                className="
                  mt-3
                  rounded-lg
                  border
                  border-[#D8EADF]
                  bg-[#F5FBF7]
                  px-3
                  py-2.5
                "
              >
                <div
                  className="
                    flex
                    items-center
                    justify-between
                    gap-3
                  "
                >
                  <div>
                    <p
                      className="
                        text-[7px]
                        font-bold
                        uppercase
                        tracking-wide
                        text-[#0B6B43]
                      "
                    >
                      Payment Type
                    </p>

                    <p
                      className="
                        mt-1
                        text-[11px]
                        font-extrabold
                        text-[#17221D]
                      "
                    >
                      {paymentType}
                    </p>
                  </div>

                  <span
                    className="
                      flex
                      h-7
                      w-7
                      items-center
                      justify-center
                      rounded-md
                      bg-[#EAF5EF]
                    "
                  >
                    <ArrowRight
                      size={13}
                      className="text-[#0B6B43]"
                    />
                  </span>
                </div>
              </div>

              {/* PAYMENT MODE */}

              <div className="mt-3">
                <FormField
                  label="Payment Mode"
                >
                  <select
                    value={
                      paymentMode
                    }
                    onChange={(event) =>
                      setPaymentMode(
                        event.target
                          .value
                      )
                    }
                    className={
                      inputClass
                    }
                  >
                    <option>
                      Cash
                    </option>

                    <option>
                      Bank
                    </option>

                    <option>
                      UPI
                    </option>

                    <option>
                      Card
                    </option>

                    <option>
                      Cheque
                    </option>
                  </select>
                </FormField>
              </div>

              {/* LOCATION */}

              <div className="mt-3">
                <FormField
                  label="Collection Location"
                >
                  <div
                    className="
                      relative
                    "
                  >
                    <MapPin
                      size={13}
                      className="
                        pointer-events-none
                        absolute
                        left-3
                        top-1/2
                        -translate-y-1/2
                        text-slate-400
                      "
                    />

                    <input
                      type="text"
                      value={
                        location
                      }
                      onChange={(event) =>
                        setLocation(
                          event.target
                            .value
                        )
                      }
                      placeholder="Customer location / area"
                      className={`
                        ${inputClass}
                        pl-8
                      `}
                    />
                  </div>
                </FormField>
              </div>

              {/* REMARKS */}

              <div className="mt-3">
                <FormField
                  label="Remarks"
                >
                  <textarea
                    value={
                      remarks
                    }
                    onChange={(event) =>
                      setRemarks(
                        event.target
                          .value
                      )
                    }
                    rows={3}
                    placeholder="Optional repayment remarks"
                    className="
                      min-h-[80px]
                      w-full
                      resize-none
                      rounded-lg
                      border
                      border-slate-200
                      px-3
                      py-2.5
                      text-[10px]
                      font-semibold
                      text-[#253252]
                      outline-none
                      focus:border-[#9CCEB1]
                      focus:ring-1
                      focus:ring-[#DCEFE4]
                    "
                  />
                </FormField>
              </div>

              {/* IMPORTANT INFO */}

              <div
                className="
                  mt-3
                  rounded-lg
                  bg-slate-50
                  px-3
                  py-2.5
                "
              >
                <p
                  className="
                    text-[8px]
                    font-semibold
                    text-slate-600
                  "
                >
                  Staff submission creates a
                  Pending collection only.
                </p>

                <p
                  className="
                    mt-1
                    text-[7px]
                    leading-relaxed
                    text-slate-400
                  "
                >
                  The loan balance,
                  repayment schedule and
                  dashboard update only after
                  Admin approves the payment.
                </p>
              </div>

              {/* SUBMIT */}

              <div
                className="
                  mt-4
                  flex
                  items-center
                  justify-end
                  gap-2
                  border-t
                  border-slate-100
                  pt-4
                "
              >
                <button
                  type="button"
                  onClick={
                    clearSelection
                  }
                  className="
                    h-9
                    rounded-lg
                    border
                    border-slate-200
                    bg-white
                    px-4
                    text-[9px]
                    font-bold
                    text-slate-500
                    transition
                    hover:bg-slate-50
                  "
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="
                    inline-flex
                    h-9
                    items-center
                    gap-1.5
                    rounded-lg
                    bg-[#0B6B43]
                    px-4
                    text-[9px]
                    font-extrabold
                    text-white
                    shadow-sm
                    transition
                    hover:-translate-y-[1px]
                    hover:bg-[#095B3B]
                  "
                >
                  <CheckCircle2
                    size={12}
                  />

                  Submit Repayment
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : (
        /* =================================================
           EMPTY
        ================================================= */

        <section
          className="
            mt-3
            rounded-xl
            border
            border-slate-200
            bg-white
            px-5
            py-16
            text-center
            shadow-sm
          "
        >
          <div
            className="
              mx-auto
              flex
              h-14
              w-14
              items-center
              justify-center
              rounded-2xl
              bg-[#EAF5EF]
            "
          >
            <WalletCards
              size={23}
              className="text-[#0B6B43]"
            />
          </div>

          <p
            className="
              mt-4
              text-[13px]
              font-extrabold
              text-[#17221D]
            "
          >
            Search a customer or loan
          </p>

          <p
            className="
              mx-auto
              mt-1
              max-w-[430px]
              text-[9px]
              leading-relaxed
              text-slate-400
            "
          >
            Select an open loan to see its
            overdue, current due, penalty and
            future repayment state. The payment
            type is determined automatically.
          </p>
        </section>
      )}
    </div>
  );
};

/* =========================================================
   REPAYMENT STATE CARD
========================================================= */

const RepaymentStateCard = ({
  state,
}) => {
  const hasOverdue =
    Number(
      state?.overdueAmount || 0
    ) > 0;

  const hasCurrent =
    Number(
      state?.currentDueAmount || 0
    ) > 0;

  const hasFuture =
    Number(
      state?.futureAmount || 0
    ) > 0;

  const hasPenalty =
    Number(
      state?.penaltyAmount || 0
    ) > 0;

  return (
    <section
      className="
        rounded-xl
        border
        border-slate-200
        bg-white
        p-4
        shadow-sm
      "
    >
      <div
        className="
          flex
          items-center
          gap-2
        "
      >
        <div
          className="
            flex
            h-8
            w-8
            items-center
            justify-center
            rounded-lg
            bg-[#EAF5EF]
          "
        >
          <WalletCards
            size={15}
            className="text-[#0B6B43]"
          />
        </div>

        <div>
          <h3
            className="
              text-[12px]
              font-extrabold
              text-[#17221D]
            "
          >
            Repayment State
          </h3>

          <p
            className="
              mt-0.5
              text-[8px]
              text-slate-400
            "
          >
            Current loan payment buckets
          </p>
        </div>
      </div>

      <div
        className="
          mt-3
          grid
          grid-cols-2
          gap-2
          sm:grid-cols-4
        "
      >
        <StateMetric
          label="Overdue"
          amount={
            state?.overdueAmount
          }
          count={
            state?.overdueCount
          }
          active={
            hasOverdue
          }
          tone="red"
        />

        <StateMetric
          label="Current Due"
          amount={
            state?.currentDueAmount
          }
          count={
            state?.currentDueCount
          }
          active={
            hasCurrent
          }
          tone="green"
        />

        <StateMetric
          label="Penalty"
          amount={
            state?.penaltyAmount
          }
          count=""
          active={
            hasPenalty
          }
          tone="amber"
        />

        <StateMetric
          label="Future"
          amount={
            state?.futureAmount
          }
          count={
            state?.futureCount
          }
          active={
            hasFuture
          }
          tone="blue"
        />
      </div>

      <div
        className="
          mt-3
          flex
          items-center
          justify-between
          gap-3
          rounded-lg
          bg-slate-50
          px-3
          py-2.5
        "
      >
        <span
          className="
            text-[8px]
            font-semibold
            text-slate-500
          "
        >
          Total scheduled outstanding
        </span>

        <span
          className="
            text-[11px]
            font-extrabold
            text-[#17221D]
          "
        >
          {formatMoney(
            state?.outstanding
          )}
        </span>
      </div>
    </section>
  );
};

/* =========================================================
   STATE METRIC
========================================================= */

const StateMetric = ({
  label,
  amount,
  count,
  active,
  tone,
}) => {
  const styles = {
    red: {
      bg: "bg-[#FFF5F5]",
      value: "text-red-600",
    },

    green: {
      bg: "bg-[#F2FAF5]",
      value: "text-[#0B6B43]",
    },

    amber: {
      bg: "bg-[#FFF8ED]",
      value: "text-[#B86D00]",
    },

    blue: {
      bg: "bg-[#F2F6FD]",
      value: "text-[#4779D8]",
    },
  };

  const current =
    styles[tone] ||
    styles.green;

  return (
    <div
      className={`
        rounded-lg
        border
        border-slate-100
        ${current.bg}
        px-3
        py-2.5
      `}
    >
      <div
        className="
          flex
          items-start
          justify-between
          gap-2
        "
      >
        <div>
          <p
            className="
              text-[7px]
              font-bold
              uppercase
              tracking-wide
              text-slate-400
            "
          >
            {label}
          </p>

          <p
            className={`
              mt-1
              text-[14px]
              font-extrabold
              ${current.value}
            `}
          >
            {formatMoney(
              amount
            )}
          </p>

          {count !== "" && (
            <p
              className="
                mt-0.5
                text-[7px]
                font-medium
                text-slate-400
              "
            >
              {count || 0} open
            </p>
          )}
        </div>

        <span
          className={`
            mt-0.5
            inline-flex
            h-2
            w-2
            rounded-full
            ${
              active
                ? "bg-current"
                : "bg-slate-200"
            }
            ${current.value}
          `}
        />
      </div>
    </div>
  );
};

/* =========================================================
   ALLOCATION PREVIEW
========================================================= */

const AllocationPreview = ({
  preview,
  paymentType,
}) => {
  const allocation =
    preview?.allocation ||
    {};

  return (
    <section
      className="
        rounded-xl
        border
        border-[#D8EADF]
        bg-[#F8FCF9]
        p-4
        shadow-sm
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
        "
      >
        <div
          className="
            flex
            items-center
            gap-2
          "
        >
          <div
            className="
              flex
              h-8
              w-8
              items-center
              justify-center
              rounded-lg
              bg-[#EAF5EF]
            "
          >
            <Calculator
              size={15}
              className="text-[#0B6B43]"
            />
          </div>

          <div>
            <h3
              className="
                text-[12px]
                font-extrabold
                text-[#17221D]
              "
            >
              Allocation Preview
            </h3>

            <p
              className="
                mt-0.5
                text-[8px]
                text-slate-400
              "
            >
              Payment will be allocated
              automatically after approval
            </p>
          </div>
        </div>

        <span
          className="
            rounded-full
            bg-[#EAF5EF]
            px-2
            py-1
            text-[7px]
            font-extrabold
            text-[#0B6B43]
          "
        >
          {paymentType}
        </span>
      </div>

      <div
        className="
          mt-3
          space-y-2
        "
      >
        <AllocationRow
          label="Penalty"
          amount={
            allocation?.penalty
          }
          tone="amber"
        />

        <AllocationRow
          label="Overdue"
          amount={
            allocation?.overdue
          }
          tone="red"
        />

        <AllocationRow
          label="Current Due"
          amount={
            allocation?.currentDue
          }
          tone="green"
        />

        <AllocationRow
          label="Advance"
          amount={
            allocation?.advance
          }
          tone="blue"
        />

        <AllocationRow
          label="Principal"
          amount={
            allocation?.principal
          }
          tone="slate"
        />

        <AllocationRow
          label="Excess"
          amount={
            allocation?.excess
          }
          tone="slate"
        />
      </div>

      {Number(
        allocation?.excess || 0
      ) > 0 && (
        <div
          className="
            mt-3
            flex
            items-start
            gap-2
            rounded-lg
            border
            border-amber-200
            bg-amber-50
            px-3
            py-2.5
          "
        >
          <ShieldAlert
            size={13}
            className="mt-0.5 shrink-0 text-amber-600"
          />

          <p
            className="
              text-[8px]
              font-semibold
              leading-relaxed
              text-amber-700
            "
          >
            This payment contains{" "}
            {formatMoney(
              allocation.excess
            )}{" "}
            excess amount. The excess is
            recorded separately and is not
            silently applied to principal.
          </p>
        </div>
      )}
    </section>
  );
};

/* =========================================================
   ALLOCATION ROW
========================================================= */

const AllocationRow = ({
  label,
  amount,
  tone,
}) => {
  const styles = {
    amber:
      "bg-[#FFF8ED] text-[#B86D00]",
    red:
      "bg-[#FFF4F4] text-red-600",
    green:
      "bg-[#F1FAF4] text-[#0B6B43]",
    blue:
      "bg-[#F1F6FE] text-blue-600",
    slate:
      "bg-slate-50 text-slate-600",
  };

  const current =
    styles[tone] ||
    styles.slate;

  const numeric =
    Number(
      amount || 0
    );

  return (
    <div
      className="
        flex
        items-center
        justify-between
        gap-3
        rounded-lg
        border
        border-slate-100
        bg-white
        px-3
        py-2
      "
    >
      <div className="flex items-center gap-2">
        <span
          className={`
            rounded-md
            px-2
            py-1
            text-[7px]
            font-extrabold
            ${current}
          `}
        >
          {label}
        </span>
      </div>

      <span
        className={`
          text-[10px]
          font-extrabold
          ${
            numeric > 0
              ? current
                  .split(" ")
                  .find((item) =>
                    item.startsWith(
                      "text-"
                    )
                  )
              : "text-slate-400"
          }
        `}
      >
        {formatMoney(
          numeric
        )}
      </span>
    </div>
  );
};

/* =========================================================
   FORM FIELD
========================================================= */

const FormField = ({
  label,
  children,
}) => {
  return (
    <label className="block">
      <span
        className="
          mb-1.5
          block
          text-[8px]
          font-bold
          uppercase
          tracking-wide
          text-slate-400
        "
      >
        {label}
      </span>

      {children}
    </label>
  );
};

/* =========================================================
   INPUT
========================================================= */

const inputClass = `
  h-10
  w-full
  rounded-lg
  border
  border-slate-200
  bg-white
  px-3
  text-[10px]
  font-semibold
  text-[#253252]
  outline-none
  transition
  focus:border-[#9CCEB1]
  focus:ring-1
  focus:ring-[#DCEFE4]
`;

/* =========================================================
   MONEY
========================================================= */

const money = (
  value
) => {
  return Number(
    value || 0
  ).toLocaleString(
    "en-IN",
    {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }
  );
};

const formatMoney = (
  value
) => {
  return `₹${money(
    value
  )}`;
};

/* =========================================================
   ROUND
========================================================= */

const roundMoney = (
  value
) => {
  const number =
    Number(value);

  if (
    !Number.isFinite(
      number
    )
  ) {
    return 0;
  }

  return (
    Math.round(
      (
        number +
        Number.EPSILON
      ) * 100
    ) / 100
  );
};

/* =========================================================
   TODAY
========================================================= */

const getTodayKey = () => {
  const today =
    new Date();

  return [
    today.getFullYear(),

    String(
      today.getMonth() + 1
    ).padStart(
      2,
      "0"
    ),

    String(
      today.getDate()
    ).padStart(
      2,
      "0"
    ),
  ].join("-");
};

/* =========================================================
   PREVIEW HELPERS
========================================================= */

const getPrimaryAllocationItem = (
  preview
) => {
  const items =
    Array.isArray(
      preview?.allocation
        ?.items
    )
      ? preview.allocation.items
      : [];

  return (
    items.find(
      (item) =>
        item?.scheduleId
    ) ||
    items[0] ||
    null
  );
};

const getPrimaryScheduleId = (
  preview
) => {
  const item =
    getPrimaryAllocationItem(
      preview
    );

  return (
    item?.scheduleId ||
    ""
  );
};

const getPrimaryInstallment = (
  preview
) => {
  const item =
    getPrimaryAllocationItem(
      preview
    );

  return (
    item?.installment ??
    ""
  );
};

const getPrimaryDueDate = (
  preview
) => {
  const item =
    getPrimaryAllocationItem(
      preview
    );

  return (
    item?.dueDate ||
    ""
  );
};

const getPrimaryOverdueDays = (
  preview,
  state
) => {
  const row =
    state?.penaltyRows?.[0];

  return Number(
    row?.overdueDays ||
      0
  );
};

const getPrimaryGraceDays = (
  preview,
  state
) => {
  const row =
    state?.penaltyRows?.[0];

  return Number(
    row?.graceDays ||
      0
  );
};

const getPrimaryPenaltyDays = (
  preview
) => {
  const row =
    preview?.allocation
      ?.penaltyRows?.[0];

  return Number(
    row?.penaltyDays ||
      0
  );
};

/* =========================================================
   COLLECTION ALLOCATION
========================================================= */

const buildCollectionAllocation = (
  preview
) => {
  const allocation =
    preview?.allocation ||
    {};

  return {
    penalty:
      roundMoney(
        allocation?.penalty
      ),

    overdue:
      roundMoney(
        allocation?.overdue
      ),

    currentDue:
      roundMoney(
        allocation?.currentDue
      ),

    advance:
      roundMoney(
        allocation?.advance
      ),

    principal:
      roundMoney(
        allocation?.principal
      ),

    excess:
      roundMoney(
        allocation?.excess
      ),

    totalPayment:
      roundMoney(
        allocation?.totalPayment
      ),

    allocated:
      roundMoney(
        allocation?.allocated
      ),

    remaining:
      roundMoney(
        allocation?.remaining
      ),

    calculatedPenalty:
      roundMoney(
        allocation
          ?.calculatedPenalty
      ),

    items:
      Array.isArray(
        allocation?.items
      )
        ? allocation.items.map(
            (item) => ({
              ...item,

              amount:
                roundMoney(
                  item?.amount
                ),
            })
          )
        : [],
  };
};

/* =========================================================
   STATE LABEL
========================================================= */

const formatStateLabel = (
  state
) => {
  if (!state) {
    return "Open";
  }

  if (
    state?.overdueAmount >
    0
  ) {
    return "Overdue";
  }

  if (
    state?.currentDueAmount >
    0
  ) {
    return "Due Today";
  }

  if (
    state?.futureAmount >
    0
  ) {
    return "Advance Ready";
  }

  return "Open";
};

/* =========================================================
   PREVIEW ERROR
========================================================= */

const getPreviewError = (
  result
) => {
  switch (
    result?.reason
  ) {
    case "loan_required":
      return "Loan is required.";

    case "loan_closed":
      return "This loan is already closed or foreclosed.";

    case "invalid_payment_amount":
      return "Enter a valid payment amount.";

    default:
      return (
        result?.reason ||
        "Unable to calculate repayment."
      );
  }
};

/* =========================================================
   DUPLICATE HELPERS
========================================================= */

const findDuplicatePendingCollection = (
  collections,
  loan
) => {
  const loanId =
    loan?.id ||
    "";

  const loanNumber =
    loan?.loanNumber ||
    "";

  return (
    (Array.isArray(
      collections
    )
      ? collections
      : []
    ).find(
      (collection) => {
        if (
          normalize(
            collection?.status
          ) !==
          "pending"
        ) {
          return false;
        }

        const sameLoan =
          (
            loanId &&
            String(
              collection?.loanId ||
                ""
            ) ===
              String(
                loanId
              )
          ) ||
          (
            loanNumber &&
            String(
              collection?.loanNumber ||
                ""
            ) ===
              String(
                loanNumber
              )
          );

        return sameLoan;
      }
    ) || null
  );
};

const hasMeaningfulScheduleTarget = (
  collection
) => {
  return Boolean(
    collection?.scheduleId ||
    collection?.dueDate ||
    collection?.installment
  );
};

/* =========================================================
   SAFE LOAN STATE
========================================================= */

const safeGetLoanState = (
  loan
) => {
  try {
    return getLoanRepaymentState(
      loan
    );
  } catch (error) {
    console.error(
      "Failed to calculate loan state:",
      error
    );

    return null;
  }
};

/* =========================================================
   SESSION
========================================================= */

const safeGetSession = () => {
  try {
    return (
      getSession() ||
      {}
    );
  } catch (error) {
    console.error(
      "Failed to get staff session:",
      error
    );

    return {};
  }
};

/* =========================================================
   SAFE STORAGE
========================================================= */

const safeGetLoans = async () => {
  try {
    const result =
      await getLoans();

    return Array.isArray(
      result
    )
      ? result
      : [];
  } catch (error) {
    console.error(
      "Failed to load loans:",
      error
    );

    return [];
  }
};

const safeGetCollections = async () => {
  try {
    const result =
      await getCollections();

    return Array.isArray(
      result
    )
      ? result
      : [];
  } catch (error) {
    console.error(
      "Failed to load collections:",
      error
    );

    return [];
  }
};

export default Repayment;