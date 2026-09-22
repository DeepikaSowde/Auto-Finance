// src/pages/customers/CustomerDetails.jsx

import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useNavigate,
  useParams,
} from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  User,
  ShieldCheck,
  Car,
  IndianRupee,
  WalletCards,
  CalendarDays,
  FileText,
  CreditCard,
  Bell,
  Pencil,
  Upload,
  Plus,
  History,
  Activity as ActivityIcon,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  X,
  Maximize2,
} from "lucide-react";

import LoanRepaymentSchedule from "../../components/loans/LoanRepaymentSchedule";
import CustomerPaymentHistoryModal from "../../components/customers/CustomerPaymentHistoryModal";
import CustomerActivityHistoryModal from "../../components/customers/CustomerActivityHistoryModal";
import CustomerPhotoViewer from "../../components/customers/CustomerPhotoViewer";


import {
  getCustomerById,
} from "../../services/customerStorage";
import {
  getCustomerLoans,
} from "../../services/reloanStorage";

import {
  getEmi,
  getLoanOutstanding,
} from "../../utils/loan/loanHelpers";

/* =========================================================
   MAIN PAGE
========================================================= */

const CustomerDetails = () => {
  const { customerId } =
    useParams();

  const navigate =
    useNavigate();

  const [customer, setCustomer] =
    useState(null);

  const [activeTab, setActiveTab] =
    useState("Overview");

  const [showPaymentHistory, setShowPaymentHistory] =
    useState(false);
const [showActivityHistory, setShowActivityHistory] =
  useState(false);
  /* =====================================================
     LOAD CUSTOMER
  ====================================================== */

  useEffect(() => {
    const loadCustomer = async () => {
      const data =
        await getCustomerById(
          customerId
        );

      setCustomer(data);
    };

    loadCustomer();

    const handleUpdate = () => {
      loadCustomer();
    };

    window.addEventListener(
      "fleetopz:data-updated",
      handleUpdate
    );

    window.addEventListener(
      "auto-finance:data-updated",
      handleUpdate
    );

    window.addEventListener(
      "storage",
      handleUpdate
    );

    return () => {
      window.removeEventListener(
        "fleetopz:data-updated",
        handleUpdate
      );

      window.removeEventListener(
        "auto-finance:data-updated",
        handleUpdate
      );

      window.removeEventListener(
        "storage",
        handleUpdate
      );
    };
  }, [customerId]);

  /* =====================================================
     NOT FOUND
  ====================================================== */

  if (!customer) {
    return (
      <div className="min-h-full bg-[#F6F8F7] px-4 py-5 sm:px-5">
        <button
          type="button"
          onClick={() =>
            navigate("/customers")
          }
          className="
            inline-flex
            items-center
            gap-2
            text-[11px]
            font-semibold
            text-slate-500
            transition
            hover:text-[#0B5D3B]
          "
        >
          <ArrowLeft size={14} />
          Back to Customers
        </button>

        <div
          className="
            mt-4
            rounded-xl
            border
            border-slate-200
            bg-white
            px-6
            py-12
            text-center
            shadow-sm
          "
        >
          <p className="text-[14px] font-bold text-[#17221D]">
            Customer not found
          </p>

          <p className="mt-1 text-[10px] text-slate-400">
            The selected customer record could not be found.
          </p>
        </div>
      </div>
    );
  }

  /* =====================================================
     REAL DATA
  ====================================================== */

  const personal =
    customer?.customer?.personal ||
    {};

  const kyc =
    customer?.customer?.kyc ||
    {};

  const vehicle =
    customer?.vehicle ||
    {};

  const customerPhoto =
    customer?.customer?.photo?.fileData ||
    "";

  const rc =
    customer?.rc ||
    {};

  const loan =
    customer?.loan ||
    {};

  const customerLoans =
    getCustomerLoans(
      customer
    );

  const calculation =
    loan?.calculation ||
    {};

  const charges =
    loan?.charges ||
    {};

  const collection =
    loan?.collection ||
    {};

  const repaymentSchedule =
    Array.isArray(
      loan?.repaymentSchedule
    )
      ? loan.repaymentSchedule
      : [];

  const paymentHistory =
    Array.isArray(
      loan?.paymentHistory
    )
      ? loan.paymentHistory
      : [];

  /* =====================================================
     BASIC VALUES
  ====================================================== */

  const customerName =
    personal?.name ||
    "Customer";

  const customerNumber =
    customer?.customer?.customerNumber ||
    customer?.customer?.id ||
    "—";

  const customerMobile =
    personal?.mobileNumber ||
    "—";

  const customerStatus =
    getCustomerStatus(
      customer?.customer?.status
    );

  const vehicleName =
    [
      vehicle?.brand,
      vehicle?.model,
      vehicle?.variant,
    ]
      .filter(Boolean)
      .join(" ") ||
    "Vehicle not assigned";

  /* =====================================================
     LOAN STATUS
  ====================================================== */

  const loanStatus =
    getLoanStatus(
      loan
    );

  const isForeclosed =
    isForeclosedLoan(
      loan
    );

  const isClosed =
    isClosedLoan(
      loan
    );

  const isTerminalLoan =
    isForeclosed ||
    isClosed;

  /* =====================================================
     LOAN VALUES
  ====================================================== */

  const loanAmount =
    Number(
      loan?.loanAmount || 0
    );

  const emiAmount =
    Number(
      getEmi(loan) || 0
    );

  /*
   * For closed / foreclosed loans,
   * collection workflow must no longer
   * present an active outstanding balance.
   *
   * We do not mutate storage here.
   * This is only display logic.
   */
  const rawOutstandingAmount =
    Number(
      getLoanOutstanding(
        loan
      ) || 0
    );

  const outstandingAmount =
    isTerminalLoan
      ? 0
      : rawOutstandingAmount;

  const totalPayable =
    Number(
      calculation?.totalDue || 0
    );

  const collectedAmount =
    isTerminalLoan
      ? totalPayable
      : Math.max(
          totalPayable -
            outstandingAmount,
          0
        );

  /* =====================================================
     INSTALLMENT COUNTS
  ====================================================== */

  const paidInstallments =
    repaymentSchedule.filter(
      (row) => {
        const status =
          normalizeStatus(
            row?.status
          );

        return (
          status === "paid" ||
          status === "completed" ||
          status === "closed" ||
          status === "settled"
        );
      }
    ).length;

  const pendingInstallments =
    isTerminalLoan
      ? 0
      : repaymentSchedule.filter(
          (row) => {
            const status =
              normalizeStatus(
                row?.status
              );

            if (
              status !== "pending" &&
              status !==
                "partially paid" &&
              status !==
                "partially-paid" &&
              status !== "partial"
            ) {
              return false;
            }

            return !isOverdueRow(
              row
            );
          }
        ).length;

  const overdueRows =
    isTerminalLoan
      ? []
      : repaymentSchedule.filter(
          (row) =>
            isOverdueRow(
              row
            )
        );

  const overdueInstallments =
    overdueRows.length;

  const totalOverdueAmount =
    isTerminalLoan
      ? 0
      : overdueRows.reduce(
          (sum, row) =>
            sum +
            Number(
              row?.remainingAmount ??
                row?.balance ??
                row?.paymentAmount ??
                row?.emiAmount ??
                row?.amount ??
                0
            ),
          0
        );

  const totalInstallments =
    repaymentSchedule.length;

  /* =====================================================
     NEXT PAYMENT
  ====================================================== */

  const nextDue =
    isTerminalLoan
      ? null
      : getNextPayment(
          loan
        );

  const nextDueDate =
    nextDue?.dueDate
      ? formatDate(
          nextDue.dueDate
        )
      : "—";

  const nextDueAmount =
    Number(
      nextDue?.remainingAmount ??
        nextDue?.balance ??
        nextDue?.paymentAmount ??
        nextDue?.emiAmount ??
        nextDue?.amount ??
        emiAmount ??
        0
    );

  const nextDueDays =
    nextDue?.dueDate
      ? getDaysFromToday(
          nextDue.dueDate
        )
      : 0;

  /* =====================================================
     TABS
  ====================================================== */

  const tabs = [
    "Overview",
    "Vehicle & RC",
    "Loan Details",
    "Activity",
  ];

  /* =====================================================
     ACTIONS
  ====================================================== */

  const handleEdit = () => {
    navigate(
      `/customers/${customerId}/edit`
    );
  };

  const handleDocuments = () => {
    navigate(
      `/customers/${customerId}/documents`
    );
  };

  const handlePaymentHistory = () => {
    setShowPaymentHistory(true);
  };
const handleActivity = () => {
  setShowActivityHistory(true);
};

  /* =====================================================
     RENDER
  ====================================================== */

  return (
    <div className="min-h-full bg-[#F6F8F7] px-3 py-3 sm:px-4 sm:py-4 lg:px-5 lg:py-5">

      {/* =================================================
          PAGE HEADER
      ================================================== */}

      <div
        className="
          mb-3
          rounded-xl
          border
          border-slate-200
          bg-white
          px-4
          py-3
          shadow-sm
        "
      >
        <div
          className="
            flex
            flex-col
            gap-3
            lg:flex-row
            lg:items-center
            lg:justify-between
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  "/customers"
                )
              }
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                border
                border-slate-200
                bg-white
                text-slate-500
                shadow-sm
                transition
                hover:border-[#9DD3B5]
                hover:bg-[#F3FAF6]
                hover:text-[#0B5D3B]
              "
            >
              <ArrowLeft size={15} />
            </button>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1
                  className="
                    truncate
                    text-[19px]
                    font-extrabold
                    tracking-tight
                    text-[#17221D]
                  "
                >
                  {customerName}
                </h1>

                {/* Customer status stays independent from loan status */}
                <StatusBadge
                  label={
                    customerStatus
                  }
                />

                {/* Loan status is shown separately */}
                {isForeclosed && (
                  <LoanTerminalBadge
                    label="Foreclosed"
                    tone="foreclosed"
                  />
                )}

                {isClosed && !isForeclosed && (
                  <LoanTerminalBadge
                    label="Closed"
                    tone="closed"
                  />
                )}
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2">
                <span className="text-[10px] font-semibold text-slate-400">
                  {customerNumber}
                </span>

                <span className="text-slate-300">
                  •
                </span>

                <span className="text-[10px] font-medium text-slate-400">
                  {customerMobile}
                </span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <HeaderButton
              icon={Pencil}
              label="Edit"
              onClick={
                handleEdit
              }
            />

            <HeaderButton
              icon={FileText}
              label="Documents"
              onClick={
                handleDocuments
              }
            />

            <HeaderButton
              icon={History}
              label="Payment History"
              onClick={
                handlePaymentHistory
              }
            />

            <button
              type="button"
              onClick={
                handleActivity
              }
              className="
                inline-flex
                h-9
                items-center
                gap-1.5
                rounded-lg
                border
                border-[#0B6B43]
                bg-[#0B6B43]
                px-3.5
                text-[9px]
                font-bold
                text-white
                shadow-[0_5px_14px_rgba(11,107,67,0.18)]
                transition-all
                hover:-translate-y-[1px]
                hover:bg-[#095B3B]
              "
            >
              <ActivityIcon
                size={13}
                strokeWidth={2.2}
              />
              Activity
            </button>
          </div>
        </div>
      </div>

      {/* =================================================
          TABS
      ================================================== */}

      <div
        className="
          mb-3
          overflow-x-auto
          rounded-xl
          border
          border-slate-200
          bg-white
          shadow-sm
        "
      >
        <div className="flex min-w-max items-center px-2">
          {tabs.map(
            (tab) => (
              <button
                key={tab}
                type="button"
                onClick={() =>
                  setActiveTab(
                    tab
                  )
                }
                className={`
                  relative
                  px-4
                  py-3
                  text-[10px]
                  font-bold
                  transition
                  ${
                    activeTab ===
                    tab
                      ? "text-[#0B5D3B]"
                      : "text-slate-400 hover:text-slate-600"
                  }
                `}
              >
                {tab}

                {activeTab ===
                  tab && (
                  <span
                    className="
                      absolute
                      bottom-0
                      left-3
                      right-3
                      h-[2px]
                      rounded-full
                      bg-[#0B5D3B]
                    "
                  />
                )}
              </button>
            )
          )}
        </div>
      </div>

      {/* =================================================
          OVERVIEW
      ================================================== */}

      {activeTab ===
        "Overview" && (
        <div
          className="
            grid
            gap-3
            xl:grid-cols-[minmax(0,3fr)_320px]
            2xl:grid-cols-[minmax(0,3.2fr)_335px]
          "
        >
          <div className="min-w-0 space-y-3">

            {/* CUSTOMER INFORMATION */}

            <DetailCard
              icon={User}
              title="Customer Information"
              action={
                <CardLink>
                  Edit
                </CardLink>
              }
            >
              {customerPhoto && (
                <CustomerPhotoViewer
                  photo={customerPhoto}
                  name={personal?.name || "Customer"}
                />
              )}

              <div
                className="
                  grid
                  grid-cols-2
                  gap-x-6
                  gap-y-4
                  lg:grid-cols-3
                "
              >
                <DetailItem
                  icon={User}
                  label="Name"
                  value={
                    personal?.name
                  }
                />

                <DetailItem
                  label="Mobile Number"
                  value={
                    personal?.mobileNumber
                  }
                />

                <DetailItem
                  label="Alternate Mobile"
                  value={
                    personal?.alternateMobileNumber
                  }
                />

                <DetailItem
                  label="Profession"
                  value={
                    personal?.profession
                  }
                />

                <DetailItem
                  label="Own House"
                  value={
                    personal?.ownHouse ===
                    true
                      ? "Yes"
                      : personal?.ownHouse ===
                        false
                      ? "No"
                      : "—"
                  }
                />

                <DetailItem
                  label="Referred By"
                  value={
                    personal?.referredBy
                  }
                />

                <DetailItem
                  label="Group / Vehicle Type"
                  value={
                    personal?.groupOrVehicleType
                  }
                />

                <DetailItem
                  label="Area"
                  value={
                    personal?.area
                  }
                />

                <DetailItem
                  label="Pincode"
                  value={
                    personal?.pincode
                  }
                />

                <DetailItem
                  label="Landmark"
                  value={
                    personal?.landmark
                  }
                />

                <div className="min-w-0 lg:col-span-2">
                  <DetailItem
                    label="Address"
                    value={
                      personal?.address
                    }
                  />
                </div>
              </div>
            </DetailCard>

            {/* KYC */}

            <DetailCard
              icon={ShieldCheck}
              title="KYC Information"
              action={
                <CardLink>
                  Verified Records
                </CardLink>
              }
            >
              <div className="grid grid-cols-4 gap-x-8 gap-y-4">
                <DetailItem
                  icon={CreditCard}
                  label="Aadhaar Number"
                  value={
                    kyc?.aadhaarNumber
                      ? maskAadhaar(
                          kyc.aadhaarNumber
                        )
                      : "—"
                  }
                />

                <DetailItem
                  label="PAN"
                  value={
                    kyc?.panNumber ||
                    "—"
                  }
                />

                <DetailItem
                  label="Driving Licence"
                  value={
                    kyc?.drivingLicenceNumber ||
                    "—"
                  }
                />

                <DetailItem
                  label="Voter ID"
                  value={
                    kyc?.voterIdNumber ||
                    "—"
                  }
                />
              </div>
            </DetailCard>

            {/* FINANCIAL SNAPSHOT */}

            <DetailCard
              icon={WalletCards}
              title="Financial Snapshot"
            >
              <div
                className="
                  grid
                  grid-cols-2
                  gap-2
                  sm:grid-cols-4
                "
              >
                <SnapshotCard
                  label="Loan Amount"
                  value={`₹${money(
                    loanAmount
                  )}`}
                  note={
                    isForeclosed
                      ? "Foreclosed account"
                      : "Original finance"
                  }
                  tone="green"
                  icon={IndianRupee}
                />

                <SnapshotCard
                  label="Outstanding"
                  value={`₹${money(
                    outstandingAmount
                  )}`}
                  note={
                    isTerminalLoan
                      ? "No active balance"
                      : "Remaining payable"
                  }
                  tone={
                    isTerminalLoan
                      ? "neutral"
                      : "green"
                  }
                  icon={
                    WalletCards
                  }
                />

                <SnapshotCard
                  label="Collected"
                  value={`₹${money(
                    collectedAmount
                  )}`}
                  note={
                    isTerminalLoan
                      ? "Account resolved"
                      : "Paid so far"
                  }
                  tone="blue"
                  icon={
                    CheckCircle2
                  }
                />

                <SnapshotCard
                  label="Overdue"
                  value={`₹${money(
                    totalOverdueAmount
                  )}`}
                  note={
                    isTerminalLoan
                      ? "No active overdue"
                      : overdueInstallments >
                        0
                      ? `${overdueInstallments} installment${
                          overdueInstallments ===
                          1
                            ? ""
                            : "s"
                        }`
                      : "No overdue"
                  }
                  tone={
                    isTerminalLoan
                      ? "neutral"
                      : "red"
                  }
                  icon={
                    isTerminalLoan
                      ? CheckCircle2
                      : AlertTriangle
                  }
                />
              </div>
            </DetailCard>
          </div>

          {/* RIGHT SIDEBAR */}

          <aside className="space-y-3">

            {/* CUSTOMER OVERVIEW */}

            <SidebarCard title="Customer Overview">
              <SideValue
                label="Customer ID"
                value={
                  customerNumber
                }
              />

              <SideValue
                label="Mobile"
                value={
                  customerMobile
                }
              />

              <SideValue
                label="Customer Status"
                value={
                  customerStatus
                }
                valueClass="text-[#0B6B43]"
              />

              <SideValue
                label="Loan Status"
                value={
                  loanStatus
                }
                valueClass={
                  getLoanStatusClass(
                    loanStatus
                  )
                }
              />

              <SideValue
                label="Created"
                value={formatDate(
                  customer?.customer
                    ?.createdAt
                )}
              />

              <SideValue
                label="Vehicle"
                value={
                  vehicleName
                }
              />
            </SidebarCard>

            {/* QUICK ACTIONS */}

            <SidebarCard title="Quick Actions">
              <QuickAction
                icon={Pencil}
                label="Edit Customer"
                onClick={
                  handleEdit
                }
              />

              <QuickAction
                icon={Upload}
                label="Upload Document"
                onClick={
                  handleDocuments
                }
              />

              <QuickAction
                icon={Plus}
                label="Add Loan"
                onClick={() =>
                  navigate(
                    `/loans/new?customerId=${customerId}`
                  )
                }
              />

              {!isTerminalLoan && (
                <>
                  <QuickAction
                    icon={IndianRupee}
                    label="Receive Payment"
                  />

                  <QuickAction
                    icon={Bell}
                    label="Send Reminder"
                  />
                </>
              )}
            </SidebarCard>

            {/* UPCOMING DUE */}

            {!isTerminalLoan ? (
              <SidebarCard title="Upcoming Dues">
                {!nextDue ? (
                  <div
                    className="
                      rounded-lg
                      bg-slate-50
                      px-3
                      py-3
                      text-center
                    "
                  >
                    <p className="text-[9px] font-semibold text-slate-500">
                      No upcoming payment
                    </p>
                  </div>
                ) : (
                  <div
                    className={`
                      rounded-lg
                      border
                      px-3
                      py-3
                      ${
                        nextDueDays <
                        0
                          ? "border-red-100 bg-red-50"
                          : "border-[#D8EEDF] bg-[#F5FBF7]"
                      }
                    `}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[8px] font-semibold uppercase tracking-wide text-slate-400">
                        Next EMI
                      </span>

                      <Clock3
                        size={12}
                        className={
                          nextDueDays <
                          0
                            ? "text-red-500"
                            : "text-[#0B6B43]"
                        }
                      />
                    </div>

                    <span
                      className={`
                        mt-2
                        inline-flex
                        rounded-md
                        px-2.5
                        py-1
                        text-[8px]
                        font-extrabold
                        ${
                          nextDueDays < 0
                            ? "bg-red-100 text-red-600"
                            : nextDueDays === 0
                            ? "bg-amber-100 text-amber-700"
                            : "bg-[#E4F3EA] text-[#0B6B43]"
                        }
                      `}
                    >
                      {nextDueDays < 0
                        ? `${Math.abs(nextDueDays)} Days Overdue`
                        : nextDueDays ===
                          0
                        ? "Due Today"
                        : `${nextDueDays} Days Left`}
                    </span>

                    <p className="mt-1.5 text-[18px] font-extrabold tracking-tight text-[#17221D]">
                      ₹
                      {money(
                        nextDueAmount
                      )}
                    </p>

                    <p className="mt-1 text-[8px] font-semibold text-slate-400">
                      {nextDueDate}
                    </p>
                  </div>
                )}
              </SidebarCard>
            ) : (
              <TerminalLoanCard
                loanStatus={
                  loanStatus
                }
                isForeclosed={
                  isForeclosed
                }
              />
            )}

            {/* LOAN SUMMARY */}

            <SidebarCard title="Loan Summary">
              <SideValue
                label="Loan Number"
                value={
                  loan?.loanNumber ||
                  "—"
                }
              />

              <SideValue
                label="Loan Status"
                value={
                  loanStatus
                }
                valueClass={
                  getLoanStatusClass(
                    loanStatus
                  )
                }
              />

              <SideValue
                label="EMI"
                value={
                  isTerminalLoan
                    ? "—"
                    : `₹${money(
                        emiAmount
                      )}`
                }
              />

              <SideValue
                label="Outstanding"
                value={
                  isTerminalLoan
                    ? "₹0"
                    : `₹${money(
                        outstandingAmount
                      )}`
                }
                valueClass={
                  isTerminalLoan
                    ? "text-slate-500"
                    : "text-[#0B6B43]"
                }
              />

              <SideValue
                label="Overdue"
                value={
                  isTerminalLoan
                    ? "₹0"
                    : `₹${money(
                        totalOverdueAmount
                      )}`
                }
                valueClass={
                  isTerminalLoan
                    ? "text-slate-500"
                    : totalOverdueAmount >
                      0
                    ? "text-red-600"
                    : "text-slate-500"
                }
              />

              <SideValue
                label="Installments"
                value={
                  isTerminalLoan
                    ? "Account closed"
                    : `${paidInstallments}/${totalInstallments}`
                }
              />
            </SidebarCard>
          </aside>
        </div>
      )}

      {/* =================================================
          VEHICLE TAB
      ================================================== */}

      {activeTab ===
        "Vehicle & RC" && (
        <VehicleTab
          vehicle={vehicle}
          rc={rc}
        />
      )}

      {/* =================================================
          LOAN TAB
      ================================================== */}

      {activeTab ===
        "Loan Details" && (
        <LoanTab
          loan={loan}
          customerLoans={customerLoans}
          calculation={
            calculation
          }
          charges={charges}
          collection={
            collection
          }
          repaymentSchedule={
            repaymentSchedule
          }
          totalOverdueAmount={
            totalOverdueAmount
          }
          overdueInstallments={
            overdueInstallments
          }
          paidInstallments={
            paidInstallments
          }
          pendingInstallments={
            pendingInstallments
          }
          isForeclosed={
            isForeclosed
          }
          isClosed={
            isClosed
          }
          loanStatus={
            loanStatus
          }
        />
      )}

      {/* =================================================
          ACTIVITY TAB
      ================================================== */}

      {activeTab ===
        "Activity" && (
        <ActivityTab
          customer={customer}
          paymentHistory={
            paymentHistory
          }
          repaymentSchedule={
            repaymentSchedule
          }
          isTerminalLoan={
            isTerminalLoan
          }
        />
      )}

      {showPaymentHistory && (
        <CustomerPaymentHistoryModal
          customer={customer}
          loan={loan}
          paymentHistory={paymentHistory}
          onClose={() => setShowPaymentHistory(false)}
        />
      )}
{showActivityHistory && (
  <CustomerActivityHistoryModal
    customer={customer}
    paymentHistory={paymentHistory}
    repaymentSchedule={repaymentSchedule}
    isTerminalLoan={isTerminalLoan}
    onClose={() =>
      setShowActivityHistory(false)
    }
  />
)}
      <style>{`
        .vehicle-image-placeholder {
          background:
            linear-gradient(
              135deg,
              #eef6f1 0%,
              #f7faf8 100%
            );
        }
      `}</style>
    </div>
  );
};

/* =========================================================
   TERMINAL LOAN CARD
========================================================= */

const TerminalLoanCard = ({
  loanStatus,
  isForeclosed,
}) => {
  return (
    <section
      className="
        rounded-xl
        border
        border-slate-200
        bg-white
        p-3.5
        shadow-sm
      "
    >
      <div
        className={`
          rounded-lg
          border
          px-3
          py-3
          ${
            isForeclosed
              ? "border-violet-200 bg-violet-50"
              : "border-emerald-200 bg-emerald-50"
          }
        `}
      >
        <div className="flex items-center gap-2">
          <CheckCircle2
            size={16}
            className={
              isForeclosed
                ? "text-violet-600"
                : "text-emerald-600"
            }
          />

          <div>
            <p
              className={`
                text-[8px]
                font-bold
                uppercase
                tracking-wide
                ${
                  isForeclosed
                    ? "text-violet-600"
                    : "text-emerald-600"
                }
              `}
            >
              Loan Status
            </p>

            <p className="mt-0.5 text-[13px] font-extrabold text-[#17221D]">
              {loanStatus}
            </p>
          </div>
        </div>

        <p className="mt-2 text-[8px] font-medium leading-4 text-slate-500">
          {isForeclosed
            ? "This loan has been foreclosed. No active EMI, due or collection action is required."
            : "This loan account is closed. No active EMI, due or collection action is required."}
        </p>
      </div>
    </section>
  );
};

/* =========================================================
   LOAN TERMINAL BADGE
========================================================= */

const LoanTerminalBadge = ({
  label,
  tone = "closed",
}) => {
  const className =
    tone === "foreclosed"
      ? "bg-violet-50 text-violet-700"
      : "bg-emerald-50 text-emerald-700";

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        px-2.5
        py-1
        text-[7px]
        font-extrabold
        ${className}
      `}
    >
      {label}
    </span>
  );
};

/* =========================================================
   VEHICLE TAB
========================================================= */

const VehicleTab = ({
  vehicle,
  rc,
}) => {
  return (
    <div className="space-y-3">
      <DetailCard
        icon={Car}
        title="Vehicle Information"
        action={
          <span className="text-[8px] font-semibold text-slate-400">
            From Onboarding
          </span>
        }
      >
        <div
          className="
            grid
            gap-5
            lg:grid-cols-[160px_minmax(0,1fr)]
          "
        >
          <div
            className="
              overflow-hidden
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              shadow-sm
            "
          >
            <CustomerPhotoViewer
              photo={
                vehicle?.photo?.fileData ||
                "/assets/vehicle-placeholder.jpg"
              }
              name={
                vehicle?.photo?.fileName ||
                "Vehicle"
              }
            />

            <div className="border-t border-slate-100 px-3 py-2">
              <p className="truncate text-[10px] font-bold text-[#253252]">
                {[
                  vehicle?.brand,
                  vehicle?.model,
                ]
                  .filter(Boolean)
                  .join(" ") ||
                  "Vehicle"}
              </p>

              <p className="mt-0.5 text-[8px] text-slate-400">
                {rc?.registrationNumber ||
                  "No registration"}
              </p>
            </div>
          </div>

          <div
            className="
              grid
              grid-cols-2
              gap-x-8
              gap-y-5
              sm:grid-cols-3
              lg:grid-cols-4
            "
          >
            <DetailItem
              label="Vehicle Type"
              value={
                vehicle?.vehicleType
              }
            />

            <DetailItem
              label="Brand"
              value={
                vehicle?.brand
              }
            />

            <DetailItem
              label="Model"
              value={
                vehicle?.model
              }
            />

            <DetailItem
              label="Variant"
              value={
                vehicle?.variant
              }
            />

            <DetailItem
              label="Colour"
              value={
                vehicle?.colour
              }
            />

            <DetailItem
              label="Manufacturing Year"
              value={
                vehicle?.manufacturingYear
              }
            />

            <DetailItem
              label="Fuel Type"
              value={
                vehicle?.fuelType
              }
            />

            <MetricField
              label="Vehicle Value"
              value={`₹${money(
                vehicle?.vehicleValue
              )}`}
              accent
            />
          </div>
        </div>
      </DetailCard>

      <DetailCard
        icon={FileText}
        title="Registration & RC"
      >
        <div
          className="
            grid
            grid-cols-2
            gap-x-8
            gap-y-5
            sm:grid-cols-3
            lg:grid-cols-4
          "
        >
          <DetailItem
            label="Registration Number"
            value={
              rc?.registrationNumber
            }
          />

          <DetailItem
            label="RC Book Number"
            value={
              rc?.rcBookNumber
            }
          />

          <DetailItem
            label="RTO Location"
            value={
              rc?.location
            }
          />

          <DetailItem
            label="Registration Date"
            value={
              rc?.dateOfRegistration
                ? formatDate(
                    rc.dateOfRegistration
                  )
                : "—"
            }
          />

          <DetailItem
            label="Chassis Number"
            value={
              rc?.chassisNumber
            }
          />

          <DetailItem
            label="Engine Number"
            value={
              rc?.engineNumber
            }
          />

          <DetailItem
            label="Existing Financier"
            value={
              rc?.existingFinancier
            }
          />

          <DetailItem
            label="Hypothecation"
            value={
              rc?.hypothecation ===
              true
                ? "Yes"
                : rc?.hypothecation ===
                  false
                ? "No"
                : "—"
            }
          />

          <DetailItem
            label="Tax Expiry"
            value={
              rc?.taxExpiry
                ? formatDate(
                    rc.taxExpiry
                  )
                : "—"
            }
          />

          <DetailItem
            label="Permit Expiry"
            value={
              rc?.permitExpiry
                ? formatDate(
                    rc.permitExpiry
                  )
                : "—"
            }
          />

          <DetailItem
            label="FC Expiry"
            value={
              rc?.fcExpiry
                ? formatDate(
                    rc.fcExpiry
                  )
                : "—"
            }
          />
        </div>
      </DetailCard>

      <DetailCard
        icon={ShieldCheck}
        title="Insurance Information"
      >
        <div
          className="
            grid
            grid-cols-2
            gap-x-8
            gap-y-5
            sm:grid-cols-3
            lg:grid-cols-4
          "
        >
          <DetailItem
            label="Insurance Company"
            value={
              rc?.insurance
                ?.companyName
            }
          />

          <DetailItem
            label="Policy Number"
            value={
              rc?.insurance
                ?.policyNumber
            }
          />

          <DetailItem
            label="Insurance Expiry"
            value={
              rc?.insurance
                ?.expiryDate
                ? formatDate(
                    rc.insurance.expiryDate
                  )
                : "—"
            }
          />

          <DetailItem
            label="Insurance Document"
            value={
              rc?.insurance
                ?.document
                ?.fileName ||
              "Not uploaded"
            }
          />

          <DetailItem
            label="Endorsement"
            value={
              rc?.endorsement
                ?.enabled ===
              true
                ? "Enabled"
                : "Not Enabled"
            }
          />

          <DetailItem
            label="Remarks"
            value={
              rc?.remarks ||
              "—"
            }
          />
        </div>
      </DetailCard>
    </div>
  );
};

/* =========================================================
   LOAN TAB
========================================================= */

const LoanTab = ({
  loan,
  customerLoans,
  calculation,
  charges,
  collection,
  repaymentSchedule,
  totalOverdueAmount,
  overdueInstallments,
  paidInstallments,
  pendingInstallments,
  isForeclosed,
  isClosed,
  loanStatus,
}) => {
  const isTerminalLoan =
    isForeclosed ||
    isClosed;

  const [
    scheduleOpen,
    setScheduleOpen,
  ] = useState(false);

  return (
    <div className="space-y-3">

      {/* TERMINAL STATUS */}

      {isTerminalLoan && (
        <DetailCard
          icon={CheckCircle2}
          title="Loan Status"
        >
          <div
            className={`
              rounded-xl
              border
              p-4
              ${
                isForeclosed
                  ? "border-violet-200 bg-violet-50"
                  : "border-emerald-200 bg-emerald-50"
              }
            `}
          >
            <div className="flex items-center gap-3">
              <div
                className={`
                  flex
                  h-10
                  w-10
                  shrink-0
                  items-center
                  justify-center
                  rounded-xl
                  ${
                    isForeclosed
                      ? "bg-violet-100 text-violet-600"
                      : "bg-emerald-100 text-emerald-600"
                  }
                `}
              >
                <CheckCircle2
                  size={19}
                />
              </div>

              <div>
                <p className="text-[8px] font-bold uppercase tracking-wide text-slate-400">
                  Current Loan Status
                </p>

                <p
                  className={`
                    mt-1
                    text-[18px]
                    font-extrabold
                    ${
                      isForeclosed
                        ? "text-violet-700"
                        : "text-emerald-700"
                    }
                  `}
                >
                  {loanStatus}
                </p>

                <p className="mt-1 text-[9px] font-medium text-slate-500">
                  {isForeclosed
                    ? "Loan has been foreclosed. Active EMI collection and overdue monitoring are disabled."
                    : "Loan account is closed. Active EMI collection and overdue monitoring are disabled."}
                </p>
              </div>
            </div>
          </div>
        </DetailCard>
      )}

      {/* LOAN INFORMATION */}

      <DetailCard
        icon={IndianRupee}
        title="Loan Information"
      >
        <div
          className="
            grid
            grid-cols-2
            gap-x-8
            gap-y-5
            sm:grid-cols-3
            lg:grid-cols-4
          "
        >
          <MetricField
            label="Loan Number"
            value={
              loan?.loanNumber
            }
          />

          <MetricField
            label="Loan Status"
            value={
              loanStatus
            }
            accent={!isForeclosed}
          />

          <MetricField
            label="Vehicle Amount"
            value={`₹${money(
              loan?.vehicleAmount
            )}`}
          />

          <MetricField
            label="Down Payment"
            value={`₹${money(
              loan?.downPayment
            )}`}
          />

          <MetricField
            label="Loan Amount"
            value={`₹${money(
              loan?.loanAmount
            )}`}
            accent
          />

          <MetricField
            label="Principal"
            value={`₹${money(
              calculation?.principal
            )}`}
          />

          <MetricField
            label="Interest"
            value={`₹${money(
              calculation?.interestAmount ??
                calculation?.interest
            )}`}
          />

          <MetricField
            label="Total Payable"
            value={`₹${money(
              calculation?.totalDue
            )}`}
            accent
          />

          <MetricField
            label={
              loan?.repayment
                ?.method ===
              "Principal"
                ? "First Payment"
                : "EMI"
            }
            value={
              isTerminalLoan
                ? "—"
                : `₹${money(
                    loan?.repayment
                      ?.method ===
                      "Principal"
                      ? calculation?.firstPayment
                      : calculation?.emiAmount
                  )}`
            }
            accent
          />

          <MetricField
            label="Interest Type"
            value={
              loan?.interest
                ?.type
            }
          />

          <MetricField
            label="Interest Rate"
            value={
              loan?.interest?.rate
                ? `${loan.interest.rate}%`
                : "—"
            }
          />

          <MetricField
            label="Repayment Method"
            value={
              loan?.repayment
                ?.method
            }
          />

          <MetricField
            label="Frequency"
            value={
              loan?.repayment
                ?.frequency
            }
          />

          <MetricField
            label="Tenure"
            value={
              loan?.repayment
                ?.tenure
                ? `${loan.repayment.tenure} ${
                    loan.repayment
                      ?.tenureUnit ||
                    "Months"
                  }`
                : "—"
            }
          />

          <MetricField
            label="First Due Date"
            value={
              isTerminalLoan
                ? "—"
                : loan?.firstDueDate
                ? formatDate(
                    loan.firstDueDate
                  )
                : "—"
            }
          />
        </div>

        {customerLoans.length > 1 && (
          <div className="mt-5 border-t border-slate-100 pt-4">
            <p className="mb-2 text-[10px] font-extrabold uppercase tracking-wide text-slate-400">
              Loan History
            </p>
            <div className="space-y-2">
              {customerLoans.map((historyLoan) => (
                <div key={historyLoan.id || historyLoan.loanNumber} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                  <div>
                    <p className="text-[11px] font-bold text-[#17221D]">
                      {historyLoan.loanNumber || "—"}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      {historyLoan.previousLoanId || historyLoan.previousLoanNumber ? "NEW LOAN · FROM RE-LOAN WORKFLOW" : "NORMAL"}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-semibold text-[#17221D]">
                      {historyLoan.status || "—"}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      ₹{money(getLoanOutstanding(historyLoan))} outstanding
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DetailCard>

      {/* REPAYMENT SUMMARY */}

      <DetailCard
        icon={CalendarDays}
        title="Repayment Summary"
      >
        {isTerminalLoan ? (
          <div
            className="
              rounded-xl
              border
              border-slate-200
              bg-slate-50
              px-4
              py-4
            "
          >
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <SnapshotCard
                label="Status"
                value={
                  loanStatus
                }
                note="Account resolution"
                tone={
                  isForeclosed
                    ? "neutral"
                    : "green"
                }
                icon={
                  CheckCircle2
                }
              />

              <SnapshotCard
                label="Paid"
                value={
                  paidInstallments
                }
                note="Recorded installments"
                tone="green"
                icon={
                  CheckCircle2
                }
              />

              <SnapshotCard
                label="Pending"
                value="0"
                note="No active EMI"
                tone="neutral"
                icon={Clock3}
              />

              <SnapshotCard
                label="Overdue"
                value="0"
                note="No active overdue"
                tone="neutral"
                icon={
                  CheckCircle2
                }
              />
            </div>
          </div>
        ) : (
          <div
            className="
              grid
              grid-cols-2
              gap-2
              sm:grid-cols-4
            "
          >
            <SnapshotCard
              label="Total Installments"
              value={
                repaymentSchedule.length
              }
              note="Scheduled"
              tone="blue"
              icon={
                CalendarDays
              }
            />

            <SnapshotCard
              label="Paid"
              value={
                paidInstallments
              }
              note="Completed"
              tone="green"
              icon={
                CheckCircle2
              }
            />

            <SnapshotCard
              label="Pending"
              value={
                pendingInstallments
              }
              note="Still due"
              tone="blue"
              icon={Clock3}
            />

            <SnapshotCard
              label="Overdue"
              value={
                overdueInstallments
              }
              note={`₹${money(
                totalOverdueAmount
              )}`}
              tone="red"
              icon={
                AlertTriangle
              }
            />
          </div>
        )}
      </DetailCard>

      {/* CHARGES */}

      <DetailCard
        icon={WalletCards}
        title="Charges & Collection"
      >
        <div
          className="
            grid
            grid-cols-2
            gap-x-8
            gap-y-5
            sm:grid-cols-3
            lg:grid-cols-4
          "
        >
          <MetricField
            label="Default Interest"
            value={`₹${money(
              charges?.defaultInterest
            )}`}
          />

          <MetricField
            label="Grace Days"
            value={
              charges?.graceDays ||
              0
            }
          />

          <MetricField
            label="Advance EMI"
            value={`₹${money(
              charges?.advanceEmi
            )}`}
          />

          <MetricField
            label="Document Charge"
            value={`₹${money(
              charges?.documentCharge
            )}`}
          />

          <MetricField
            label="Insurance Amount"
            value={`₹${money(
              charges?.insuranceAmount
            )}`}
          />

          <MetricField
            label="Fine Amount"
            value={`₹${money(
              charges?.fineAmount
            )}`}
          />

          <MetricField
            label="Difference Initial"
            value={`₹${money(
              charges?.differenceInitial
            )}`}
          />

          <MetricField
            label="Collection Mode"
            value={
              collection?.payMode ||
              collection?.receiptMode ||
              "—"
            }
          />

          <MetricField
            label="Initial Receipt"
            value={`₹${money(
              collection?.receiptAmount
            )}`}
            accent
          />
        </div>
      </DetailCard>

      {/* REPAYMENT SCHEDULE */}

      <section
        className="
          overflow-hidden
          rounded-xl
          border
          border-slate-200
          bg-white
          shadow-sm
        "
      >
        <div
          className="
            flex
            flex-col
            gap-3
            border-b
            border-slate-100
            px-4
            py-3.5
            sm:flex-row
            sm:items-center
            sm:justify-between
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex
                h-9
                w-9
                shrink-0
                items-center
                justify-center
                rounded-lg
                bg-[#EAF5EF]
                text-[#0B6B43]
              "
            >
              <CalendarDays size={16} />
            </div>

            <div className="min-w-0">
              <h3 className="text-[12px] font-extrabold text-[#17221D]">
                Repayment Schedule
              </h3>

              <p className="mt-0.5 text-[8px] font-medium text-slate-400">
                View the complete installment schedule without expanding the page.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className="
                rounded-full
                bg-slate-100
                px-2.5
                py-1
                text-[8px]
                font-extrabold
                text-slate-500
              "
            >
              {repaymentSchedule.length} entries
            </span>

            <button
              type="button"
              onClick={() => setScheduleOpen(true)}
              className="
                inline-flex
                h-9
                items-center
                gap-1.5
                rounded-lg
                bg-[#0B6B43]
                px-3.5
                text-[9px]
                font-extrabold
                text-white
                shadow-sm
                transition
                hover:-translate-y-[1px]
                hover:bg-[#095B3B]
                hover:shadow-md
              "
            >
              <Maximize2 size={12} />
              Open Schedule
            </button>
          </div>
        </div>

        <div className="px-4 py-3">
          {isTerminalLoan ? (
            <div
              className="
                rounded-lg
                border
                border-slate-200
                bg-slate-50
                px-4
                py-4
                text-center
              "
            >
              <CheckCircle2
                size={20}
                className="mx-auto text-emerald-600"
              />

              <p className="mt-2 text-[10px] font-bold text-[#17221D]">
                No Active Repayment Schedule
              </p>

              <p className="mt-1 text-[8px] text-slate-400">
                {isForeclosed
                  ? "This loan has been foreclosed and is no longer part of the active EMI collection workflow."
                  : "This loan is closed and is no longer part of the active EMI collection workflow."}
              </p>
            </div>
          ) : (
            <div
              className="
                flex
                flex-wrap
                items-center
                justify-between
                gap-3
                rounded-lg
                border
                border-[#D8E9DF]
                bg-[#F6FBF8]
                px-3
                py-3
              "
            >
              <div>
                <p className="text-[9px] font-extrabold text-[#17221D]">
                  Complete schedule available
                </p>

                <p className="mt-0.5 text-[8px] text-slate-500">
                  Open the schedule popup to review due dates, principal, interest, EMI and status.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setScheduleOpen(true)}
                className="
                  inline-flex
                  h-8
                  items-center
                  gap-1.5
                  rounded-lg
                  border
                  border-[#B9DCC6]
                  bg-white
                  px-3
                  text-[8px]
                  font-extrabold
                  text-[#0B6B43]
                  transition
                  hover:bg-[#EAF5EF]
                "
              >
                <CalendarDays size={11} />
                View Schedule
              </button>
            </div>
          )}
        </div>
      </section>

      {scheduleOpen && (
        <RepaymentSchedulePopup
          loan={loan}
          onClose={() => setScheduleOpen(false)}
        />
      )}
    </div>
  );
};

/* =========================================================
   REPAYMENT SCHEDULE POPUP
========================================================= */

const RepaymentSchedulePopup = ({
  loan,
  onClose,
}) => {
  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener(
      "keydown",
      handleEscape
    );

    return () => {
      window.removeEventListener(
        "keydown",
        handleEscape
      );
    };
  }, [onClose]);

  useEffect(() => {
    const previousOverflow =
      document.body.style.overflow;

    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow =
        previousOverflow;
    };
  }, []);

  const scheduleCount =
    Array.isArray(
      loan?.repaymentSchedule
    )
      ? loan.repaymentSchedule.length
      : 0;

  return (
    <div
      className="
        fixed
        inset-0
        z-[500]
        flex
        items-center
        justify-center
        bg-slate-950/50
        p-3
        backdrop-blur-[3px]
        sm:p-5
      "
      onClick={onClose}
    >
      <div
        className="
          flex
          h-[92vh]
          w-full
          max-w-[1180px]
          flex-col
          overflow-hidden
          rounded-2xl
          border
          border-slate-200
          bg-[#F7FAF8]
          shadow-[0_30px_100px_rgba(15,23,42,0.28)]
        "
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        <div
          className="
            flex
            shrink-0
            items-center
            justify-between
            gap-3
            border-b
            border-slate-200
            bg-white
            px-4
            py-3.5
            sm:px-5
          "
        >
          <div className="flex min-w-0 items-center gap-3">
            <div
              className="
                flex
                h-10
                w-10
                shrink-0
                items-center
                justify-center
                rounded-xl
                bg-[#EAF5EF]
                text-[#0B6B43]
              "
            >
              <CalendarDays size={18} />
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="truncate text-[15px] font-extrabold text-[#17221D] sm:text-[17px]">
                  Repayment Schedule
                </h2>

                <span
                  className="
                    rounded-full
                    bg-slate-100
                    px-2
                    py-1
                    text-[7px]
                    font-extrabold
                    text-slate-500
                  "
                >
                  {scheduleCount} entries
                </span>
              </div>

              <p className="mt-0.5 truncate text-[8px] text-slate-400 sm:text-[9px]">
                {loan?.loanNumber || "Loan"} ·{" "}
                {loan?.customerName || "Customer"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="
              flex
              h-9
              w-9
              shrink-0
              items-center
              justify-center
              rounded-lg
              border
              border-slate-200
              bg-white
              text-slate-400
              transition
              hover:bg-slate-50
              hover:text-slate-700
            "
            aria-label="Close repayment schedule"
          >
            <X size={17} />
          </button>
        </div>

        <div
          className="
            min-h-0
            flex-1
            overflow-auto
            p-3
            sm:p-4
            lg:p-5
          "
        >
          <div
            className="
              rounded-2xl
              border
              border-slate-200
              bg-white
              shadow-sm
            "
          >
            <LoanRepaymentSchedule
              loan={loan}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

/* =========================================================
   ACTIVITY TAB
========================================================= */

const ActivityTab = ({
  customer,
  paymentHistory,
  repaymentSchedule,
  isTerminalLoan,
}) => {
  const events = useMemo(() => {
    const rows = [];

    if (
      customer?.customer
        ?.createdAt
    ) {
      rows.push({
        id: "created",
        title:
          "Customer created",
        description:
          "Customer record was created.",
        date:
          customer.customer
            .createdAt,
        tone: "green",
      });
    }

    if (
      customer?.loan
        ?.createdAt
    ) {
      rows.push({
        id: "loan-created",
        title:
          "Loan created",
        description:
          `Loan ${
            customer?.loan
              ?.loanNumber ||
            ""
          } was created.`,
        date:
          customer.loan
            .createdAt,
        tone: "blue",
      });
    }

    paymentHistory.forEach(
      (
        payment,
        index
      ) => {
        rows.push({
          id:
            payment?.id ||
            `payment-${index}`,
          title:
            "Payment received",
          description:
            `Payment of ₹${money(
              payment?.amount
            )} recorded.`,
          date:
            payment?.date ||
            payment?.paidAt ||
            payment?.paymentDate,
          tone: "green",
        });
      }
    );

    /*
     * Do not create fake overdue events
     * for terminal loans.
     */
    if (!isTerminalLoan) {
      repaymentSchedule
        .filter(
          (row) =>
            isOverdueRow(
              row
            )
        )
        .forEach(
          (
            row,
            index
          ) => {
            rows.push({
              id:
                `overdue-${index}-${row?.dueDate}`,
              title:
                "EMI overdue",
              description:
                `₹${money(
                  row?.remainingAmount ??
                    row?.balance ??
                    row?.paymentAmount ??
                    row?.emiAmount ??
                    row?.amount ??
                    0
                )} is overdue.`,
              date:
                row?.dueDate,
              tone: "red",
            });
          }
        );
    }

    return rows.sort(
      (a, b) =>
        new Date(
          b.date || 0
        ).getTime() -
        new Date(
          a.date || 0
        ).getTime()
    );
  }, [
    customer,
    paymentHistory,
    repaymentSchedule,
    isTerminalLoan,
  ]);

  return (
    <div
      className="
        rounded-xl
        border
        border-slate-200
        bg-white
        shadow-sm
      "
    >
      <div
        className="
          border-b
          border-slate-100
          px-4
          py-3
        "
      >
        <div className="flex items-center gap-2">
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
            <ActivityIcon
              size={15}
              className="text-[#0B5D3B]"
            />
          </div>

          <div>
            <h2 className="text-[13px] font-extrabold text-[#17221D]">
              Activity
            </h2>

            <p className="mt-0.5 text-[8px] text-slate-400">
              Customer and loan activity history
            </p>
          </div>
        </div>
      </div>

      <div className="p-4">
        {events.length ===
        0 ? (
          <div className="rounded-lg bg-slate-50 px-4 py-6 text-center">
            <p className="text-[9px] font-semibold text-slate-500">
              No activity available
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {events.map(
              (event) => (
                <ActivityItem
                  key={event.id}
                  {...event}
                />
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================
   DETAIL CARD
========================================================= */

const DetailCard = ({
  icon: Icon,
  title,
  action,
  children,
}) => {
  return (
    <section
      className="
        overflow-hidden
        rounded-xl
        border
        border-slate-200
        bg-white
        shadow-sm
      "
    >
      <div
        className="
          flex
          items-center
          justify-between
          gap-3
          border-b
          border-slate-100
          px-4
          py-3
        "
      >
        <div className="flex min-w-0 items-center gap-2.5">
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
              ring-1
              ring-[#D4EBDE]
            "
          >
            <Icon
              size={15}
              strokeWidth={2.2}
              className="text-[#0B5D3B]"
            />
          </div>

          <h2 className="truncate text-[13px] font-extrabold tracking-tight text-[#17221D]">
            {title}
          </h2>
        </div>

        {action}
      </div>

      <div className="px-4 py-4">
        {children}
      </div>
    </section>
  );
};

/* =========================================================
   DETAIL ITEM
========================================================= */

const DetailItem = ({
  icon: Icon,
  label,
  value,
}) => {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5">
        {Icon && (
          <Icon
            size={11}
            strokeWidth={2.2}
            className="shrink-0 text-[#0B6B43]"
          />
        )}

        <p className="truncate text-[8px] font-bold uppercase tracking-[0.05em] text-slate-400">
          {label}
        </p>
      </div>

      <p
        className="
          mt-1
          truncate
          text-[11px]
          font-bold
          leading-tight
          text-[#17221D]
        "
        title={value || "—"}
      >
        {value || "—"}
      </p>
    </div>
  );
};

/* =========================================================
   METRIC FIELD
========================================================= */

const MetricField = ({
  label,
  value,
  accent = false,
}) => {
  return (
    <div className="min-w-0">
      <p className="truncate text-[8px] font-bold uppercase tracking-[0.05em] text-slate-400">
        {label}
      </p>

      <p
        className={`
          mt-1
          truncate
          text-[12px]
          font-extrabold
          leading-tight
          ${
            accent
              ? "text-[#0B6B43]"
              : "text-[#17221D]"
          }
        `}
      >
        {value || "—"}
      </p>
    </div>
  );
};

/* =========================================================
   SNAPSHOT CARD
========================================================= */

const SnapshotCard = ({
  label,
  value,
  note,
  tone = "neutral",
  icon: Icon,
}) => {
  const styles = {
    green: {
      bg: "bg-[#F2FAF5]",
      icon:
        "bg-[#DDF2E5] text-[#0B6B43]",
      value:
        "text-[#0B6B43]",
    },

    blue: {
      bg: "bg-[#F3F7FE]",
      icon:
        "bg-[#E3ECFC] text-[#4E7DEB]",
      value:
        "text-[#365EA8]",
    },

    red: {
      bg: "bg-[#FFF5F5]",
      icon:
        "bg-[#FDE3E3] text-[#D92D3A]",
      value:
        "text-[#D92D3A]",
    },

    neutral: {
      bg: "bg-slate-50",
      icon:
        "bg-slate-100 text-slate-600",
      value:
        "text-[#17221D]",
    },
  };

  const current =
    styles[tone] ||
    styles.neutral;

  return (
    <div
      className={`
        rounded-lg
        border
        border-slate-100
        ${current.bg}
        px-3
        py-3
      `}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-[7px] font-bold uppercase tracking-wide text-slate-400">
            {label}
          </p>

          <p
            className={`
              mt-1
              truncate
              text-[16px]
              font-extrabold
              tracking-tight
              ${current.value}
            `}
          >
            {value}
          </p>

          <p className="mt-1 text-[7px] font-medium text-slate-400">
            {note}
          </p>
        </div>

        {Icon && (
          <div
            className={`
              flex
              h-7
              w-7
              shrink-0
              items-center
              justify-center
              rounded-md
              ${current.icon}
            `}
          >
            <Icon
              size={13}
              strokeWidth={2.2}
            />
          </div>
        )}
      </div>
    </div>
  );
};

/* =========================================================
   SIDEBAR CARD
========================================================= */

const SidebarCard = ({
  title,
  children,
}) => {
  return (
    <section
      className="
        rounded-xl
        border
        border-slate-200
        bg-white
        p-3.5
        shadow-sm
      "
    >
      <h3
        className="
          text-[10px]
          font-extrabold
          uppercase
          tracking-[0.05em]
          text-[#17221D]
        "
      >
        {title}
      </h3>

      <div className="mt-3 space-y-2.5">
        {children}
      </div>
    </section>
  );
};

/* =========================================================
   SIDE VALUE
========================================================= */

const SideValue = ({
  label,
  value,
  valueClass = "text-[#253252]",
}) => {
  return (
    <div
      className="
        flex
        items-start
        justify-between
        gap-4
        border-b
        border-slate-50
        pb-2
        last:border-b-0
        last:pb-0
      "
    >
      <span className="shrink-0 text-[8px] font-semibold text-slate-400">
        {label}
      </span>

      <span
        className={`
          min-w-0
          max-w-[68%]
          truncate
          text-right
          text-[10px]
          font-extrabold
          leading-tight
          ${valueClass}
        `}
        title={value || "—"}
      >
        {value || "—"}
      </span>
    </div>
  );
};

/* =========================================================
   QUICK ACTION
========================================================= */

const QuickAction = ({
  icon: Icon,
  label,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group
        flex
        w-full
        items-center
        gap-2.5
        rounded-lg
        border
        border-transparent
        px-2
        py-2
        text-left
        transition-all
        hover:border-[#CFE8D9]
        hover:bg-[#F3FAF5]
      "
    >
      <span
        className="
          flex
          h-7
          w-7
          shrink-0
          items-center
          justify-center
          rounded-md
          bg-[#EAF5EF]
          text-[#0B6B43]
        "
      >
        <Icon
          size={13}
          strokeWidth={2.2}
        />
      </span>

      <span
        className="
          text-[9px]
          font-bold
          text-[#344054]
          group-hover:text-[#0B6B43]
        "
      >
        {label}
      </span>
    </button>
  );
};

/* =========================================================
   HEADER BUTTON
========================================================= */

const HeaderButton = ({
  icon: Icon,
  label,
  onClick,
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className="
        group
        inline-flex
        h-9
        items-center
        gap-1.5
        rounded-lg
        border
        border-slate-200
        bg-white
        px-3
        text-[9px]
        font-bold
        text-slate-600
        shadow-sm
        transition-all
        hover:-translate-y-[1px]
        hover:border-[#A9D4BB]
        hover:bg-[#F2FAF5]
        hover:text-[#0B6B43]
      "
    >
      <Icon
        size={12}
        strokeWidth={2.2}
        className="
          text-slate-400
          transition
          group-hover:text-[#0B6B43]
        "
      />

      {label}
    </button>
  );
};

/* =========================================================
   CARD LINK
========================================================= */

const CardLink = ({
  children,
}) => {
  return (
    <button
      type="button"
      className="
        inline-flex
        items-center
        gap-1
        text-[8px]
        font-bold
        text-[#0B6B43]
        hover:underline
      "
    >
      {children}
      <ArrowRight size={9} />
    </button>
  );
};

/* =========================================================
   STATUS BADGE
========================================================= */

const StatusBadge = ({
  label,
}) => {
  const normalized =
    normalizeStatus(
      label
    );

  let classes =
    "bg-slate-100 text-slate-600";

  if (
    normalized === "active" ||
    normalized === "open"
  ) {
    classes =
      "bg-[#EAF5EF] text-[#0B5D3B]";
  }

  if (
    normalized === "pending" ||
    normalized === "draft"
  ) {
    classes =
      "bg-amber-50 text-amber-700";
  }

  if (
    normalized === "overdue"
  ) {
    classes =
      "bg-red-50 text-red-600";
  }

  if (
    normalized === "paid" ||
    normalized === "closed" ||
    normalized === "completed"
  ) {
    classes =
      "bg-emerald-50 text-emerald-700";
  }

  if (
    normalized ===
      "partially paid" ||
    normalized ===
      "partially-paid"
  ) {
    classes =
      "bg-orange-50 text-orange-600";
  }

  if (
    normalized ===
      "foreclosed" ||
    normalized ===
      "foreclosure"
  ) {
    classes =
      "bg-violet-50 text-violet-700";
  }

  return (
    <span
      className={`
        inline-flex
        items-center
        rounded-full
        px-2.5
        py-1
        text-[7px]
        font-extrabold
        ${classes}
      `}
    >
      {label}
    </span>
  );
};

/* =========================================================
   ACTIVITY ITEM
========================================================= */

const ActivityItem = ({
  title,
  description,
  date,
  tone,
}) => {
  const colors = {
    green: {
      bg: "bg-[#EAF5EF]",
      text: "text-[#0B6B43]",
    },

    blue: {
      bg: "bg-[#EDF3FE]",
      text: "text-[#4E7DEB]",
    },

    red: {
      bg: "bg-red-50",
      text: "text-red-600",
    },
  };

  const current =
    colors[tone] ||
    colors.blue;

  return (
    <div
      className="
        flex
        items-start
        gap-3
        rounded-lg
        border
        border-slate-100
        bg-[#FCFDFC]
        px-3
        py-3
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
          ${current.bg}
        `}
      >
        <ActivityIcon
          size={12}
          className={
            current.text
          }
        />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10px] font-bold text-[#253252]">
            {title}
          </p>

          <p className="text-[8px] text-slate-400">
            {formatDate(date)}
          </p>
        </div>

        <p className="mt-1 text-[8px] leading-relaxed text-slate-400">
          {description}
        </p>
      </div>
    </div>
  );
};

/* =========================================================
   TABLE HEADER
========================================================= */

const TableHeader = ({
  children,
}) => {
  return (
    <th
      className="
        whitespace-nowrap
        border-b
        border-slate-200
        px-4
        py-2.5
        text-left
        text-[8px]
        font-bold
        uppercase
        tracking-[0.05em]
        text-slate-400
      "
    >
      {children}
    </th>
  );
};

/* =========================================================
   STATUS HELPERS
========================================================= */

const normalizeStatus = (
  value
) => {
  return String(
    value || ""
  )
    .trim()
    .toLowerCase()
    .replace(/[-_]+/g, " ");
};

const isForeclosedLoan = (
  loan
) => {
  const status =
    normalizeStatus(
      loan?.status
    );

  return (
    status ===
      "foreclosed" ||
    status ===
      "foreclosure"
  );
};

const isClosedLoan = (
  loan
) => {
  const status =
    normalizeStatus(
      loan?.status
    );

  return (
    status ===
      "closed" ||
    status ===
      "paid off" ||
    status ===
      "paid"
  );
};

const getLoanStatusClass = (
  status
) => {
  const normalized =
    normalizeStatus(
      status
    );

  if (
    normalized ===
      "foreclosed" ||
    normalized ===
      "foreclosure"
  ) {
    return "text-violet-700";
  }

  if (
    normalized ===
      "closed" ||
    normalized ===
      "paid" ||
    normalized ===
      "paid off"
  ) {
    return "text-emerald-700";
  }

  if (
    normalized ===
    "overdue"
  ) {
    return "text-red-600";
  }

  if (
    normalized ===
      "pending" ||
    normalized ===
      "draft"
  ) {
    return "text-amber-700";
  }

  return "text-[#0B6B43]";
};

const normalizePaymentLabel =
  (status) => {
    switch (
      normalizeStatus(
        status
      )
    ) {
      case "paid":
      case "completed":
      case "closed":
      case "settled":
        return "Paid";

      case "pending":
        return "Upcoming";

      case "overdue":
        return "Overdue";

      case "partially paid":
      case "partial":
        return "Partially Paid";

      case "foreclosed":
        return "Foreclosed";

      default:
        return "Upcoming";
    }
  };

const getCustomerStatus =
  (status) => {
    const normalized =
      normalizeStatus(
        status
      );

    if (
      normalized ===
      "draft"
    ) {
      return "Pending";
    }

    if (!status) {
      return "Unknown";
    }

    return String(status);
  };

/* =========================================================
   LOAN STATUS
========================================================= */

const getLoanStatus = (
  loan
) => {
  const raw =
    normalizeStatus(
      loan?.status
    );

  if (
    raw === "foreclosed" ||
    raw === "foreclosure"
  ) {
    return "Foreclosed";
  }

  if (
    raw === "closed" ||
    raw === "paid off" ||
    raw === "paid"
  ) {
    return "Paid";
  }

  if (
    raw === "draft"
  ) {
    return "Pending";
  }

  /*
   * Only calculate Overdue for loans
   * which are still active/open.
   */
  if (
    raw !== "closed" &&
    raw !== "foreclosed" &&
    raw !== "foreclosure" &&
    raw !== "paid off" &&
    raw !== "paid"
  ) {
    if (
      Array.isArray(
        loan?.repaymentSchedule
      )
    ) {
      if (
        loan.repaymentSchedule.some(
          (row) =>
            isOverdueRow(
              row
            )
        )
      ) {
        return "Overdue";
      }
    }
  }

  return (
    loan?.status ||
    "Pending"
  );
};

/* =========================================================
   OVERDUE RULE
========================================================= */

const isOverdueRow = (
  row
) => {
  const status =
    normalizeStatus(
      row?.status
    );

  if (
    status === "paid" ||
    status === "completed" ||
    status === "closed" ||
    status === "settled" ||
    status === "foreclosed" ||
    status === "foreclosure"
  ) {
    return false;
  }

  if (
    status !== "pending" &&
    status !== "overdue" &&
    status !== "partially paid" &&
    status !== "partial"
  ) {
    return false;
  }

  if (!row?.dueDate) {
    return false;
  }

  const dueDate =
    parseDateOnly(
      row.dueDate
    );

  if (!dueDate) {
    return false;
  }

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0
  );

  return (
    dueDate.getTime() <
    today.getTime()
  );
};

/* =========================================================
   NEXT PAYMENT
========================================================= */

const getNextPayment = (
  loan
) => {
  if (
    isForeclosedLoan(
      loan
    ) ||
    isClosedLoan(
      loan
    )
  ) {
    return null;
  }

  const schedule =
    Array.isArray(
      loan?.repaymentSchedule
    )
      ? loan.repaymentSchedule
      : [];

  const openRows =
    schedule.filter(
      (row) => {
        const status =
          normalizeStatus(
            row?.status
          );

        return [
          "pending",
          "overdue",
          "partially paid",
          "partial",
        ].includes(
          status
        );
      }
    );

  if (!openRows.length) {
    return null;
  }

  return (
    [...openRows].sort(
      (a, b) => {
        const aDate =
          parseDateOnly(
            a?.dueDate
          );

        const bDate =
          parseDateOnly(
            b?.dueDate
          );

        return (
          (
            aDate?.getTime() ||
            Number.MAX_SAFE_INTEGER
          ) -
          (
            bDate?.getTime() ||
            Number.MAX_SAFE_INTEGER
          )
        );
      }
    )[0] || null
  );
};

/* =========================================================
   DATE HELPERS
========================================================= */

const parseDateOnly = (
  value
) => {
  if (!value) {
    return null;
  }

  const raw = String(value);

  const match =
    raw.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  if (match) {
    return new Date(
      Number(match[1]),
      Number(match[2]) - 1,
      Number(match[3])
    );
  }

  const date =
    new Date(value);

  return Number.isNaN(
    date.getTime()
  )
    ? null
    : date;
};

const formatDate = (
  value
) => {
  const date =
    parseDateOnly(value);

  if (!date) {
    return "—";
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
};

const getDaysFromToday =
  (value) => {
    const due =
      parseDateOnly(value);

    if (!due) {
      return 0;
    }

    due.setHours(
      0,
      0,
      0,
      0
    );

    const today =
      new Date();

    today.setHours(
      0,
      0,
      0,
      0
    );

    return Math.ceil(
      (
        due.getTime() -
        today.getTime()
      ) /
        (
          1000 *
          60 *
          60 *
          24
        )
    );
  };

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

/* =========================================================
   AADHAAR
========================================================= */

const maskAadhaar = (
  value
) => {
  const digits =
    String(value || "");

  if (
    digits.length < 4
  ) {
    return digits;
  }

  return `XXXX XXXX ${digits.slice(
    -4
  )}`;
};

/* =========================================================
   EXPORT
========================================================= */

export default CustomerDetails;